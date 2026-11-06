-- Skivvies: cash & check gifts logged in admin + donation report (Mike, 5 Nov 2026)
-- Mike types: who gave it, how much, what day. Only the Skivvies admin can read or write these.
-- Counter rule for cash/checks: every $20 = 2 butts (counted per gift, leftover dollars under $20 don't add).
create table if not exists public.skivvies_cash_gifts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  gift_date date not null default current_date,
  donor_name text not null check (char_length(donor_name) between 1 and 80),
  amount_cents int not null check (amount_cents > 0 and amount_cents <= 100000000),
  created_by uuid default auth.uid()
);
alter table public.skivvies_cash_gifts enable row level security;
drop policy if exists "admins read cash" on public.skivvies_cash_gifts;
drop policy if exists "admins add cash" on public.skivvies_cash_gifts;
drop policy if exists "admins delete cash" on public.skivvies_cash_gifts;
create policy "admins read cash" on public.skivvies_cash_gifts for select to authenticated using (public.is_skivvies_admin());
create policy "admins add cash" on public.skivvies_cash_gifts for insert to authenticated with check (public.is_skivvies_admin());
create policy "admins delete cash" on public.skivvies_cash_gifts for delete to authenticated using (public.is_skivvies_admin());
grant select, insert, delete on public.skivvies_cash_gifts to authenticated;
grant usage on sequence public.skivvies_cash_gifts_id_seq to authenticated;

-- The big counter: hand count + paid live online gifts ($20 = 2 guys or 1 woman) + cash/checks ($20 = 2)
create or replace function public.skivvies_counter()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'hand',  coalesce((select sum(people) from skivvies_butt_count), 0),
    'gifts', coalesce((select sum(case when kind = 'men' then 2 * qty else qty end)
                       from skivvies_gifts where mode = 'live' and paid), 0),
    'cash',  coalesce((select sum((amount_cents / 2000) * 2) from skivvies_cash_gifts), 0),
    'since', coalesce((select min(year) from skivvies_butt_count),
                      (select extract(year from min(paid_at))::int from skivvies_gifts where mode = 'live' and paid))
  )
$$;
revoke all on function public.skivvies_counter() from public;
grant execute on function public.skivvies_counter() to anon, authenticated;
