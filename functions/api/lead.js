/**
 * POST /api/lead
 *
 * Saves a tour request into the Notion leads database.
 * Env (Pages project, production and preview):
 *   NOTION_LEADS_TOKEN  — Notion integration token
 *   NOTION_LEADS_DB_ID  — leads database id
 *
 * Property types were checked against the live database:
 *   Name                 title
 *   First name           text  → rich_text
 *   Last name            text  → rich_text
 *   Phone                phone_number
 *   Email                email
 *   Profession           select
 *   Preferred location   select
 *   Suite interested in  select
 *   Notes                text  → rich_text
 *   Status               status (default option 新)
 *   Source               select
 *   Submitted at         date
 */

const NOTION_VERSION = "2022-06-28";
const hits = new Map();

const PROFESSIONS = new Set([
  "Hairstylist",
  "Barber",
  "Nail tech",
  "Lash/Brow",
  "Lash tech",
  "Brow tech",
  "Esthetician",
  "Makeup artist",
  "Hair extensions specialist",
  "Massage therapist",
  "Med spa professional",
  "Permanent makeup artist",
  "Tattoo artist",
  "Waxing specialist",
  "Nutritionist/Dietitian",
  "Personal trainer",
  "Wellness coach",
  "Other",
]);

const LOCATIONS = new Set([
  "Summerville — Ladson Oakbrook (open now)",
  "Future locations — keep me posted",
]);

// Map any suite label to an unpriced Notion option. The database also has
// priced option names; those are never written.
function suiteOption(value) {
  const v = clip(value, 120);
  if (!v) return "";
  if (v === "Not sure yet — show me around" || /^not sure\b/i.test(v)) {
    return "Not sure yet — show me around";
  }
  const size = v.split(/[\s—(]/, 1)[0].toLowerCase();
  if (size === "small") return "Small";
  if (size === "medium") return "Medium";
  if (size === "large") return "Large";
  return "";
}

function clip(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function richText(content) {
  return { rich_text: [{ type: "text", text: { content } }] };
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Please check the form and try again." }, 400);
  }

  if (!body || typeof body !== "object") {
    return json({ ok: false, error: "Please check the form and try again." }, 400);
  }

  // Honeypot: pretend success so bots don't retry, and don't write a row.
  const trap = clip(body.website || body.company || body.hp, 300);
  if (trap) return json({ ok: true });

  const combined = clip(body.name, 120);
  const parts = combined ? combined.split(" ") : [];
  const fn = clip(body.fn || parts[0], 80);
  const ln = clip(body.ln || (parts.length > 1 ? parts.slice(1).join(" ") : ""), 80);
  const ph = clip(body.ph, 40);
  const em = clip(body.em, 120);
  const pr = clip(body.pr, 80);
  const lo = clip(body.lo, 120);
  const st = clip(body.st, 80);
  const ms = clip(body.ms, 1800);

  if (!fn && !ln) {
    return json({ ok: false, error: "Please add your name." }, 400);
  }

  const phoneDigits = ph.replace(/\D/g, "");
  const emailOk = em ? validEmail(em) : false;
  if (phoneDigits.length < 7 && !emailOk) {
    return json({ ok: false, error: "Please add a phone number or email." }, 400);
  }
  if (em && !emailOk) {
    return json({ ok: false, error: "That email address doesn't look quite right." }, 400);
  }
  if (ph && phoneDigits.length < 7) {
    return json({ ok: false, error: "That phone number doesn't look quite right." }, 400);
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (tooFast(ip)) return json({ ok: false, error: "Please wait a minute and try again." }, 429);

  const token = env.NOTION_LEADS_TOKEN;
  const databaseId = env.NOTION_LEADS_DB_ID;
  if (!token || !databaseId) {
    console.error("Missing NOTION_LEADS_TOKEN or NOTION_LEADS_DB_ID");
    return json({ ok: false, error: "Could not save your request." }, 500);
  }

  const name = [fn, ln].filter(Boolean).join(" ").slice(0, 200);
  const utm = body.utm && typeof body.utm === "object" ? body.utm : {};
  const score = leadScore({ profession: pr, suite: st, location: lo, email: emailOk, phone: phoneDigits.length >= 7 });
  const noteLines = [
    "Lease inquiry from the website.",
    pr ? "Profession: " + pr : "",
    lo ? "Location: " + lo : "",
    st ? "Suite: " + st : "",
    "Lead score: " + score.score,
    score.why.length ? "Score why: " + score.why.join(". ") + "." : "",
    clip(utm.source, 80) ? "UTM source: " + clip(utm.source, 80) : "",
    clip(utm.medium, 80) ? "UTM medium: " + clip(utm.medium, 80) : "",
    clip(utm.campaign, 80) ? "UTM campaign: " + clip(utm.campaign, 80) : "",
    clip(body.referrer, 200) ? "Referrer: " + clip(body.referrer, 200) : "",
    ms ? "Note: " + ms : "",
    "No payment taken.",
  ].filter(Boolean).join("\n");

  const properties = {
    Name: { title: [{ type: "text", text: { content: name } }] },
    Notes: richText(noteLines),
  };
  if (fn) properties["First name"] = richText(fn);
  if (ln) properties["Last name"] = richText(ln);
  if (phoneDigits.length >= 7) properties.Phone = { phone_number: ph };
  if (emailOk) properties.Email = { email: em };
  if (PROFESSIONS.has(pr)) properties.Profession = { select: { name: pr } };
  if (LOCATIONS.has(lo)) properties["Preferred location"] = { select: { name: lo } };
  const suite = suiteOption(st);
  if (suite) properties["Suite interested in"] = { select: { name: suite } };

  let existing = null;
  try {
    existing = await findLead(token, databaseId, emailOk ? em : "", phoneDigits.length >= 7 ? ph : "");
  } catch (err) {
    console.error("Lead lookup failed", err && err.message);
  }

  let notionRes;
  try {
    if (existing) {
      notionRes = await patchLead(token, existing.id, properties);
    } else {
      properties.Status = { status: { name: "New" } };
      properties.Source = { select: { name: "Website" } };
      properties["Submitted at"] = { date: { start: new Date().toISOString() } };
      notionRes = await createLead(token, databaseId, properties);
    }
  } catch (err) {
    console.error("Notion request failed", err && err.message);
    return json({ ok: false, error: "Could not save your request." }, 502);
  }

  if (!notionRes || !notionRes.ok) {
    return json({ ok: false, error: "Could not save your request." }, 502);
  }

  return json({ ok: true, updated: !!existing });
}

function tooFast(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 8) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function leadScore({ profession, suite, location, email, phone }) {
  let score = 0;
  const why = [];
  if (profession) { score += 2; why.push("Named their work"); }
  if (suite && !/^not sure/i.test(suite)) { score += 2; why.push("Chose a suite size"); }
  if (location && /summerville/i.test(location)) { score += 2; why.push("Wants the open Summerville studio"); }
  if (email && phone) { score += 1; why.push("Left a phone and email"); }
  return { score, why };
}

async function notionFetch(token, path, body, method) {
  return fetch("https://api.notion.com/v1" + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function findLead(token, databaseId, email, phone) {
  const filters = [];
  if (email) filters.push({ property: "Email", email: { equals: email } });
  if (phone) filters.push({ property: "Phone", phone_number: { equals: phone } });
  if (!filters.length) return null;
  const res = await notionFetch(token, "/databases/" + databaseId + "/query", {
    filter: filters.length === 1 ? filters[0] : { or: filters },
    page_size: 1,
  }, "POST");
  if (!res.ok) return null;
  const data = await res.json();
  return (data.results || [])[0] || null;
}

async function createLead(token, databaseId, properties) {
  return notionFetch(token, "/pages", { parent: { database_id: databaseId }, properties }, "POST");
}

async function patchLead(token, pageId, properties) {
  delete properties.Status;
  delete properties.Source;
  return notionFetch(token, "/pages/" + pageId, { properties }, "PATCH");
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Method not allowed. Use POST." }, 405);
}
