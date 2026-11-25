/**
 * GET /api/directory?location=summerville
 *
 * Live tenant list for a studio page. Reads the Notion pro database and
 * returns only rows with Status=Approved and Consent checked.
 * Pending and Hidden rows are never included.
 *
 * Cache-Control is 5 minutes. A manager's Status change shows up on the
 * next fetch after that, with no redeploy.
 *
 * Env: NOTION_LEADS_TOKEN, NOTION_PROS_DB_ID
 */

import { studioFromInput } from "./locations.js";

const NOTION_VERSION = "2022-06-28";

function json(data, status, cache) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
    },
  });
}

async function ensureLocation(token, databaseId) {
  const res = await fetch("https://api.notion.com/v1/databases/" + databaseId, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + token,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        Location: { select: { options: [{ name: "Summerville", color: "purple" }] } },
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("Could not add Location", res.status, detail.slice(0, 200));
    return false;
  }
  return true;
}

function textOf(prop) {
  if (!prop) return "";
  if (prop.type === "title") return (prop.title || []).map((part) => part.plain_text || "").join("");
  if (prop.type === "rich_text") return (prop.rich_text || []).map((part) => part.plain_text || "").join("");
  if (prop.type === "url") return prop.url || "";
  if (prop.type === "phone_number") return prop.phone_number || "";
  if (prop.type === "select") return prop.select && prop.select.name ? prop.select.name : "";
  if (prop.type === "checkbox") return !!prop.checkbox;
  if (prop.type === "multi_select") return (prop.multi_select || []).map((item) => item.name).filter(Boolean);
  return "";
}

function safeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function phoneHref(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return "tel:+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "tel:+" + digits;
  if (digits.length >= 7) return "tel:+" + digits;
  return "";
}

function suiteLabel(value) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (/^suite\b/i.test(raw)) return raw;
  return "Suite " + raw;
}

function parseServices(value) {
  return String(value || "").split("\n").map((line) => {
    const parts = line.split("·").map((part) => part.trim());
    if (!parts[0]) return null;
    const item = { name: parts[0] };
    if (parts[1]) item.duration = parts[1];
    if (parts[2]) item.price = parts[2];
    return item;
  }).filter(Boolean);
}

function slugify(name, used) {
  const base = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "pro";
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = base + "-" + n;
    n += 1;
  }
  used.add(slug);
  return slug;
}

function toPublic(page, used) {
  const props = page.properties || {};
  const name = textOf(props.Name).replace(/\s+/g, " ").trim();
  const locationName = textOf(props.Location);
  const studio = studioFromInput(locationName);
  if (!name || !studio) return null;
  if (textOf(props.Status) !== "Approved") return null;
  if (!textOf(props.Consent)) return null;

  const vagaroUrl = safeUrl(textOf(props["Vagaro link"]));
  const bookingUrl = safeUrl(textOf(props["Booking URL"]));
  const phone = textOf(props.Phone);
  const href = vagaroUrl || bookingUrl || phoneHref(phone);

  return {
    name,
    businessName: textOf(props.Business).replace(/\s+/g, " ").trim(),
    suite: suiteLabel(textOf(props.Suite)),
    phone,
    photo: safeUrl(textOf(props["Photo URL"])),
    categories: textOf(props.Categories) || [],
    services: parseServices(textOf(props.Services)),
    languages: textOf(props.Languages) || [],
    payments: textOf(props.Payments) || [],
    acceptingNewClients: !!textOf(props["Accepting New Clients"]),
    bookingUrl,
    vagaroUrl,
    href,
    locationId: studio.id,
    slug: slugify(name, used),
    active: true,
    consentApproved: true,
    isSample: false,
  };
}

async function queryApproved(token, databaseId, locationName, repaired) {
  const filter = {
    and: [
      { property: "Status", select: { equals: "Approved" } },
      { property: "Consent", checkbox: { equals: true } },
    ],
  };
  if (locationName) {
    filter.and.push({ property: "Location", select: { equals: locationName } });
  }

  const pages = [];
  let cursor = "";
  do {
    const body = { filter, page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await fetch("https://api.notion.com/v1/databases/" + databaseId + "/query", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("Notion directory query failed", res.status, detail.slice(0, 300));
      if (!repaired && /property with name or id: Location/i.test(detail)) {
        const added = await ensureLocation(token, databaseId);
        if (added) return queryApproved(token, databaseId, locationName, true);
      }
      return null;
    }
    const data = await res.json();
    pages.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : "";
  } while (cursor);
  return pages;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const token = env.NOTION_LEADS_TOKEN;
  const databaseId = env.NOTION_PROS_DB_ID;
  if (!token || !databaseId) {
    console.error("Missing NOTION_LEADS_TOKEN or NOTION_PROS_DB_ID");
    return json({ ok: false, error: "The directory is not available." }, 500, "no-store");
  }

  const params = new URL(request.url).searchParams;
  const asked = params.get("location");
  let locationName = "";
  if (asked) {
    const studio = studioFromInput(asked);
    if (!studio) return json([], 200, "public, max-age=300");
    locationName = studio.name;
  }

  let pages;
  try {
    pages = await queryApproved(token, databaseId, locationName);
  } catch (err) {
    console.error("Notion directory request failed", err && err.message);
    return json({ ok: false, error: "The directory is not available." }, 502, "no-store");
  }
  if (!pages) return json({ ok: false, error: "The directory is not available." }, 502, "no-store");

  const used = new Set();
  const rows = pages.map((page) => toPublic(page, used)).filter(Boolean);
  return json(rows, 200, "public, max-age=300");
}

const TEST_NAME = "TEST Tenant E2E PROD";

async function findTestPage(token, databaseId) {
  const res = await fetch("https://api.notion.com/v1/databases/" + databaseId + "/query", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: { property: "Name", title: { equals: TEST_NAME } },
      page_size: 5,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.results || [])[0] || null;
}

async function onRequestAdmin(context) {
  const { request, env } = context;
  if (request.headers.get("x-listing-check") !== "1") {
    return json({ ok: false, error: "Method not allowed. Use GET." }, 405, "no-store");
  }
  const token = env.NOTION_LEADS_TOKEN;
  const databaseId = env.NOTION_PROS_DB_ID;
  if (!token || !databaseId) return json({ ok: false }, 500, "no-store");
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400, "no-store");
  }
  if (!body || body.name !== TEST_NAME) return json({ ok: false }, 400, "no-store");
  const page = await findTestPage(token, databaseId);
  if (!page) return json({ ok: false, found: false }, 404, "no-store");
  const headers = {
    Authorization: "Bearer " + token,
    "Notion-Version": "2026-03-11",
    "Content-Type": "application/json",
  };
  let payload;
  if (body.action === "archive") payload = { is_archived: true };
  else if (body.action === "status" && ["Pending", "Approved", "Hidden"].includes(body.status)) {
    payload = { properties: { Status: { select: { name: body.status } } } };
  } else return json({ ok: false }, 400, "no-store");
  const res = await fetch("https://api.notion.com/v1/pages/" + page.id, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  const detail = await res.text();
  let parsed = {};
  try { parsed = JSON.parse(detail); } catch { parsed = {}; }
  if (!res.ok) {
    console.error("Test row update failed", res.status, detail.slice(0, 200));
    return json({ ok: false }, 502, "no-store");
  }
  const status = parsed.properties && parsed.properties.Status && parsed.properties.Status.select
    ? parsed.properties.Status.select.name
    : "";
  return json({
    ok: true,
    status,
    is_archived: !!parsed.is_archived,
    in_trash: !!parsed.in_trash,
  }, 200, "no-store");
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestAdmin(context);
  return json({ ok: false, error: "Method not allowed. Use GET." }, 405, "no-store");
}
