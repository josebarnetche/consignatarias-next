-- Sprint 1B: add "persona detrás del consignatario" fields to public.consignatarias.
--
-- Positioning: the consignatario is the unit of value on the platform. To
-- support that, every profile needs human dimensions beyond company name +
-- logo: who the referente is, what they specialize in, how long they've been
-- doing it, where they operate. These are the fields the profile page will
-- hero in Sprint 2.
--
-- All optional — existing 86 rows stay valid. UI must render fallback copy
-- ("Sin información disponible") until manually filled per consignataria.

alter table public.consignatarias
  add column if not exists region_operativa text,        -- "NEA", "Pampa Húmeda", "Patagonia", custom — free text but coordinated with category dropdown in admin
  add column if not exists especialidad text,            -- 'cria' | 'invernada' | 'general' | 'reproductores' | 'lechera' | 'mixto' — same vocabulary as remates.type
  add column if not exists anos_oficio integer,          -- años desde la fundación o desde que el referente opera (cualquiera sirve, lo importante es el orden de magnitud)
  add column if not exists bio_referente text,           -- 1-3 párrafos: quién opera, qué busca, qué lo distingue. NO marketing copy.
  add column if not exists referente_nombre text,        -- nombre + apellido de la persona física (Juan Pérez, Roldán Roldán)
  add column if not exists referente_cargo text,         -- "Titular", "Socio", "Director comercial", etc.
  add column if not exists foto_referente_url text;      -- URL a la foto. Por ahora supabase storage o link público (sitio oficial, LinkedIn).

-- Indexes only where it pays off
create index if not exists consignatarias_especialidad_idx on public.consignatarias (especialidad) where especialidad is not null;
create index if not exists consignatarias_region_operativa_idx on public.consignatarias (region_operativa) where region_operativa is not null;

-- Document the vocabulary so admin tooling stays consistent
comment on column public.consignatarias.especialidad is 'One of: cria | invernada | general | reproductores | lechera | mixto. Mirrors remates.type for cross-filtering.';
comment on column public.consignatarias.region_operativa is 'Free text but should be one of the standard cattle regions: NEA, NOA, Pampa Humeda, Mesopotamia, Patagonia, Cuyo, Centro.';
comment on column public.consignatarias.foto_referente_url is 'Photograph of the referente (the person, not the company logo). Distinct from logo_url.';
