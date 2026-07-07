-- "El novillo en dólares" — showcase histórico del Enterprise API (from ISO-8859-1
-- to full historic): valor de un novillo (~460 kg) en USD para cualquier fecha,
-- cruzando INMAG diario (2015→) con el dólar blue/oficial. Agregación en la DB para
-- no tocar el cap de 1.000 filas de Supabase.

-- Valor del novillo en USD para fechas puntuales (días importantes de Argentina).
create or replace function novillo_usd_days(p_dates text[])
returns json language sql stable set search_path=public as $$
  select coalesce(json_agg(json_build_object(
    'date', d,
    'inmag', (select inmag_value from mag_inmag_history i where i.inmag_value is not null and i.date <= d::date order by i.date desc limit 1),
    'blue', (select venta from usd_blue_history b where b.venta is not null and b.date <= d::date order by b.date desc limit 1),
    'usd_blue', round((select inmag_value from mag_inmag_history i where i.inmag_value is not null and i.date <= d::date order by i.date desc limit 1)*460 / nullif((select venta from usd_blue_history b where b.venta is not null and b.date <= d::date order by b.date desc limit 1),0)),
    'usd_oficial', round((select inmag_value from mag_inmag_history i where i.inmag_value is not null and i.date <= d::date order by i.date desc limit 1)*460 / nullif((select venta from usd_oficial_history o where o.venta is not null and o.date <= d::date order by o.date desc limit 1),0))
  ) order by d), '[]')
  from unnest(p_dates) d;
$$;

-- Serie mensual (último día hábil de cada mes) del novillo en USD blue — el espinazo del chart.
create or replace function novillo_usd_series()
returns json language sql stable set search_path=public as $$
  with monthly as (
    select distinct on (date_trunc('month', i.date)) i.date, i.inmag_value,
      (select venta from usd_blue_history b where b.venta is not null and b.date <= i.date order by b.date desc limit 1) blue
    from mag_inmag_history i where i.inmag_value is not null
    order by date_trunc('month', i.date), i.date desc
  )
  select coalesce(json_agg(json_build_object('date', to_char(date,'YYYY-MM-DD'), 'usd', round(inmag_value*460/blue)) order by date), '[]')
  from monthly where blue is not null;
$$;
