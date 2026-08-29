-- proveedor_contactos — datos de contacto de los proveedores de la guía.
--
-- POR QUÉ NO ESTÁN EN EL CÓDIGO
-- **Este repositorio es público.** El catálogo `src/lib/proveedores.ts` lleva lo que se
-- publica (empresa, rubro, descripción) y eso puede vivir en el código sin problema. El
-- email y el teléfono de la persona que atiende, no: quedarían indexados en GitHub, que
-- es exactamente el scraping que se evita al no publicarlos en el HTML.
--
-- La conformidad que dieron fue para aparecer con el nombre de la empresa y recibir
-- consultas. No para que su casilla quede en un repositorio abierto.
--
-- Se lee sólo desde el servidor (`/api/proveedores/contacto`), al derivar un lead.
-- RLS habilitada sin políticas → service role únicamente.
--
-- Aplicada vía MCP el 2026-08-29. Las filas se cargan a mano: son pocas y cada una
-- necesita su respaldo de consentimiento.

create table if not exists public.proveedor_contactos (
  slug              text primary key,
  contacto_nombre   text not null,
  contacto_email    text,
  contacto_telefono text,
  -- Respaldo de por qué figura en la guía: quién dio la conformidad, cuándo y por qué vía.
  consentimiento    text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.proveedor_contactos enable row level security;

comment on table public.proveedor_contactos is
  'Contacto de los proveedores de la guia. Fuera del codigo porque el repo es publico. Service-role only: se lee al derivar un lead y nunca llega al navegador.';
comment on column public.proveedor_contactos.consentimiento is
  'Quien dio la conformidad para figurar, cuando y por que via. Es el respaldo si pide salir o alguien pregunta por que aparece.';
