-- Skivvies: the Butt Count (already applied to the "Miscellaneous" Supabase project on 31 Oct 2026; kept here for the record).
-- people = individual people who actually RECEIVED new underwear that year, each counted once.
create table if not exists public.skivvies_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
create table if not exists public.skivvies_butt_count (
  year int primary key check (year between 2026 and 2100),
  people int not null default 0 check (people >= 0 and people < 1000000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create table if not exists public.skivvies_butt_count_log (
  id bigserial primary key, year int not null, old_people int, new_people int not null,
  changed_at timestamptz not null default now(), changed_by uuid
);
create or replace function public.is_skivvies_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.skivvies_admins where user_id = auth.uid());
$$;
revoke all on function public.is_skivvies_admin() from public, anon;
grant execute on function public.is_skivvies_admin() to authenticated;
create or replace function public.skivvies_butt_count_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now(); new.updated_by := auth.uid();
  insert into public.skivvies_butt_count_log(year, old_people, new_people, changed_by)
  values (new.year, case when tg_op = 'UPDATE' then old.people end, new.people, auth.uid());
  return new;
end $$;
revoke execute on function public.skivvies_butt_count_stamp() from public, anon, authenticated;
create trigger skivvies_butt_count_stamp before insert or update on public.skivvies_butt_count
for each row execute function public.skivvies_butt_count_stamp();
alter table public.skivvies_admins enable row level security;
alter table public.skivvies_butt_count enable row level security;
alter table public.skivvies_butt_count_log enable row level security;
create policy "admins see themselves" on public.skivvies_admins for select to authenticated using (user_id = auth.uid());
create policy "anyone can read the count" on public.skivvies_butt_count for select to anon, authenticated using (true);
create policy "admins add a year" on public.skivvies_butt_count for insert to authenticated with check (public.is_skivvies_admin());
create policy "admins change the count" on public.skivvies_butt_count for update to authenticated using (public.is_skivvies_admin()) with check (public.is_skivvies_admin());
create policy "admins read the history" on public.skivvies_butt_count_log for select to authenticated using (public.is_skivvies_admin());
grant select on public.skivvies_butt_count to anon, authenticated;
grant insert, update on public.skivvies_butt_count to authenticated;
grant select on public.skivvies_butt_count_log, public.skivvies_admins to authenticated;
insert into public.skivvies_butt_count(year, people) values (2026, 0) on conflict do nothing;
