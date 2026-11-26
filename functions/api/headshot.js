/**
 * Headshots are stored on the pro's Notion page, then shown from a stable
 * site URL. The Photo URL property keeps that address. Older requests that
 * send a normal image URL still use that URL as-is.
 */
const FILE_VERSION = "2026-03-11";
const PAGE_VERSION = "2022-06-28";
const SITE = "https://ohlalasalonstudio.com";

export const HEADSHOT_MAX = 5 * 1024 * 1024;

export function inspectHeadshot(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (!data.byteLength || data.byteLength > HEADSHOT_MAX) return null;
  return sniff(data);
}

function sniff(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === "heic" || brand === "heix" || brand === "heif" || brand === "mif1" || brand === "msf1") {
      return { ext: "heic", mime: "image/heic" };
    }
  }
  return null;
}

export function headshotPath(pageId, ext) {
  const id = String(pageId || "").toLowerCase().replace(/[^a-f0-9-]/g, "");
  return "/headshots/" + id + "." + ext;
}

export function headshotUrl(pageId, ext) {
  return SITE + headshotPath(pageId, ext);
}

export function hostedPhoto(url, origin) {
  const raw = String(url || "");
  if (!raw || !origin) return raw;
  try {
    const parsed = new URL(raw);
    if (!parsed.pathname.startsWith("/headshots/")) return raw;
    return new URL(parsed.pathname, origin).toString();
  } catch {
    return raw;
  }
}

async function notion(token, version, path, options) {
  const headers = {
    Authorization: "Bearer " + token,
    "Notion-Version": version,
  };
  if (options.json) headers["Content-Type"] = "application/json";
  const res = await fetch("https://api.notion.com/v1" + path, {
    method: options.method || "GET",
    headers,
    body: options.body,
  });
  return res;
}

export async function storeHeadshot(token, pageId, bytes, kind) {
  const created = await notion(token, FILE_VERSION, "/file_uploads", {
    method: "POST",
    json: true,
    body: JSON.stringify({ filename: "headshot." + kind.ext, content_type: kind.mime }),
  });
  if (!created.ok) {
    console.error("Headshot upload did not start", created.status);
    return false;
  }
  const upload = await created.json();
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: kind.mime }), "headshot." + kind.ext);
  const sent = await notion(token, FILE_VERSION, "/file_uploads/" + upload.id + "/send", {
    method: "POST",
    body: form,
  });
  if (!sent.ok) {
    console.error("Headshot upload failed", sent.status);
    return false;
  }
  const attached = await notion(token, FILE_VERSION, "/blocks/" + pageId + "/children", {
    method: "PATCH",
    json: true,
    body: JSON.stringify({
      children: [{
        object: "block",
        type: "image",
        image: { type: "file_upload", file_upload: { id: upload.id } },
      }],
    }),
  });
  if (!attached.ok) {
    console.error("Headshot could not be attached", attached.status);
    return false;
  }
  const patched = await notion(token, PAGE_VERSION, "/pages/" + pageId, {
    method: "PATCH",
    json: true,
    body: JSON.stringify({
      properties: { "Photo URL": { url: headshotUrl(pageId, kind.ext) } },
    }),
  });
  if (!patched.ok) {
    console.error("Headshot URL was not saved", patched.status);
    return false;
  }
  return true;
}

function sameId(a, b) {
  return String(a || "").replace(/-/g, "").toLowerCase() === String(b || "").replace(/-/g, "").toLowerCase();
}

export async function openHeadshot(env, name) {
  const match = String(name || "").toLowerCase().match(/^([0-9a-f-]{32,36})\.(jpg|png|webp|heic)$/);
  if (!match) return null;
  const token = env.NOTION_LEADS_TOKEN;
  const databaseId = env.NOTION_PROS_DB_ID;
  if (!token || !databaseId) return null;
  const pageId = match[1];
  const pageRes = await notion(token, PAGE_VERSION, "/pages/" + pageId, {});
  if (!pageRes.ok) return null;
  const page = await pageRes.json();
  const parent = page.parent || {};
  const parentId = parent.database_id || parent.data_source_id || "";
  if (!sameId(parentId, databaseId)) return null;
  const blocksRes = await notion(token, PAGE_VERSION, "/blocks/" + pageId + "/children?page_size=20", {});
  if (!blocksRes.ok) return null;
  const blocks = await blocksRes.json();
  const image = (blocks.results || []).find((block) => block.type === "image" && block.image);
  if (!image) return null;
  const file = image.image.file || image.image.external || {};
  if (!file.url) return null;
  const fetched = await fetch(file.url);
  if (!fetched.ok) return null;
  const bytes = await fetched.arrayBuffer();
  const mime = match[2] === "png" ? "image/png" : match[2] === "webp" ? "image/webp" : match[2] === "heic" ? "image/heic" : "image/jpeg";
  return { bytes, mime };
}
