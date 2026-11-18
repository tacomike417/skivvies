-- 18 Nov 2026 (Mike): email address on donated-underwear entries so the thank-you letter can be emailed.
-- Already applied to the Miscellaneous project.
alter table public.skivvies_inkind add column if not exists donor_email text check (donor_email is null or char_length(donor_email) <= 200);
alter table public.skivvies_inkind add column if not exists letter_sent_at timestamptz;
