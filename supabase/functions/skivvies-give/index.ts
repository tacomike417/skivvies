/* SKIVVIES GIVE (5 Nov 2026, Mike; emails added 13 Nov 2026). Miscellaneous project. Money goes to the
 * Cornerstones Recovery, Inc. Stripe account (its secret key is the STRIPE_SECRET_KEY secret here).
 *
 *   POST checkout { kind, qty, monthly, name, anon, message }
 *       -> makes a Stripe Checkout page ($20 a pack) and returns { url } to send the donor to.
 *          A row goes in skivvies_gifts as not-paid-yet.
 *   POST confirm  { session }
 *       -> asks Stripe if that checkout got paid; if so marks the row paid and returns what they gave.
 *          A message (if any) waits for Mike's approval in skivvies.org/admin before it shows.
 *          Then, ONCE per gift:
 *            - the donor gets a thank-you email from us: tax letter PDF (attached + a link), a share-card
 *              button, the Recovery Misfits group invite, and "we'll email you when your pair goes out"
 *            - Mike gets a "new gift" heads-up email
 *   GET  ?receipt=<receipt_key>
 *       -> the donor's tax letter as a PDF, signed "Cornerstones Recovery, Inc."
 *
 * Emails go through Resend from skivvies@recoverymisfits.org, replies to hello@skivvies.org.
 * Secrets: STRIPE_SECRET_KEY, RESEND_API_KEY, SKIVVIES_FROM (optional), SKIVVIES_ALERT_TO (optional;
 * default hello@skivvies.org, which forwards to Mike's inbox).
 *
 * Test or live is decided by the key: sk_test_... = test mode (no real money), sk_live_... = live.
 * No browser login needed, so it is deployed with verify_jwt off. It never trusts a price from the browser.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const PACK_CENTS = 2000;
const SITE = "https://skivvies.org";
const GROUP = "https://recoverymisfits.org/skivvies?to=group";
const ORG = "Cornerstones Recovery, Inc.";
const ORG_ADDR = "820 South Linden Ave, Alliance, Ohio 44601";
const EIN = "99-4095027";
const TAX = `Tax-deductible gift to ${ORG}, a 501(c)(3) nonprofit, EIN ${EIN}. No goods or services were provided in exchange for this gift.`;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const FROM = Deno.env.get("SKIVVIES_FROM") || "Skivvies <skivvies@recoverymisfits.org>";
const REPLY_TO = "hello@skivvies.org";
const ALERT_TO = Deno.env.get("SKIVVIES_ALERT_TO") || "hello@skivvies.org";
const SELF = (Deno.env.get("SUPABASE_URL") || "") + "/functions/v1/skivvies-give";

function key() { return Deno.env.get("STRIPE_SECRET_KEY") || ""; }
function mode() { return /_live_/.test(key()) ? "live" : "test"; }

async function stripe(path: string, params?: URLSearchParams, method = "POST") {
  const r = await fetch("https://api.stripe.com/v1/" + path + (method === "GET" && params ? "?" + params : ""), {
    method,
    headers: { Authorization: "Bearer " + key(), "Content-Type": "application/x-www-form-urlencoded" },
    body: method === "POST" ? params : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message || "Stripe said no");
  return d;
}

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const money = (cents: number) => "$" + (cents / 100).toFixed(2);
const day = (iso: string | null) => new Date(iso || Date.now()).toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric" });
const packLabel = (g: Gift) => (g.kind === "women" ? "Skivvies pack for a woman (underwear and a bra)" : "Skivvies pack for a guy (new boxer briefs)") + " x" + g.qty;
const receiptNo = (g: Gift) => "SKV-" + String(g.id).padStart(5, "0");
const receiptUrl = (g: Gift) => SELF + "?receipt=" + g.receipt_key;

type Gift = {
  id: number; stripe_session: string; mode: string; kind: string; qty: number; monthly: boolean; amount_cents: number;
  donor_name: string | null; anonymous: boolean; message: string | null; paid: boolean; paid_at: string | null;
  donor_email: string | null; legal_name: string | null; receipt_key: string; fee_cents: number | null;
  thanked_at: string | null; alerted_at: string | null;
};

// ---------- the tax letter (PDF) ----------
async function letterPdf(g: Gift): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Donation receipt ${receiptNo(g)}`); pdf.setAuthor(ORG);
  const page = pdf.addPage([612, 792]); // US Letter
  const reg = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.063, 0.145, 0.125), soft = rgb(0.32, 0.39, 0.36), coral = rgb(0.953, 0.365, 0.251);
  const safe = (t: string) => t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
  const L = 64, W = 612 - L * 2;
  let y = 720;
  const line = (t: string, o: { f?: typeof reg; s?: number; c?: typeof ink; gap?: number } = {}) => {
    const f = o.f || reg, s = o.s || 11.5;
    page.drawText(safe(t), { x: L, y, size: s, font: f, color: o.c || ink }); y -= o.gap ?? s + 6;
  };
  const para = (t: string, o: { f?: typeof reg; s?: number; c?: typeof ink } = {}) => {
    const f = o.f || reg, s = o.s || 11.5; let cur = "";
    for (const w of safe(t).split(" ")) {
      const next = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(next, s) > W && cur) { line(cur, { ...o, gap: s + 5 }); cur = w; } else cur = next;
    }
    if (cur) line(cur, { ...o, gap: s + 5 }); y -= 8;
  };
  const row = (k: string, v: string) => {
    page.drawText(safe(k), { x: L, y, size: 11.5, font: reg, color: soft });
    page.drawText(safe(v), { x: L + 150, y, size: 11.5, font: bold, color: ink }); y -= 20;
  };

  line(ORG, { f: bold, s: 20, gap: 24 });
  line(ORG_ADDR, { c: soft, s: 10.5, gap: 15 });
  line(`A 501(c)(3) nonprofit organization  |  EIN ${EIN}`, { c: soft, s: 10.5, gap: 14 });
  page.drawRectangle({ x: L, y: y - 2, width: 92, height: 4, color: coral }); y -= 40;

  line("Donation receipt", { f: bold, s: 16, gap: 26 });
  line(day(new Date().toISOString()), { c: soft, gap: 26 });
  line(`Dear ${g.legal_name || "friend"},`, { gap: 22 });
  para(`Thank you for your gift to Skivvies, a program of ${ORG} Because of you, someone starting treatment in Stark County, Ohio gets new underwear on day one.`);

  y -= 4;
  row("Receipt number", receiptNo(g) + (g.mode === "test" ? "  (TEST, no real money)" : ""));
  row("Donor", g.legal_name || "Name not provided");
  if (g.donor_email) row("Email", g.donor_email);
  row("Date of gift", day(g.paid_at));
  row("Amount", money(g.amount_cents) + " USD" + (g.monthly ? "  (first monthly gift)" : ""));
  row("Paid by", "Card, through Stripe");
  row("Gift", packLabel(g));
  y -= 12;

  para(`${ORG} is exempt from federal income tax under section 501(c)(3) of the Internal Revenue Code. No goods or services were provided in exchange for this gift, so the full amount is tax-deductible to the extent the law allows. Please keep this letter with your tax records.`);
  if (g.monthly) para("This letter covers your first monthly gift. Stripe emails a receipt for each month after that.", { c: soft, s: 10.5 });
  y -= 10;
  line("With thanks,", { gap: 22 });
  line(ORG, { f: bold, gap: 18 });
  line(`Questions: ${REPLY_TO}  |  skivvies.org`, { c: soft, s: 10.5 });
  return await pdf.save();
}

// ---------- emails ----------
function thanksEmail(g: Gift) {
  const first = (g.anonymous ? g.legal_name : g.donor_name || g.legal_name)?.split(" ")[0] || "";
  const hi = first ? `Hey ${first},` : `Hey,`;
  const who = g.kind === "women" ? (g.qty > 1 ? `${g.qty} women` : "a woman") : (g.qty > 1 ? `${g.qty} guys` : "a guy");
  const anon = g.anonymous ? ` You gave anonymously, and it stays that way. Your name is only on your tax letter.` : ``;
  const subject = "You covered a butt. Here's your tax letter 🍑";
  const text = [
    hi, ``,
    `Thank you. Your ${money(g.amount_cents)} just covered ${who} walking into day one of recovery in Stark County.${anon}`, ``,
    `YOUR TAX LETTER`,
    `It's attached as a PDF. You can also download it here: ${receiptUrl(g)}`,
    `${ORG} is a 501(c)(3) nonprofit, EIN ${EIN}. No goods or services were provided in exchange for your gift.`, ``,
    `PASS IT ON`,
    `Grab a share card and post it. It gets the next butt covered: ${SITE}/share-it`, ``,
    `COME HANG OUT`,
    `Join the Skivvies group on Recovery Misfits (free): ${GROUP}`, ``,
    `WHAT HAPPENS NEXT`,
    `We'll email you the day your pair goes out.`, ``,
    `Thanks for covering a butt.`, `— Skivvies`, ``,
    `Skivvies is a program of ${ORG}, a 501(c)(3) nonprofit in Alliance, Ohio. Questions: ${REPLY_TO}`,
  ].join("\n");
  const btn = (href: string, label: string, bg: string, fg: string) =>
    `<a href="${href}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;font-weight:900;font-size:16px;padding:13px 20px;border-radius:14px">${label}</a>`;
  const block = (title: string, body: string, b: string) =>
    `<div style="background:#ffffff;border-radius:16px;padding:18px 18px 20px;margin:0 0 14px">
      <div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#f35d40;margin:0 0 6px">${title}</div>
      <p style="font-size:15px;line-height:1.5;margin:0 0 14px">${body}</p>${b}</div>`;
  const html = `<!doctype html><html><body style="margin:0;background:#fff6f0;font-family:Inter,Helvetica,Arial,sans-serif;color:#102520">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px">
    <div style="font-size:30px;font-weight:900;letter-spacing:-.05em">skivvies</div>
    <div style="height:4px;width:92px;background:#f35d40;border-radius:4px;margin:4px 0 22px"></div>
    <h1 style="font-size:26px;line-height:1.15;margin:0 0 14px">You covered a butt. 🍑</h1>
    <p style="font-size:17px;line-height:1.5;margin:0 0 14px">${esc(hi)}</p>
    <p style="font-size:17px;line-height:1.5;margin:0 0 22px">Thank you. Your ${money(g.amount_cents)} just covered ${who} walking into day one of recovery in Stark County.${esc(anon)}</p>
    ${block("YOUR TAX LETTER", `It's attached to this email as a PDF, or download it below. ${esc(ORG)} is a 501(c)(3) nonprofit, EIN ${EIN}. No goods or services were provided in exchange for your gift.`, btn(receiptUrl(g), "Download tax letter (PDF)", "#102520", "#ffffff"))}
    ${block("PASS IT ON", "Grab a share card and post it on Recovery Misfits, Facebook or wherever. It gets the next butt covered.", btn(SITE + "/share-it", "Get my share card 🍑", "#f35d40", "#ffffff"))}
    ${block("COME HANG OUT", "The Skivvies crew has a group on Recovery Misfits. It's free, and it's where the notes and updates land.", btn(GROUP, "Join the Skivvies group", "#f7b733", "#102520"))}
    ${block("WHAT HAPPENS NEXT", "We'll email you the day your pair goes out.", "")}
    <p style="font-size:17px;line-height:1.5;margin:22px 0 0">Thanks for covering a butt.<br>— Skivvies</p>
    <p style="font-size:12px;line-height:1.5;color:#52635c;margin:30px 0 0">Skivvies is a program of ${esc(ORG)}, a 501(c)(3) nonprofit in Alliance, Ohio. Questions: ${REPLY_TO}</p>
  </div></body></html>`;
  return { subject, text, html };
}

function alertEmail(g: Gift) {
  const who = g.legal_name || g.donor_name || "Someone";
  const subject = `${g.mode === "test" ? "[TEST] " : ""}New Skivvies gift: ${money(g.amount_cents)} from ${who}`;
  const text = [
    `${who} just gave ${money(g.amount_cents)}${g.monthly ? " (monthly)" : ""}.`, ``,
    `For: ${packLabel(g)}`,
    `Shows on the site as: ${g.anonymous ? "Anonymous" : g.donor_name}`,
    `Email: ${g.donor_email || "none"}`,
    g.fee_cents != null ? `Stripe kept ${money(g.fee_cents)}, so ${money(g.amount_cents - g.fee_cents)} lands in the bank.` : ``,
    g.message ? `\nTheir note (waiting for your OK in admin):\n"${g.message}"` : `\nNo note.`, ``,
    `They got the thank-you email with their tax letter.`,
    `Admin: ${SITE}/admin`,
  ].join("\n");
  return { subject, text, html: `<pre style="font:15px/1.5 Helvetica,Arial,sans-serif;white-space:pre-wrap">${esc(text)}</pre>` };
}

async function send(to: string, m: { subject: string; text: string; html: string }, attach?: { filename: string; content: string }) {
  if (!RESEND) throw new Error("no Resend key");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: m.subject, text: m.text, html: m.html, ...(attach ? { attachments: [attach] } : {}) }),
  });
  if (!r.ok) throw new Error("Resend said no: " + (await r.text()).slice(0, 200));
}
const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };

/* Send the two emails, once each. The stamp is claimed first so two tabs can't double-send;
 * if the send fails the stamp is taken back so the next confirm tries again. */
async function emails(id: number) {
  const out: Record<string, string> = {};
  const { data: g0 } = await db.from("skivvies_gifts").select("*").eq("id", id).maybeSingle();
  let g = g0 as Gift | null;
  if (!g || !g.paid) return out;
  if (!g.legal_name || !g.donor_email) { // older gifts: fetch the name on the card from Stripe
    try {
      const s = await stripe("checkout/sessions/" + g.stripe_session, undefined, "GET");
      const patch = { legal_name: g.legal_name || clean(s.customer_details?.name, 80) || null, donor_email: g.donor_email || s.customer_details?.email || null };
      await db.from("skivvies_gifts").update(patch).eq("id", id); g = { ...g, ...patch };
    } catch { /* go with what we have */ }
  }
  if (!g.thanked_at && g.donor_email) {
    const { data: mine } = await db.from("skivvies_gifts").update({ thanked_at: new Date().toISOString() }).eq("id", id).is("thanked_at", null).select("id");
    if (mine?.length) {
      try {
        const pdf = await letterPdf(g);
        await send(g.donor_email, thanksEmail(g), { filename: `Skivvies-tax-letter-${receiptNo(g)}.pdf`, content: b64(pdf) });
        out.thanks = "sent";
      } catch (e) { await db.from("skivvies_gifts").update({ thanked_at: null }).eq("id", id); out.thanks = "failed: " + (e as Error).message; }
    }
  }
  if (!g.alerted_at) {
    const { data: mine } = await db.from("skivvies_gifts").update({ alerted_at: new Date().toISOString() }).eq("id", id).is("alerted_at", null).select("id");
    if (mine?.length) {
      try { await send(ALERT_TO, alertEmail(g)); out.alert = "sent"; }
      catch (e) { await db.from("skivvies_gifts").update({ alerted_at: null }).eq("id", id); out.alert = "failed: " + (e as Error).message; }
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ---- the tax letter link in the email ----
  if (req.method === "GET") {
    const k = new URL(req.url).searchParams.get("receipt") || "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return new Response("That link isn't right.", { status: 400, headers: CORS });
    const { data: g } = await db.from("skivvies_gifts").select("*").eq("receipt_key", k).eq("paid", true).maybeSingle();
    if (!g) return new Response("We couldn't find that receipt. Email " + REPLY_TO + " and we'll sort it out.", { status: 404, headers: CORS });
    const pdf = await letterPdf(g as Gift);
    return new Response(pdf, { headers: { ...CORS, "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Skivvies-tax-letter-${receiptNo(g as Gift)}.pdf"`, "Cache-Control": "private, no-store" } });
  }

  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!key()) return json({ error: "Giving isn't switched on yet." }, 503);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* empty */ }

  try {
    if (b.action === "checkout") {
      const kind = b.kind === "women" ? "women" : "men";
      const qty = Math.max(1, Math.min(10000, Math.floor(Number(b.qty) || 1)));
      const monthly = b.monthly === true;
      const anon = b.anon !== false;
      const name = anon ? null : (clean(b.name, 40) || null);
      const message = clean(b.message, 280) || null;
      const label = kind === "women" ? "Skivvies pack for a woman (underwear and a bra)" : "Skivvies pack for a guy (new boxer briefs)";

      const p = new URLSearchParams();
      p.set("mode", monthly ? "subscription" : "payment");
      p.set("line_items[0][quantity]", String(qty));
      p.set("line_items[0][price_data][currency]", "usd");
      p.set("line_items[0][price_data][unit_amount]", String(PACK_CENTS));
      p.set("line_items[0][price_data][product_data][name]", label);
      p.set("line_items[0][price_data][product_data][description]", TAX);
      if (monthly) p.set("line_items[0][price_data][recurring][interval]", "month");
      else { p.set("submit_type", "donate"); p.set("payment_intent_data[description]", label + " x" + qty + ". " + TAX); }
      p.set("custom_text[submit][message]", `${ORG} is a 501(c)(3) nonprofit (EIN ${EIN}). Your gift is tax-deductible. We email your tax letter right after you give.`);
      p.set("success_url", SITE + "/cover-someones-butt?gift={CHECKOUT_SESSION_ID}");
      p.set("cancel_url", SITE + "/cover-someones-butt");
      p.set("metadata[program]", "skivvies");
      p.set("metadata[kind]", kind);
      p.set("metadata[qty]", String(qty));
      const s = await stripe("checkout/sessions", p);

      const { error } = await db.from("skivvies_gifts").insert({
        stripe_session: s.id, mode: mode(), kind, qty, monthly, amount_cents: PACK_CENTS * qty,
        donor_name: name, anonymous: anon || !name, message, message_status: "none",
      });
      if (error) return json({ error: "That didn't start. Try again." }, 500);
      return json({ ok: true, url: s.url, test: mode() === "test" });
    }

    if (b.action === "confirm") {
      const id = clean(b.session, 200);
      if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: "That link isn't right." }, 400);
      const { data: row } = await db.from("skivvies_gifts").select("*").eq("stripe_session", id).maybeSingle();
      if (!row) return json({ error: "We couldn't find that gift." }, 404);
      if (!row.paid) {
        const s = await stripe("checkout/sessions/" + id + "?expand[]=payment_intent.latest_charge.balance_transaction", undefined, "GET");
        const fee = s?.payment_intent?.latest_charge?.balance_transaction?.fee; // Stripe's cut, for the books
        const paid = s.payment_status === "paid" || (s.mode === "subscription" && s.status === "complete" && s.payment_status !== "unpaid");
        if (!paid) return json({ ok: true, paid: false });
        await db.from("skivvies_gifts").update({
          paid: true, paid_at: new Date().toISOString(),
          donor_email: s.customer_details?.email || null,
          legal_name: clean(s.customer_details?.name, 80) || null,
          fee_cents: typeof fee === "number" ? fee : null,
          message_status: row.message ? "pending" : "none",
        }).eq("id", row.id).eq("paid", false);
      }
      let mail: Record<string, string> = {};
      try { mail = await emails(row.id); } catch { /* the gift is recorded either way */ }
      return json({ ok: true, paid: true, kind: row.kind, qty: row.qty, monthly: row.monthly, amount: row.amount_cents / 100, test: row.mode === "test", emailed: mail.thanks === "sent", mail });
    }
  } catch (e) {
    return json({ error: (e as Error).message || "Something went wrong." }, 502);
  }
  return json({ error: "Unknown action" }, 400);
});
