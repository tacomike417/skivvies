-- Skivvies: "We need underwear" requests (applied to the Miscellaneous Supabase project 31 Oct 2026; kept for the record).
-- The email ping is the edge function "skivvies-ping" in the recoverymisfits project (it already has RESEND_API_KEY).
create table if not exists public.skivvies_requests (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  place_name text not null check (char_length(place_name) between 2 and 120),
  place_type text not null check (place_type in ('Sober house','Treatment program','Shelter','Other')),
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  contact text not null check (char_length(contact) between 5 and 120),
  people_per_month int check (people_per_month is null or (people_per_month between 1 and 5000)),
  who text check (who is null or who in ('Men','Women','Both')),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'new' check (status in ('new','handled')),
  handled_at timestamptz
);
alter table public.skivvies_requests enable row level security;
create policy "anyone can send a request" on public.skivvies_requests for insert to anon, authenticated with check (status = 'new' and handled_at is null);
create policy "admins read requests" on public.skivvies_requests for select to authenticated using (public.is_skivvies_admin());
create policy "admins update requests" on public.skivvies_requests for update to authenticated using (public.is_skivvies_admin()) with check (public.is_skivvies_admin());
grant insert on public.skivvies_requests to anon, authenticated;
grant usage on sequence public.skivvies_requests_id_seq to anon, authenticated;
grant select, update on public.skivvies_requests to authenticated;
