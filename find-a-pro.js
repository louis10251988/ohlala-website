/**
 * Find a Pro directory.
 * Filter state is one plain object. A future grouped filter modal can call
 * setState() with the same keys. That modal is not built.
 *
 * Keys: q, category, location, accepting, languages[], payments[]
 * ZIP and radius stay hidden until more than one location exists.
 */
(function () {
  const STUDIO_PHONE = "(843) 420-9965";
  const STUDIO_TEL = "+18434209965";
  const CATS = [
    { slug: "hair", label: "Hair (cuts, color, extensions, braids & locs)", short: "Hair" },
    { slug: "barber", label: "Barber", short: "Barber" },
    { slug: "nails", label: "Nails", short: "Nails" },
    { slug: "lashes-brows", label: "Lashes, Brows & Hair Removal", short: "Lashes & Brows" },
    { slug: "skin", label: "Skin Care", short: "Skin Care" },
    { slug: "tattoo", label: "Tattoo & Permanent Makeup", short: "Tattoo & PMU" },
    { slug: "massage", label: "Massage & Bodywork", short: "Massage" },
    { slug: "wellness", label: "Wellness (nutrition, weight loss, holistic)", short: "Wellness" },
    { slug: "fitness", label: "Fitness (personal training, yoga, pilates)", short: "Fitness" },
    { slug: "other", label: "Other", short: "Other" },
  ];
  const LANGS = ["English", "Chinese", "Spanish"];
  const PAYS = ["Card", "Buy Now Pay Later"];
  const catBySlug = Object.fromEntries(CATS.map((cat) => [cat.slug, cat]));

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
    map: document.getElementById("map"),
  };

  let locations = [];
  let pros = [];
  let map;
  let marker;

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
    return String(name || "").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  }

  function isPublic(pro) {
    return pro.active && (pro.consentApproved || pro.isSample);
  }

  function getState() {
    const checked = (name) => [...els.form.querySelectorAll('input[name="' + name + '"]:checked')].map((input) => input.value);
    return {
      q: els.q.value.trim(),
      category: els.category.value,
      location: els.location.value,
      accepting: els.accepting.checked,
      languages: checked("lang"),
      payments: checked("pay"),
    };
  }

  function setState(next) {
    els.q.value = next.q || "";
    els.category.value = catBySlug[next.category] ? next.category : "";
    const knownLocation = locations.some((loc) => loc.id === next.location);
    els.location.value = knownLocation ? next.location : "";
    els.accepting.checked = !!next.accepting;
    els.form.querySelectorAll('input[name="lang"]').forEach((input) => {
      input.checked = (next.languages || []).includes(input.value);
    });
    els.form.querySelectorAll('input[name="pay"]').forEach((input) => {
      input.checked = (next.payments || []).includes(input.value);
    });
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
    if (state.category && !(pro.categories || []).includes(state.category)) return false;
    if (state.location && pro.locationId !== state.location) return false;
    if (state.accepting && !pro.acceptingNewClients) return false;
    if (state.languages.length && !state.languages.some((lang) => (pro.languages || []).includes(lang))) return false;
    if (state.payments.length && !state.payments.some((pay) => (pro.payments || []).includes(pay))) return false;
    if (state.q) {
      const hay = [
        pro.name,
        pro.businessName,
        ...(pro.services || []),
        ...(pro.categories || []).map((slug) => (catBySlug[slug] ? catBySlug[slug].label + " " + catBySlug[slug].short : slug)),
      ].join(" ").toLowerCase();
      if (!hay.includes(state.q.toLowerCase())) return false;
    }
    return true;
  }

  const phoneIcon = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h3l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z"/></svg>';
  const pinIcon = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  function card(pro, loc) {
    const pills = (pro.categories || []).map((slug) => '<span class="pill">' + esc(catBySlug[slug] ? catBySlug[slug].short : slug) + "</span>").join("");
    const photo = pro.photo
      ? '<img class="avatar" src="' + esc(pro.photo) + '" alt="" width="64" height="64">'
      : '<span class="mono avatar" aria-hidden="true">' + esc(initials(pro.name)) + "</span>";
    const sample = pro.isSample ? '<span class="sample-tag">Sample</span>' : "";
    const city = loc ? esc(loc.city) + ", " + esc(loc.state) : "";
    const address = "4498 Ladson Rd, " + esc(pro.suite) + ", Summerville, SC 29485";
    const phone = pro.phone || (loc && loc.phone) || STUDIO_PHONE;
    return '<a class="finder-card" href="/pros/' + esc(pro.slug) + '">' + photo +
      "<span><strong>" + esc(pro.name) + "</strong>" + sample +
      '<span class="biz">' + esc(pro.businessName) + (city ? " · " + city : "") + "</span>" +
      '<span class="meta">' + phoneIcon + esc(phone) + "</span>" +
      '<span class="meta">' + pinIcon + address + "</span>" +
      '<span class="pills">' + pills + "</span></span></a>";
  }

  function render() {
    const state = getState();
    const locById = Object.fromEntries(locations.map((loc) => [loc.id, loc]));
    const matches = pros.filter(isPublic).filter((pro) => proMatches(pro, state));
    els.count.textContent = "Showing " + matches.length + (matches.length === 1 ? " pro" : " pros");
    els.list.innerHTML = matches.slice(0, 24).map((pro) => card(pro, locById[pro.locationId])).join("");
    els.empty.hidden = matches.length > 0;
    els.reset.hidden = !filtersActive(state);
  }

  function fillControls() {
    els.category.innerHTML = '<option value="">All Services</option>' + CATS.map((cat) => '<option value="' + cat.slug + '">' + esc(cat.label) + "</option>").join("");
    els.location.innerHTML = '<option value="">All locations</option>' + locations.map((loc) => '<option value="' + esc(loc.id) + '">' + esc(loc.label) + "</option>").join("");
    if (locations.length > 1) els.geo.hidden = false;
  }

  function pinMap() {
    if (!window.L || !locations[0] || map) return;
    const loc = locations[0];
    map = L.map(els.map, { scrollWheelZoom: false }).setView([loc.lat, loc.lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    const icon = L.divIcon({ className: "pin", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] });
    marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
    marker.bindPopup(
      "<strong>" + esc(loc.name) + "</strong><br>" +
      '<a href="tel:' + esc(loc.phoneTel) + '">' + esc(loc.phone) + "</a><br>" +
      esc(loc.address) + "<br>" +
      '<a href="' + esc(loc.directionsUrl) + '" target="_blank" rel="noopener">Directions</a>'
    );
  }

  function showPane(which) {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const listOn = which !== "map";
    document.getElementById("listPane").hidden = mobile && !listOn;
    document.getElementById("mapPane").hidden = mobile && listOn;
    document.getElementById("showList").setAttribute("aria-pressed", listOn ? "true" : "false");
    document.getElementById("showMap").setAttribute("aria-pressed", listOn ? "false" : "true");
    if (map && (!mobile || !listOn)) setTimeout(() => map.invalidateSize(), 50);
  }

  document.getElementById("showList").addEventListener("click", () => showPane("list"));
  document.getElementById("showMap").addEventListener("click", () => showPane("map"));
  els.form.addEventListener("submit", (event) => event.preventDefault());
  els.form.addEventListener("input", () => {
    writeUrl(getState());
    render();
  });
  els.reset.addEventListener("click", () => setState({ q: "", category: "", location: "", accepting: false, languages: [], payments: [] }));

  const moreBtn = document.getElementById("moreBtn");
  const morePop = document.getElementById("morePop");
  moreBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = morePop.classList.toggle("open");
    moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("click", (event) => {
    if (!morePop.contains(event.target) && event.target !== moreBtn) {
      morePop.classList.remove("open");
      moreBtn.setAttribute("aria-expanded", "false");
    }
  });

  Promise.all([
    fetch("/data/pros.json").then((res) => res.json()),
    fetch("/data/locations.json").then((res) => res.json()),
  ]).then(([proData, locData]) => {
    pros = proData;
    locations = locData;
    fillControls();
    setState(readUrl());
    pinMap();
    showPane("list");
  }).catch(() => {
    els.count.textContent = "The directory could not load. Call (843) 420-9965.";
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      document.getElementById("listPane").hidden = false;
      document.getElementById("mapPane").hidden = false;
      if (map) map.invalidateSize();
    }
  });
})();
