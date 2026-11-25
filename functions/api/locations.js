/**
 * Studios the join form and the public directory share.
 * slug is the URL key (?location=summerville). name is the Notion select.
 * id matches data/locations.json so the location page can filter.
 */
export const STUDIOS = [
  {
    slug: "summerville",
    name: "Summerville",
    id: "summerville-ladson",
    city: "Summerville",
    region: "SC",
    address: "4498 Ladson Rd, Summerville, SC 29485",
    street: "4498 Ladson Rd",
    page: "/locations/summerville",
    lat: 32.958014,
    lng: -80.15923,
    directions: "https://www.google.com/maps/search/?api=1&query=Oh+La+La+Salon+%26+Studios+4498+Ladson+Rd+Summerville+SC+29485",
  },
];

export function studioFromInput(value) {
  const key = String(value ?? "").trim().toLowerCase();
  if (!key) return null;
  return STUDIOS.find((studio) =>
    studio.slug === key || studio.id === key || studio.name.toLowerCase() === key
  ) || null;
}
