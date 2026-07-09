-- Karma ledger — el SALDO GASTABLE de karma (Fase 2 del gating/karma).
--
-- Contexto: hasta ahora "karma" era un puntaje de REPUTACIÓN calculado al vuelo
-- (src/lib/karma.ts), sin saldo ni forma de gastarlo. Este ledger le da a karma un
-- saldo real, append-only (earn/spend), para el modelo "pasás tiempo en la app →
-- ganás karma → lo gastás como crédito para desbloquear funciones" (sin pagar).
--
-- Escrituras SIEMPRE por service role (server) o por spend_karma() (SECURITY
-- DEFINER); el cliente solo LEE su propio ledger. Ver docs / src/lib/karma-ledger.ts.

create table if not exists public.karma_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  delta       integer not null,          -- >0 acreditación, <0 gasto
  reason      text not null,             -- 'engagement' | 'action:follow' | 'seed:hacienda' | 'spend:unlock_history' | ...
  ref_type    text,                      -- 'value_event' | 'remate_mark' | 'unlock' | null
  ref_id      text,                      -- id de la fuente (para idempotencia de créditos únicos)
  created_at  timestamptz not null default now()
);

create index if not exists karma_ledger_user_idx
  on public.karma_ledger (user_id, created_at desc);

-- Idempotencia: no acreditar dos veces la misma fuente (mismo user+reason+ref_id).
create unique index if not exists karma_ledger_ref_uniq
  on public.karma_ledger (user_id, reason, ref_id)
  where ref_id is not null;

alter table public.karma_ledger enable row level security;

-- El usuario solo LEE lo suyo. No hay policy de insert para el cliente a propósito:
-- las escrituras van por service role o por spend_karma().
drop policy if exists "karma_ledger own select" on public.karma_ledger;
create policy "karma_ledger own select" on public.karma_ledger
  for select using (auth.uid() = user_id);

-- Saldo = suma de deltas.
create or replace function public.karma_balance(p_user uuid)
returns integer
language sql stable
as $$
  select coalesce(sum(delta), 0)::integer
  from public.karma_ledger
  where user_id = p_user;
$$;

-- Gasto ATÓMICO: verifica saldo >= costo y debita en una sola transacción,
-- serializando los gastos del mismo usuario con un advisory lock (evita doble gasto
-- concurrente). Devuelve el saldo NUEVO, o -1 si no alcanza. p_cost debe ser > 0.
create or replace function public.spend_karma(
  p_user uuid,
  p_cost integer,
  p_reason text,
  p_ref_id text default null
)
returns integer
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_cost is null or p_cost <= 0 then
    raise exception 'spend_karma: p_cost debe ser > 0';
  end if;

  -- Serializa gastos del mismo usuario (dura hasta el fin de la transacción).
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  v_balance := public.karma_balance(p_user);
  if v_balance < p_cost then
    return -1;  -- saldo insuficiente
  end if;

  insert into public.karma_ledger (user_id, delta, reason, ref_type, ref_id)
  values (p_user, -p_cost, coalesce(p_reason, 'spend'), 'unlock', p_ref_id);

  return v_balance - p_cost;
end;
$$;

-- spend_karma no debe ser invocable directo por el cliente (se llama desde el server
-- tras validar el desbloqueo). karma_balance sí puede leerse.
revoke all on function public.spend_karma(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.karma_balance(uuid) to authenticated, service_role;
grant execute on function public.spend_karma(uuid, integer, text, text) to service_role;
