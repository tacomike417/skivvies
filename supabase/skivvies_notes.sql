-- skivvies_notes.sql (2 Nov 2026, Mike) -- Miscellaneous project
-- Notes written in the Skivvies group on Recovery Misfits land here as "pending".
-- Mike reads them in /admin. Approve sends it up in the group (edge function skivvies-note);
-- Decline just marks it. The writer's RM name is kept so they can be told, never shown publicly.
create table if not exists public.skivvies_notes (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  rm_user_id  uuid not null,
  rm_handle   text not null,
  body        text not null check (char_length(body) between 2 and 600),
  sign_as     text check (sign_as is null or char_length(sign_as) <= 40),
  status      text not null default 'pending' check (status in ('pending','approved','declined')),
  handled_at  timestamptz,
  rm_post_id  uuid
);
create index if not exists skivvies_notes_status on public.skivvies_notes (status, created_at desc);
alter table public.skivvies_notes enable row level security;
drop policy if exists "admins read notes" on public.skivvies_notes;
create policy "admins read notes" on public.skivvies_notes for select using (is_skivvies_admin());
drop policy if exists "admins update notes" on public.skivvies_notes;
create policy "admins update notes" on public.skivvies_notes for update using (is_skivvies_admin());
-- no insert policy: only the edge function (service role) writes notes in
