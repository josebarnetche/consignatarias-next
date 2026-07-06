-- Agregación mensual de cabezas por consignatario en el MAG (dato transaccional
-- propio). La hace la DB con GROUP BY para no tocar el cap de 1.000 filas de
-- Supabase al traer los lotes y sumar en el cliente. La consume El Corredor.
create or replace function mag_monthly_consignatario_stats(p_year int, p_month int)
returns json language sql security definer set search_path = public as $$
  with lots as (
    select l.mag_consignataria_id as id, l.head_count, l.date
    from mag_consignataria_sales_lots l
    where l.date >= make_date(p_year, p_month, 1)
      and l.date < (make_date(p_year, p_month, 1) + interval '1 month')
  ),
  byfirm as (
    select id, sum(coalesce(head_count,0))::int as cabezas
    from lots group by id having sum(coalesce(head_count,0)) > 0
  )
  select json_build_object(
    'total', (select coalesce(sum(cabezas),0)::int from byfirm),
    'firms_count', (select count(*)::int from byfirm),
    'days', (select count(distinct date)::int from lots),
    'top', (select coalesce(json_agg(row_to_json(t)),'[]') from (
        select coalesce(c.name, 'Firma #'||b.id) as name, b.cabezas
        from byfirm b left join mag_consignatarias c on c.mag_id = b.id
        order by b.cabezas desc limit 15
      ) t)
  );
$$;
