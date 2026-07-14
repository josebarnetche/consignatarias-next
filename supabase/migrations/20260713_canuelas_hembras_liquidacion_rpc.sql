-- Índice de Liquidación: agregación mensual de % hembras del operado en Cañuelas.
-- Necesario porque leer los ~8.500 lotes crudos vía PostgREST se capea en 1.000 filas
-- (db-max-rows) y devolvía sólo parte del primer mes. El RPC agrega en la base y
-- devuelve ~3 filas, sin límite. Hembras = vacas + vaquillonas (y sus estados).
create or replace function public.get_canuelas_hembras_mensual()
returns table(mes text, hembras bigint, total bigint)
language sql
stable
as $$
  select to_char(date, 'YYYY-MM') as mes,
         coalesce(sum(head_count) filter (where category ~* '^VAC|^VAQ'), 0)::bigint as hembras,
         sum(head_count)::bigint as total
  from public.mag_consignataria_sales_lots
  where head_count > 0 and date is not null
  group by 1
  order by 1;
$$;
