-- Sprint 3: consignataria_reviews — productor-submitted reviews of consignatarias.
--
-- Positioning: "el consignatario importa" only convinces if there are real
-- productores vouching for him. Boca a boca capturado: even 3-5 reviews per
-- consignataria materially shifts credibility versus a generic profile page.
--
-- Submission flow (v1, simplified — full email verify is a follow-up):
--   1. Anonymous visitor fills form on /consignatarias/[slug] (name, email,
--      role, provincia, rating 1-5, body 30-2000 chars).
--   2. Row inserts with status='pending' + ip_hash (soft anti-abuse).
--   3. Admin sees pending rows at /admin/reviews, approves or rejects.
--   4. Approved rows render publicly on the profile page.
--
-- Anti-abuse rails (RLS + app-level):
--   - Unique (consignataria_slug, submitter_email) so one email = one review
--     per consignataria. A second submission updates instead.
--   - ip_hash is SHA-256(ip + secret) — never the raw IP, never reversible.
--     Used to spot bursts ("5 reviews from same IP in 1h → check").
--   - All writes go through service-role DAL helpers that rate-limit.
--   - RLS: public can SELECT only approved rows; service role does the rest.

create table if not exists public.consignataria_reviews (
  id uuid primary key default gen_random_uuid(),
  consignataria_slug text not null references public.consignatarias(canonical_slug) on delete cascade,

  submitter_name text not null check (char_length(submitter_name) between 2 and 80),
  submitter_email text not null check (submitter_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  submitter_role text check (submitter_role in ('productor', 'asesor', 'comprador', 'otro')),
  submitter_provincia text,

  rating int2 not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 30 and 2000),

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,

  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text,

  unique (consignataria_slug, submitter_email)
);

create index if not exists consignataria_reviews_slug_status_idx
  on public.consignataria_reviews (consignataria_slug, status);

create index if not exists consignataria_reviews_status_created_idx
  on public.consignataria_reviews (status, created_at desc);

alter table public.consignataria_reviews enable row level security;

-- Public read: approved only.
drop policy if exists "reviews_select_approved" on public.consignataria_reviews;
create policy "reviews_select_approved"
  on public.consignataria_reviews
  for select
  to anon, authenticated
  using (status = 'approved');

-- All writes via service role (DAL handles rate-limit + insert/update).
-- We do NOT grant anon/auth direct INSERT to avoid email enumeration via
-- duplicate-key error responses.

comment on table public.consignataria_reviews is 'Productor reviews of consignatarias. Public reads are gated to status=approved. Writes go through service-role DAL helpers that handle rate-limiting + ip_hash anti-abuse.';
comment on column public.consignataria_reviews.submitter_role is 'One of productor | asesor | comprador | otro. Optional but helpful for context on the review display.';
comment on column public.consignataria_reviews.ip_hash is 'SHA-256(ip + REVIEW_IP_PEPPER). Never reversible. Used to spot submission bursts.';
