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

function bookBlock(pro) {
  const first = pro.name.split(" ")[0];
  if (pro.bookingUrl) {
    return `<a class="btn btn-gold" href="${esc(pro.bookingUrl)}" target="_blank" rel="noopener">Book with ${esc(first)}</a>`;
  }
  const phone = pro.phone || STUDIO_PHONE;
  return `<div class="call-text"><span>Call or text</span><a class="btn btn-gold" href="${telHref(phone)}">Call</a><a class="btn btn-outline" href="${smsHref(phone)}">Text</a></div>`;
}

function socials(pro) {
  const items = [
    ["instagram", "Instagram"],
    ["tiktok", "TikTok"],
    ["facebook", "Facebook"],
    ["website", "Website"],
  ].filter(([key]) => pro.socials && pro.socials[key]);
  if (!items.length) return "";
  return `<p class="pro-actions">${items.map(([key, label]) => `<a class="btn btn-outline" href="${esc(pro.socials[key])}" target="_blank" rel="noopener">${label}</a>`).join("")}</p>`;
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
  const services = (pro.services || []).map((service) => `<span class="pill">${esc(service)}</span>`).join("");
  const hours = DAYS.map((day) => `<tr><th scope="row">${day}</th><td>${esc(pro.hours[day] || "Closed")}</td></tr>`).join("");
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
        "worksFor": { "@type": "Organization", "name": "Oh La La Salon & Studios", "url": "https://ohlalasalonstudio.com/" },
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
          { "@type": "ListItem", "position": 2, "name": "Find a Pro", "item": "https://ohlalasalonstudio.com/find-a-pro" },
          { "@type": "ListItem", "position": 3, "name": pro.name, "item": url },
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
      <a href="/find-a-pro">Find a Pro</a>
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
    <a href="/find-a-pro">Find a Pro</a><a href="/suites">Suites</a><a href="/earnings">Earnings</a><a href="/faq">FAQ</a><a href="/#tour">Tour</a><a href="tel:+18434209965">Call (843) 420-9965</a>
  </div>
</nav>
<main id="main" class="dir">
  <div class="wrap">
    <p class="crumbs"><a href="/">Home</a> / <a href="/find-a-pro">Find a Pro</a> / ${esc(pro.name)}</p>
    ${pro.isSample ? '<p class="sample-note">Sample profile — real Oh La La pros coming soon.</p>' : ""}
    <div class="pro-layout">
      <div class="pro-photo">${photo}${pro.isSample ? '<span class="sample-badge">Sample</span>' : ""}</div>
      <div class="pro-hero-card">
        <h1>${esc(pro.name)} <span class="suite">${esc(pro.suite)}</span></h1>
        <h2>${esc(pro.businessName)} · Oh La La Salon &amp; Studios (Summerville, SC)</h2>
        <p><a href="${telHref(phone)}">${esc(phone)}</a></p>
        <p>${esc(suiteAddress)}</p>
        <p><a href="${esc(loc.directionsUrl)}" target="_blank" rel="noopener">Directions</a></p>
        <p class="pills">${cats}</p>
        <div class="pro-actions">${bookBlock(pro)}</div>
        ${socials(pro)}
      </div>
    </div>
    <section class="pro-section">
      <h2>Services</h2>
      <p class="pills">${services}</p>
    </section>
    <section class="pro-section">
      <h2>About</h2>
      <p>${esc(pro.bio)}</p>
      <p>${pro.acceptingNewClients ? "Accepting new clients." : "Not accepting new clients right now."}</p>
      <p>Languages: ${esc((pro.languages || []).join(", ") || "Ask when you call")}</p>
      <p>Payment: ${esc((pro.payments || []).join(", ") || "Ask when you call")}</p>
    </section>
    <section class="pro-section">
      <h2>Weekly hours</h2>
      <table class="hours"><tbody>${hours}</tbody></table>
    </section>
    <p class="pro-actions">${bookBlock(pro)} <a class="btn btn-outline" href="/find-a-pro?location=summerville-ladson">More Oh La La pros</a></p>
  </div>
</main>
<footer>
  <div class="wrap">
    <p><a href="/pros/join">Oh La La tenant? Join the directory</a></p>
    <p><a href="/">Home</a> · <a href="/find-a-pro">Find a Pro</a> · <a href="tel:+18434209965">(843) 420-9965</a></p>
  </div>
</footer>
<div class="msticky"><a class="btn btn-outline" href="/#tour">Tour</a><a class="btn btn-gold" href="tel:+18434209965">Call</a></div>
</body>
</html>
`;
  writeFileSync(`pros/${pro.slug}.html`, html);
  console.log(pro.slug);
}
