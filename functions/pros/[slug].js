import { loadProfiles, previewSample, previewSampleAllowed } from "../api/pros-data.js";
import { renderMissing, renderProfile } from "./page.js";

function html(body, status, cache) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cache,
    },
  });
}

export async function onRequest(context) {
  const slug = String((context.params && context.params.slug) || "").replace(/\/$/, "");
  if (!slug || slug === "join") {
    return Response.redirect(new URL("/pros/join", context.request.url), 302);
  }

  let profiles = [];
  try {
    const loaded = await loadProfiles(context.env, "");
    if (loaded) profiles = loaded;
  } catch (err) {
    console.error("Profile lookup failed", err && err.message);
  }

  const match = profiles.find((pro) => pro.slug === slug);
  if (!match) {
    if (previewSampleAllowed(context.env) && slug === previewSample().slug) {
      return html(renderProfile(previewSample(), profiles.filter((pro) => pro.locationId === "summerville-ladson").slice(0, 6)), 200, "no-store");
    }
    return html(renderMissing(), 404, "no-store");
  }

  const others = profiles.filter((pro) => pro.locationId === match.locationId && pro.slug !== match.slug).slice(0, 6);
  return html(renderProfile(match, others), 200, "public, max-age=300");
}
