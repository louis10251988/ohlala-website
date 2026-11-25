/**
 * Studios the join form and the public directory share.
 * slug is the URL key (?location=summerville). name is the Notion select.
 * id matches data/locations.json so the location page can filter.
 */
export const STUDIOS = [
  { slug: "summerville", name: "Summerville", id: "summerville-ladson" },
];

export function studioFromInput(value) {
  const key = String(value ?? "").trim().toLowerCase();
  if (!key) return null;
  return STUDIOS.find((studio) =>
    studio.slug === key || studio.id === key || studio.name.toLowerCase() === key
  ) || null;
}
