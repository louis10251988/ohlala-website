/**
 * Store picker. One list, one map. Pros live on the studio page, not here.
 */
(function () {
  const SHORT = {
    hair: "Hair",
    barber: "Barber",
    nails: "Nails",
    "lashes-brows": "Lashes & Brows",
    skin: "Skin",
    tattoo: "Tattoo & PMU",
    massage: "Massage",
    wellness: "Wellness",
    fitness: "Fitness",
    other: "Other",
  };
  const STATES = { sc: "south carolina", southcarolina: "sc" };
  const SOUTHEAST = [[25.0, -92.0], [39.5, -75.5]];

  const listEl = document.getElementById("storeList");
  const qEl = document.getElementById("storeQ");
  const msgEl = document.getElementById("storeMsg");
  const app = document.getElementById("storeApp");
  let locations = [];
  let tags = {};
  let origin = null;
  let map;
  let markers = {};
  let selected = "";

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }
  function miles(a, b) {
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
    return '<article class="store-card' + on + '" data-id="' + esc(loc.id) + '">' +
      '<a class="store-main" href="' + esc(loc.page) + '">' +
      '<img class="store-logo" src="/images/logo.png" alt="" width="72" height="72">' +
      "<div><h2>" + esc(loc.name) + "</h2>" +
      '<p class="store-place">' + esc(place) + "</p>" +
      '<p class="store-line">' + phoneIcon() + "<span>" + esc(loc.phone) + "</span></p>" +
      '<p class="store-line">' + pinIcon() + "<span>" + esc(loc.address) + "</span></p>" +
      (pills ? '<p class="store-tags">' + pills + "</p>" : "") +
      away + "</div></a>" +
      '<div class="store-actions">' +
      '<a class="btn btn-primary" href="' + esc(loc.page) + '">View pros</a>' +
      '<a class="btn btn-outline" href="' + esc(loc.directionsUrl) + '" target="_blank" rel="noopener">Directions</a>' +
      "</div></article>";
  }
  function visible() {
    const query = qEl.value.trim();
    let rows = locations.filter((loc) => matches(loc, query));
    if (origin) rows = rows.slice().sort((a, b) => miles(origin, a) - miles(origin, b));
    return rows;
  }
  function render() {
    const rows = visible();
    listEl.innerHTML = rows.length
      ? rows.map(card).join("")
      : '<p class="store-empty">No studios match that search.</p>';
  }
  function select(id, opts) {
    selected = id;
    document.querySelectorAll(".store-card").forEach((el) => el.classList.toggle("is-on", el.dataset.id === id));
    const marker = markers[id];
    if (!marker || !map) return;
    Object.entries(markers).forEach(([key, item]) => item.getElement()?.classList.toggle("is-on", key === id));
    if (opts.pan) map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 11), { duration: 0.5 });
    if (opts.popup) marker.openPopup();
    document.querySelector('.store-card[data-id="' + id + '"]')?.scrollIntoView({ block: "nearest" });
  }
  function mountMap() {
    if (!window.L || map) return;
    map = L.map("storeMap", { scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    const icon = L.divIcon({
      className: "store-pin",
      html: "<span></span>",
      iconSize: [32, 32],
      iconAnchor: [16, 30],
      popupAnchor: [0, -28],
    });
    locations.forEach((loc) => {
      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
      marker.bindPopup(
        "<strong>" + esc(loc.name) + "</strong><br>" + esc(loc.city) + ", " + esc(loc.state) +
        '<br><a href="' + esc(loc.page) + '">View pros</a>'
      );
      marker.on("click", () => select(loc.id, { pan: true, popup: true }));
      markers[loc.id] = marker;
    });
    fitMap();
    setTimeout(fitMap, 80);
  }
  function fitMap() {
    if (!map) return;
    map.invalidateSize();
    if (locations.length === 1) map.fitBounds(SOUTHEAST, { padding: [12, 12] });
    else if (locations.length) map.fitBounds(L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng])), { padding: [40, 40] });
  }
  function showMap(on) {
    app.classList.toggle("is-map", on);
    document.getElementById("tabList").setAttribute("aria-pressed", on ? "false" : "true");
    document.getElementById("tabMap").setAttribute("aria-pressed", on ? "true" : "false");
    setTimeout(fitMap, 40);
  }

  qEl.addEventListener("input", render);
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
  listEl.addEventListener("click", (event) => {
    const cardEl = event.target.closest(".store-card");
    if (!cardEl || event.target.closest('a[target="_blank"]')) return;
    select(cardEl.dataset.id, { pan: true, popup: false });
  });

  Promise.all([
    fetch("/data/locations.json").then((res) => res.json()),
    fetch("/data/pros.json").then((res) => res.json()),
  ]).then(([places, pros]) => {
    locations = places;
    tags = {};
    pros.filter((pro) => pro.active).forEach((pro) => {
      const bag = tags[pro.locationId] || [];
      (pro.categories || []).forEach((slug) => {
        const label = SHORT[slug] || slug;
        if (!bag.includes(label)) bag.push(label);
      });
      tags[pro.locationId] = bag;
    });
    render();
    mountMap();
  }).catch(() => {
    listEl.innerHTML = '<p class="store-empty">The studio list did not load. Call (843) 420-9965.</p>';
  });
})();
