/**
 * Store picker. One list, one map. Pros live on the studio page, not here.
 */
(function () {
  const SHORT = {
    hair: "Hair stylist",
    barber: "Barber",
    nails: "Nails",
    "lashes-brows": "Lashes",
    skin: "Skin care",
    tattoo: "Tattoo",
    massage: "Massage",
    wellness: "Wellness & holistic",
    fitness: "Fitness",
    other: "Other",
  };
  const STATES = { sc: "south carolina", southcarolina: "sc" };
  const PIN = '<svg class="pin-svg" viewBox="0 0 36 48" aria-hidden="true"><path d="M18 1C9.2 1 2 8.1 2 17c0 11.2 16 30 16 30s16-18.8 16-30C34 8.1 26.8 1 18 1z" fill="#5D1A3A"/><circle cx="18" cy="16" r="4.5" fill="#E8B4A8"/></svg>';

  const listEl = document.getElementById("storeList");
  const qEl = document.getElementById("storeQ");
  const msgEl = document.getElementById("storeMsg");
  const app = document.getElementById("main");
  let locations = [];
  let tags = {};
  let origin = null;
  let map;
  let cluster;
  let markers = {};
  let selected = "";
  let areaBounds = null;
  let ignoreMoveUntil = 0;
  const searchAreaBtn = document.getElementById("searchArea");

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }
  function miles(a, b) {
    if (!a || !b || typeof b.lat !== "number") return 99999;
    const R = 3958.8;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function matches(loc, query) {
    if (!query) return true;
    const q = query.toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ").trim();
    const hay = [loc.city, loc.state, loc.zip, loc.address, loc.name, loc.label, STATES[loc.state.toLowerCase()] || ""]
      .join(" ")
      .toLowerCase();
    return q.split(" ").every((part) => hay.includes(part) || hay.includes(STATES[part] || part));
  }
  function phoneIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h3l1.5 4-2 1.5a12 12 0 0 0 6 6L17 13l4 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 4 5a2 2 0 0 1 2-2z"/></svg>';
  }
  function pinIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.4"/></svg>';
  }
  function card(loc) {
    const place = (loc.city + ", " + loc.state).toUpperCase();
    const pills = (tags[loc.id] || []).map((label) => '<span class="store-tag">' + esc(label) + "</span>").join("");
    const away = origin ? '<p class="store-away">' + Math.max(1, Math.round(miles(origin, loc))) + " mi away</p>" : "";
    const on = loc.id === selected ? " is-on" : "";
    const soon = loc.comingSoon;
    const href = esc(loc.page);
    const external = soon ? ' target="_blank" rel="noopener"' : "";
    return '<article class="store-card' + on + '" data-id="' + esc(loc.id) + '">' +
      '<div class="store-main">' +
      '<img class="store-logo" src="/images/logo.png" alt="" width="72" height="72">' +
      "<div><h2><a href=\"" + href + "\"" + external + ">" + esc(loc.name) + "</a></h2>" +
      '<p class="store-place">' + esc(soon ? "COMING SOON · " + place : place) + "</p>" +
      '<p class="store-line">' + phoneIcon() + "<span>" + esc(loc.phone) + "</span></p>" +
      '<p class="store-line">' + pinIcon() + "<span>" + esc(loc.address) + "</span></p>" +
      (soon ? '<p class="store-tags"><span class="store-tag">No lease signed yet</span></p>' : "") +
      (pills ? '<p class="store-tags">' + pills + "</p>" : "") +
      away + "</div></div>" +
      '<div class="store-actions">' +
      '<a class="btn btn-primary" href="' + href + '"' + external + ">" + (soon ? "Join the list" : "View pros") + "</a>" +
      (loc.directionsUrl ? '<a class="btn btn-outline" href="' + esc(loc.directionsUrl) + '" target="_blank" rel="noopener">' + (soon ? "See the map" : "Directions") + "</a>" : "") +
      "</div></article>";
  }
  function visible() {
    const query = qEl.value.trim();
    let rows = locations.filter((loc) => matches(loc, query) && (!areaBounds || (typeof loc.lat === "number" && areaBounds.contains([loc.lat, loc.lng]))));
    if (origin) rows = rows.slice().sort((a, b) => miles(origin, a) - miles(origin, b));
    return rows;
  }
  function render() {
    const rows = visible();
    listEl.innerHTML = rows.length
      ? rows.map(card).join("")
      : '<p class="store-empty">' + (areaBounds ? "No studios in this map area." : "No studios match that search.") + "</p>";
  }
  function popupHtml(loc) {
    return '<div class="map-pop"><p class="map-pop-name">' + esc(loc.name) + "</p>" +
      "<p>" + esc(loc.address) + "</p><p>" + esc(loc.phone) + "</p>" +
      '<div class="map-pop-actions"><a class="btn btn-primary" href="' + esc(loc.page) + '">View pros</a>' +
      '<a class="btn btn-outline" href="' + esc(loc.directionsUrl) + '" target="_blank" rel="noopener">Directions</a></div></div>';
  }
  function paint(id) {
    document.querySelectorAll(".store-card").forEach((el) => el.classList.toggle("is-on", el.dataset.id === id));
    Object.entries(markers).forEach(([key, marker]) => marker.getElement()?.classList.toggle("is-on", key === id));
  }
  function holdMoves(ms) {
    ignoreMoveUntil = Date.now() + ms;
  }
  function select(id, opts) {
    selected = id;
    paint(id);
    const marker = markers[id];
    if (!marker || !map) return;
    const show = () => {
      paint(id);
      if (opts.popup) marker.openPopup();
    };
    if (opts.pan) {
      holdMoves(900);
      const zoom = Math.max(map.getZoom(), 12);
      if (cluster && !marker.getElement()) cluster.zoomToShowLayer(marker, () => { map.flyTo(marker.getLatLng(), zoom, { duration: 0.45 }); show(); });
      else { map.flyTo(marker.getLatLng(), zoom, { duration: 0.45 }); show(); }
    } else show();
    document.querySelector('.store-card[data-id="' + id + '"]')?.scrollIntoView({ block: "nearest" });
  }
  function mountMap() {
    if (!window.L || map) return;
    map = L.map("storeMap", { scrollWheelZoom: false, zoomControl: false, maxZoom: 18 });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.maplibreGL({
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      attributionControl: false,
    }).addTo(map);
    map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>');
    const icon = L.divIcon({ className: "store-pin", html: PIN, iconSize: [36, 48], iconAnchor: [18, 46], popupAnchor: [0, -42] });
    cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      iconCreateFunction(group) {
        return L.divIcon({
          className: "wine-cluster",
          html: "<span>" + group.getChildCount() + "</span>",
          iconSize: [44, 44],
        });
      },
    });
    locations.filter((loc) => typeof loc.lat === "number" && typeof loc.lng === "number").forEach((loc) => {
      const marker = L.marker([loc.lat, loc.lng], { icon });
      marker.bindPopup(popupHtml(loc), { minWidth: 220, maxWidth: 260, autoPanPadding: [24, 24] });
      marker.on("click", () => select(loc.id, { pan: false, popup: true }));
      marker.on("mouseover", () => paint(loc.id));
      marker.on("mouseout", () => paint(selected));
      markers[loc.id] = marker;
      cluster.addLayer(marker);
    });
    map.addLayer(cluster);
    const box = map.getContainer();
    box.addEventListener("click", () => map.scrollWheelZoom.enable());
    box.addEventListener("focus", () => map.scrollWheelZoom.enable());
    box.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
    box.addEventListener("blur", () => map.scrollWheelZoom.disable());
    map.on("moveend", () => {
      if (Date.now() < ignoreMoveUntil) return;
      searchAreaBtn.hidden = false;
    });
    fitMap();
    setTimeout(fitMap, 80);
  }
  function fitMap() {
    if (!map) return;
    holdMoves(800);
    map.invalidateSize();
    const pins = locations.filter((loc) => typeof loc.lat === "number");
    if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 12);
    else if (pins.length) map.fitBounds(L.latLngBounds(pins.map((loc) => [loc.lat, loc.lng])), { padding: [48, 48] });
  }
  function showMap(on) {
    app.classList.toggle("is-map", on);
    document.getElementById("tabList").setAttribute("aria-pressed", on ? "false" : "true");
    document.getElementById("tabMap").setAttribute("aria-pressed", on ? "true" : "false");
    setTimeout(fitMap, 40);
  }

  qEl.addEventListener("input", () => { areaBounds = null; render(); });
  searchAreaBtn.addEventListener("click", () => {
    areaBounds = map.getBounds();
    searchAreaBtn.hidden = true;
    msgEl.textContent = "Showing studios in this map area.";
    render();
  });
  document.getElementById("storeSearch").addEventListener("submit", (event) => event.preventDefault());
  document.getElementById("useLoc").addEventListener("click", () => {
    if (!navigator.geolocation) {
      msgEl.textContent = "Location isn't available in this browser. Search by city or ZIP.";
      return;
    }
    msgEl.textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition((pos) => {
      origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      msgEl.textContent = "Closest studios first.";
      render();
      if (visible()[0]) select(visible()[0].id, { pan: true, popup: false });
    }, () => {
      msgEl.textContent = "Location is off. Search by city or ZIP.";
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
  });
  document.getElementById("tabList").addEventListener("click", () => showMap(false));
  document.getElementById("tabMap").addEventListener("click", () => showMap(true));
  listEl.addEventListener("mouseover", (event) => {
    const cardEl = event.target.closest(".store-card");
    if (cardEl) paint(cardEl.dataset.id);
  });
  listEl.addEventListener("mouseout", (event) => {
    const cardEl = event.target.closest(".store-card");
    if (!cardEl || cardEl.contains(event.relatedTarget)) return;
    paint(selected);
  });
  listEl.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    const cardEl = event.target.closest(".store-card");
    if (!cardEl) return;
    select(cardEl.dataset.id, { pan: true, popup: true });
  });

  Promise.all([
    fetch("/data/locations.json").then((res) => res.json()),
    fetch("/api/directory").then((res) => (res.ok ? res.json() : [])).catch(() => []),
  ]).then(([places, pros]) => {
    locations = places;
    tags = {};
    const rows = Array.isArray(pros) ? pros : [];
    rows.filter((pro) => pro.active && pro.consentApproved && !pro.isSample).forEach((pro) => {
      const bag = tags[pro.locationId] || [];
      (pro.categories || []).forEach((slug) => {
        const label = SHORT[slug] || slug;
        if (!bag.includes(label)) bag.push(label);
      });
      tags[pro.locationId] = bag;
    });
    render();
    const start = () => {
      ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"].forEach((href) => {
        if (document.querySelector('link[href="' + href + '"]')) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      });
      const load = (src) => new Promise((resolve, reject) => {
        if (document.querySelector('script[src="' + src + '"]')) return resolve();
        const el = document.createElement("script");
        el.src = src;
        el.onload = () => resolve();
        el.onerror = reject;
        document.body.appendChild(el);
      });
      load("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js")
        .then(() => load("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"))
        .then(() => load("https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js"))
        .then(() => load("https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"))
        .then(mountMap)
        .catch((err) => console.error(err));
    };
    const mapBox = document.getElementById("storeMap");
    if (mapBox && "IntersectionObserver" in window) {
      const watch = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        watch.disconnect();
        start();
      }, { rootMargin: "200px" });
      watch.observe(mapBox);
    } else start();
  }).catch((err) => {
    console.error(err);
    listEl.innerHTML = '<p class="store-empty">The studio list did not load. Call (843) 420-9965.</p>';
  });
})();
