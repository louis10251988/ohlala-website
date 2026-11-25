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
import { loadProfiles, toCard } from "./pros-data.js";

function json(data, status, cache) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
    },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const params = new URL(request.url).searchParams;
  const asked = params.get("location");
  let locationName = "";
  if (asked) {
    const studio = studioFromInput(asked);
    if (!studio) return json([], 200, "public, max-age=300");
    locationName = studio.name;
  }

  let profiles;
  try {
    profiles = await loadProfiles(env, locationName);
  } catch (err) {
    console.error("Notion directory request failed", err && err.message);
    return json({ ok: false, error: "The directory is not available." }, 502, "no-store");
  }
  if (!profiles) return json({ ok: false, error: "The directory is not available." }, 502, "no-store");

  return json(profiles.map(toCard), 200, "public, max-age=300");
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return json({ ok: false, error: "Method not allowed. Use GET." }, 405, "no-store");
}
