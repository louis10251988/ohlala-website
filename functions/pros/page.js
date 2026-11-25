import { header, footer, cssHref, fontHref } from "../../scripts/chrome.mjs";
import { CATEGORIES } from "../api/pros-data.js";
import { renderSVG } from "./qr.mjs";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function initials(name) {
  return String(name || "").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function phoneTel(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return "tel:+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "tel:+" + digits;
  if (digits.length >= 7) return "tel:+" + digits;
  return "";
}

function smsHref(value) {
  const tel = phoneTel(value);
  return tel ? tel.replace(/^tel:/, "sms:") : "";
}

function primaryBook(pro) {
  const vagaro = pro.vagaroUrl || "";
  const booking = pro.bookingUrl || "";
  if (booking && vagaro && booking !== vagaro) return booking;
  return vagaro || booking || phoneTel(pro.phone);
}

function iconLinks(pro, bookHref) {
  const links = [
    ["Instagram", pro.instagram],
    ["TikTok", pro.tiktok],
    ["Facebook", pro.facebook],
    ["Website", pro.website],
  ];
  if (pro.vagaroUrl && pro.vagaroUrl !== pro.bookingUrl && pro.vagaroUrl !== bookHref) {
    links.push(["Vagaro", pro.vagaroUrl]);
  }
  return links.filter(([, href]) => href);
}

const ICONS = {
  Instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>',
  TikTok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.5 3c.4 2.4 1.8 4 4.2 4.3v2.4c-1.5 0-2.9-.5-4.2-1.3v6.4a5.2 5.2 0 1 1-5.2-5.2c.3 0 .6 0 .9.1v2.5a2.7 2.7 0 1 0 1.9 2.6V3h2.4z"/></svg>',
  Facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z"/></svg>',
  Website: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c2.5 2.8 3.8 6.2 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-6.2-3.8-9s1.3-6.2 3.8-9z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  Vagaro: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7.5 8.5 12 16l4.5-7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function iconButton(label, href) {
  return `<a class="tenant-icon" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(label)}">${ICONS[label] || ""}</a>`;
}

function iconRow(links) {
  if (!links.length) return "";
  return `<span class="tenant-icons">${links.map(([label, href]) => iconButton(label, href)).join("")}</span>`;
}

function directionsUrl(suite) {
  const query = ["Oh La La Salon & Studios", suite, "4498 Ladson Rd, Summerville, SC 29485"].filter(Boolean).join(" ");
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

function toMinutes(match) {
  let hour = Number(match[1]) % 12;
  if (/pm/i.test(match[3])) hour += 12;
  return hour * 60 + Number(match[2] || 0);
}

export function openNow(hours, now = new Date()) {
  if (!hours || !hours.length) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = (parts.find((part) => part.type === "weekday") || {}).value || "";
  const hour = Number((parts.find((part) => part.type === "hour") || {}).value || 0);
  const minute = Number((parts.find((part) => part.type === "minute") || {}).value || 0);
  const line = hours.find((item) => item.toLowerCase().startsWith(weekday.toLowerCase()));
  if (!line) return null;
  if (/closed/i.test(line)) return false;
  const times = [...line.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi)];
  if (times.length < 2) return null;
  const start = toMinutes(times[0]);
  const end = toMinutes(times[1]);
  const current = (hour % 24) * 60 + minute;
  return current >= start && current < end;
}

function absoluteUrl(value) {
  if (!value) return "";
  if (/^https?:/i.test(value)) return value;
  if (value.startsWith("/")) return "https://ohlalasalonstudio.com" + value;
  return "";
}

function serviceNames(pro) {
  const names = (pro.services || []).map((item) => item.name).filter(Boolean);
  if (names.length) return names;
  return (pro.categories || []).map((slug) => CATEGORIES[slug] || slug);
}

export function renderProfile(pro, others) {
  const studio = pro.studio;
  const city = studio.city || studio.name;
  const suite = pro.suite || "";
  const business = pro.businessName || "";
  const title = business
    ? pro.name + (suite ? " (" + suite + ")" : "") + " | " + business + " | Oh La La Salon & Studios"
    : pro.name + " | Oh La La " + city;
  const description = (pro.bio || (pro.name + " sees clients one-on-one at Oh La La in " + city + ".")).replace(/\s+/g, " ").trim().slice(0, 160);
  const canonical = "https://ohlalasalonstudio.com" + pro.profilePath;
  const bookHref = primaryBook(pro);
  const links = iconLinks(pro, bookHref);
  const tel = phoneTel(pro.phone);
  const sms = smsHref(pro.phone);
  const book = bookHref
    ? `<a class="btn btn-primary" href="${esc(bookHref)}"${/^https?:/i.test(bookHref) ? ' target="_blank" rel="noopener"' : ""}>Book now</a>`
    : "";
  const call = tel ? `<a class="btn btn-outline" href="${esc(tel)}">Call</a>` : "";
  const text = sms ? `<a class="btn btn-outline" href="${esc(sms)}">Text</a>` : "";
  const icons = iconRow(links);
  const photoUrl = absoluteUrl(pro.photo);
  const photo = pro.photo
    ? `<img src="${esc(pro.photo)}" alt="${esc(pro.isPreviewSample ? "A private suite at Oh La La " + city : "Photo of " + pro.name)}" width="320" height="320" decoding="async" fetchpriority="high">`
    : `<span class="tenant-initials" aria-hidden="true">${esc(initials(pro.name))}</span>`;
  const accepting = pro.acceptingNewClients ? `<p class="tenant-accept">Accepting new clients</p>` : "";
  const sampleNote = pro.isPreviewSample ? `<p class="tenant-sample">Preview sample. This is not a live tenant.</p>` : "";
  const email = pro.email ? `<a href="mailto:${esc(pro.email)}">Email</a>` : "";
  const chips = serviceNames(pro);
  const services = chips.length
    ? `<section class="tenant-block"><h2>Services</h2><p class="pills">${chips.map((label) => `<span class="pill">${esc(label)}</span>`).join("")}</p>${serviceLines(pro)}</section>`
    : "";
  const bio = pro.bio ? `<section class="tenant-block tenant-bio"><p>${esc(pro.bio)}</p></section>` : "";
  const open = openNow(pro.hours);
  const openBadge = open === true ? `<span class="tenant-open">Open now</span>` : open === false ? `<span class="tenant-closed">Closed now</span>` : "";
  const hours = pro.hours && pro.hours.length
    ? `<section class="tenant-block"><h2>Hours ${openBadge}</h2><ul class="tenant-hours">${pro.hours.map((line) => `<li>${esc(line)}</li>`).join("")}</ul></section>`
    : "";
  const gallery = pro.photos && pro.photos.length
    ? `<section class="tenant-block"><h2>Portfolio</h2><div class="tenant-gallery">${pro.photos.map((src, index) => `<button class="tenant-shot" type="button" data-full="${esc(src)}" aria-label="Open photo ${index + 1}"><img src="${esc(src)}" alt="${esc(pro.isPreviewSample ? "A private suite at Oh La La " + city : "Work by " + pro.name)}" width="640" height="640" loading="lazy" decoding="async"></button>`).join("")}</div></section>`
    : "";
  const badges = [
    ...(pro.languages || []).map((item) => `<span class="pill">${esc(item)}</span>`),
    ...(pro.payments || []).map((item) => `<span class="pill">${esc(item)}</span>`),
  ];
  const factsHtml = badges.length ? `<section class="tenant-block"><h2>Good to know</h2><p class="pills">${badges.join("")}</p></section>` : "";
  const catLabel = ((pro.categories || []).map((slug) => CATEGORIES[slug] || slug)[0] || "").toLowerCase();
  const othersHtml = others && others.length
    ? `<section class="tenant-block"><h2>More ${catLabel ? esc(catLabel) + " " : ""}pros</h2><ul class="tenant-others">${others.map((item) => `<li><a href="${esc(item.profilePath)}">${esc(item.name)}${item.suite ? " (" + esc(item.suite) + ")" : ""}</a></li>`).join("")}</ul></section>`
    : "";
  const maps = directionsUrl(suite);
  const qr = renderSVG(canonical, { ecc: "M", border: 2, pixelSize: 8, blackColor: "#5D1A3A", whiteColor: "#FDFAF8" });
  const placeType = (pro.categories || []).some((cat) => cat === "hair" || cat === "barber") ? "HairSalon" : "HealthAndBeautyBusiness";
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        name: pro.name,
        url: canonical,
        ...(pro.phone ? { telephone: pro.phone } : {}),
        ...(photoUrl ? { image: photoUrl } : {}),
        worksFor: { "@id": "https://ohlalasalonstudio.com" + studio.page + "#studio" },
      },
      {
        "@type": [placeType, "LocalBusiness"],
        "@id": "https://ohlalasalonstudio.com" + studio.page + "#studio",
        name: "Oh La La Salon & Studios",
        url: "https://ohlalasalonstudio.com" + studio.page,
        telephone: "+18434209965",
        image: photoUrl || "https://ohlalasalonstudio.com/images/real/suite-1-desk.webp",
        address: {
          "@type": "PostalAddress",
          streetAddress: studio.street,
          addressLocality: studio.city,
          addressRegion: studio.region,
          postalCode: "29485",
          addressCountry: "US",
        },
        geo: { "@type": "GeoCoordinates", latitude: studio.lat, longitude: studio.lng },
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${pro.isPreviewSample ? '<meta name="robots" content="noindex, nofollow">' : '<link rel="canonical" href="' + esc(canonical) + '">'}
<meta property="og:title" content="${esc(pro.name + (suite ? " (" + suite + ")" : ""))}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:type" content="profile">
${photoUrl ? `<meta property="og:image" content="${esc(photoUrl)}">` : ""}
<link rel="stylesheet" href="${cssHref}">
<link rel="stylesheet" href="${fontHref}">
<script type="application/ld+json">
${JSON.stringify(graph).replace(/</g, "\\u003c")}
</script>
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
<body>
${header("locations")}
<main id="main" class="tenant-page">
  <header class="tenant-hero">
    <div class="wrap tenant-hero-in">
      <div class="tenant-photo">${photo}</div>
      <div class="tenant-id">
        <p class="crumbs"><a href="/">Home</a> / <a href="/locations/">Locations</a> / <a href="${esc(studio.page)}">${esc(city)}</a> / ${esc(pro.name)}</p>
        ${sampleNote}
        <h1>${esc(pro.name)}${suite ? ` <span class="tenant-suite">(${esc(suite)})</span>` : ""}</h1>
        <p class="tenant-kicker">${esc([business, city + ", " + (studio.region || "")].filter(Boolean).join(" | "))}</p>
        ${accepting}
        <p class="tenant-where"><a href="${esc(studio.page)}">View location</a><br>${esc(studio.address)}${suite ? " · " + esc(suite) : ""}</p>
        <div class="tenant-actions">${book}${icons}${call}${text}${email ? `<span class="tenant-contact">${email}</span>` : ""}</div>
        <div class="tenant-share">
          <button class="btn btn-outline" type="button" id="tenantShare" data-url="${esc(canonical)}" data-title="${esc(pro.name)}">Share</button>
          <details class="tenant-qr">
            <summary>QR code</summary>
            <div class="tenant-qr-img">${qr}</div>
            <p>Scan to open this profile.</p>
          </details>
        </div>
      </div>
    </div>
  </header>
  <div class="wrap tenant-body">
    ${services}
    ${bio}
    <div class="tenant-actions tenant-again">${book}${icons}<a class="btn btn-outline" href="${esc(studio.page)}">More pros</a></div>
    ${hours}
    ${gallery}
    ${factsHtml}
    <section class="tenant-block">
      <h2>Location</h2>
      <p>${esc(studio.address)}${suite ? " · " + esc(suite) : ""}</p>
      <div id="proMap" class="mini-map" data-lat="${studio.lat}" data-lng="${studio.lng}" aria-label="Map of Oh La La ${esc(city)}"></div>
      <p><a class="btn btn-outline" href="${esc(maps)}" target="_blank" rel="noopener">Directions to ${esc(suite || "the studio")}</a></p>
    </section>
    ${othersHtml}
  </div>
</main>
<div class="tenant-bar" role="region" aria-label="Book or contact ${esc(pro.name)}">
  ${book}${icons}${call}${text}
</div>
<dialog class="tenant-light" id="tenantLight">
  <button class="tenant-light-x" type="button">Close</button>
  <img alt="" width="720" height="720">
</dialog>
${footer({ sticky: false })}
<script>
(function(){
  var mapEl=document.getElementById("proMap");
  if(mapEl && "IntersectionObserver" in window){
    function load(src){return new Promise(function(resolve,reject){if(document.querySelector('script[src="'+src+'"]'))return resolve();var el=document.createElement("script");el.src=src;el.onload=resolve;el.onerror=reject;document.body.appendChild(el);});}
    var watch=new IntersectionObserver(function(entries){
      if(!entries.some(function(entry){return entry.isIntersecting;})) return;
      watch.disconnect();
      ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css","https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"].forEach(function(href){
        if(document.querySelector('link[href="'+href+'"]')) return;
        var link=document.createElement("link");link.rel="stylesheet";link.href=href;document.head.appendChild(link);
      });
      load("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js")
        .then(function(){return load("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js");})
        .then(function(){return load("https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js");})
        .then(function(){
          if(mapEl.dataset.ready||!window.L) return;
          mapEl.dataset.ready="1";
          var lat=Number(mapEl.dataset.lat), lng=Number(mapEl.dataset.lng);
          var map=L.map(mapEl,{scrollWheelZoom:false,zoomControl:false}).setView([lat,lng],14);
          L.control.zoom({position:"bottomright"}).addTo(map);
          L.maplibreGL({style:"https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",attributionControl:false}).addTo(map);
          map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>');
          var icon=L.divIcon({className:"store-pin",html:'<svg class="pin-svg" viewBox="0 0 36 48" aria-hidden="true"><path d="M18 1C9.2 1 2 8.1 2 17c0 11.2 16 30 16 30s16-18.8 16-30C34 8.1 26.8 1 18 1z" fill="#5D1A3A"/><circle cx="18" cy="16" r="4.5" fill="#E8B4A8"/></svg>',iconSize:[36,48],iconAnchor:[18,46]});
          L.marker([lat,lng],{icon:icon}).addTo(map);
          setTimeout(function(){map.invalidateSize();},80);
        });
    },{rootMargin:"200px"});
    watch.observe(mapEl);
  }
  var light=document.getElementById("tenantLight");
  var lightImg=light&&light.querySelector("img");
  var closeBtn=light&&light.querySelector(".tenant-light-x");
  document.querySelectorAll(".tenant-shot").forEach(function(btn){
    btn.addEventListener("click",function(){
      if(!light||!lightImg) return;
      lightImg.src=btn.getAttribute("data-full");
      lightImg.alt=btn.querySelector("img") ? btn.querySelector("img").alt : "";
      if(light.showModal) light.showModal();
      if(closeBtn) closeBtn.focus();
    });
  });
  if(closeBtn) closeBtn.addEventListener("click",function(){ light.close(); });
  if(light) light.addEventListener("click",function(event){ if(event.target===light) light.close(); });
  var share=document.getElementById("tenantShare");
  if(share) share.addEventListener("click",function(){
    var url=share.getAttribute("data-url");
    var title=share.getAttribute("data-title");
    if(navigator.share){
      navigator.share({title:title,url:url}).catch(function(){});
      return;
    }
    if(navigator.clipboard){
      navigator.clipboard.writeText(url).then(function(){ share.textContent="Link copied"; });
    }
  });
})();
</script>
</body>
</html>`;
}

function serviceLines(pro) {
  const detailed = (pro.services || []).filter((item) => item.duration || item.price);
  if (!detailed.length) return "";
  return `<ul class="tenant-services">${detailed.map((item) => `<li><span>${esc(item.name)}</span> <span>${esc([item.duration, item.price].filter(Boolean).join(" · "))}</span></li>`).join("")}</ul>`;
}

export function renderMissing() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Profile not available | Oh La La Salon &amp; Studios</title>
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="${cssHref}">
<link rel="stylesheet" href="${fontHref}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
<body>
${header("locations")}
<main id="main" class="wrap tenant-missing">
  <h1>This profile is not on the site</h1>
  <p>It may still be in review, or the pro is no longer listed.</p>
  <p><a class="btn btn-primary" href="/locations/summerville">See Summerville pros</a></p>
</main>
${footer({ sticky: false })}
</body>
</html>`;
}
