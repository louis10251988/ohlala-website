/**
 * The only header and footer for the site.
 * scripts/apply-chrome.mjs stamps every page. scripts/render-pros.mjs uses the same functions.
 */
export const ASSET = "20261122e";
export const cssHref = `/styles.css?v=${ASSET}`;
export const fontHref = "https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap";

const NAV = [
  ["suites", "/suites", "Suites"],
  ["earnings", "/earnings", "Earnings"],
  ["faq", "/faq", "FAQ"],
  ["locations", "/locations/", "Locations"],
];

export function header(active = "") {
  const links = NAV.map(([key, href, label]) =>
    `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`
  ).join("\n      ");
  return `<!-- site-header -->
<a class="skip" href="#main">Skip to content</a>
<nav>
  <div class="nav-in">
    <a class="nav-logo" href="/" aria-label="Oh La La Salon and Studios home"><img src="/images/logo.png" width="1146" height="282" alt="Oh La La Salon and Studios"></a>
    <div class="nav-links">
      ${links}
    </div>
    <div class="nav-cta">
      <a class="pill-cta pill-cta-outline" href="/locations/">Book a service</a>
      <a class="pill-cta pill-cta-solid" href="/#tour">Find your suite</a>
    </div>
    <button class="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mm" onclick="var m=document.getElementById('mm');var o=m.classList.toggle('open');this.setAttribute('aria-expanded',o?'true':'false')"><span></span><span></span><span></span></button>
  </div>
  <div class="mobile-menu" id="mm">
    ${NAV.map(([, href, label]) => `<a href="${href}">${label}</a>`).join("")}
    <a href="/#tour">Find your suite</a>
    <a href="tel:+18434209965">Call (843) 420-9965</a>
  </div>
</nav>
<!-- /site-header -->`;
}

export function footer(options = {}) {
  const sticky = options.sticky !== false;
  return `<!-- site-footer -->
<footer>
  <div class="wrap foot-grid">
    <div>
      <a href="/" aria-label="Oh La La Salon and Studios home"><img class="foot-logo" src="/images/logo.png" width="1146" height="282" alt="Oh La La Salon and Studios"></a>
      <p>Private studios for independent pros who serve clients one-on-one in the Charleston Lowcountry.</p>
      <p><a href="/pros/join">Oh La La tenant? Join the directory</a></p>
    </div>
    <div>
      <h2>Explore</h2>
      <ul>
        <li><a href="/suites">Suites</a></li>
        <li><a href="/earnings">Earnings</a></li>
        <li><a href="/faq">FAQ</a></li>
        <li><a href="/locations/">Locations</a></li>
        <li><a href="/locations/summerville">Summerville studio</a></li>
      </ul>
    </div>
    <div>
      <h2>Visit</h2>
      <ul>
        <li>4498 Ladson Rd</li>
        <li>Summerville, SC 29485</li>
        <li><a href="tel:+18434209965">(843) 420-9965</a></li>
        <li><a href="mailto:info@ohlalasalonstudio.com">info@ohlalasalonstudio.com</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap legal">©2026 Oh La La Salon &amp; Studios. Each professional operating at an Oh La La location is an independently owned and operated business.</div>
</footer>
${sticky ? `<div class="msticky"><a class="btn btn-outline" href="/#tour">Find your suite</a><a class="btn btn-primary" href="tel:+18434209965">Call</a></div>` : ""}
<!-- /site-footer -->`;
}
