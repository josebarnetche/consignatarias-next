-- Marcas del productor: "estuve en este remate" / "sigo a esta consignataria".
-- Valor que el usuario free aporta (asistencia + confianza) y entrada del karma.
create table if not exists public.remate_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  remate_id text,
  consignataria_slug text,
  mark_type text not null check (mark_type in ('attended','following','trust')),
  created_at timestamptz not null default now()
);

create unique index if not exists remate_marks_uniq
  on public.remate_marks (user_id, mark_type, coalesce(remate_id,''), coalesce(consignataria_slug,''));

create index if not exists remate_marks_user_idx on public.remate_marks (user_id);

alter table public.remate_marks enable row level security;

drop policy if exists "remate_marks own select" on public.remate_marks;
create policy "remate_marks own select" on public.remate_marks
  for select using (auth.uid() = user_id);
drop policy if exists "remate_marks own insert" on public.remate_marks;
create policy "remate_marks own insert" on public.remate_marks
  for insert with check (auth.uid() = user_id);
drop policy if exists "remate_marks own delete" on public.remate_marks;
create policy "remate_marks own delete" on public.remate_marks
  for delete using (auth.uid() = user_id);
