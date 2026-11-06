/* SKIVVIES HAND-OUT (6 Nov 2026, Mike). Miscellaneous project. Admin only.
 *
 *   handout { pairs, source: "bought"|"donated", note, date }
 *       -> records pairs handed out. If they came from the BOUGHT pile, the donor line moves:
 *          every paid online gift whose first place in line is now reached gets ONE email,
 *          "your pair went out", sent through Resend from skivvies@recoverymisfits.org.
 *          Donated (in-kind) pairs never move the line.
 *   fees
 *       -> asks Stripe what it kept on each paid live gift that doesn't have fee_cents yet.
 *   test_email { to }
 *       -> sends Mike a sample of the donor email so he can see it.
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

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

// ---- the donor email ----
function wentOutEmail(opts: { name: string | null; qty: number; hadNote: boolean }) {
  const hi = opts.name ? `Hey ${opts.name},` : `Hey,`;
  const more = opts.qty > 1 ? ` That was the first of your ${opts.qty}. The rest go out as people come in.` : ``;
  const note = opts.hadNote ? ` Your note went with it.` : ``;
  const subject = "Your pair went out today 🍑";
  const text = [
    hi, ``,
    `Your pair went out today. Somebody in Stark County walked into day one of recovery with new underwear on, because of you.${more}${note}`, ``,
    `We don't say who or where. That part stays theirs.`, ``,
    `Thanks for covering a butt.`, `— Skivvies`, ``,
    `Brag a little (it gets the next butt covered): ${SITE}/share-it?out=1`, ``,
    `Cover another one: ${SITE}/cover-someones-butt`, ``,
    `Skivvies is a program of Cornerstones Recovery, Inc., a 501(c)(3) nonprofit in Alliance, Ohio. Your receipt came from Stripe when you gave.`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#fff6f0;font-family:Inter,Helvetica,Arial,sans-serif;color:#102520">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px">
    <div style="font-size:30px;font-weight:900;letter-spacing:-.05em">skivvies</div>
    <div style="height:4px;width:92px;background:#f35d40;border-radius:4px;margin:4px 0 22px"></div>
    <h1 style="font-size:26px;line-height:1.15;margin:0 0 14px">Your pair went out today. 🍑</h1>
    <p style="font-size:17px;line-height:1.5;margin:0 0 14px">${esc(hi)}</p>
    <p style="font-size:17px;line-height:1.5;margin:0 0 14px">Somebody in Stark County walked into day one of recovery with new underwear on, because of you.${esc(more)}${esc(note)}</p>
    <p style="font-size:15px;line-height:1.5;color:#52635c;margin:0 0 22px">We don't say who or where. That part stays theirs.</p>
    <a href="${SITE}/share-it?out=1" style="display:inline-block;background:#f35d40;color:#fff;text-decoration:none;font-weight:900;font-size:17px;padding:14px 22px;border-radius:14px">Brag a little 🍑</a>
    <p style="font-size:14px;line-height:1.5;color:#52635c;margin:10px 0 0">Share the card on Recovery Misfits, Facebook or wherever. It gets the next butt covered. Or <a href="${SITE}/cover-someones-butt" style="color:#f35d40;font-weight:900">cover another one</a>.</p>
    <p style="font-size:17px;line-height:1.5;margin:26px 0 0">Thanks for covering a butt.<br>— Skivvies</p>
    <p style="font-size:12px;line-height:1.5;color:#52635c;margin:30px 0 0">Skivvies is a program of Cornerstones Recovery, Inc., a 501(c)(3) nonprofit in Alliance, Ohio. Your receipt came from Stripe when you gave. Questions: ${REPLY_TO}</p>
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

// ---- move the line: email everyone whose first place is now reached ----
async function moveLine() {
  const { data: given } = await admin.from("skivvies_handouts").select("pairs").eq("source", "bought");
  const total = (given || []).reduce((t, h) => t + h.pairs, 0);
  const { data: line } = await admin.from("skivvies_line").select("id,line_start").is("notified_at", null).lte("line_start", total);
  let sent = 0, failed = 0;
  for (const g of line || []) {
    const { data: row } = await admin.from("skivvies_gifts").select("id,donor_email,donor_name,anonymous,qty,message,notified_at").eq("id", g.id).maybeSingle();
    if (!row || row.notified_at) continue;
    if (!row.donor_email) { await admin.from("skivvies_gifts").update({ notified_at: new Date().toISOString() }).eq("id", row.id); continue; }
    try {
      await send(row.donor_email, wentOutEmail({ name: row.anonymous ? null : row.donor_name, qty: row.qty, hadNote: !!row.message }));
      await admin.from("skivvies_gifts").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
      sent++;
    } catch { failed++; }
  }
  return { total, sent, failed };
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
    if (b.action === "handout") {
      const pairs = Math.floor(Number(b.pairs) || 0);
      if (pairs < 1 || pairs > 10000) return json({ error: "How many pairs went out?" }, 400);
      const source = b.source === "donated" ? "donated" : "bought";
      const note = clean(b.note, 300) || null;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? String(b.date) : new Date().toISOString().slice(0, 10);
      const { error } = await admin.from("skivvies_handouts").insert({ pairs, source, note, handed_on: date, created_by: me.id });
      if (error) return json({ error: "That didn't save. Try again." }, 500);
      const line = source === "bought" ? await moveLine() : { total: null, sent: 0, failed: 0 };
      return json({ ok: true, ...line });
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
      await send(to, wentOutEmail({ name: "Mike", qty: 5, hadNote: true }));
      return json({ ok: true });
    }
  } catch (e) {
    return json({ error: (e as Error).message || "Something went wrong." }, 502);
  }
  return json({ error: "Unknown action" }, 400);
});
