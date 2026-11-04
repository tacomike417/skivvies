/* SKIVVIES NOTES (2 Nov 2026, Mike). Miscellaneous project.
 *
 *   submit  { body, sign }   Authorization: a Recovery Misfits token.
 *                            The note lands in skivvies_notes as pending.
 *   approve { id }           Authorization: a Skivvies admin's token (this project).
 *                            The note goes up in the Skivvies group on RM, from the
 *                            skivvies house account, and the writer gets a DM.
 *   decline { id }           Same admin check. Just marks it.
 *   use     { id }           Same admin check. An approved note went in a pack: used_count +1
 *                            and the writer gets a DM ("just went out in a pack"). Reusable.
 *
 * The RM side checks a shared secret (skivvies_bridge, in both projects, readable by nobody
 * through the API). Deployed with verify_jwt off: it checks every token itself.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const RM = "https://rlytvfehbglsjfvprtbp.supabase.co";
const RM_KEY = "sb_publishable_5r-l8Bj8PjXhq5qpp1b26g_QQ7xPQ7P";       // RM's public key

async function rmUser(jwt: string) {
  const r = await fetch(RM + "/auth/v1/user", { headers: { apikey: RM_KEY, Authorization: "Bearer " + jwt } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.id ? u : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* empty */ }
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Sign in first." }, 401);

  if (b.action === "submit") {
    const u = await rmUser(jwt);
    if (!u) return json({ error: "Sign in to your Recovery Misfits account first." }, 401);
    const handle = String(u.email || "").split("@")[0].toLowerCase();
    const body = String(b.body || "").replace(/\r/g, "").trim();
    const sign = String(b.sign || "").trim().slice(0, 40) || null;
    if (body.length < 2) return json({ error: "Write a little something first." }, 400);
    if (body.length > 600) return json({ error: "Keep it under 600 characters. It has to fit on a card." }, 400);
    // spam brake: 5 a day, 3 waiting at once
    const day = new Date(Date.now() - 86_400_000).toISOString();
    const { count: today } = await admin.from("skivvies_notes").select("id", { count: "exact", head: true }).eq("rm_user_id", u.id).gte("created_at", day);
    if ((today || 0) >= 5) return json({ error: "That's 5 notes today. Thank you! Come back tomorrow." }, 429);
    const { count: waiting } = await admin.from("skivvies_notes").select("id", { count: "exact", head: true }).eq("rm_user_id", u.id).eq("status", "pending");
    if ((waiting || 0) >= 3) return json({ error: "You have 3 notes waiting to be read. Give us a minute to catch up." }, 429);
    const { error } = await admin.from("skivvies_notes").insert({ rm_user_id: u.id, rm_handle: handle, body, sign_as: sign });
    if (error) return json({ error: "That didn't save. Try again." }, 500);
    return json({ ok: true });
  }

  if (b.action === "approve" || b.action === "decline" || b.action === "use") {
    const { data: who } = await admin.auth.getUser(jwt);
    const me = who?.user;
    if (!me) return json({ error: "Sign in first." }, 401);
    const { data: isAdm } = await admin.from("skivvies_admins").select("user_id").eq("user_id", me.id).maybeSingle();
    if (!isAdm) return json({ error: "Admins only." }, 403);
    const id = Number(b.id);
    const { data: n } = await admin.from("skivvies_notes").select("*").eq("id", id).maybeSingle();
    if (!n) return json({ error: "That note isn't here." }, 404);
    if (b.action === "use") {
      if (n.status !== "approved") return json({ error: "Approve it first." }, 409);
      // only count it if nobody else bumped it a split second ago (double tap)
      const { data: bumped } = await admin.from("skivvies_notes")
        .update({ used_count: (n.used_count || 0) + 1, last_used_at: new Date().toISOString() })
        .eq("id", id).eq("used_count", n.used_count || 0).select("used_count");
      if (!bumped || !bumped.length) return json({ error: "That tap already went through." }, 409);
      const { data: br } = await admin.from("skivvies_bridge").select("secret").maybeSingle();
      let told = false;
      if (br) {
        const r = await fetch(RM + "/rest/v1/rpc/skivvies_note_used", {
          method: "POST",
          headers: { apikey: RM_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ p_secret: br.secret, p_writer: n.rm_user_id }),
        });
        told = r.ok;
      }
      return json({ ok: true, used: bumped[0].used_count, told });
    }
    if (n.status !== "pending") return json({ error: "That one was already " + n.status + "." }, 409);

    if (b.action === "decline") {
      await admin.from("skivvies_notes").update({ status: "declined", handled_at: new Date().toISOString() }).eq("id", id);
      return json({ ok: true });
    }
    const { data: br } = await admin.from("skivvies_bridge").select("secret").maybeSingle();
    if (!br) return json({ error: "The bridge to Recovery Misfits isn't set up." }, 500);
    // claim it first, so a double tap can't post it twice
    const { data: claimed } = await admin.from("skivvies_notes").update({ status: "approved", handled_at: new Date().toISOString() })
      .eq("id", id).eq("status", "pending").select("id");
    if (!claimed || !claimed.length) return json({ error: "That one was already handled." }, 409);
    const r = await fetch(RM + "/rest/v1/rpc/skivvies_post_note", {
      method: "POST",
      headers: { apikey: RM_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_secret: br.secret, p_body: n.body, p_sign: n.sign_as || "", p_writer: n.rm_user_id }),
    });
    const pid = await r.json().catch(() => null);
    if (!r.ok) {
      await admin.from("skivvies_notes").update({ status: "pending", handled_at: null }).eq("id", id);
      return json({ error: "Recovery Misfits didn't take it: " + ((pid && pid.message) || r.status) }, 502);
    }
    await admin.from("skivvies_notes").update({ rm_post_id: pid }).eq("id", id);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
