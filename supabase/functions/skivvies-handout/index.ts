/* SKIVVIES HAND-OUT (6 Nov 2026, Mike; reworked 15 Nov 2026). Miscellaneous project. Admin only.
 *
 *   gift_out { id }
 *       -> "Handed out" on one gift in the admin. It means we used their money. The donor gets ONE email:
 *          your pack (and note) went out, your tax letter again, the Rock Bottom card to share, thank you.
 *          Then the gift is stamped notified_at so it can't be sent twice.
 *   handout { pairs, source: "bought"|"donated", note, date }
 *       -> takes pairs off a stock pile. Emails nobody (the old donor line is gone).
 *   undo { id }  -> takes back a stock entry.
 *   fees         -> asks Stripe what it kept on each paid live gift that doesn't have fee_cents yet.
 *   test_email { to } -> sends a sample of the donor email.
 *
 * Secrets: RESEND_API_KEY, SKIVVIES_FROM (default "Skivvies <skivvies@recoverymisfits.org>"), STRIPE_SECRET_KEY.
 * Deployed with verify_jwt off; it checks the admin's token itself (same as skivvies-note).
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const FROM = Deno.env.get("SKIVVIES_FROM") || "Skivvies <skivvies@recoverymisfits.org>";
const REPLY_TO = "hello@skivvies.org";
const SITE = "https://skivvies.org";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const GIVE = (Deno.env.get("SUPABASE_URL") || "") + "/functions/v1/skivvies-give";   // serves the tax letter PDF
const CARD = SITE + "/img/cards/rock-bottom.jpg";                                    // the one share card (Mike, 15 Nov 2026)
const ORG = "Cornerstones Recovery, Inc.";
const EIN = "99-4095027";

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

// ---- the donor email ----
function wentOutEmail(o: { name: string | null; qty: number; note: string | null; receiptKey: string | null }) {
  const hi = o.name ? `Hey ${o.name},` : `Hey,`;
  const packs = o.qty > 1 ? `Your ${o.qty} packs went out.` : `Your pack went out.`;
  const head = o.qty > 1 ? `Your packs went out. 🍑` : `Your pack went out. 🍑`;
  const subject = o.qty > 1 ? "Your packs went out 🍑" : "Your pack went out 🍑";
  const who = o.qty > 1 ? `${o.qty} people in Stark County walked` : `Somebody in Stark County walked`;
  const letter = o.receiptKey ? `${GIVE}?receipt=${o.receiptKey}` : "";
  const text = [
    hi, ``,
    `${packs} ${who} into day one of recovery with new underwear on, because of you.`, ``,
    ...(o.note ? [`Your note went with it:`, `"${o.note}"`, ``] : []),
    `We don't say who or where. That part stays theirs.`, ``,
    `PASS IT ON`,
    `Share the card. It gets the next butt covered: ${SITE}/share-it`, ``,
    ...(letter ? [`YOUR TAX LETTER`, `Here it is again if you need it: ${letter}`, `${ORG} is a 501(c)(3) nonprofit, EIN ${EIN}. No goods or services were provided in exchange for your gift.`, ``] : []),
    `Thank you for covering a butt.`, `— Skivvies`, ``,
    `Skivvies is a program of ${ORG}, a 501(c)(3) nonprofit in Alliance, Ohio. Questions: ${REPLY_TO}`,
  ].join("\n");
  const btn = (href: string, label: string, bg: string, fg: string) =>
    `<a href="${href}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;font-weight:900;font-size:16px;padding:13px 20px;border-radius:14px">${label}</a>`;
  const block = (title: string, body: string, b: string) =>
    `<div style="background:#ffffff;border-radius:16px;padding:18px 18px 20px;margin:0 0 14px">
      <div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#f35d40;margin:0 0 6px">${title}</div>
      ${body}${b}</div>`;
  const p = (t: string) => `<p style="font-size:15px;line-height:1.5;margin:0 0 14px">${t}</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#fff6f0;font-family:Inter,Helvetica,Arial,sans-serif;color:#102520">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px">
    <div style="font-size:30px;font-weight:900;letter-spacing:-.05em">skivvies</div>
    <div style="height:4px;width:92px;background:#f35d40;border-radius:4px;margin:4px 0 22px"></div>
    <h1 style="font-size:26px;line-height:1.15;margin:0 0 14px">${head}</h1>
    <p style="font-size:17px;line-height:1.5;margin:0 0 14px">${esc(hi)}</p>
    <p style="font-size:17px;line-height:1.5;margin:0 0 14px">${esc(who)} into day one of recovery with new underwear on, because of you.</p>
    ${o.note ? `<div style="border-left:5px solid #f35d40;background:#ffffff;border-radius:0 14px 14px 0;padding:12px 16px;margin:0 0 14px"><div style="font-size:12px;font-weight:900;letter-spacing:.08em;color:#52635c;margin:0 0 4px">YOUR NOTE WENT WITH IT</div><div style="font-size:17px;line-height:1.45;font-style:italic">&ldquo;${esc(o.note)}&rdquo;</div></div>` : ``}
    <p style="font-size:15px;line-height:1.5;color:#52635c;margin:0 0 22px">We don't say who or where. That part stays theirs.</p>
    ${block("PASS IT ON", `<a href="${SITE}/share-it"><img src="${CARD}" width="300" alt="Rock bottom shouldn't be bare bottom. skivvies.org" style="display:block;width:100%;max-width:300px;height:auto;border-radius:14px;border:0;margin:0 0 14px"></a>` + p("This is your card. Post it on Facebook, Recovery Misfits or wherever. It gets the next butt covered."), btn(SITE + "/share-it", "Share the card 🍑", "#f35d40", "#ffffff"))}
    ${letter ? block("YOUR TAX LETTER", p(`Here it is again if you need it. ${esc(ORG)} is a 501(c)(3) nonprofit, EIN ${EIN}. No goods or services were provided in exchange for your gift.`), btn(letter, "Download tax letter (PDF)", "#102520", "#ffffff")) : ``}
    <p style="font-size:17px;line-height:1.5;margin:22px 0 0">Thank you for covering a butt.<br>— Skivvies</p>
    <p style="font-size:12px;line-height:1.5;color:#52635c;margin:30px 0 0">Skivvies is a program of ${esc(ORG)}, a 501(c)(3) nonprofit in Alliance, Ohio. Questions: ${REPLY_TO}</p>
  </div></body></html>`;
  return { subject, text, html };
}

async function send(to: string, m: { subject: string; text: string; html: string }) {
  if (!RESEND) throw new Error("Email isn't switched on yet (no Resend key).");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: m.subject, text: m.text, html: m.html }),
  });
  if (!r.ok) throw new Error("Resend said no: " + (await r.text()).slice(0, 200));
}

// ---- who's asking ----
async function isAdmin(req: Request) {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data: who } = await admin.auth.getUser(jwt);
  const me = who?.user;
  if (!me) return null;
  const { data: isAdm } = await admin.from("skivvies_admins").select("user_id").eq("user_id", me.id).maybeSingle();
  return isAdm ? me : null;
}

async function stripeGet(path: string) {
  const r = await fetch("https://api.stripe.com/v1/" + path, { headers: { Authorization: "Bearer " + STRIPE_KEY } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message || "Stripe said no");
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const me = await isAdmin(req);
  if (!me) return json({ error: "Admins only." }, 403);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* empty */ }

  try {
    if (b.action === "gift_out") {
      const id = Number(b.id);
      if (!Number.isInteger(id) || id < 1) return json({ error: "Which gift?" }, 400);
      const { data: g } = await admin.from("skivvies_gifts").select("id,paid,donor_email,donor_name,legal_name,anonymous,qty,message,receipt_key,notified_at").eq("id", id).maybeSingle();
      if (!g || !g.paid) return json({ error: "Couldn't find that gift." }, 404);
      if (g.notified_at) return json({ ok: true, already: true });
      // claim it first so two taps can't send two emails; give it back if the email fails
      const { data: mine } = await admin.from("skivvies_gifts").update({ notified_at: new Date().toISOString() }).eq("id", id).is("notified_at", null).select("id");
      if (!mine || !mine.length) return json({ ok: true, already: true });
      if (!g.donor_email) return json({ ok: true, emailed: false });
      try {
        const first = (g.anonymous ? g.legal_name : g.donor_name || g.legal_name)?.split(" ")[0] || null;
        await send(g.donor_email, wentOutEmail({ name: first, qty: g.qty, note: clean(g.message, 600) || null, receiptKey: g.receipt_key }));
      } catch (e) {
        await admin.from("skivvies_gifts").update({ notified_at: null }).eq("id", id);
        return json({ error: "The email didn't send, so nothing was marked. " + ((e as Error).message || "") }, 502);
      }
      return json({ ok: true, emailed: true });
    }

    if (b.action === "handout") {
      const pairs = Math.floor(Number(b.pairs) || 0);
      if (pairs < 1 || pairs > 10000) return json({ error: "How many pairs went out?" }, 400);
      const source = b.source === "donated" ? "donated" : "bought";
      const note = clean(b.note, 300) || null;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? String(b.date) : new Date().toISOString().slice(0, 10);
      const { error } = await admin.from("skivvies_handouts").insert({ pairs, source, note, handed_on: date, created_by: me.id });
      if (error) return json({ error: "That didn't save. Try again." }, 500);
      return json({ ok: true });
    }

    if (b.action === "undo") {
      // Take back the last hand-out (wrong number). Emails already sent stay sent.
      const id = Number(b.id);
      await admin.from("skivvies_handouts").delete().eq("id", id);
      return json({ ok: true });
    }

    if (b.action === "fees") {
      if (!STRIPE_KEY) return json({ error: "No Stripe key." }, 503);
      const { data: rows } = await admin.from("skivvies_gifts").select("id,stripe_session").eq("mode", "live").eq("paid", true).is("fee_cents", null).limit(50);
      let done = 0;
      for (const g of rows || []) {
        try {
          const s = await stripeGet("checkout/sessions/" + g.stripe_session + "?expand[]=payment_intent.latest_charge.balance_transaction");
          const fee = s?.payment_intent?.latest_charge?.balance_transaction?.fee;
          if (typeof fee === "number") { await admin.from("skivvies_gifts").update({ fee_cents: fee }).eq("id", g.id); done++; }
        } catch { /* next */ }
      }
      return json({ ok: true, done, of: (rows || []).length });
    }

    if (b.action === "test_email") {
      const to = clean(b.to, 120);
      if (!/@/.test(to)) return json({ error: "Email?" }, 400);
      await send(to, wentOutEmail({ name: "Mike", qty: 1, note: "Rooting for ya bud", receiptKey: null }));
      return json({ ok: true });
    }
  } catch (e) {
    return json({ error: (e as Error).message || "Something went wrong." }, 502);
  }
  return json({ error: "Unknown action" }, 400);
});
