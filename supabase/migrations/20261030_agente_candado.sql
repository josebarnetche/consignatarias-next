-- Candado por corrida del agente (30-10-2026). Ver src/lib/agente/candado.ts.
--
-- /api/cron/agente lo llaman GitHub Actions cada 10–30 min; si dos llamadas se
-- pisan, las dos corridas pueden ofrecer a la misma firma dentro de las 24 h o
-- pasarse del cupo de 20 contactos nuevos por día. Con el candado, la segunda
-- corrida sale sin mandar nada.
--
-- Fila con vencimiento y NO pg_advisory_lock: por PostgREST cada .rpc() puede
-- caer en otra conexión del pool, así que un advisory lock de sesión se toma en
-- una conexión y el unlock corre en otra (o queda colgado en la conexión del
-- pool). La fila vence sola: si la corrida muere sin soltarla, la próxima la
-- toma cuando pasó el vencimiento (el código pide 10 min; tope duro 15).
--
-- Solo el service role: RLS sin políticas y EXECUTE revocado a anon/authenticated.

create table if not exists public.agente_candado (
  nombre text primary key,
  duenio text not null,
  tomado_at timestamptz not null default now(),
  vence_at timestamptz not null
);
alter table public.agente_candado enable row level security;

-- Toma el candado si está libre o vencido. Atómico: un solo INSERT ... ON CONFLICT.
-- Devuelve true si quedó a nombre de p_duenio.
create or replace function public.agente_tomar_candado(p_nombre text, p_duenio text, p_segundos int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seg int := least(greatest(coalesce(p_segundos, 600), 30), 900); -- 30 s a 15 min
  v_ok boolean;
begin
  insert into public.agente_candado as c (nombre, duenio, tomado_at, vence_at)
  values (p_nombre, p_duenio, now(), now() + make_interval(secs => v_seg))
  on conflict (nombre) do update
    set duenio = excluded.duenio, tomado_at = excluded.tomado_at, vence_at = excluded.vence_at
    where c.vence_at < now()
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

-- Suelta el candado solo si sigue siendo de p_duenio (una corrida que se pasó del
-- vencimiento no le borra el candado a la que vino después).
create or replace function public.agente_soltar_candado(p_nombre text, p_duenio text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  delete from public.agente_candado where nombre = p_nombre and duenio = p_duenio;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

revoke all on function public.agente_tomar_candado(text, text, int) from public, anon, authenticated;
revoke all on function public.agente_soltar_candado(text, text) from public, anon, authenticated;
grant execute on function public.agente_tomar_candado(text, text, int) to service_role;
grant execute on function public.agente_soltar_candado(text, text) to service_role;
