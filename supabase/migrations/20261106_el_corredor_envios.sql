-- El Corredor: quién recibió cada edición y quién lo pidió sin perder lo suyo.
--
-- 1) newsletter_subscribers.el_corredor. Cada correo tiene UN source, y la alta de
--    /api/el-corredor/subscribe hacía upsert con source='el-corredor': quien estaba por
--    'cierre-mensual', 'frigorificos' o 'arrendamiento-liquidacion' quedaba fuera de su
--    propio mail al pedir el Corredor. Ahora el source no se toca y el pedido se marca acá.
--
-- 2) el_corredor_envios. El envío se topea por día (capForFreePlan, 80) y lo que pasaba
--    del tope no salía nunca: 17 de 97 en la edición de septiembre y 34 de 114 en la de
--    octubre (cron_runs, workflow 'el-corredor-publish'). Una fila por (edición, tipo,
--    correo) enviado: el envío de los días siguientes manda solo a quien no tiene fila,
--    y volver a disparar el del día 1 no duplica.
alter table public.newsletter_subscribers
  add column if not exists el_corredor boolean not null default false;

create table if not exists public.el_corredor_envios (
  ym text not null,
  tipo text not null default 'edicion' check (tipo in ('edicion', 'correccion')),
  email text not null,
  enviado_at timestamptz not null default now(),
  primary key (ym, tipo, email)
);

-- Solo la escribe y la lee el service role (la ruta del envío). RLS sin políticas y sin
-- privilegios para las claves públicas.
alter table public.el_corredor_envios enable row level security;
revoke all on table public.el_corredor_envios from anon, authenticated;

-- ROLLBACK:
--   drop table if exists public.el_corredor_envios;
--   alter table public.newsletter_subscribers drop column if exists el_corredor;
