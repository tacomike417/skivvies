-- Skivvies Count goes up on its own for online gifts (Mike, 5 Nov 2026)
-- Big counter = hand-entered butts (cash, checks, donated underwear: skivvies_butt_count)
--             + paid LIVE Stripe gifts: $20 covers 2 guys or 1 woman.
-- Test-mode gifts never count. Safe to run more than once.
create or replace function public.skivvies_counter()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'hand',  coalesce((select sum(people) from skivvies_butt_count), 0),
    'gifts', coalesce((select sum(case when kind = 'men' then 2 * qty else qty end)
                       from skivvies_gifts where mode = 'live' and paid), 0),
    'since', coalesce((select min(year) from skivvies_butt_count),
                      (select extract(year from min(paid_at))::int from skivvies_gifts where mode = 'live' and paid))
  )
$$;
revoke all on function public.skivvies_counter() from public;
grant execute on function public.skivvies_counter() to anon, authenticated;
