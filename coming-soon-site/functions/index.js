import { locations, phone, logoUrl, homeUrl } from "../locations.js";
import { theme } from "./theme.js";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

const statusLabel = {
  proposed: "No lease signed yet",
  open: "Open now",
  signed: "Lease signed",
  closed: "List closed",
};

export async function onRequest() {
  const cards = locations.map((place) => `<a class="loc" href="/${esc(place.slug)}"><b>${esc(place.name)}</b><p>${esc(place.city)}, ${esc(place.state)}</p><p>${esc(statusLabel[place.status] || "Coming soon")}</p><p>${esc(place.goal)} founding pros to open</p></a>`).join("");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coming soon studios | Oh La La</title>
<meta name="description" content="Proposed Oh La La studios. Join a founding list. No payment needed.">
<link rel="canonical" href="https://ohlala-coming-soon.pages.dev/">
<style>${theme}</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Playfair+Display:wght@600&display=swap">
</head>
<body>
<header class="hero"><div class="wrap top"><img class="logo" src="${esc(logoUrl)}" alt="Oh La La Salon and Studios" width="180" height="44"><a class="call" href="tel:${esc(phone.tel)}">${esc(phone.display)}</a></div>
<div class="wrap" style="padding-bottom:28px"><p class="kicker">Coming soon</p><h1>Studios we want to open.</h1><p class="lead">Pick a spot. Join the list. You do not pay anything today.</p><div class="locs">${cards}</div></div></header>
<footer class="foot"><div class="wrap"><p>Oh La La Salon &amp; Studios</p><p><a href="tel:${esc(phone.tel)}">${esc(phone.display)}</a></p><p><a class="home" href="${esc(homeUrl)}">ohlalasalonstudio.com</a></p></div></footer>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
