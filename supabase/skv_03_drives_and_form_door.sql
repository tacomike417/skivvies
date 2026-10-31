-- Skivvies: Undie Sunday sign-ups + both forms go through the "skivvies-form" edge function
-- (applied to the Miscellaneous Supabase project 31 Oct 2026; kept for the record).
create table if not exists public.skivvies_drives (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  organization text not null check (char_length(organization) between 2 and 120),
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  phone text not null check (char_length(phone) between 7 and 30),
  email text not null check (char_length(email) between 5 and 120),
  drive_date date,
  collecting_for text check (collecting_for is null or collecting_for in ('Men','Women','Both')),
  headcount int check (headcount is null or headcount between 1 and 100000),
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'new' check (status in ('new','handled')),
  handled_at timestamptz
);
alter table public.skivvies_drives enable row level security;
create policy "admins read drives" on public.skivvies_drives for select to authenticated using (public.is_skivvies_admin());
create policy "admins update drives" on public.skivvies_drives for update to authenticated using (public.is_skivvies_admin()) with check (public.is_skivvies_admin());
grant select, update on public.skivvies_drives to authenticated;
-- the public can no longer write straight into the requests table; skivvies-form does it with the service key
drop policy if exists "anyone can send a request" on public.skivvies_requests;
revoke insert on public.skivvies_requests from anon, authenticated;
revoke usage on sequence public.skivvies_requests_id_seq from anon, authenticated;
