import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const pros = JSON.parse(readFileSync("data/pros.json", "utf8"));
const locations = JSON.parse(readFileSync("data/locations.json", "utf8"));
const locById = Object.fromEntries(locations.map((loc) => [loc.id, loc]));
const CATS = {
  hair: "Hair (cuts, color, extensions, braids & locs)",
  barber: "Barber",
  nails: "Nails",
  "lashes-brows": "Lashes, Brows & Hair Removal",
  skin: "Skin Care",
  tattoo: "Tattoo & Permanent Makeup",
  massage: "Massage & Bodywork",
  wellness: "Wellness (nutrition, weight loss, holistic)",
  fitness: "Fitness (personal training, yoga, pilates)",
  other: "Other",
};
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const STUDIO_PHONE = "(843) 420-9965";
const STUDIO_TEL = "+18434209965";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function telHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 7) return "tel:" + STUDIO_TEL;
  return "tel:+1" + digits.slice(-10);
}

function smsHref(phone) {
  return telHref(phone).replace("tel:", "sms:");
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

const SHORT = {
  hair: "Hair", barber: "Barber", nails: "Nails", "lashes-brows": "Lashes & Brows",
  skin: "Skin", tattoo: "Tattoo & PMU", massage: "Massage", wellness: "Wellness",
  fitness: "Fitness", other: "Other",
};
function serviceItems(list) {
  return (list || []).map((item) => typeof item === "string" ? { name: item, duration: "", price: "" } : item);
}
function bookLink(pro) {
  const first = esc(pro.name.split(" ")[0]);
  if (pro.vagaroUrl) {
    return { kind: "link", href: esc(pro.vagaroUrl), extra: ' target="_blank" rel="noopener"', label: "Book on Vagaro", note: "Pick a time online" };
  }
  if (pro.bookingUrl) {
    return { kind: "link", href: esc(pro.bookingUrl), extra: ' target="_blank" rel="noopener"', label: `Book with ${first}`, note: "" };
  }
  const phone = pro.phone || "";
  const tel = telHref(phone || STUDIO_PHONE);
  const sms = smsHref(phone || STUDIO_PHONE);
  if (phone) {
    return { kind: "menu", tel, sms, label: `Book with ${first}`, note: "" };
  }
  return { kind: "link", href: tel, extra: "", label: "Book", note: "Call the studio" };
}
function bookHtml(pro, id) {
  const book = bookLink(pro);
  if (book.kind === "menu") {
    return `<details class="book-menu" ${id ? `id="${id}"` : ""}><summary class="btn btn-primary">${book.label}</summary><a href="${book.tel}">Call</a><a href="${book.sms}">Text</a></details>`;
  }
  return `<a class="btn btn-primary" ${id ? `id="${id}"` : ""} href="${book.href}"${book.extra}>${book.label}</a>${book.note ? `<p class="book-note">${book.note}</p>` : ""}`;
}
function stickyHtml(pro) {
  const book = bookLink(pro);
  const phone = pro.phone || STUDIO_PHONE;
  if (book.kind === "menu") {
    return `<div class="pro-sticky"><a class="btn btn-primary" href="${book.tel}">Call</a><a class="btn btn-outline" href="${book.sms}">Text</a></div>`;
  }
  return `<div class="pro-sticky"><a class="btn btn-primary" href="${book.href}"${book.extra}>Book</a><a class="btn btn-outline" href="${telHref(phone)}">Call</a></div>`;
}

function socials(pro) {
  const icons = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M14 4v9.2a3.2 3.2 0 1 1-2.2-3V7.2A6.8 6.8 0 0 0 16 9.5V6.2A5 5 0 0 1 14 4z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z"/></svg>',
    website: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  };
  const items = [
    ["instagram", "Instagram"],
    ["tiktok", "TikTok"],
    ["facebook", "Facebook"],
    ["website", "Website"],
  ].filter(([key]) => pro.socials && pro.socials[key]);
  if (!items.length) return "";
  return `<p class="socials">${items.map(([key, label]) => `<a class="social-link" href="${esc(pro.socials[key])}" target="_blank" rel="noopener">${icons[key]}<span>${label}</span></a>`).join("")}</p>`;
}

mkdirSync("pros", { recursive: true });

for (const pro of pros) {
  const loc = locById[pro.locationId];
  const suiteAddress = `4498 Ladson Rd, ${pro.suite}, Summerville, SC 29485`;
  const phone = pro.phone || STUDIO_PHONE;
  const photo = pro.photo
    ? `<img src="${esc(pro.photo)}" alt="Portrait of ${esc(pro.name)}" width="480" height="640">`
    : `<div class="mono" aria-hidden="true">${esc(initials(pro.name))}</div>`;
  const cats = (pro.categories || []).map((slug) => `<span class="pill">${esc(CATS[slug] || slug)}</span>`).join("");
  const services = serviceItems(pro.services).map((service) => `<li><span>${esc(service.name)}</span><span>${[service.duration, service.price].filter(Boolean).map(esc).join(" · ")}</span></li>`).join("");
  const photos = (pro.photos || []).slice(0, 9).map((src, i) => `<button type="button" class="shot" data-full="${esc(src)}"><img src="${esc(src)}" alt="Sample portfolio image ${i + 1} for ${esc(pro.name)}" width="400" height="400" loading="lazy"><span class="sample-quiet">Sample</span></button>`).join("");
  const hours = DAYS.map((day) => `<tr data-day="${day}"><th scope="row">${day}</th><td>${esc(pro.hours[day] || "Closed")}</td></tr>`).join("");
  const primaryCat = SHORT[(pro.categories || [])[0]] || "";
  const title = `${pro.name} — ${pro.businessName} | Oh La La Salon & Studios`;
  const url = `https://ohlalasalonstudio.com/pros/${pro.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": url + "#page",
        "name": title,
        "url": url,
        "about": { "@id": url + "#person" },
      },
      {
        "@type": "Person",
        "@id": url + "#person",
        "name": pro.name,
        "description": pro.bio,
        "telephone": phone,
        "worksFor": {
          "@type": "HealthAndBeautyBusiness",
          "name": "Oh La La Salon & Studios",
          "url": "https://ohlalasalonstudio.com/",
          "telephone": "+18434209965",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": `4498 Ladson Rd, ${pro.suite}`,
            "addressLocality": "Summerville",
            "addressRegion": "SC",
            "postalCode": "29485",
            "addressCountry": "US",
          },
        },
      },
      {
        "@type": "Place",
        "name": "Oh La La Salon & Studios",
        "telephone": "+18434209965",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": `4498 Ladson Rd, ${pro.suite}`,
          "addressLocality": "Summerville",
          "addressRegion": "SC",
          "postalCode": "29485",
          "addressCountry": "US",
        },
        "geo": { "@type": "GeoCoordinates", "latitude": loc.lat, "longitude": loc.lng },
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://ohlalasalonstudio.com/" },
          { "@type": "ListItem", "position": 2, "name": "Locations", "item": "https://ohlalasalonstudio.com/locations" },
          { "@type": "ListItem", "position": 3, "name": loc ? loc.city : "Summerville", "item": "https://ohlalasalonstudio.com" + (loc && loc.page ? loc.page : "/locations/summerville") },
          { "@type": "ListItem", "position": 4, "name": pro.name, "item": url },
        ],
      },
    ],
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(pro.bio)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(pro.bio)}">
<meta property="og:type" content="profile">
<meta property="og:url" content="${url}">
${pro.isSample || !pro.consentApproved ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow">'}
<link rel="stylesheet" href="../styles.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap" media="print" onload="this.media='all'">
<script type="application/ld+json">
${JSON.stringify(jsonLd)}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<nav>
  <div class="nav-in">
    <a class="nav-logo" href="/" aria-label="Oh La La Salon and Studios home"><img src="../images/logo.png" width="1146" height="282" alt="Oh La La Salon and Studios"></a>
    <div class="nav-links">
      <a href="/locations">Locations</a>
      <a href="/suites">Suites</a>
      <a href="/earnings">Earnings</a>
      <a href="/faq">FAQ</a>
    </div>
    <div class="nav-cta">
      <a class="btn btn-outline" href="tel:+18434209965">Call (843) 420-9965</a>
      <a class="btn btn-primary" href="/#tour">Tour</a>
    </div>
    <button class="burger" type="button" aria-label="Open menu" aria-expanded="false" onclick="var m=document.getElementById('mm');var o=m.classList.toggle('open');this.setAttribute('aria-expanded',o?'true':'false')"><span></span><span></span><span></span></button>
  </div>
  <div class="mobile-menu" id="mm">
    <a href="/locations">Locations</a><a href="/suites">Suites</a><a href="/earnings">Earnings</a><a href="/faq">FAQ</a><a href="/#tour">Tour</a><a href="tel:+18434209965">Call (843) 420-9965</a>
  </div>
</nav>
<main id="main" class="pro-page">
  <div class="wrap">
    <p class="crumbs"><a href="/">Home</a> / <a href="/locations">Locations</a> / <a href="${loc && loc.page ? loc.page : "/locations/summerville"}">${esc(loc ? loc.city : "Summerville")}</a> / ${esc(pro.name)}</p>
    ${pro.isSample ? '<p class="sample-line">Sample profile — real Oh La La pros coming soon.</p>' : ""}
    <div class="pro-hero">
      <div class="pro-photo">${photo}</div>
      <div>
        <h1>${esc(pro.name)}</h1>
        <p class="pro-kicker">${esc(pro.suite)} · ${esc(primaryCat)}</p>
        <p>${esc(pro.businessName)}</p>
        <p>${esc(suiteAddress)}</p>
        <p><a href="${esc(loc.directionsUrl)}" target="_blank" rel="noopener">Directions</a></p>
        <div class="pro-actions" id="book">
          ${bookHtml(pro)}
          <a class="btn btn-outline" href="${telHref(phone)}">Call</a>
          <a class="btn btn-outline" href="${smsHref(phone)}">Text</a>
        </div>
        ${socials(pro)}
      </div>
    </div>
    <section class="pro-section">
      <h2>About</h2>
      <p>${esc(pro.bio)}</p>
      <p>${pro.acceptingNewClients ? "Accepting new clients." : "Not accepting new clients right now."}</p>
      <p>Languages: ${esc((pro.languages || []).join(", ") || "Ask when you call")}</p>
      <p>Payment: ${esc((pro.payments || []).join(", ") || "Ask when you call")}</p>
    </section>
    <section class="pro-section">
      <h2>Services</h2>
      <ul class="menu">${services}</ul>
    </section>
    ${photos ? `<section class="pro-section"><h2>Portfolio</h2><div class="gallery">${photos}</div><p class="sample-line">Sample images — not a real portfolio.</p></section>` : ""}
    <section class="pro-section">
      <h2>Hours</h2>
      <table class="hours"><tbody>${hours}</tbody></table>
    </section>
    <p><a class="btn btn-outline" href="${loc && loc.page ? loc.page : "/locations/summerville"}">More pros at this studio</a></p>
  </div>
</main>
<footer>
  <div class="wrap">
    <p><a href="/pros/join">Oh La La tenant? Join the directory</a></p>
    <p><a href="/">Home</a> · <a href="/locations">Locations</a> · <a href="tel:+18434209965">(843) 420-9965</a></p>
  </div>
</footer>
${stickyHtml(pro)}
<dialog class="lightbox" id="lightbox"><button type="button" class="btn btn-outline" id="closeLight">Close</button><img alt=""><p class="sample-line">Sample</p></dialog>
<script>
const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
document.querySelector('[data-day="'+names[new Date().getDay()]+'"]')?.classList.add("is-today");
const box=document.getElementById("lightbox");
document.querySelectorAll(".shot").forEach(btn=>btn.addEventListener("click",()=>{box.querySelector("img").src=btn.dataset.full;box.showModal();}));
document.getElementById("closeLight").addEventListener("click",()=>box.close());
box.addEventListener("click",e=>{if(e.target===box)box.close();});
</script>
</body>
</html>
`;
  writeFileSync(`pros/${pro.slug}.html`, html);
  console.log(pro.slug);
}

mkdirSync("locations", { recursive: true });
const socialIcon = {
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
};

for (const loc of locations) {
  const photos = (loc.photos || []).slice(0, 2);
  const photoHtml = photos.length
    ? photos.map((photo) => `<img src="${esc(photo.src)}" alt="${esc(photo.alt || loc.name)}" width="640" height="480">`).join("")
    : `<figure class="shot-sample"><img src="/images/samples/swatch-a.svg" alt="Sample studio photo"><figcaption>Sample</figcaption></figure><figure class="shot-sample"><img src="/images/samples/swatch-b.svg" alt="Sample studio photo"><figcaption>Sample</figcaption></figure>`;
  const socials = ["facebook", "instagram"].map((key) => loc[key]
    ? `<a class="hero-social" href="${esc(loc[key])}" target="_blank" rel="noopener">${socialIcon[key]}<span class="visually-hidden">${key === "facebook" ? "Facebook" : "Instagram"}</span></a>`
    : "").join("");
  const amenities = (loc.amenities || []).map((item) => `<li>${esc(item)}</li>`).join("");
  const tagline = loc.tagline || "A local community of independent beauty & wellness pros";
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(loc.name)} in ${esc(loc.city)}, ${esc(loc.state)} | Oh La La Salon &amp; Studios</title>
<meta name="description" content="${esc(tagline)} ${esc(loc.address)}.">
<link rel="canonical" href="https://ohlalasalonstudio.com${loc.page}">
<meta property="og:title" content="${esc(loc.name)} in ${esc(loc.city)}">
<meta property="og:description" content="${esc(tagline)}">
<meta property="og:url" content="https://ohlalasalonstudio.com${loc.page}">
<link rel="stylesheet" href="../styles.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap"></noscript>
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "HealthAndBeautyBusiness",
  name: "Oh La La Salon & Studios",
  url: "https://ohlalasalonstudio.com" + loc.page,
  telephone: "+18434209965",
  address: {
    "@type": "PostalAddress",
    streetAddress: "4498 Ladson Rd",
    addressLocality: loc.city,
    addressRegion: loc.state,
    postalCode: loc.zip,
    addressCountry: "US",
  },
  geo: { "@type": "GeoCoordinates", latitude: loc.lat, longitude: loc.lng },
})}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<nav>
  <div class="nav-in">
    <a class="nav-logo" href="/" aria-label="Oh La La Salon and Studios home"><img src="../images/logo.png" width="1146" height="282" alt="Oh La La Salon and Studios"></a>
    <div class="nav-links">
      <a href="/locations">Locations</a>
      <a href="/suites">Suites</a>
      <a href="/earnings">Earnings</a>
      <a href="/faq">FAQ</a>
    </div>
    <div class="nav-cta">
      <a class="btn btn-outline" href="tel:+18434209965">Call (843) 420-9965</a>
      <a class="btn btn-primary" href="/#tour">Tour</a>
    </div>
    <button class="burger" type="button" aria-label="Open menu" aria-expanded="false" onclick="var m=document.getElementById('mm');var o=m.classList.toggle('open');this.setAttribute('aria-expanded',o?'true':'false')"><span></span><span></span><span></span></button>
  </div>
  <div class="mobile-menu" id="mm">
    <a href="/locations">Locations</a><a href="/suites">Suites</a><a href="/earnings">Earnings</a><a href="/faq">FAQ</a><a href="/#tour">Tour</a><a href="tel:+18434209965">Call (843) 420-9965</a>
  </div>
</nav>
<header class="studio-hero">
  <div class="studio-hero-copy">
    <h1>${esc(loc.name)}</h1>
    <p class="studio-tag">${esc(tagline)}</p>
    <p>${esc(loc.address)}</p>
    ${socials ? `<p class="studio-socials">${socials}</p>` : ""}
  </div>
  <div class="studio-photos">${photoHtml}</div>
</header>
<main id="main" class="studio-page" data-location="${esc(loc.id)}" data-city="${esc(loc.city)}">
  <div class="wrap">
    <p class="crumbs"><a href="/">Home</a> / <a href="/locations">Locations</a> / ${esc(loc.city)}</p>
    <div class="studio-bar">
      <h2>Pro Directory</h2>
      <div class="studio-lease">
        <p>Are you a pro interested in renting a suite?</p>
        <a class="btn btn-primary" href="/#tour">Find a suite</a>
      </div>
    </div>
    <form class="studio-filters" id="studioFilters" role="search">
      <input id="studioName" type="search" placeholder="Search by name" aria-label="Search by name" autocomplete="off">
      <input id="studioService" type="search" placeholder="Search by service" aria-label="Search by service" autocomplete="off">
      <button class="btn btn-outline" id="studioMore" type="button" aria-expanded="false" aria-controls="studioExtra">More</button>
      <div class="more-panel" id="studioExtra">
        <button class="chip-btn" id="studioAccepting" type="button" aria-pressed="false">Accepting new clients</button>
        <button class="chip-btn" type="button" data-lang="English" aria-pressed="false">English</button>
        <button class="chip-btn" type="button" data-lang="Chinese" aria-pressed="false">Chinese</button>
        <button class="chip-btn" type="button" data-lang="Spanish" aria-pressed="false">Spanish</button>
        <button class="chip-btn" type="button" data-pay="Card" aria-pressed="false">Card</button>
        <button class="chip-btn" type="button" data-pay="Buy Now Pay Later" aria-pressed="false">Buy Now Pay Later</button>
        <button class="chip-btn" type="button" data-pay="Cash" aria-pressed="false">Cash</button>
      </div>
    </form>
    <p class="sample-line">Sample profiles shown — real pros coming soon.</p>
    <p id="studioCount">Loading pros…</p>
    <div class="studio-grid" id="studioGrid"></div>
    <p id="studioEmpty" hidden>No pros match that search.</p>
    <section class="studio-facts" aria-label="Studio details">
      <div>
        <h2>Hours</h2>
        <p>${esc(loc.hoursNote || "")}</p>
      </div>
      <div>
        <h2>In the building</h2>
        <ul class="amenity-list">${amenities}</ul>
      </div>
      <div>
        <div id="studioMap" class="mini-map" data-lat="${loc.lat}" data-lng="${loc.lng}" aria-label="Map"></div>
        <p><a class="btn btn-outline" href="${esc(loc.directionsUrl)}" target="_blank" rel="noopener">Directions</a></p>
      </div>
    </section>
  </div>
</main>
<footer>
  <div class="wrap">
    <p><a href="/locations">Locations</a> · <a href="/pros/join">Oh La La tenant? Join the directory</a> · <a href="tel:+18434209965">(843) 420-9965</a></p>
  </div>
</footer>
<div class="msticky"><a class="btn btn-outline" href="/#tour">Tour</a><a class="btn btn-primary" href="tel:+18434209965">Call</a></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js"></script>
<script src="/studio.js"></script>
</body>
</html>`;
  writeFileSync(`locations/${loc.slug}.html`, page);
  console.log("location", loc.slug);
}
