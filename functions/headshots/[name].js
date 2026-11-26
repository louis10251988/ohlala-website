import { openHeadshot } from "../api/headshot.js";

export async function onRequestGet(context) {
  const name = String((context.params && context.params.name) || "").replace(/\/$/, "");
  try {
    const image = await openHeadshot(context.env, name);
    if (!image) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    return new Response(image.bytes, {
      status: 200,
      headers: {
        "Content-Type": image.mime,
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Headshot read failed", err && err.message);
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return new Response("Method not allowed.", {
    status: 405,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
