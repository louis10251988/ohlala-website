import { header, footer, cssHref, fontHref } from "../../scripts/chrome.mjs";
import { CATEGORIES } from "../api/pros-data.js";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function initials(name) {
  return String(name || "").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function servicePills(pro) {
  const detailed = (pro.services || []).some((item) => item.duration || item.price);
  if (!detailed) {
    const names = (pro.services || []).map((item) => item.name).filter(Boolean);
    if (names.length) return names;
  }
  return (pro.categories || []).map((slug) => CATEGORIES[slug] || slug);
}

function socials(pro) {
  return [
    ["Instagram", pro.instagram],
    ["Facebook", pro.facebook],
    ["TikTok", pro.tiktok],
    ["Website", pro.website],
  ].filter(([, href]) => href);
}

export function renderProfile(pro, others) {
  const studio = pro.studio;
  const city = studio.city || studio.name;
  const suite = pro.suite || "Suite";
  const business = pro.businessName || "";
  const title = business
    ? pro.name + " (" + suite + ") | " + business + " | Oh La La Salon & Studios"
    : pro.name + " (" + suite + ") | Oh La La " + city;
  const description = (pro.bio || (pro.name + " sees clients one-on-one at Oh La La in " + city + ".")).replace(/\s+/g, " ").trim().slice(0, 160);
  const canonical = "https://ohlalasalonstudio.com" + pro.profilePath;
  const pills = servicePills(pro);
  const links = socials(pro);
  const book = pro.bookHref
    ? `<a class="btn btn-primary" href="${esc(pro.bookHref)}"${/^https?:/i.test(pro.bookHref) ? ' target="_blank" rel="noopener"' : ""}>Book now</a>`
    : "";
  const photo = pro.photo
    ? `<img src="${esc(pro.photo)}" alt="" width="320" height="320">`
    : `<span class="tenant-initials" aria-hidden="true">${esc(initials(pro.name))}</span>`;
  const accepting = pro.acceptingNewClients ? `<p class="tenant-accept">Accepting new clients</p>` : "";
  const sampleNote = pro.isPreviewSample
    ? `<p class="tenant-sample">Preview sample. This is not a live tenant.</p>`
    : "";
  const socialHtml = links.length
    ? `<p class="tenant-socials">${links.map(([label, href]) => `<a class="tenant-social" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`).join("")}</p>`
    : "";
  const contact = [
    pro.phone && pro.bookHref !== phoneTel(pro.phone) ? `<a href="${esc(phoneTel(pro.phone))}">${esc(pro.phone)}</a>` : "",
    pro.email ? `<a href="mailto:${esc(pro.email)}">${esc(pro.email)}</a>` : "",
  ].filter(Boolean);
  const contactHtml = contact.length ? `<p class="tenant-contact">${contact.join(" · ")}</p>` : "";
  const services = pills.length
    ? `<section class="tenant-block"><h2>Services</h2><p class="pills">${pills.map((label) => `<span class="pill">${esc(label)}</span>`).join("")}</p>${serviceLines(pro)}</section>`
    : "";
  const bio = pro.bio ? `<section class="tenant-block tenant-bio"><p>${esc(pro.bio)}</p></section>` : "";
  const hours = pro.hours && pro.hours.length
    ? `<section class="tenant-block"><h2>Hours</h2><ul class="tenant-hours">${pro.hours.map((line) => `<li>${esc(line)}</li>`).join("")}</ul></section>`
    : "";
  const gallery = pro.photos && pro.photos.length
    ? `<section class="tenant-block"><h2>Portfolio</h2><div class="tenant-gallery">${pro.photos.map((src) => `<img src="${esc(src)}" alt="${esc(pro.isPreviewSample ? "Private suite at Oh La La " + city : "Work by " + pro.name)}" width="640" height="640" loading="lazy">`).join("")}</div></section>`
    : "";
  const facts = [];
  if (pro.languages && pro.languages.length) facts.push(`<p><strong>Languages</strong> ${esc(pro.languages.join(", "))}</p>`);
  if (pro.payments && pro.payments.length) facts.push(`<p><strong>Payments</strong> ${esc(pro.payments.join(", "))}</p>`);
  const factsHtml = facts.length ? `<section class="tenant-block tenant-facts">${facts.join("")}</section>` : "";
  const othersHtml = others && others.length
    ? `<section class="tenant-block"><h2>More pros</h2><ul class="tenant-others">${others.map((item) => `<li><a href="${esc(item.profilePath)}">${esc(item.name)}${item.suite ? " (" + esc(item.suite) + ")" : ""}</a></li>`).join("")}</ul></section>`
    : "";
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        name: pro.name,
        url: canonical,
        ...(pro.phone ? { telephone: pro.phone } : {}),
        ...(pro.photo ? { image: pro.photo } : {}),
        worksFor: { "@id": canonical + "#studio" },
      },
      {
        "@type": "HealthAndBeautyBusiness",
        "@id": canonical + "#studio",
        name: "Oh La La Salon & Studios",
        url: "https://ohlalasalonstudio.com" + studio.page,
        telephone: "+18434209965",
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
<meta property="og:title" content="${esc(pro.name + " (" + suite + ")")}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
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
        ${sampleNote}
        <h1>${esc(pro.name)} <span class="tenant-suite">(${esc(suite)})</span></h1>
        <p class="tenant-kicker">${esc([business, city + ", " + (studio.region || "")].filter(Boolean).join(" | "))}</p>
        ${accepting}
        <p class="tenant-where"><a href="${esc(studio.page)}">View location</a><br>${esc(studio.address)}</p>
        <div class="tenant-actions">${book}${socialHtml}${contactHtml}</div>
      </div>
    </div>
  </header>
  <div class="wrap tenant-body">
    ${services}
    ${bio}
    <div class="tenant-actions tenant-again">${book}<a class="btn btn-outline" href="${esc(studio.page)}">More pros</a></div>
    ${hours}
    ${gallery}
    ${factsHtml}
    <section class="tenant-block">
      <h2>Location</h2>
      <p>${esc(studio.address)}</p>
      <div id="proMap" class="mini-map" data-lat="${studio.lat}" data-lng="${studio.lng}" aria-label="Map of Oh La La ${esc(city)}"></div>
      <p><a class="btn btn-outline" href="${esc(studio.directions)}" target="_blank" rel="noopener">Directions</a></p>
    </section>
    ${othersHtml}
  </div>
</main>
${footer()}
<script>
(function(){
  var mapEl=document.getElementById("proMap");
  if(!mapEl||!("IntersectionObserver" in window)) return;
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
})();
</script>
</body>
</html>`;
}

function phoneTel(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return "tel:+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "tel:+" + digits;
  if (digits.length >= 7) return "tel:+" + digits;
  return "";
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
${footer()}
</body>
</html>`;
}
