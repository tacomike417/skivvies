# Skivvies — What's Left

One to-do list for the whole project. New to-dos go here.

## Now — social first (app waits)
- [ ] Set up email forwarding in Porkbun: hello@skivvies.org -> Gmail
- [ ] Create Facebook Page "Skivvies.org" (Nonprofit Organization), username skivvies.org
- [ ] Create Instagram @skivvies.org (fallback @skivviesorg), switch to Business, Nonprofit
- [ ] Link Instagram to the Facebook Page in Meta Business Suite
- [ ] Profile picture: skivvies wordmark + coral heart on cream (same on both)
- [ ] Paste bios (see marketing/BRAND.md)
- [ ] Connect both accounts to a scheduler (Buffer, like Recovery Misfits) so posts can be queued
- [ ] Make the first 3 launch graphics (see marketing/POST-QUEUE.md)

## Giving is built (v0.30, 5 Nov 2026), test mode until Mike says go
- Stripe: "Cornerstones Recovery, Inc" account (separate from Thunkbox), payouts to Huntington ending 7048.
- Edge function skivvies-give (Miscellaneous project, verify_jwt off): makes the Stripe Checkout page ($20 a pack,
  guy or girl, any number, one-time or monthly) and confirms it was paid. Secret: STRIPE_SECRET_KEY.
  sk_test_ key = test mode, sk_live_ key = real money. Table skivvies_gifts (supabase/skv_06_gifts.sql, applied).
- Cover Someone's Butt page: name or anonymous, optional message, Give button -> Stripe -> thank-you screen.
  Messages wait in admin (Gifts card) until "Put it on the wall". The wall shows live gifts only.
- Tax receipt: Stripe's own receipt email, with the 501(c)(3) / EIN / "no goods or services" line on the item.
- [ ] Mike: put the TEST secret key in, try a $20 test gift with card 4242 4242 4242 4242.
- [ ] Mike: Stripe Settings -> Customer emails -> turn on "Successful payments" (that's what sends receipts).
- [ ] When it looks right: swap in the LIVE secret key. That's the switch that opens real giving.

## Done 5 Nov 2026 (v0.28, v0.29)
- [x] v0.29: footer line "Skivvies is a program of Cornerstones Recovery, Inc., a 501(c)(3)..." with the EIN, so Stripe can match the site to the nonprofit.
- [x] Site copy: underwear and bras, not socks. $20 for a guy or a woman (Cover Someone's Butt page: both cards $20, totals work for both). Giving button still says "Giving opens soon" until Stripe is hooked up.

## Before taking money
- [ ] Open the Cornerstones Recovery Inc bank account
- [ ] Stripe on the Cornerstones account; wire checkout on the site
- [ ] Price the women's kit (underwear + bra) — check $20 actually covers it
- [ ] Confirm Cornerstones shows in the IRS Tax Exempt Organization Search; fix the 829/820 address typo
- [ ] Cornerstones board vote on Skivvies as a program (in the minutes) — in the Nov 2026 board packet
- [ ] Written OK from CommQuest leadership before naming Wilson Hall anywhere public
- [ ] Quick name check with Theodore Scribner on "Skivvies Project"
- [ ] Register "Skivvies" as a name with Ohio SOS (Form 534A, $39) — Cornerstones cleanup Step 6

## Site (skivvies.org) — later
- [x] Point skivvies.org DNS at GitHub Pages (repo: tacomike417/skivvies)
- [x] SEO: real page addresses (/about, /undie-sunday, ...), titles, descriptions, share previews, sitemap.xml, robots.txt (v0.9). After editing index.html, run `python3 build.py` before pushing
- [ ] Add skivvies.org to Google Search Console and submit sitemap.xml
- [x] Privacy page (/privacy) — have Theodore look it over with the Cornerstones paperwork
- [x] Skivvies Count shows the LIFETIME total (all years added); admin still enters one number per year
- [ ] GoatCounter: make the free account with code "skivvies" (counting code is already on the site)
- [ ] Turnstile spam check: get a Cloudflare Turnstile site key + secret; paste site key in index.html, secret into Supabase (Miscellaneous) as TURNSTILE_SECRET
- [ ] Optional: put RESEND_API_KEY in the Miscellaneous project too, so Skivvies email stops borrowing the Recovery Misfits one
- [ ] Gmail "Send mail as" hello@skivvies.org
- [ ] Amazon wish list + "Buy a pack" button (needs a P.O. box or other ship-to address)
- [x] "Need underwear?" request form (/request-underwear): saved in Supabase, listed on /admin, emails hello@skivvies.org (v0.10)
- [x] Admin page (skivvies.org/admin) to update the Butt Count — Supabase (Miscellaneous project), Mike only
- [x] Undie Sunday form: saved in Supabase, listed on /admin, emailed (v0.11)
- [ ] Flyer PDF + bulletin blurb download
- [ ] EIN and public contact email on About

## Funding deadlines (from the research doc)
- [ ] Walmart Spark Good Local Grants — Nov 30, 2026 (needs Spark Good + Deed account)
- [ ] Elks lodge grant via Massillon Elks #441 or Canton — Jan 20, 2027
- [ ] Sisters of Charity Foundation of Canton letter of inquiry — Feb 1, 2027 (Good Samaritan grants fit Cornerstones' size)
- [ ] Massillon Community Charitable Fund — opens Dec 28, due Feb 15, 2027
- [ ] Health Foundation of Greater Massillon — Mar 12, 2027

## Focus change (Nov 1, 2026)
- [ ] Skivvies = underwear and bras ONLY. Take socks out of the site copy, meta descriptions, manifest, and the socks images (boxers-socks, panties-socks). Socks are a bonus we don't talk about.

## Donation page — Mike's design (Nov 1, 2026). Build after bank + Stripe are live.
- [ ] $20 covers one person, guys or girls (quantity picker: 1 / 2 / 5 / 10)
- [ ] GoFundMe style: give with your name or Anonymous
- [ ] Optional message for the wall; messages wait in /admin until Mike approves them
- [ ] Email required (even for Anonymous) so the receipt can go out
- [ ] Instant tax receipt email from Cornerstones Recovery, Inc.: EIN 99-4095027, amount, date, "no goods or services were provided"
- [ ] Ideas still to decide: "cover the card fee" checkbox, monthly option, a "packs funded" number separate from the Skivvies Count

## Notes + Recovery Misfits connection — Mike's design (Nov 2, 2026). Mike designs the rest before we build.
- Landing page offers choices: donate, host an Undie Sunday, bring/buy underwear for us (storage TBD), OR write a note of encouragement for someone on day one (no money needed). No Amazon wish list.
- Notes get printed and tucked in with the underwear. Mike's printer: black-and-white laser, white paper (orange paper maybe later). Test sheet: ~/Downloads/Skivvies/Skivvies-Note-Cards-TEST.pdf (4-up quarter-page cards, black line-art logo, handwritten font). Later: a "Print notes" button in /admin that lays approved notes onto that sheet.
- An account is REQUIRED to write a note (cuts down on spam).
- Skivvies is an extension of Recovery Misfits: "Log in with Recovery Misfits" (skivvies.org signs in through Recovery Misfits' Supabase auth, same account both places). Recovery Misfits is the social side (profiles, messaging, a Skivvies group on the Porch); no new social network.
- Notes land in the Skivvies /admin as pending; Mike approves there. Approved notes auto-post into the Skivvies group on the Porch from a house account.
- One-way street: notes are anonymous to the person who gets the pack. If a recipient digs around and matches his note to its author, that's his call.
- Hooks to bring people back (ideas): "your note went out today," a one-tap anonymous thank-you from the recipient, live goals ("Friday intake: 30 notes"), personal counts (no zeros), sobriety-date reminder.
- Mike is working on an idea for the pack itself (googling first).

## Log in with Recovery Misfits — the flow (Nov 2, 2026)
1. skivvies.org: tap "Write a note".
2. Not logged in: sheet with "Log in with Recovery Misfits" (same username + password) or "New? Join Recovery Misfits, it's free" (Recovery Misfits sign-up, then straight back to Skivvies).
3. Write the note, pick username or Anonymous, send.
4. Lands in Skivvies /admin as pending. Mike approves.
5. Approved: goes on the print sheet, posts into the Skivvies group on the Porch, writer gets a Recovery Misfits notification ("Your note was approved").
6. "Come hang out" button on Skivvies opens the Skivvies group on the Porch.
- Tech: skivvies.org signs in against the Recovery Misfits Supabase project (same account). The note goes to the skivvies-form function with the login token; it checks the token with Recovery Misfits, then saves into the Skivvies (Miscellaneous) tables. Mike's /admin login stays as is.
- Decided: writing a note needs a Level 2 Recovery Misfits account (confirmed email).
- Decided: there is a Skivvies group on the Porch and every approved note goes there. Default until Mike says otherwise: a new "skivvies" house account posts them (keeps Anonymous notes anonymous). Keepers default: skivvies + recoverymisfits (no preference from Mike).

## Social side — ideas Mike likes (Nov 1, 2026). Mike designs it before we build.
- [ ] Pass it down: "Celebrate your date by covering someone's day one" — sobriety birthday = butts covered (5 years = 5 butts). Lead angle.
- [ ] A note in the pack: approved notes printed on a card tucked in with the underwear (see Notes section)
- [ ] "I just covered a butt" share card right after donating, with the running count (3-second test)
- [ ] Undie Sunday bragging rights: which church/group/team brought in the most (no zeros shown)
- [ ] Trading card idea (Nov 2): a pro-printed Skivvies card + the home-printed note, back to back in a sleeve + 3x4 toploader. NextDayFlyers: 2.5x3.5, 14 pt, gloss, full-color back, 500 for about $63; ONE design per order (min 25), so a collectible set = separate orders; ask for rounded corners. Mockup: ~/Downloads/Skivvies/Skivvies-TCG-Cards-TEST.pdf. Mike is doing this later.

## The Skivvies lane on Recovery Misfits — Mike's rule (Nov 2, 2026)
"We just don't want to confuse a user." Someone who joins through Skivvies stays focused on Skivvies. They must not get dropped into the whole Recovery Misfits neighborhood and forget why they came.
- Walking path: skivvies.org > "Write a note" > short screen + "Join the Skivvies crew" > Recovery Misfits log in / one sign-up screen (Level 2, confirmed email) > land straight in the Skivvies group, already joined > pinned "Write a note" > "Got it, once it's approved it's going in someone's pack."
- People who come in from Skivvies get NONE of the Recovery Misfits extras on the way in: no sober date step, no coin pop-ups, no Survival Pile, no walkthrough/tour, no Welcome Matt messages, no invite-your-friends step. Get in, get on, write a note.
- The sign-up screen they see is Skivvies-branded (Skivvies look and logo, "a free account on Recovery Misfits" in small words), so they know they're in the right spot.
- The Skivvies group on the Porch looks like Skivvies (orange, cream, the Skivvies logo and cartoon style), not like the rest of Recovery Misfits.
- Their notifications are about Skivvies (note approved, note went out). The rest of Recovery Misfits stays a quiet "look around" link, never pushed.


## The Skivvies lane — BUILT (Nov 2, 2026). Test it, then add the button on skivvies.org.
- Front door: recoverymisfits.org/skivvies (and /groups/skivvies goes there). Skivvies colors. New: username, password, email, 18+ tick, 6-digit code. Have an RM account: sign in and join.
- Lands in the Skivvies group. Skipped for lane sign-ups: sober date, coin, Survival Pile, tour, Welcome Matt, invite ask, the house "welcome" comment.
- In the group: "Write a note" (pinned card + the button where "Share here" was). Up to 600 characters, optional signature, 5 a day, 3 waiting at once.
- Notes land in skivvies.org/admin ("Notes for the packs"). Approve = it goes up in the group from the skivvies account and the writer gets a DM from skivvies. Decline = just marked. "Show approved notes" is the print list.
- Database: RM supabase/porch_76_skivvies_lane.sql; Miscellaneous supabase/skivvies_notes.sql + edge function skivvies-note. All applied.
- [ ] Mike: test it with a throwaway account (phone)
- [x] "Write a note" on skivvies.org (menu, hero, and a "No money? Write a note." section) → recoverymisfits.org/skivvies (v0.14). v0.15: tapping it opens a lightbox (what a note is + a Google-style "Continue with Recovery Misfits" button); the RM side is a "Sign in to continue to the Skivvies crew" screen: have an account or create one
- [ ] Later: a print sheet button for approved notes (B&W laser, white or orange paper)

## v0.18 (3 Nov 2026): the note gets written ON Skivvies — Mike's flow
skivvies.org > "I want to write a note" > sign in (or sign up) with Recovery Misfits > BACK on skivvies.org/write-a-note to write and send it > "Got it" thank-you on Skivvies, with "Write another one", "Back home" and a small "Come hang out with the Skivvies crew" link to the Porch group.
- recoverymisfits.org/skivvies?to=note sends them back after sign-in with the sign-in token in the #hash (never reaches a server). skivvies.org keeps it for that tab only and wipes it from the address. It lasts about an hour; after that the next note just hops through Recovery Misfits again (already signed in there, so it's instant). Draft is kept through the hop.
- Opening recoverymisfits.org/skivvies without ?to=note (e.g. the group link) still goes to the Porch group like before.
- Notes still go to the skivvies-note function and land in /admin as pending. Nothing changed there.
- [ ] Mike: test on the phone with a throwaway account.
- v0.19 (same night, Mike: "it flashes some pages and looks spammy"): signed in already = no Recovery Misfits screens at all, just a moment of Skivvies cream and you're on the note page (it adds you to the group quietly if you weren't in it). Sign-in/sign-up screens only show when needed, and after signing in there's no "Thanks for helping" stop, it hops straight back. "Not you?" on Skivvies opens the account picker (?switch=1).
- v0.20 (same night, Mike: "it should detect that i am logged in as tacomike417 and ask me to continue"): the note button says "Continue as <name>" with "Use a different account" under it. skivvies.org can't see inside recoverymisfits.org (browsers keep sites apart), so it remembers who came back from Recovery Misfits last time on that device. The very first time on a device it's the plain "I want to write a note" button. "Not you?" forgets the name.

## Share-card art (6 Nov 2026, v0.39)
- The share cards now use ChatGPT art: `img/cards/gave-1..5.webp`, `out-1..3.webp` (1080x1350, headline on the
  art, bottom 20% cream where card.js draws the live count pill + skivvies.org). card.js falls back to the old
  drawn card if an image fails to load.
- Mike's rule for all Skivvies art: underwear characters and logos only. Never a person who looks down-and-out,
  ragged, or in a rough state ("that's derogatory"). gave-1/gave-2 show happy, ordinary people giving; everything
  else is the boxer-briefs character.
- To add a card: drop a new webp in img/cards/, add its caption to LINES in card.js (one caption per image, same
  order), bump the `card.js?v=` number in index.html and run build.py.
