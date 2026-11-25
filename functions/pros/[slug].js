import { loadProfiles, previewSampleAllowed, previewSamples } from "../api/pros-data.js";
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
  if (!slug) return html(renderMissing(), 404, "no-store");

  let profiles = [];
  try {
    const loaded = await loadProfiles(context.env, "");
    if (loaded) profiles = loaded;
  } catch (err) {
    console.error("Profile lookup failed", err && err.message);
  }

  const preview = previewSampleAllowed(context.env) ? previewSamples() : [];
  const pool = profiles.concat(preview.filter((sample) => !profiles.some((pro) => pro.slug === sample.slug)));
  const match = pool.find((pro) => pro.slug === slug);
  if (!match || (match.isPreviewSample && !previewSampleAllowed(context.env))) {
    return html(renderMissing(), 404, "no-store");
  }

  const mine = new Set(match.categories || []);
  const others = pool.filter((pro) => {
    if (pro.slug === match.slug || pro.locationId !== match.locationId) return false;
    if (!mine.size) return true;
    return (pro.categories || []).some((cat) => mine.has(cat));
  }).slice(0, 4);
  const cache = match.isPreviewSample ? "no-store" : "public, max-age=300";
  return html(renderProfile(match, others), 200, cache);
}
