-- informe_purchases — entitlement de los productos GENERADOS POR VARIANTE
-- (el primero: el informe productivo por departamento, 455 variantes publicables).
--
-- POR QUÉ UNA TABLA NUEVA Y NO `guia_purchases`
-- La guía premium es UN archivo fijo: el maestro vive en `private/guias/`, el
-- catálogo es código (`src/lib/guias-premium.ts`) y el entitlement necesita una
-- sola coordenada — qué guía compró este email. Acá el mismo producto tiene 455
-- entregables distintos (uno por departamento, `src/lib/productividad/panel.ts` →
-- `getDepartamentosPublicables()`), y comprar el informe de Mercedes NO habilita
-- el de Curuzú Cuatiá. Meter eso en `guia_purchases` obligaba a codificar la
-- variante dentro de `guia_slug` ('informe-productivo:corrientes/mercedes'), que
-- ensucia el único índice que sostiene el ON CONFLICT del webhook y deja el
-- catálogo de guías con 455 entradas fantasma. Es una coordenada más, y una
-- coordenada más es una columna, no un slug concatenado.
--
-- QUÉ SE MANTIENE IGUAL QUE EN `guia_purchases` (y por qué)
--  · El entitlement se ancla al EMAIL, no al user_id. El checkout es email-first:
--    no exige cuenta, así que al momento de otorgar el acceso el user_id todavía
--    no existe. El email es lo único que el comprador tipeó, lo único que viaja
--    en la metadata de Rebill y lo único que el webhook puede resolver sin
--    inventar una cuenta. Para DESCARGAR sí hace falta sesión con esa misma
--    casilla — el magic-link de Supabase es la prueba de que quien baja el PDF
--    controla el mail que pagó. `user_id` se completa después, perezosamente, la
--    primera vez que el comprador entra a su biblioteca.
--  · RLS habilitada SIN políticas → sólo service role. Las páginas de cuenta y la
--    ruta de descarga leen con el service client después de validar la sesión
--    server-side; nadie consulta esta tabla desde el browser.
--  · Compra única: no otorga tier, no vence, no se cancela. Se compró o no.
--
-- Aplicada vía MCP el 2026-08-29.

create table if not exists public.informe_purchases (
  id                 bigint generated always as identity primary key,
  created_at         timestamptz not null default now(),

  -- Qué producto del catálogo. Hoy sólo 'informe-productivo', pero la columna
  -- existe desde el día uno: el segundo producto por variante (por categoría,
  -- por cuenca, por consignataria) entra sin migración.
  producto_slug      text not null,

  -- Qué variante de ese producto. Para el informe productivo es
  -- '<slugProvincia>/<slugDepartamento>' (ej. 'corrientes/mercedes'), armado con
  -- los mismos slugs que emite el panel — así la ruta de descarga
  -- /api/informes/[provincia]/[departamento] mapea 1:1 contra esta fila sin
  -- tabla de traducción. Es TEXTO GENÉRICO a propósito, y no dos columnas
  -- provincia/departamento: el próximo producto por variante puede no ser
  -- geográfico, y un entitlement no debería saber de geografía.
  variante_slug      text not null,

  -- Nombre humano de la variante ('Mercedes, Corrientes'). Denormalizado a
  -- propósito: el backoffice de facturación y el detalle de la factura tienen que
  -- poder decir QUÉ se vendió sin cargar el panel de 563 KB ni depender de que el
  -- slug siga existiendo en la próxima edición del dataset.
  variante_label     text,

  email              text not null,
  user_id            uuid,

  status             text not null default 'paid' check (status in ('paid','refunded')),

  -- Precio efectivamente cobrado, en ARS (Rebill factura en ARS). Se guarda el
  -- monto de la compra y no se lee del catálogo al mostrarlo: el catálogo es
  -- código y cambia con un deploy; lo que el comprador pagó no cambia nunca.
  amount_ars         numeric,

  rebill_payment_id  text,
  rebill_customer_id text,
  purchased_at       timestamptz not null default now(),

  -- Snapshot del CONTENIDO al momento de la compra. El informe se genera desde un
  -- dataset con fecha (`META.generado` del panel productivo) y desde una versión
  -- del generador. Sin esto, cuando el comprador vuelva en marzo y baje un PDF
  -- distinto del que leyó, no hay forma de saber qué leyó. Regla heredada de la
  -- guía: una edición nueva NO se le cobra de nuevo a quien ya compró, así que
  -- estas dos columnas son historia, no control de acceso.
  dataset_generado   date,
  generador_version  text,

  download_count     integer not null default 0,
  last_downloaded_at timestamptz,

  -- Cuándo salió el mail de entrega. No es decorativo: Resend topea en 100
  -- envíos/día en el plan free (`src/lib/email-limits.ts`) y el mail de entrega es
  -- best-effort dentro del webhook — si el cupo se agotó, el entitlement queda
  -- otorgado y el comprador no se entera. Con esta columna, "quiénes pagaron y
  -- nunca recibieron el mail" es una consulta de una línea en vez de un cruce a
  -- mano contra el panel de Resend.
  delivery_email_at  timestamptz,

  refunded_at        timestamptz,
  refund_motivo      text,

  -- FACTURACIÓN. En `guia_purchases` esto vive dentro de `meta.facturacion`, y por
  -- eso hoy no se puede contestar "¿cuáles facturas quedan por emitir?" sin leer
  -- jsonb a ojo. Acá son columnas: los datos que cargó el comprador y el acuse de
  -- que Memola Medios SAS ya emitió. La emisión es manual (no hay integración con
  -- ARCA en este repo), así que el estado tiene que vivir en la base o no vive en
  -- ningún lado.
  factura_razon_social text,
  factura_cuit         text,
  factura_tipo         text check (factura_tipo in ('A','B')),
  factura_numero       text,
  factura_emitida_at   timestamptz,

  meta               jsonb
);

-- La clave del entitlement: un comprador, un producto, una variante. Sostiene el
-- ON CONFLICT del webhook, que es lo que hace que un reintento de Rebill o una
-- segunda compra del mismo departamento no dupliquen el acceso.
--
-- Índice PLANO sobre las tres columnas, igual que en `guia_purchases` y por la
-- misma razón: ON CONFLICT (producto_slug, variante_slug, email) exige un único
-- exacto sobre esas columnas — uno funcional sobre lower(email) NO lo satisface.
-- El email se normaliza a minúsculas en el código ANTES de escribir (checkout y
-- webhook), que es donde ya se normaliza hoy.
create unique index if not exists informe_purchases_producto_variante_email_uidx
  on public.informe_purchases (producto_slug, variante_slug, email);

-- "Qué compró esta persona" — la consulta de /cuenta/informes, que busca por el
-- email de la sesión.
create index if not exists informe_purchases_email_idx
  on public.informe_purchases (lower(email));

create index if not exists informe_purchases_user_idx
  on public.informe_purchases (user_id) where user_id is not null;

-- "Qué se vendió y cuándo" — backoffice y conteo de ventas por producto.
create index if not exists informe_purchases_producto_idx
  on public.informe_purchases (producto_slug, created_at desc);

-- "Qué variantes se venden" — con 455 variantes esto deja de ser curiosidad y pasa
-- a ser la señal de qué zonas conviene enriquecer primero.
create index if not exists informe_purchases_variante_idx
  on public.informe_purchases (producto_slug, variante_slug);

-- Cola de facturas pendientes: pagó, pidió factura, todavía no se emitió.
-- Parcial a propósito — la cola es corta y la tabla no.
create index if not exists informe_purchases_factura_pendiente_idx
  on public.informe_purchases (created_at)
  where status = 'paid' and factura_cuit is not null and factura_emitida_at is null;

-- Cola de entregas caídas: pagó y nunca le salió el mail (cupo de Resend agotado,
-- caída del proveedor, o webhook que otorgó sin llegar a mandar).
create index if not exists informe_purchases_entrega_pendiente_idx
  on public.informe_purchases (created_at)
  where status = 'paid' and delivery_email_at is null;

alter table public.informe_purchases enable row level security;

comment on table public.informe_purchases is
  'Compras one-time de productos generados por variante (primero: informe productivo por departamento, 455 variantes). El entitlement se ancla al email del comprador Y a la variante; la descarga va por ruta gated con el PDF estampado. Service-role only.';
comment on column public.informe_purchases.variante_slug is
  'Coordenada del entregable dentro del producto. Informe productivo: "<provincia>/<departamento>", los mismos slugs del panel productivo.';
comment on column public.informe_purchases.email is
  'La llave del entitlement. El checkout es email-first (sin cuenta); para descargar hace falta sesión con esta misma casilla.';
comment on column public.informe_purchases.dataset_generado is
  'Fecha del dataset con el que se generó el informe comprado (META.generado del panel). Historia, no control de acceso: una edición nueva no se cobra de nuevo.';
comment on column public.informe_purchases.delivery_email_at is
  'Cuándo salió el mail de entrega. Null con status=paid = pagó y no se enteró: cupo de Resend agotado o envío caído.';
comment on column public.informe_purchases.factura_emitida_at is
  'Acuse de emisión manual por Memola Medios SAS (CUIT 30-71863222-2). No hay integración con ARCA en este repo: si el estado no vive acá, no vive en ningún lado.';

