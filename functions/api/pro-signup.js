/**
 * POST /api/pro-signup
 *
 * Saves a tenant directory application. Nothing is published from this route.
 * Env:
 *   NOTION_LEADS_TOKEN — same integration token as tour leads
 *   NOTION_PROS_DB_ID  — pros database id (set on the Pages project)
 *
 * Notion properties:
 *   Name                     title
 *   Business                 rich_text
 *   Suite                    rich_text
 *   Phone                    phone_number
 *   Email                    email
 *   Categories               multi_select (slugs)
 *   Services                 rich_text
 *   Bio                      rich_text
 *   Hours                    rich_text
 *   Booking URL              url
 *   Instagram                rich_text
 *   TikTok                   rich_text
 *   Facebook                 rich_text
 *   Website                  rich_text
 *   Languages                multi_select
 *   Payments                 multi_select
 *   Accepting New Clients    checkbox
 *   Photo URL                url
 *   Consent                  checkbox
 *   Status                   select (Pending)
 *   Submitted                date
 */

const NOTION_VERSION = "2022-06-28";

const CATEGORIES = new Set([
  "hair",
  "barber",
  "nails",
  "lashes-brows",
  "skin",
  "tattoo",
  "massage",
  "wellness",
  "fitness",
  "other",
]);

const LANGUAGES = new Map([
  ["english", "English"],
  ["en", "English"],
  ["chinese", "Chinese"],
  ["zh", "Chinese"],
  ["spanish", "Spanish"],
  ["es", "Spanish"],
  ["other", "Other"],
]);

const PAYMENTS = new Map([
  ["card", "Card"],
  ["bnpl", "Buy Now Pay Later"],
  ["buy now pay later", "Buy Now Pay Later"],
  ["cash", "Cash"],
]);

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

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function asList(value) {
  if (Array.isArray(value)) return value.map((item) => clip(item, 80)).filter(Boolean);
  const one = clip(value, 400);
  if (!one) return [];
  return one.split(",").map((item) => item.trim()).filter(Boolean);
}

function uniqueNames(items, allowed, map) {
  const names = [];
  for (const item of items) {
    const key = item.toLowerCase();
    const name = map ? map.get(key) : (allowed.has(key) ? key : "");
    if (!name || names.includes(name)) continue;
    names.push(name);
  }
  return names;
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

  const trap = clip(body.company || body.hp, 300);
  if (trap) return json({ ok: true });

  const name = clip(body.name, 120);
  const business = clip(body.business, 120);
  const suite = clip(body.suite, 40);
  const ph = clip(body.ph, 40);
  const em = clip(body.em, 120);
  const services = clip(body.services, 2000);
  const bio = clip(body.bio, 600);
  const hours = clip(body.hours, 800);
  const booking = clip(body.booking, 300);
  const instagram = clip(body.instagram, 200);
  const tiktok = clip(body.tiktok, 200);
  const facebook = clip(body.facebook, 200);
  const web = clip(body.web, 300);
  const photo = clip(body.photo, 300);
  const consent = body.consent === true || body.consent === "yes" || body.consent === "on";
  const accepting = body.accepting === true || body.accepting === "yes" || body.accepting === "on";

  if (!name) return json({ ok: false, error: "Please add your name." }, 400);
  if (!consent) {
    return json({ ok: false, error: "Please agree that Oh La La can show this info and photo on its website." }, 400);
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
  if (bio.length > 600) {
    return json({ ok: false, error: "Please keep the bio to 600 characters." }, 400);
  }

  const categories = uniqueNames(asList(body.categories), CATEGORIES, null).filter((slug) => CATEGORIES.has(slug));
  if (asList(body.categories).length && categories.length !== asList(body.categories).length) {
    return json({ ok: false, error: "Please choose a category from the list." }, 400);
  }
  const languages = uniqueNames(asList(body.languages), null, LANGUAGES);
  if (asList(body.languages).some((item) => !LANGUAGES.has(item.toLowerCase()))) {
    return json({ ok: false, error: "Please choose a language from the list." }, 400);
  }
  const payments = uniqueNames(asList(body.payments), null, PAYMENTS);
  if (asList(body.payments).some((item) => !PAYMENTS.has(item.toLowerCase()))) {
    return json({ ok: false, error: "Please choose a payment option from the list." }, 400);
  }

  for (const [label, value] of [["Booking link", booking], ["Photo URL", photo]]) {
    if (value && !validUrl(value)) {
      return json({ ok: false, error: `That ${label} needs to start with http:// or https://.` }, 400);
    }
  }

  const token = env.NOTION_LEADS_TOKEN;
  const databaseId = env.NOTION_PROS_DB_ID;
  if (!token || !databaseId) {
    console.error("Missing NOTION_LEADS_TOKEN or NOTION_PROS_DB_ID");
    return json({ ok: false, error: "Could not save your request." }, 500);
  }

  const properties = {
    Name: { title: [{ type: "text", text: { content: name } }] },
    Status: { select: { name: "Pending" } },
    Consent: { checkbox: true },
    "Accepting New Clients": { checkbox: accepting },
    Submitted: { date: { start: new Date().toISOString() } },
  };

  if (business) properties.Business = richText(business);
  if (suite) properties.Suite = richText(suite);
  if (phoneDigits.length >= 7) properties.Phone = { phone_number: ph };
  if (emailOk) properties.Email = { email: em };
  if (categories.length) properties.Categories = { multi_select: categories.map((name) => ({ name })) };
  if (services) properties.Services = richText(services);
  if (bio) properties.Bio = richText(bio);
  if (hours) properties.Hours = richText(hours);
  if (booking) properties["Booking URL"] = { url: booking };
  if (instagram) properties.Instagram = richText(instagram);
  if (tiktok) properties.TikTok = richText(tiktok);
  if (facebook) properties.Facebook = richText(facebook);
  if (web) properties.Website = richText(web);
  if (languages.length) properties.Languages = { multi_select: languages.map((name) => ({ name })) };
  if (payments.length) properties.Payments = { multi_select: payments.map((name) => ({ name })) };
  if (photo) properties["Photo URL"] = { url: photo };

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
    console.error("Notion pro signup failed", notionRes.status, detail.slice(0, 500));
    return json({ ok: false, error: "Could not save your request." }, 502);
  }

  return json({ ok: true });
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Method not allowed. Use POST." }, 405);
}
