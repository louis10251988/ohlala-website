/**
 * Pros inside one studio. Search stays on this page.
 */
(function () {
  const FULL = {
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
  const root = document.querySelector(".studio-page");
  if (!root) return;
  const locationId = root.dataset.location;
  const locationSlug = root.dataset.slug || "";
  const city = root.dataset.city || "";
  const nameEl = document.getElementById("studioName");
  const serviceEl = document.getElementById("studioService");
  const grid = document.getElementById("studioGrid");
  const empty = document.getElementById("studioEmpty");
  const count = document.getElementById("studioCount");
  const moreBtn = document.getElementById("studioMore");
  const extra = document.getElementById("studioExtra");
  let pros = [];

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }
  function initials(name) {
    return String(name || "").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  }
  function serviceText(pro) {
    return (pro.services || []).map((item) => typeof item === "string" ? item : [item.name, item.duration].filter(Boolean).join(" ")).join(" ");
  }
  function chosen(kind) {
    return [...document.querySelectorAll('#studioExtra [data-' + kind + '][aria-pressed="true"]')].map((el) => el.dataset[kind]);
  }
  function matches(pro) {
    const nameQ = nameEl.value.trim().toLowerCase();
    const svcQ = serviceEl.value.trim().toLowerCase();
    if (nameQ && (pro.name + " " + (pro.businessName || "")).toLowerCase().indexOf(nameQ) === -1) return false;
    if (svcQ) {
      const hay = (serviceText(pro) + " " + (pro.categories || []).map((slug) => FULL[slug] || slug).join(" ")).toLowerCase();
      if (!hay.includes(svcQ)) return false;
    }
    if (document.getElementById("studioAccepting").getAttribute("aria-pressed") === "true" && !pro.acceptingNewClients) return false;
    const langs = chosen("lang");
    if (langs.length && !langs.some((lang) => (pro.languages || []).includes(lang))) return false;
    const pays = chosen("pay");
    if (pays.length && !pays.some((pay) => (pro.payments || []).includes(pay))) return false;
    return true;
  }
  function card(pro) {
    const photo = pro.photo
      ? '<img src="' + esc(pro.photo) + '" alt="" width="480" height="360">'
      : '<span class="studio-mono" aria-hidden="true">' + esc(initials(pro.name)) + "</span>";
    const featured = pro.featured ? '<span class="featured-pill">Featured</span>' : "";
    const stars = typeof pro.rating === "number"
      ? '<p class="studio-stars">★ ' + esc(pro.rating.toFixed(1)) + (pro.ratingCount ? " (" + esc(pro.ratingCount) + ")" : "") + "</p>"
      : "";
    const pills = (pro.categories || []).map((slug) => '<span class="pill">' + esc(FULL[slug] || slug) + "</span>").join("");
    const where = pro.suite
      ? esc(pro.suite) + " at Oh La La " + esc(city)
      : "Oh La La " + esc(city);
    const body = '<div class="studio-card-photo">' + photo + featured + "</div>" +
      '<div class="studio-card-body">' + stars +
      "<h3>" + esc(pro.name) + "</h3>" +
      '<p class="studio-biz">' + esc(pro.businessName || "") + "</p>" +
      '<p class="studio-where">' + where + "</p>" +
      '<p class="pills">' + pills + "</p>" +
      "</div>";
    const profile = pro.profilePath || (pro.slug ? "/pros/" + pro.slug : "");
    if (profile) return '<a class="studio-card" href="' + esc(profile) + '">' + body + "</a>";
    if (!pro.href) return '<article class="studio-card">' + body + "</article>";
    const external = /^https?:/i.test(pro.href);
    return '<a class="studio-card" href="' + esc(pro.href) + '"' + (external ? ' target="_blank" rel="noopener"' : "") + ">" + body + "</a>";
  }
  function soon() {
    const join = "/pros/join" + (locationSlug ? "?location=" + encodeURIComponent(locationSlug) : "");
    return '<h2>Real pros coming soon</h2>' +
      '<p>These sample names are not bookable. When Oh La La pros join, they will show up here.</p>' +
      '<p><a class="btn btn-primary" href="tel:+18434209965">Call (843) 420-9965</a> <a class="btn btn-outline" href="sms:+18434209965">Text (843) 420-9965</a></p>' +
      '<p class="dir-empty-note">Call or text (843) 420-9965 to book.</p>' +
      '<p><a class="join-link" href="' + join + '">Are you an Oh La La pro? Join the directory</a></p>';
  }
  function render() {
    const real = pros.filter((pro) => pro.active && pro.consentApproved && !pro.isSample && pro.locationId === locationId);
    const soonEl = document.getElementById("studioSoon");
    const filters = document.getElementById("studioFilters");
    if (!real.length) {
      if (filters) filters.hidden = true;
      if (soonEl) { soonEl.hidden = false; soonEl.innerHTML = soon(); }
      grid.innerHTML = "";
      empty.hidden = true;
      count.textContent = "";
      return;
    }
    if (filters) filters.hidden = false;
    if (soonEl) soonEl.hidden = true;
    const rows = real.filter(matches);
    grid.innerHTML = rows.map(card).join("");
    empty.hidden = rows.length > 0;
    count.textContent = rows.length + (rows.length === 1 ? " pro" : " pros");
  }

  moreBtn.addEventListener("click", () => {
    const open = extra.classList.toggle("open");
    moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  extra.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    btn.setAttribute("aria-pressed", btn.getAttribute("aria-pressed") === "true" ? "false" : "true");
    render();
  });
  nameEl.addEventListener("input", render);
  serviceEl.addEventListener("input", render);
  document.getElementById("studioFilters").addEventListener("submit", (event) => event.preventDefault());

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      const el = document.createElement("script");
      el.src = src;
      el.onload = () => resolve();
      el.onerror = reject;
      document.body.appendChild(el);
    });
  }
  function mountStudioMap() {
    const mapEl = document.getElementById("studioMap");
    if (!mapEl || mapEl.dataset.ready || !window.L) return;
    mapEl.dataset.ready = "1";
    ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"].forEach((href) => {
      if (document.querySelector('link[href="' + href + '"]')) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });
    const lat = Number(mapEl.dataset.lat);
    const lng = Number(mapEl.dataset.lng);
    const map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: false }).setView([lat, lng], 14);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.maplibreGL({
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      attributionControl: false,
    }).addTo(map);
    map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>');
    const icon = L.divIcon({
      className: "store-pin",
      html: '<svg class="pin-svg" viewBox="0 0 36 48" aria-hidden="true"><path d="M18 1C9.2 1 2 8.1 2 17c0 11.2 16 30 16 30s16-18.8 16-30C34 8.1 26.8 1 18 1z" fill="#5D1A3A"/><circle cx="18" cy="16" r="4.5" fill="#E8B4A8"/></svg>',
      iconSize: [36, 48],
      iconAnchor: [18, 46],
    });
    L.marker([lat, lng], { icon }).addTo(map);
    mapEl.tabIndex = 0;
    const box = map.getContainer();
    box.addEventListener("click", () => map.scrollWheelZoom.enable());
    box.addEventListener("focus", () => map.scrollWheelZoom.enable());
    box.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
    box.addEventListener("blur", () => map.scrollWheelZoom.disable());
    setTimeout(() => map.invalidateSize(), 80);
  }
  const mapEl = document.getElementById("studioMap");
  if (mapEl && "IntersectionObserver" in window) {
    const watch = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      watch.disconnect();
      loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js")
        .then(() => loadScript("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"))
        .then(() => loadScript("https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js"))
        .then(mountStudioMap);
    }, { rootMargin: "200px" });
    watch.observe(mapEl);
  }

  const directoryUrl = "/api/directory?location=" + encodeURIComponent(locationSlug);
  fetch(directoryUrl).then((res) => {
    if (!res.ok) throw new Error("directory");
    return res.json();
  }).then((rows) => {
    if (!Array.isArray(rows)) throw new Error("directory");
    pros = rows;
    render();
  }).catch(() => {
    count.textContent = "The directory did not load. Call (843) 420-9965.";
  });
})();
