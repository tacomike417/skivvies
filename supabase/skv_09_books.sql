-- Skivvies books (Mike, 6 Nov 2026). Miscellaneous project.
-- Stock, hand-outs, receipts, donated underwear (in-kind), the donor line, and the dashboard numbers.
-- Everything here is admin-only (is_skivvies_admin()). Safe to run more than once.
--
-- The rules Mike set:
--   * Two piles of underwear: BOUGHT (with donation money) and DONATED (in-kind, kept separate for the books).
--   * The line: every $20 online gift = 1 place in line (guy or girl doesn't matter). When the count of
--     bought pairs handed out reaches a donor's first place, they get ONE email. Donated pairs never move the line.
--   * The big homepage counter stays on donations (skivvies_counter), not on hand-outs.

-- ---------- receipts: underwear bought with donation money ----------
create table if not exists public.skivvies_purchases (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  bought_on date not null default current_date,
  store text not null check (char_length(store) between 1 and 80),
  amount_cents int not null check (amount_cents >= 0 and amount_cents <= 100000000),
  pairs int not null check (pairs >= 0 and pairs <= 100000),
  receipt_path text,              -- file in the private bucket (photo or screenshot)
  note text check (note is null or char_length(note) <= 300),
  created_by uuid default auth.uid()
);
alter table public.skivvies_purchases enable row level security;
drop policy if exists "admins all purchases" on public.skivvies_purchases;
create policy "admins all purchases" on public.skivvies_purchases for all to authenticated
  using (public.is_skivvies_admin()) with check (public.is_skivvies_admin());
grant select, insert, update, delete on public.skivvies_purchases to authenticated;
grant usage on sequence public.skivvies_purchases_id_seq to authenticated;

-- ---------- donated underwear (in-kind), separate from money ----------
create table if not exists public.skivvies_inkind (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  gift_date date not null default current_date,
  donor_name text not null check (char_length(donor_name) between 1 and 80),
  description text not null check (char_length(description) between 1 and 300),  -- "12 pairs new men's boxer briefs"
  pairs int not null check (pairs >= 0 and pairs <= 100000),
  est_value_cents int check (est_value_cents is null or (est_value_cents >= 0 and est_value_cents <= 100000000)), -- for the books only, never on the letter
  photo_path text,
  created_by uuid default auth.uid()
);
alter table public.skivvies_inkind enable row level security;
drop policy if exists "admins all inkind" on public.skivvies_inkind;
create policy "admins all inkind" on public.skivvies_inkind for all to authenticated
  using (public.is_skivvies_admin()) with check (public.is_skivvies_admin());
grant select, insert, update, delete on public.skivvies_inkind to authenticated;
grant usage on sequence public.skivvies_inkind_id_seq to authenticated;

-- ---------- hand-outs ----------
create table if not exists public.skivvies_handouts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  handed_on date not null default current_date,
  pairs int not null check (pairs between 1 and 10000),
  source text not null check (source in ('bought','donated')),
  note text check (note is null or char_length(note) <= 300),
  created_by uuid
);
alter table public.skivvies_handouts enable row level security;
drop policy if exists "admins read handouts" on public.skivvies_handouts;
create policy "admins read handouts" on public.skivvies_handouts for select to authenticated using (public.is_skivvies_admin());
drop policy if exists "admins delete handouts" on public.skivvies_handouts;
create policy "admins delete handouts" on public.skivvies_handouts for delete to authenticated using (public.is_skivvies_admin());
grant select, delete on public.skivvies_handouts to authenticated;
-- inserts go through the skivvies-handout edge function (service role) so the donor emails go out in the same step

-- ---------- the line + Stripe fees on gifts ----------
alter table public.skivvies_gifts add column if not exists notified_at timestamptz;  -- "your pair went out" email sent
alter table public.skivvies_gifts add column if not exists fee_cents int;            -- Stripe's cut, filled in from Stripe

-- Each paid LIVE gift's place in line: 1 place per pack, in the order they paid.
create or replace view public.skivvies_line with (security_invoker = true) as
  select id, paid_at, qty, donor_email, notified_at,
         coalesce(sum(qty) over (order by paid_at, id rows between unbounded preceding and 1 preceding), 0) + 1 as line_start,
         sum(qty) over (order by paid_at, id) as line_end
  from public.skivvies_gifts
  where mode = 'live' and paid;
revoke all on public.skivvies_line from anon, public;
grant select on public.skivvies_line to authenticated;  -- RLS on skivvies_gifts still applies: admins only

-- ---------- private files (receipts, in-kind photos) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('skivvies-private', 'skivvies-private', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
  on conflict (id) do nothing;
drop policy if exists "skivvies admin files read" on storage.objects;
drop policy if exists "skivvies admin files write" on storage.objects;
drop policy if exists "skivvies admin files delete" on storage.objects;
create policy "skivvies admin files read" on storage.objects for select to authenticated
  using (bucket_id = 'skivvies-private' and public.is_skivvies_admin());
create policy "skivvies admin files write" on storage.objects for insert to authenticated
  with check (bucket_id = 'skivvies-private' and public.is_skivvies_admin());
create policy "skivvies admin files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'skivvies-private' and public.is_skivvies_admin());

-- ---------- the dashboard, one call ----------
create or replace function public.skivvies_books(p_from date default null, p_to date default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not public.is_skivvies_admin() then raise exception 'admins only'; end if;
  with g as (
    select * from skivvies_gifts where mode = 'live' and paid
      and (p_from is null or paid_at >= p_from) and (p_to is null or paid_at < p_to + 1)
  ),
  c as (select * from skivvies_cash_gifts where (p_from is null or gift_date >= p_from) and (p_to is null or gift_date <= p_to)),
  p as (select * from skivvies_purchases where (p_from is null or bought_on >= p_from) and (p_to is null or bought_on <= p_to)),
  k as (select * from skivvies_inkind where (p_from is null or gift_date >= p_from) and (p_to is null or gift_date <= p_to)),
  h as (select * from skivvies_handouts where (p_from is null or handed_on >= p_from) and (p_to is null or handed_on <= p_to)),
  allh as (select source, coalesce(sum(pairs),0) n from skivvies_handouts group by source)
  select json_build_object(
    'online_cents',   coalesce((select sum(amount_cents) from g), 0),
    'online_count',   (select count(*) from g),
    'fee_cents',      coalesce((select sum(fee_cents) from g), 0),
    'fees_missing',   (select count(*) from g where fee_cents is null),
    'cash_cents',     coalesce((select sum(amount_cents) from c), 0),
    'cash_count',     (select count(*) from c),
    'spent_cents',    coalesce((select sum(amount_cents) from p), 0),
    'pairs_bought',   coalesce((select sum(pairs) from p), 0),
    'pairs_donated',  coalesce((select sum(pairs) from k), 0),
    'inkind_count',   (select count(*) from k),
    'inkind_value_cents', coalesce((select sum(est_value_cents) from k), 0),
    'given_bought',   coalesce((select sum(pairs) from h where source = 'bought'), 0),
    'given_donated',  coalesce((select sum(pairs) from h where source = 'donated'), 0),
    -- stock is lifetime, not date-ranged
    'stock_bought',   coalesce((select sum(pairs) from skivvies_purchases), 0) - coalesce((select n from allh where source = 'bought'), 0),
    'stock_donated',  coalesce((select sum(pairs) from skivvies_inkind), 0) - coalesce((select n from allh where source = 'donated'), 0),
    -- the line (lifetime)
    'line_given',     coalesce((select n from allh where source = 'bought'), 0),
    'line_total',     coalesce((select sum(qty) from skivvies_gifts where mode = 'live' and paid), 0),
    'line_waiting',   (select count(*) from skivvies_gifts where mode = 'live' and paid and notified_at is null and donor_email is not null)
  ) into r;
  return r;
end $$;
revoke all on function public.skivvies_books(date, date) from public;
grant execute on function public.skivvies_books(date, date) to authenticated;

-- ---------- homepage counter: in-kind pairs count as donations too ----------
-- counter = hand adjustments + online ($20 = 2 guys / 1 woman) + cash/checks ($20 = 2) + donated pairs logged in admin
create or replace function public.skivvies_counter()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'hand',   coalesce((select sum(people) from skivvies_butt_count), 0),
    'gifts',  coalesce((select sum(case when kind = 'men' then 2 * qty else qty end)
                        from skivvies_gifts where mode = 'live' and paid), 0),
    'cash',   coalesce((select sum((amount_cents / 2000) * 2) from skivvies_cash_gifts), 0),
    'inkind', coalesce((select sum(pairs) from skivvies_inkind), 0),
    'since',  coalesce((select min(year) from skivvies_butt_count),
                       (select extract(year from min(paid_at))::int from skivvies_gifts where mode = 'live' and paid))
  )
$$;
revoke all on function public.skivvies_counter() from public;
grant execute on function public.skivvies_counter() to anon, authenticated;
