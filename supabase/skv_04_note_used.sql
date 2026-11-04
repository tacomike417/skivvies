-- skv_04_note_used.sql (4 Nov 2026, Mike) -- Miscellaneous project
-- "Use this note" in /admin: a note can go in as many packs as Mike wants.
-- Each tap adds 1 here and the writer gets a Recovery Misfits DM.
alter table public.skivvies_notes add column if not exists used_count int not null default 0;
alter table public.skivvies_notes add column if not exists last_used_at timestamptz;
