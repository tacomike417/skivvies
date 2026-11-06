/* SKIVVIES GIVE (5 Nov 2026, Mike). Miscellaneous project. Money goes to the
 * Cornerstones Recovery, Inc. Stripe account (its secret key is the STRIPE_SECRET_KEY secret here).
 *
 *   checkout { kind, qty, monthly, name, anon, message }
 *       -> makes a Stripe Checkout page ($20 a pack) and returns { url } to send the donor to.
 *          A row goes in skivvies_gifts as not-paid-yet.
 *   confirm  { session }
 *       -> asks Stripe if that checkout got paid; if so marks the row paid and returns what they gave.
 *          A message (if any) waits for Mike's approval in skivvies.org/admin before it shows.
 *
 * Test or live is decided by the key: sk_test_... = test mode (no real money), sk_live_... = live.
 * No browser login needed, so it is deployed with verify_jwt off. It never trusts a price from the browser.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const PACK_CENTS = 2000;
const SITE = "https://skivvies.org";
const TAX = "Tax-deductible gift to Cornerstones Recovery, Inc., a 501(c)(3) nonprofit, EIN 99-4095027. No goods or services were provided in exchange for this gift.";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
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
      p.set("custom_text[submit][message]", "Cornerstones Recovery, Inc. is a 501(c)(3) nonprofit (EIN 99-4095027). Your gift is tax-deductible. Stripe emails your receipt.");
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
          fee_cents: typeof fee === "number" ? fee : null,
          message_status: row.message ? "pending" : "none",
        }).eq("id", row.id).eq("paid", false);
      }
      return json({ ok: true, paid: true, kind: row.kind, qty: row.qty, monthly: row.monthly, amount: row.amount_cents / 100, test: row.mode === "test" });
    }
  } catch (e) {
    return json({ error: (e as Error).message || "Something went wrong." }, 502);
  }
  return json({ error: "Unknown action" }, 400);
});
