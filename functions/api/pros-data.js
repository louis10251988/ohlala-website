/**
 * Shared reader for approved tenant profiles.
 * Directory cards and /pros/<slug> both use this. Pending and Hidden rows
 * are never returned.
 */
import { studioFromInput } from "./locations.js";

const NOTION_VERSION = "2022-06-28";

export const CATEGORIES = {
  hair: "Hair",
  barber: "Barber",
  nails: "Nails",
  "lashes-brows": "Lashes & Brows",
  skin: "Skin",
  tattoo: "Tattoo & PMU",
  massage: "Massage",
  wellness: "Wellness",
  fitness: "Fitness",
  other: "Other",
};

export function textOf(prop) {
  if (!prop) return "";
  if (prop.type === "title") return (prop.title || []).map((part) => part.plain_text || "").join("");
  if (prop.type === "rich_text") return (prop.rich_text || []).map((part) => part.plain_text || "").join("");
  if (prop.type === "url") return prop.url || "";
  if (prop.type === "email") return prop.email || "";
  if (prop.type === "phone_number") return prop.phone_number || "";
  if (prop.type === "select") return prop.select && prop.select.name ? prop.select.name : "";
  if (prop.type === "checkbox") return !!prop.checkbox;
  if (prop.type === "multi_select") return (prop.multi_select || []).map((item) => item.name).filter(Boolean);
  return "";
}

export function safeUrl(value) {
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

export function phoneHref(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return "tel:+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "tel:+" + digits;
  if (digits.length >= 7) return "tel:+" + digits;
  return "";
}

export function suiteLabel(value) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (/^suite\b/i.test(raw)) return raw;
  return "Suite " + raw;
}

export function slugPart(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function profileSlug(name, suite, used) {
  const suiteBit = String(suite || "").replace(/^suite\s+/i, "");
  const base = ((slugPart(name) || "pro") + "-suite-" + (slugPart(suiteBit) || "x")).slice(0, 80);
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = (base + "-" + n).slice(0, 80);
    n += 1;
  }
  used.add(slug);
  return slug;
}

export function parseServices(value) {
  return String(value || "").split("\n").map((line) => {
    const parts = line.split("·").map((part) => part.trim());
    if (!parts[0]) return null;
    const item = { name: parts[0] };
    if (parts[1]) item.duration = parts[1];
    if (parts[2]) item.price = parts[2];
    return item;
  }).filter(Boolean);
}

export function parseLines(value) {
  return String(value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function mapPage(page, used) {
  const props = page.properties || {};
  const name = textOf(props.Name).replace(/\s+/g, " ").trim();
  const studio = studioFromInput(textOf(props.Location));
  if (!name || !studio) return null;
  if (textOf(props.Status) !== "Approved") return null;
  if (!textOf(props.Consent)) return null;

  const suite = suiteLabel(textOf(props.Suite));
  const slug = profileSlug(name, suite, used);
  const vagaroUrl = safeUrl(textOf(props["Vagaro link"]));
  const bookingUrl = safeUrl(textOf(props["Booking URL"]));
  const phone = textOf(props.Phone);
  const bookHref = vagaroUrl || bookingUrl || phoneHref(phone);
  const photos = parseLines(textOf(props["Portfolio photos"])).map(safeUrl).filter(Boolean).slice(0, 9);

  return {
    name,
    businessName: textOf(props.Business).replace(/\s+/g, " ").trim(),
    suite,
    phone,
    email: textOf(props.Email).trim(),
    photo: safeUrl(textOf(props["Photo URL"])),
    photos,
    categories: textOf(props.Categories) || [],
    services: parseServices(textOf(props.Services)),
    bio: textOf(props.Bio).trim(),
    hours: parseLines(textOf(props.Hours)),
    languages: textOf(props.Languages) || [],
    payments: textOf(props.Payments) || [],
    acceptingNewClients: !!textOf(props["Accepting New Clients"]),
    bookingUrl,
    vagaroUrl,
    instagram: safeUrl(textOf(props.Instagram)),
    facebook: safeUrl(textOf(props.Facebook)),
    tiktok: safeUrl(textOf(props.TikTok)),
    website: safeUrl(textOf(props.Website)),
    bookHref,
    href: bookHref,
    locationId: studio.id,
    studio,
    slug,
    profilePath: "/pros/" + slug,
    active: true,
    consentApproved: true,
    isSample: false,
  };
}

export function toCard(profile) {
  const card = { ...profile };
  delete card.email;
  delete card.bio;
  delete card.hours;
  delete card.photos;
  delete card.studio;
  return card;
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

export async function queryApproved(token, databaseId, locationName, repaired) {
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

export async function loadProfiles(env, locationName) {
  const token = env.NOTION_LEADS_TOKEN;
  const databaseId = env.NOTION_PROS_DB_ID;
  if (!token || !databaseId) {
    console.error("Missing NOTION_LEADS_TOKEN or NOTION_PROS_DB_ID");
    return null;
  }
  const pages = await queryApproved(token, databaseId, locationName || "");
  if (!pages) return null;
  const used = new Set();
  return pages.map((page) => mapPage(page, used)).filter(Boolean);
}

export function previewSampleAllowed(env) {
  const branch = env && env.CF_PAGES_BRANCH;
  return Boolean(branch) && branch !== "main";
}

function sampleBase(studio, fields) {
  return {
    phone: "(843) 420-9965",
    email: "",
    languages: ["English"],
    payments: ["Card", "Cash"],
    acceptingNewClients: true,
    bookingUrl: "https://ohlalasalonstudio.com/locations/summerville",
    vagaroUrl: "https://www.vagaro.com/",
    instagram: "https://www.instagram.com/",
    facebook: "https://facebook.com/352835481242473",
    tiktok: "https://www.tiktok.com/",
    website: "https://ohlalasalonstudio.com",
    locationId: studio.id,
    studio,
    active: true,
    consentApproved: true,
    isSample: true,
    isPreviewSample: true,
    ...fields,
  };
}

export function previewSamples() {
  const studio = studioFromInput("summerville");
  const camille = sampleBase(studio, {
    name: "Camille Brooks",
    businessName: "Brooks Color Room",
    suite: "Suite 4",
    photo: "/images/real/suite-1-desk.webp",
    photos: ["/images/real/suite-1.webp", "/images/real/studio-photoshoot-1.webp"],
    categories: ["hair"],
    services: [
      { name: "Lived-in color", duration: "2.5 hr", price: "from $180" },
      { name: "Haircut", duration: "45 min", price: "from $55" },
      { name: "Gloss", duration: "45 min", price: "from $65" },
    ],
    bio: "Camille works one-on-one in a private suite at Oh La La Summerville. She focuses on soft color, healthy hair, and cuts that are easy to live with between visits.",
    hours: [
      "Monday: Closed",
      "Tuesday: 10:00 AM – 6:00 PM",
      "Wednesday: 10:00 AM – 6:00 PM",
      "Thursday: 10:00 AM – 7:00 PM",
      "Friday: 9:00 AM – 5:00 PM",
      "Saturday: 9:00 AM – 2:00 PM",
      "Sunday: Closed",
    ],
    slug: "camille-brooks-suite-4",
    profilePath: "/pros/camille-brooks-suite-4",
  });
  const lane = sampleBase(studio, {
    name: "Avery Lane",
    businessName: "Lane Studio",
    suite: "Suite 8",
    photo: "/images/real/tenant-station-1.webp",
    photos: ["/images/real/suite-1-desk.webp"],
    categories: ["hair"],
    services: [{ name: "Blowout", duration: "45 min", price: "from $45" }],
    bio: "Avery styles hair in a private suite down the hall, with time set aside for each client.",
    hours: ["Monday: 11:00 AM – 7:00 PM", "Tuesday: 11:00 AM – 7:00 PM", "Sunday: Closed"],
    slug: "avery-lane-suite-8",
    profilePath: "/pros/avery-lane-suite-8",
  });
  for (const pro of [camille, lane]) {
    pro.bookHref = pro.bookingUrl;
    pro.href = pro.bookingUrl;
  }
  return [camille, lane];
}

export function previewSample() {
  return previewSamples()[0];
}
