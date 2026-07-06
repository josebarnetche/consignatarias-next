-- Capa de datos first-party: un ID de visitante propio (cookie `cid`, seteada en
-- middleware) con su atribución (first-touch + last-touch) y stitching a la cuenta
-- al loguearse. Cada value_event se liga a un visitor_id. Sin RLS público: solo el
-- service role (vía /api/track/*) escribe/lee; el cliente nunca consulta directo.
create table if not exists visitors (
  cid text primary key,
  user_id uuid references auth.users(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  visits int not null default 1,
  pageviews int not null default 1,
  ft_landing text, ft_referrer text, ft_utm_source text, ft_utm_medium text, ft_utm_campaign text, ft_ai_engine text, ft_device text,
  lt_landing text, lt_referrer text, lt_utm_source text, lt_utm_medium text, lt_utm_campaign text, lt_ai_engine text,
  consent text not null default 'implied',
  updated_at timestamptz not null default now()
);
alter table visitors enable row level security;
create index if not exists idx_visitors_user on visitors(user_id) where user_id is not null;
create index if not exists idx_visitors_last_seen on visitors(last_seen_at desc);

alter table value_events add column if not exists visitor_id text;
create index if not exists idx_value_events_visitor on value_events(visitor_id);

-- Upsert atómico: preserva el first-touch, actualiza el last-touch, incrementa
-- pageviews (siempre) y visits (solo en sesión nueva), y hace stitching a la cuenta
-- (user_id) la primera vez que se conoce. Llamada desde /api/track/visit (service role).
create or replace function upsert_visitor(
  p_cid text, p_user uuid,
  p_landing text, p_referrer text, p_utm_source text, p_utm_medium text, p_utm_campaign text, p_ai_engine text, p_device text,
  p_new_session boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into visitors (cid, user_id,
      ft_landing, ft_referrer, ft_utm_source, ft_utm_medium, ft_utm_campaign, ft_ai_engine, ft_device,
      lt_landing, lt_referrer, lt_utm_source, lt_utm_medium, lt_utm_campaign, lt_ai_engine)
  values (p_cid, p_user,
      p_landing, p_referrer, p_utm_source, p_utm_medium, p_utm_campaign, p_ai_engine, p_device,
      p_landing, p_referrer, p_utm_source, p_utm_medium, p_utm_campaign, p_ai_engine)
  on conflict (cid) do update set
    last_seen_at = now(), updated_at = now(),
    pageviews = visitors.pageviews + 1,
    visits = visitors.visits + (case when p_new_session then 1 else 0 end),
    user_id = coalesce(visitors.user_id, excluded.user_id),
    lt_landing = excluded.lt_landing, lt_referrer = excluded.lt_referrer,
    lt_utm_source = excluded.lt_utm_source, lt_utm_medium = excluded.lt_utm_medium,
    lt_utm_campaign = excluded.lt_utm_campaign, lt_ai_engine = excluded.lt_ai_engine;
end $$;

-- Agregados para el dashboard de visitantes en /admin/ops: totales, stitching,
-- nuevos 7d, recurrentes, y breakdowns por motor de IA / fuente / device + recientes.
create or replace function visitor_stats()
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'total', (select count(*) from visitors),
    'stitched', (select count(*) from visitors where user_id is not null),
    'new_7d', (select count(*) from visitors where first_seen_at > now() - interval '7 days'),
    'returning', (select count(*) from visitors where visits > 1),
    'by_engine', (select coalesce(json_agg(row_to_json(t)),'[]') from (select ft_ai_engine as k, count(*)::int as n from visitors where ft_ai_engine is not null group by ft_ai_engine order by n desc limit 8) t),
    'by_source', (select coalesce(json_agg(row_to_json(t)),'[]') from (select coalesce(nullif(ft_utm_source,''), ft_referrer, 'directo') as k, count(*)::int as n from visitors group by 1 order by n desc limit 8) t),
    'by_device', (select coalesce(json_agg(row_to_json(t)),'[]') from (select coalesce(ft_device,'?') as k, count(*)::int as n from visitors group by 1 order by n desc) t),
    'recent', (select coalesce(json_agg(row_to_json(t)),'[]') from (select ft_landing, ft_utm_source, ft_ai_engine, ft_device, visits, pageviews, (user_id is not null) as registered, last_seen_at from visitors order by last_seen_at desc limit 12) t)
  );
$$;
