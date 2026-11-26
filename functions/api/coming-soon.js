/**
 * GET  /api/coming-soon?slug=ashley-phosphate
 * POST /api/coming-soon
 *
 * Writes a new row in 02 Leads (NOTION_LEADS_DB_ID). Status is New.
 * This route never updates an existing row.
 */
import { locations } from "../../data/coming-soon.js";
import { canonicalCategories } from "./business-types.js";

const NOTION_VERSION = "2022-06-28";

const PROFESSION = {
  "Hair stylist": "Hairstylist",
  "Hair extensions": "Hair extensions specialist",
  "Barber": "Barber",
  "Nails": "Nail tech",
  "Lashes": "Lash tech",
  "Brows": "Brow tech",
  "Skin care": "Esthetician",
  "Massage": "Massage therapist",
  "Med spa / aesthetics": "Med spa professional",
  "Permanent makeup / microblading": "Permanent makeup artist",
  "Tattoo": "Tattoo artist",
  "Waxing": "Waxing specialist",
  "Makeup": "Makeup artist",
  "Wellness & holistic": "Wellness coach",
  "Fitness": "Personal trainer",
  "Other": "Other",
};

const SIZES = new Set(["Small", "Medium", "Large", "Not sure"]);
const TIMING = new Set(["ASAP", "1-3 months", "3-6 months", "Just looking"]);
const SUITE_OPTION = {
  Small: "Small",
  Medium: "Medium",
  Large: "Large",
  "Not sure": "Not sure yet — show me around",
};

export function findLocation(slug) {
  return locations.find((item) => item.slug === slug) || null;
}

export function capCount(raw, goal) {
  const signed = Math.max(0, Number(raw) || 0);
  const need = Math.max(1, Number(goal) || 1);
  return { count: Math.min(signed, need), goal: need, left: Math.max(0, need - signed), signed };
}

export function countableName(name) {
  return !/^test\b/i.test(String(name || "").trim());
}

function clip(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function richText(content) {
  return { rich_text: [{ type: "text", text: { content: String(content).slice(0, 2000) } }] };
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function notion(token, path, body) {
  return fetch("https://api.notion.com/v1" + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function queryLeads(token, databaseId, filter) {
  const pages = [];
  let cursor = "";
  do {
    const body = { filter, page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notion(token, "/databases/" + databaseId + "/query", body);
    if (!res.ok) {
      const detail = await res.text();
      console.error("Coming soon count failed", res.status, detail.slice(0, 180));
      return null;
    }
    const data = await res.json();
    pages.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : "";
  } while (cursor);
  return pages;
}

export async function countSignups(token, databaseId, place) {
  const notes = { property: "Notes", rich_text: { contains: place.noteTag } };
  const both = { or: [{ property: "Source", select: { equals: place.source } }, notes] };
  const pages = await queryLeads(token, databaseId, both) || await queryLeads(token, databaseId, notes);
  if (!pages) return null;
  let raw = 0;
  for (const page of pages) {
    const title = ((page.properties || {}).Name || {}).title || [];
    const name = title.map((part) => part.plain_text || "").join("");
    if (countableName(name)) raw += 1;
  }
  return capCount(raw, place.goal);
}

export async function onRequestGet(context) {
  const slug = new URL(context.request.url).searchParams.get("slug") || "";
  const place = findLocation(slug);
  if (!place) return json({ ok: false, error: "That studio is not on the list." }, 404);
  const token = context.env.NOTION_LEADS_TOKEN;
  const databaseId = context.env.NOTION_LEADS_DB_ID;
  if (!token || !databaseId) return json({ ok: false, error: "The list is not available." }, 502);
  const tally = await countSignups(token, databaseId, place);
  if (!tally) return json({ ok: false, error: "The list is not available." }, 502);
  return json({ ok: true, slug: place.slug, ...tally });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Please check the form and try again." }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "Please check the form and try again." }, 400);
  if (clip(body.company || body.hp, 200)) return json({ ok: true, count: 0, goal: 30, left: 30 });

  const place = findLocation(clip(body.slug, 80));
  if (!place) return json({ ok: false, error: "That studio is not on the list." }, 400);

  const name = clip(body.name, 120);
  const phone = clip(body.phone, 40);
  const email = clip(body.email, 120);
  const size = clip(body.size, 40);
  const timing = clip(body.timing, 40);
  const current = clip(body.current, 160);
  const consent = body.consent === true || body.consent === "yes" || body.consent === "on";
  const categories = canonicalCategories(Array.isArray(body.categories) ? body.categories : []);

  if (!name) return json({ ok: false, error: "Please add your name." }, 400);
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return json({ ok: false, error: "Please add a phone number we can text or call." }, 400);
  if (!validEmail(email)) return json({ ok: false, error: "That email address doesn't look quite right." }, 400);
  if (!categories) return json({ ok: false, error: "Please choose a type of business from the list." }, 400);
  if (!categories.length) return json({ ok: false, error: "Please choose at least one type of business." }, 400);
  if (!SIZES.has(size)) return json({ ok: false, error: "Please choose a suite size." }, 400);
  if (!TIMING.has(timing)) return json({ ok: false, error: "Please tell us when you could move in." }, 400);
  if (!consent) return json({ ok: false, error: "Please say we can text and call you." }, 400);

  const token = env.NOTION_LEADS_TOKEN;
  const databaseId = env.NOTION_LEADS_DB_ID;
  if (!token || !databaseId) return json({ ok: false, error: "Could not save your request." }, 500);

  const parts = name.split(" ");
  const first = parts[0];
  const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
  const profession = categories.map((item) => PROFESSION[item]).find(Boolean) || "Other";
  const rent = (place.rents || []).find((item) => item.size === size);
  const notes = [
    place.noteTag,
    "Proposed site: " + place.address,
    "Types of business: " + categories.join(", "),
    "Suite size wanted: " + size,
    "Move-in: " + timing,
    current ? "Works now: " + current : "",
    "OK to text and call: yes",
    "No payment taken.",
  ].filter(Boolean).join("\n");

  const properties = {
    Name: { title: [{ type: "text", text: { content: name } }] },
    Status: { status: { name: "New" } },
    Source: { select: { name: place.source } },
    "Submitted at": { date: { start: new Date().toISOString() } },
    "First name": richText(first),
    Phone: { phone_number: phone },
    Email: { email },
    Profession: { select: { name: profession } },
    "Preferred location": { select: { name: place.locationOption } },
    "Suite interested in": { select: { name: SUITE_OPTION[size] } },
    Notes: richText(notes),
  };
  if (last) properties["Last name"] = richText(last);
  if (rent && Number.isFinite(rent.weekly)) properties["Weekly budget"] = { number: rent.weekly };

  let saved = false;
  try {
    saved = await createLead(token, databaseId, properties);
  } catch (err) {
    console.error("Coming soon lead failed", err && err.message);
  }
  if (!saved) return json({ ok: false, error: "Could not save your request. Call (843) 420-9965." }, 502);
  const tally = await countSignups(token, databaseId, place);
  return json({ ok: true, ...(tally || capCount(0, place.goal)) });
}

async function createLead(token, databaseId, properties) {
  const send = () => notion(token, "/pages", { parent: { database_id: databaseId }, properties });
  let res = await send();
  if (res.ok) return true;
  const detail = await res.text();
  const optional = ["Source", "Preferred location", "Profession", "Suite interested in", "Weekly budget"];
  const dropped = optional.filter((name) => properties[name] && detail.includes(name));
  if (!dropped.length) {
    console.error("Coming soon lead failed", res.status, detail.slice(0, 300));
    return false;
  }
  for (const name of dropped) delete properties[name];
  res = await send();
  if (!res.ok) {
    const again = await res.text();
    console.error("Coming soon lead failed", res.status, again.slice(0, 300));
    return false;
  }
  return true;
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Method not allowed." }, 405);
}
