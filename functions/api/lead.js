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

const PROFESSIONS = new Set([
  "Hairstylist",
  "Barber",
  "Nail tech",
  "Esthetician",
  "Lash tech",
  "Brow tech",
  "Hair extensions specialist",
  "Massage therapist",
  "Med spa professional",
  "Permanent makeup artist",
  "Tattoo artist",
  "Waxing specialist",
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

  const fn = clip(body.fn, 80);
  const ln = clip(body.ln, 80);
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

  const token = env.NOTION_LEADS_TOKEN;
  const databaseId = env.NOTION_LEADS_DB_ID;
  if (!token || !databaseId) {
    console.error("Missing NOTION_LEADS_TOKEN or NOTION_LEADS_DB_ID");
    return json({ ok: false, error: "Could not save your request." }, 500);
  }

  const name = [fn, ln].filter(Boolean).join(" ").slice(0, 200);
  const properties = {
    Name: { title: [{ type: "text", text: { content: name } }] },
    Status: { status: { name: "新" } },
    Source: { select: { name: "网站" } },
    "Submitted at": { date: { start: new Date().toISOString() } },
  };

  if (fn) properties["First name"] = richText(fn);
  if (ln) properties["Last name"] = richText(ln);
  if (phoneDigits.length >= 7) properties.Phone = { phone_number: ph };
  if (emailOk) properties.Email = { email: em };
  if (PROFESSIONS.has(pr)) properties.Profession = { select: { name: pr } };
  if (LOCATIONS.has(lo)) properties["Preferred location"] = { select: { name: lo } };
  const suite = suiteOption(st);
  if (suite) properties["Suite interested in"] = { select: { name: suite } };
  if (ms) properties.Notes = richText(ms);

  let notionRes;
  try {
    notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });
  } catch (err) {
    console.error("Notion request failed", err && err.message);
    return json({ ok: false, error: "Could not save your request." }, 502);
  }

  if (!notionRes.ok) {
    const detail = await notionRes.text();
    console.error("Notion lead create failed", notionRes.status, detail.slice(0, 500));
    return json({ ok: false, error: "Could not save your request." }, 502);
  }

  return json({ ok: true });
}
