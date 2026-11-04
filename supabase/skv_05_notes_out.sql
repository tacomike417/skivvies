-- skv_05_notes_out.sql (4 Nov 2026, Mike) -- Miscellaneous project
-- "Notes that went out" strip in the Skivvies group on Recovery Misfits.
-- Public: only the note, how it's signed, and how many packs. Never who wrote it.
create or replace function public.skivvies_notes_out()
returns table(id bigint, body text, sign_as text, used_count int)
language sql stable security definer set search_path to 'public' as $$
  select id, body, sign_as, used_count from skivvies_notes
  where status = 'approved' and used_count >= 1
  order by last_used_at desc nulls last limit 12
$$;
revoke all on function public.skivvies_notes_out() from public;
grant execute on function public.skivvies_notes_out() to anon, authenticated;
