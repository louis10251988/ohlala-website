/**
 * Public type-of-business names. These match the 03 Tenants
 * "Type of business" multi-select, exact spelling.
 *
 * The website does not read this list from Notion. Join submissions
 * save these names on 08 Website Pro List → Categories. Older rows
 * may still store the previous slugs; those display as the names below.
 */

export const BUSINESS_TYPES = [
  "Hair stylist",
  "Hair extensions",
  "Hair replacement / scalp care",
  "Textured / natural hair",
  "Braids",
  "Locs",
  "Barber",
  "Nails",
  "Lashes",
  "Brows",
  "Threading",
  "Waxing",
  "Sugaring",
  "Laser hair removal / electrolysis",
  "Skin care",
  "Spa",
  "Med spa / aesthetics",
  "Body contouring",
  "Beauty enhancements",
  "Weight loss / medical",
  "Makeup",
  "Permanent makeup / microblading",
  "Tattoo",
  "Tattoo removal",
  "Piercing & jewelry",
  "Massage",
  "Wellness & holistic",
  "Physical therapy / chiropractic",
  "Fitness",
  "Tanning",
  "Teeth whitening",
  "Ultrasound",
  "Photo studio",
  "Pet grooming",
  "Retail & lifestyle",
  "Other",
];

const BY_KEY = new Map(BUSINESS_TYPES.map((name) => [name.toLowerCase(), name]));

/** Previous Website Pro List slugs, shown and saved as the current names. */
export const LEGACY_CATEGORIES = {
  hair: "Hair stylist",
  barber: "Barber",
  nails: "Nails",
  "lashes-brows": "Lashes",
  skin: "Skin care",
  tattoo: "Tattoo",
  massage: "Massage",
  wellness: "Wellness & holistic",
  fitness: "Fitness",
  other: "Other",
};

const HAIR = new Set([
  "Hair stylist",
  "Hair extensions",
  "Hair replacement / scalp care",
  "Textured / natural hair",
  "Braids",
  "Locs",
  "Barber",
]);

export const CATEGORIES = {};
for (const name of BUSINESS_TYPES) CATEGORIES[name] = name;
for (const [slug, name] of Object.entries(LEGACY_CATEGORIES)) CATEGORIES[slug] = name;

export function categoryLabel(value) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  return BY_KEY.get(raw.toLowerCase()) || LEGACY_CATEGORIES[raw.toLowerCase()] || raw;
}

export function canonicalCategory(value) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  return BY_KEY.get(raw.toLowerCase()) || LEGACY_CATEGORIES[raw.toLowerCase()] || "";
}

export function canonicalCategories(values) {
  const names = [];
  for (const item of values || []) {
    const name = canonicalCategory(item);
    if (!name) return null;
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

export function labelCategories(values) {
  const names = [];
  for (const item of values || []) {
    const name = categoryLabel(item);
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

export function isHairCategory(value) {
  return HAIR.has(categoryLabel(value));
}
