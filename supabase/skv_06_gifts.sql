-- Skivvies: gifts (5 Nov 2026, Mike). Miscellaneous project.
-- $20 per pack, guy or girl, any number, one-time or monthly, through Stripe Checkout on the
-- Cornerstones Recovery, Inc. Stripe account. Name or anonymous, optional message.
-- Messages show on the wall only after Mike approves them in skivvies.org/admin.
-- Rows are written ONLY by the skivvies-give edge function (service role). Nobody can insert from the browser.
create table if not exists public.skivvies_gifts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  stripe_session text unique not null,
  mode text not null check (mode in ('test','live')),
  kind text not null check (kind in ('men','women')),
  qty int not null check (qty between 1 and 10000),
  monthly boolean not null default false,
  amount_cents int not null check (amount_cents > 0),
  donor_name text check (donor_name is null or char_length(donor_name) <= 40),
  anonymous boolean not null default true,
  message text check (message is null or char_length(message) <= 280),
  message_status text not null default 'none' check (message_status in ('none','pending','approved','hidden')),
  paid boolean not null default false,
  paid_at timestamptz,
  donor_email text            -- private: never shown anywhere public
);
alter table public.skivvies_gifts enable row level security;
create policy "admins read gifts" on public.skivvies_gifts for select to authenticated using (public.is_skivvies_admin());
create policy "admins update gifts" on public.skivvies_gifts for update to authenticated using (public.is_skivvies_admin()) with check (public.is_skivvies_admin());
grant select, update on public.skivvies_gifts to authenticated;

-- The public wall: paid, approved messages only. No emails, no amounts beyond packs.
create or replace function public.skivvies_wall() returns table (who text, kind text, qty int, monthly boolean, message text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select case when anonymous or donor_name is null then 'Anonymous' else donor_name end,
         kind, qty, monthly, message, paid_at
  from public.skivvies_gifts
  where paid and mode = 'live' and message_status = 'approved'
  order by paid_at desc limit 40;
$$;
revoke all on function public.skivvies_wall() from public;
grant execute on function public.skivvies_wall() to anon, authenticated;
