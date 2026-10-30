# CLAUDE HANDOFF — SKIVVIES PROJECT

Domain: skivvies.org
Parent organization: Cornerstones Recovery Inc, 501(c)(3)
Tagline: "New basics for people starting recovery."

## Approved direction
Warm, playful but credible. Coral orange (#f35d40), ink (#102520), off-white (#fff6f0), plenty of white space, bold headline and simple original line icons. Phone-first at 390px; desktop centers the narrow phone-style website layout. The **first screen must explain exactly what is given and how donors can help**. No photos of people in treatment. The original approved home concept has two explanatory CTAs: Sponsor a Kit ($15 men's kit) and Host an Undie Sunday (collect new underwear/socks).

## Pages
1. Home: immediate mission headline, explanatory CTAs, Give any amount link, 3-step process, 501(c)(3) trust line.
2. Sponsor a Kit: Men's $15 (3 underwear, 3 socks, white tee, hygiene kit); Women's price TBD (underwear, socks, bra/sports bra, period products, hygiene kit). Quantity presets 1/5/10/custom, live total, monthly toggle, placeholder checkout. Women's checkout disabled until price provided.
3. Give Any Amount: 15/30/75/150/custom, monthly/one-time, placeholder checkout.
4. Undie Sunday: form fields organization, name, phone, email, date, men/women/both, rough number of people, notes; local thank-you state, copy bulletin blurb and flyer placeholder.
5. About: why new underwear matters, parent nonprofit, EIN/contact placeholders.

## Hard requirements
- American spelling, no 'should' in website copy.
- Respectful language; never call people 'addicts'.
- No named treatment facilities. Refer to local treatment programs in Stark County.
- Hide counters unless values >=2. Current prototype has no public counters.
- Back/forward history and swipe-back via browser history; no trapped screens. Footer on all views: Apps by ThunkBox linking to https://apps.thunkbox.com.
- Version pill upper-right, white with black text.
- No frameworks. HTML, CSS, vanilla JavaScript.

## Before production launch
1. Confirm women's kit price and wire up Stripe securely via backend/hosted Checkout; never accept raw card data in this static app.
2. Connect Undie Sunday form to an actual service/backend with validation, spam controls, and a privacy notice. Currently frontend-only.
3. Provide an approved flyer PDF and replace placeholder flyer action.
4. Confirm exact legal organization name, tax-deductibility language, EIN, public contact address, and fulfillment details.
5. Test iOS Safari edge swipe and Android hardware back on hosted URL, plus accessibility and real-device 390px layout.
