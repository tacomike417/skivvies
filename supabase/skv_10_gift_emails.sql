-- skv_10: donor thank-you email + tax letter PDF + "new gift" heads-up to Mike (13 Nov 2026)
-- ALREADY RUN on the Miscellaneous project. Kept here for the record.
alter table public.skivvies_gifts
  add column if not exists legal_name  text,                                    -- name on the card, from Stripe. For the tax letter only, never shown publicly.
  add column if not exists receipt_key uuid not null default gen_random_uuid(), -- unguessable key in the PDF link
  add column if not exists thanked_at  timestamptz,                             -- donor thank-you email sent
  add column if not exists alerted_at  timestamptz;                             -- "new gift" email to Mike sent
create unique index if not exists skivvies_gifts_receipt_key on public.skivvies_gifts (receipt_key);
