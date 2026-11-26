/**
 * GET  /api/coming-soon?slug=ashley-phosphate
 * POST /api/coming-soon
 *
 * Creates or updates a 02 Leads row. Status is set only on a brand-new row (New).
 * Updates never change Status.
 */
import { locations } from "../../locations.js";
import { BUSINESS_TYPES, categoryLabel } from "./business-types.js";

const NOTION_VERSION = "2022-06-28";
const PROFESSION = {
  "Hair stylist": "Hairstylist",
  "Hair extensions": "Hair extensions specialist",
  Barber: "Barber",
  Nails: "Nail tech",
  Lashes: "Lash tech",
  Brows: "Brow tech",
  "Skin care": "Esthetician",
  Massage: "Massage therapist",
  "Med spa / aesthetics": "Med spa professional",
  "Permanent makeup / microblading": "Permanent makeup artist",
  Tattoo: "Tattoo artist",
  Waxing: "Waxing specialist",
  Makeup: "Makeup artist",
  "Wellness & holistic": "Wellness coach",
  Fitness: "Personal trainer",
  Other: "Other",
};
const SIZES = new Set(["Small", "Medium", "Large", "Not sure"]);
const TIMING = new Set(["ASAP", "1-3 months", "3-6 months", "Just looking"]);
const SUITE_OPTION = {
  Small: "Small",
  Medium: "Medium",
  Large: "Large",
  "Not sure": "Not sure yet — show me around",
};
const hits = new Map();

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

export function chosenTypes(values) {
  const names = [];
  for (const item of values || []) {
    const label = categoryLabel(item);
    if (!BUSINESS_TYPES.includes(label)) return null;
    if (!names.includes(label)) names.push(label);
  }
  return names;
}

export function leadScore({ timing, size, current, categories }) {
  let score = 0;
  const why = [];
  if (timing === "ASAP") { score += 3; why.push("Can move in ASAP"); }
  else if (timing === "1-3 months") { score += 2; why.push("Can move in within 3 months"); }
  else if (timing === "3-6 months") { score += 1; why.push("Can move in within 6 months"); }
  if (size && size !== "Not sure") { score += 2; why.push("Chose a suite size"); }
  if (String(current || "").trim()) { score += 2; why.push("Told us where they work now"); }
  if (categories && categories.length) { score += 1; why.push("Named the work they do"); }
  return { score, why };
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
  return { rich_text: [{ type: "text", text: { content: String(content).slice(0, 1900) } }] };
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function plainTitle(page) {
  const title = ((page.properties || {}).Name || {}).title || [];
  return title.map((part) => part.plain_text || "").join("");
}

function plainNotes(page) {
  const notes = ((page.properties || {}).Notes || {}).rich_text || [];
  return notes.map((part) => part.plain_text || "").join("");
}

function field(notes, label) {
  const match = String(notes || "").match(new RegExp("^" + label + ": (.+)$", "m"));
  return match ? match[1].trim() : "";
}

export function buildNotes(place, info) {
  const score = leadScore(info);
  const lines = [
    place.noteTag,
    "Proposed site: " + place.address,
    info.categories && info.categories.length ? "Types of business: " + info.categories.join(", ") : "",
    info.size ? "Suite size wanted: " + info.size : "",
    info.timing ? "Move-in: " + info.timing : "",
    info.current ? "Works now: " + info.current : "",
    "OK to text and call: yes",
    "No payment taken.",
    "Lead score: " + score.score,
    score.why.length ? "Score why: " + score.why.join(". ") + "." : "",
    "Ref: " + info.ref,
    info.referredBy ? "Referred by: " + info.referredBy : "",
    "Referral count: " + (info.referralCount || 0),
    info.utm.source ? "UTM source: " + info.utm.source : "",
    info.utm.medium ? "UTM medium: " + info.utm.medium : "",
    info.utm.campaign ? "UTM campaign: " + info.utm.campaign : "",
    info.utm.content ? "UTM content: " + info.utm.content : "",
    info.utm.term ? "UTM term: " + info.utm.term : "",
    info.referrer ? "Referrer: " + info.referrer : "",
  ];
  return lines.filter(Boolean).join("\n");
}

function tooFast(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const recent = (hits.get(ip) || []).filter((time) => now - time < windowMs);
  if (recent.length >= 8) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

async function notion(token, path, body, method = "POST") {
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

async function queryLeads(token, databaseId, filter) {
  const pages = [];
  let cursor = "";
  do {
    const body = { filter, page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notion(token, "/databases/" + databaseId + "/query", body);
    if (!res.ok) {
      const detail = await res.text();
      console.error("Coming soon query failed", res.status, detail.slice(0, 180));
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
    if (countableName(plainTitle(page))) raw += 1;
  }
  return capCount(raw, place.goal);
}

async function findContact(token, databaseId, email, phone) {
  const filters = [];
  if (email) filters.push({ property: "Email", email: { equals: email } });
  if (phone) filters.push({ property: "Phone", phone_number: { equals: phone } });
  if (!filters.length) return null;
  const pages = await queryLeads(token, databaseId, filters.length === 1 ? filters[0] : { or: filters });
  if (!pages || !pages.length) return null;
  return pages[0];
}

async function findByRef(token, databaseId, code) {
  if (!code || !/^[a-z0-9]{6,12}$/.test(code)) return null;
  const pages = await queryLeads(token, databaseId, {
    property: "Notes",
    rich_text: { contains: "Ref: " + code },
  });
  if (!pages) return null;
  return pages.find((page) => field(plainNotes(page), "Ref") === code) || null;
}

function shareUrl(request, slug, ref) {
  return new URL("/" + slug + "?ref=" + ref, request.url).toString();
}

function utmFrom(body) {
  const utm = body.utm && typeof body.utm === "object" ? body.utm : {};
  return {
    source: clip(utm.source, 80),
    medium: clip(utm.medium, 80),
    campaign: clip(utm.campaign, 80),
    content: clip(utm.content, 80),
    term: clip(utm.term, 80),
  };
}

export async function onRequestGet(context) {
  const slug = new URL(context.request.url).searchParams.get("slug") || "";
  const place = findLocation(slug);
  if (!place) return json({ ok: false, error: "That studio is not on the list." }, 404);
  const token = context.env.NOTION_LEADS_TOKEN;
  const databaseId = context.env.NOTION_LEADS_DB_ID;
  if (!token || !databaseId) return json({ ok: false, error: "Notion settings are missing on this deployment." }, 502);
  const tally = await countSignups(token, databaseId, place);
  if (!tally) return json({ ok: false, error: "Notion did not answer." }, 502);
  return json({ ok: true, slug: place.slug, ...tally });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (tooFast(ip)) return json({ ok: false, error: "Please wait a minute and try again." }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Please check the form and try again." }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "Please check the form and try again." }, 400);
  if (clip(body.company || body.hp, 200)) return json({ ok: true, count: 0, goal: 30, left: 30, ref: "", shareUrl: "" });

  const place = findLocation(clip(body.slug, 80));
  if (!place) return json({ ok: false, error: "That studio is not on the list." }, 400);
  if (place.status === "closed") return json({ ok: false, error: "This list is closed." }, 400);

  const step = String(body.step || "1");
  const name = clip(body.name, 120);
  const phone = clip(body.phone, 40);
  const email = clip(body.email, 120);
  const consent = body.consent === true || body.consent === "yes" || body.consent === "on";
  if (!name) return json({ ok: false, error: "Please add your name." }, 400);
  if (phone.replace(/\D/g, "").length < 10) return json({ ok: false, error: "Please add a phone number we can text or call." }, 400);
  if (!validEmail(email)) return json({ ok: false, error: "That email address doesn't look quite right." }, 400);
  if (!consent) return json({ ok: false, error: "Please say we can text and call you." }, 400);

  let categories = [];
  let size = "";
  let timing = "";
  let current = "";
  if (step === "2") {
    categories = chosenTypes(Array.isArray(body.categories) ? body.categories : []);
    size = clip(body.size, 40);
    timing = clip(body.timing, 40);
    current = clip(body.current, 160);
    if (!categories) return json({ ok: false, error: "Please choose a type of business from the list." }, 400);
    if (!categories.length) return json({ ok: false, error: "Please choose at least one type of business." }, 400);
    if (!SIZES.has(size)) return json({ ok: false, error: "Please choose a suite size." }, 400);
    if (!TIMING.has(timing)) return json({ ok: false, error: "Please tell us when you could move in." }, 400);
  }

  const token = env.NOTION_LEADS_TOKEN;
  const databaseId = env.NOTION_LEADS_DB_ID;
  if (!token || !databaseId) return json({ ok: false, error: "Notion settings are missing on this deployment." }, 500);

  let existing = null;
  try {
    existing = await findContact(token, databaseId, email, phone);
  } catch (err) {
    console.error("Coming soon lookup failed", err && err.message);
  }
  const oldNotes = existing ? plainNotes(existing) : "";
  const ref = field(oldNotes, "Ref") || crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const referredBy = clip(body.ref, 12).toLowerCase();
  const info = {
    categories: categories.length ? categories : field(oldNotes, "Types of business").split(", ").filter(Boolean),
    size: size || field(oldNotes, "Suite size wanted"),
    timing: timing || field(oldNotes, "Move-in"),
    current: current || field(oldNotes, "Works now"),
    ref,
    referredBy: (referredBy && referredBy !== ref) ? referredBy : field(oldNotes, "Referred by"),
    referralCount: Number(field(oldNotes, "Referral count") || 0),
    utm: utmFrom(body),
    referrer: clip(body.referrer, 200),
  };
  if (!info.utm.source && field(oldNotes, "UTM source")) info.utm.source = field(oldNotes, "UTM source");
  const notes = buildNotes(place, info);
  const existingSource = existing && existing.properties && existing.properties.Source && existing.properties.Source.select
    ? existing.properties.Source.select.name
    : "";
  const ours = !existing || oldNotes.includes(place.noteTag) || existingSource === place.source;
  const parts = name.split(" ");
  const properties = {
    Name: { title: [{ type: "text", text: { content: name } }] },
    "First name": richText(parts[0]),
    Phone: { phone_number: phone },
    Email: { email },
    Notes: richText(notes),
    Source: { select: { name: place.source } },
    "Preferred location": { select: { name: place.locationOption } },
  };
  if (parts.length > 1) properties["Last name"] = richText(parts.slice(1).join(" "));
  if (info.categories.length) {
    const profession = info.categories.map((item) => PROFESSION[item]).find(Boolean) || "Other";
    properties.Profession = { select: { name: profession } };
  }
  if (SIZES.has(info.size)) properties["Suite interested in"] = { select: { name: SUITE_OPTION[info.size] } };
  const rent = (place.rents || []).find((item) => item.size === info.size);
  if (rent) properties["Weekly budget"] = { number: rent.weekly };

  if (existing && !ours) {
    properties.Notes = richText((oldNotes ? oldNotes + "\n\n" : "") + notes);
    delete properties.Source;
    delete properties["Preferred location"];
    delete properties.Profession;
    delete properties["Suite interested in"];
    delete properties["Weekly budget"];
  }
  let saved = false;
  try {
    if (existing) saved = await patchLead(token, existing.id, properties);
    else {
      properties.Status = { status: { name: "New" } };
      properties["Submitted at"] = { date: { start: new Date().toISOString() } };
      saved = await createLead(token, databaseId, properties);
    }
  } catch (err) {
    console.error("Coming soon save failed", err && err.message);
  }
  if (!saved) return json({ ok: false, error: "Could not save your request. Call (843) 420-9965." }, 502);

  if (!existing && info.referredBy) {
    try {
      const referrer = await findByRef(token, databaseId, info.referredBy);
      if (referrer) {
        const referrerNotes = plainNotes(referrer);
        const next = Number(field(referrerNotes, "Referral count") || 0) + 1;
        const updated = referrerNotes.replace(/^Referral count: \d+$/m, "Referral count: " + next);
        await patchLead(token, referrer.id, { Notes: richText(updated.includes("Referral count:") ? updated : referrerNotes + "\nReferral count: " + next) });
      }
    } catch (err) {
      console.error("Referral count was not updated", err && err.message);
    }
  }

  const tally = await countSignups(token, databaseId, place);
  return json({
    ok: true,
    step,
    ref,
    shareUrl: shareUrl(request, place.slug, ref),
    ...(tally || capCount(0, place.goal)),
  });
}

async function createLead(token, databaseId, properties) {
  const send = () => notion(token, "/pages", { parent: { database_id: databaseId }, properties });
  let res = await send();
  if (res.ok) return true;
  const detail = await res.text();
  const optional = ["Source", "Preferred location", "Profession", "Suite interested in", "Weekly budget"];
  const dropped = optional.filter((name) => properties[name] && detail.includes(name));
  if (!dropped.length) {
    console.error("Coming soon lead failed", res.status, detail.slice(0, 240));
    return false;
  }
  for (const name of dropped) delete properties[name];
  res = await send();
  if (!res.ok) return false;
  return true;
}

async function patchLead(token, pageId, properties) {
  delete properties.Status;
  const res = await notion(token, "/pages/" + pageId, { properties }, "PATCH");
  if (res.ok) return true;
  const detail = await res.text();
  const optional = ["Source", "Preferred location", "Profession", "Suite interested in", "Weekly budget"];
  const dropped = optional.filter((name) => properties[name] && detail.includes(name));
  for (const name of dropped) delete properties[name];
  if (!dropped.length) {
    console.error("Coming soon update failed", res.status, detail.slice(0, 240));
    return false;
  }
  const again = await notion(token, "/pages/" + pageId, { properties }, "PATCH");
  return again.ok;
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Method not allowed." }, 405);
}
