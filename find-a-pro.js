/**
 * Find a Pro. Filter state is one object so a larger filter modal can call setState later.
 * One studio uses a compact map. More than one studio switches to the large map.
 */
(function () {
  const TYPES = [
    "Hair stylist",
    "Hair extensions",
    "Hair replacement / scalp care",
    "Textured / natural hair",
    "Braids",
    "Locs",
    "Barber",
    "Nails",
    "Lashes",
    "Brows",
    "Threading",
    "Waxing",
    "Sugaring",
    "Laser hair removal / electrolysis",
    "Skin care",
    "Spa",
    "Med spa / aesthetics",
    "Body contouring",
    "Beauty enhancements",
    "Weight loss / medical",
    "Makeup",
    "Permanent makeup / microblading",
    "Tattoo",
    "Tattoo removal",
    "Piercing & jewelry",
    "Massage",
    "Wellness & holistic",
    "Physical therapy / chiropractic",
    "Fitness",
    "Tanning",
    "Teeth whitening",
    "Ultrasound",
    "Photo studio",
    "Pet grooming",
    "Retail & lifestyle",
    "Other",
  ];
  const CATS = [{ slug: "", label: "All" }, ...TYPES.map((name) => ({ slug: name, label: name }))];
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
  function categoryLabel(slug) {
    return FULL[slug] || slug;
  }

  const els = {
    form: document.getElementById("filters"),
    q: document.getElementById("q"),
    category: document.getElementById("category"),
    location: document.getElementById("location"),
    accepting: document.getElementById("accepting"),
    reset: document.getElementById("resetFilters"),
    count: document.getElementById("resultCount"),
    list: document.getElementById("proList"),
    empty: document.getElementById("emptyState"),
    geo: document.getElementById("geoExtra"),
    mini: document.getElementById("miniMap"),
    big: document.getElementById("bigMap"),
    locCard: document.getElementById("locCard"),
  };

  let locations = [];
  let pros = [];
  let map;
  let timer;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }
  function initials(name) {
    return String(name || "").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  }
  function isPublic(pro) {
    return pro.active && (pro.consentApproved || pro.isSample);
  }
  function pressed(selector) {
    return [...document.querySelectorAll(selector + '[aria-pressed="true"]')].map((el) => el.dataset.lang || el.dataset.pay).filter(Boolean);
  }
  function getState() {
    return {
      q: els.q.value.trim(),
      category: els.category.value,
      location: els.location.value,
      accepting: els.accepting.getAttribute("aria-pressed") === "true",
      languages: pressed("[data-lang]"),
      payments: pressed("[data-pay]"),
    };
  }
  function setState(next) {
    els.q.value = next.q || "";
    els.category.value = CATS.some((cat) => cat.slug === next.category) ? next.category : "";
    document.querySelectorAll("#catChips .chip-btn").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.cat === els.category.value ? "true" : "false");
    });
    const known = locations.some((loc) => loc.id === next.location);
    els.location.value = known ? next.location : "";
    els.accepting.setAttribute("aria-pressed", next.accepting ? "true" : "false");
    document.querySelectorAll("[data-lang]").forEach((btn) => btn.setAttribute("aria-pressed", (next.languages || []).includes(btn.dataset.lang) ? "true" : "false"));
    document.querySelectorAll("[data-pay]").forEach((btn) => btn.setAttribute("aria-pressed", (next.payments || []).includes(btn.dataset.pay) ? "true" : "false"));
    writeUrl(getState());
    render();
  }
  function readUrl() {
    const params = new URLSearchParams(location.search);
    return {
      q: params.get("q") || "",
      category: params.get("category") || "",
      location: params.get("location") || "",
      accepting: params.get("accepting") === "1",
      languages: (params.get("lang") || "").split(",").filter(Boolean),
      payments: (params.get("pay") || "").split(",").filter(Boolean),
    };
  }
  function writeUrl(state) {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.category) params.set("category", state.category);
    if (state.location) params.set("location", state.location);
    if (state.accepting) params.set("accepting", "1");
    if (state.languages.length) params.set("lang", state.languages.join(","));
    if (state.payments.length) params.set("pay", state.payments.join(","));
    const query = params.toString();
    history.replaceState(null, "", query ? "?" + query : location.pathname);
  }
  function filtersActive(state) {
    return !!(state.q || state.category || state.location || state.accepting || state.languages.length || state.payments.length);
  }
  function proMatches(pro, state) {
    if (state.category && !(pro.categories || []).some((slug) => categoryLabel(slug) === state.category)) return false;
    if (state.location && pro.locationId !== state.location) return false;
    if (state.accepting && !pro.acceptingNewClients) return false;
    if (state.languages.length && !state.languages.some((lang) => (pro.languages || []).includes(lang))) return false;
    if (state.payments.length && !state.payments.some((pay) => (pro.payments || []).includes(pay))) return false;
    if (state.q) {
      const services = (pro.services || []).map((item) => typeof item === "string" ? item : [item.name, item.duration, item.price].filter(Boolean).join(" "));
      const hay = [pro.name, pro.businessName, ...services, ...(pro.categories || []).map(categoryLabel)].join(" ").toLowerCase();
      if (!hay.includes(state.q.toLowerCase())) return false;
    }
    return true;
  }
  function card(pro) {
    const photo = pro.photo
      ? '<img class="avatar" src="' + esc(pro.photo) + '" alt="" width="88" height="88">'
      : '<span class="mono avatar" aria-hidden="true">' + esc(initials(pro.name)) + "</span>";
    const cat = categoryLabel((pro.categories || [])[0]);
    const sample = pro.isSample ? '<span class="sample-quiet">Sample</span>' : "";
    const external = pro.vagaroUrl || pro.bookingUrl;
    const book = external
      ? '<a class="btn btn-primary book-mini" href="' + esc(external) + '" target="_blank" rel="noopener">Book</a>'
      : '<a class="btn btn-primary book-mini" href="/pros/' + esc(pro.slug) + '#book">Book</a>';
    return '<article class="pro-tile">' + photo +
      '<a class="pro-tile-link" href="/pros/' + esc(pro.slug) + '"><span class="visually-hidden">' + esc(pro.name) + "</span></a>" +
      "<div><h2>" + esc(pro.name) + "</h2>" +
      '<p class="cat-line">' + esc(cat) + "</p>" +
      '<p class="suite-line">' + esc(pro.suite) + "</p>" +
      '<p class="phone-line">' + esc(pro.phone || "(843) 420-9965") + "</p>" +
      sample + "</div>" + book + "</article>";
  }
  function render() {
    const state = getState();
    const matches = pros.filter(isPublic).filter((pro) => proMatches(pro, state));
    els.count.textContent = matches.length + (matches.length === 1 ? " pro" : " pros");
    els.list.innerHTML = matches.slice(0, 24).map(card).join("");
    els.empty.hidden = matches.length > 0;
    els.reset.hidden = !filtersActive(state);
  }
  function mountMap(el, loc) {
    if (!window.L || !loc || map) return;
    map = L.map(el, { scrollWheelZoom: false, attributionControl: true }).setView([loc.lat, loc.lng], locations.length > 1 ? 11 : 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
    const icon = L.divIcon({ className: "pin", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] });
    locations.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], { icon }).addTo(map);
      marker.bindPopup("<strong>" + esc(place.name) + "</strong><br>" + esc(place.phone) + "<br>" + esc(place.address));
    });
    setTimeout(() => map.invalidateSize(), 60);
  }

  document.getElementById("moreBtn").insertAdjacentHTML("beforebegin", CATS.map((cat) =>
    '<button class="chip-btn" type="button" data-cat="' + cat.slug + '" aria-pressed="' + (cat.slug === "" ? "true" : "false") + '">' + cat.label + "</button>"
  ).join(""));

  els.form.addEventListener("submit", (event) => event.preventDefault());
  els.q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { writeUrl(getState()); render(); }, 180);
  });
  document.getElementById("catChips").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-cat]");
    if (!btn) return;
    els.category.value = btn.dataset.cat;
    setState(getState());
  });
  document.getElementById("moreBtn").addEventListener("click", () => {
    const panel = document.getElementById("morePop");
    const open = panel.classList.toggle("open");
    document.getElementById("moreBtn").setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.getElementById("morePop").addEventListener("click", (event) => {
    const btn = event.target.closest(".chip-btn");
    if (!btn) return;
    btn.setAttribute("aria-pressed", btn.getAttribute("aria-pressed") === "true" ? "false" : "true");
    writeUrl(getState());
    render();
  });
  function clearAll() {
    setState({ q: "", category: "", location: "", accepting: false, languages: [], payments: [] });
  }
  els.reset.addEventListener("click", clearAll);
  document.getElementById("emptyClear").addEventListener("click", clearAll);

  Promise.all([
    fetch("/data/pros.json").then((res) => res.json()),
    fetch("/data/locations.json").then((res) => res.json()),
  ]).then(([proData, locData]) => {
    pros = proData;
    locations = locData;
    els.location.innerHTML = '<option value="">All locations</option>' + locations.map((loc) => '<option value="' + esc(loc.id) + '">' + esc(loc.label) + "</option>").join("");
    if (locations.length > 1) {
      document.body.classList.add("multi-loc");
      els.big.hidden = false;
      els.locCard.hidden = true;
      els.geo.hidden = false;
      mountMap(els.big, locations[0]);
    } else if (window.matchMedia("(min-width: 800px)").matches) {
      els.locCard.open = true;
      mountMap(els.mini, locations[0]);
    } else {
      mountMap(els.mini, locations[0]);
    }
    setState(readUrl());
  }).catch(() => {
    els.count.textContent = "The directory could not load. Call (843) 420-9965.";
  });
})();
