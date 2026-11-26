import { theme } from "./theme.js";
import { BUSINESS_TYPES } from "./api/business-types.js";
import { findLocation } from "./api/coming-soon.js";
import { proof, phone, logoUrl, homeUrl } from "../locations.js";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function page(place, origin) {
  const start = (place.rents[0] || {}).weekly || 300;
  const rents = (place.rents || []).map((item) => `<li>${esc(item.size)} — $${esc(item.weekly)} a week · ${esc(item.sqft)} sq ft</li>`).join("");
  const perks = (place.perks || []).map((item) => `<li>${esc(item)}</li>`).join("");
  const includes = (place.suiteIncludes || []).map((item) => `<li>${esc(item)}</li>`).join("");
  const facts = proof.facts.map((item) => `<li>${esc(item)}</li>`).join("");
  const canonical = origin + "/" + place.slug;
  const title = "Oh La La at " + place.name + " — coming soon";
  const description = "Proposed studio at " + place.address + ". No lease signed yet. " + place.goal + " founding pros needed. No payment needed.";
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: title,
        url: canonical,
        description,
      },
      {
        "@type": "LocalBusiness",
        name: "Oh La La Salon & Studios — " + place.name + " (proposed)",
        url: canonical,
        telephone: phone.tel,
        image: place.photo,
        address: {
          "@type": "PostalAddress",
          streetAddress: place.address,
          addressLocality: place.city,
          addressRegion: place.state,
          addressCountry: "US",
        },
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
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(place.photo)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<style>${theme}</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap">
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"182d5244fee94c929d9917c698745875"}'></script>
<script type="application/ld+json">${JSON.stringify(graph)}</script>
</head>
<body>
<a class="skip" href="#join">Skip to the form</a>
<header class="hero">
  <div class="wrap top">
    <img class="logo" src="${esc(logoUrl)}" alt="Oh La La Salon and Studios" width="180" height="44">
    <a class="call" href="tel:${esc(phone.tel)}">${esc(phone.display)}</a>
  </div>
  <div class="wrap">
    <p class="kicker">Coming soon · ${esc(place.city)}, ${esc(place.state)}</p>
    <h1>We want to open a studio here.</h1>
    <p class="lead">A private room for your clients. You keep the business you build.</p>
    <p class="flag">Proposed site — no lease signed yet</p>
    <p class="address">${esc(place.address)}</p>
    <img class="shot" src="${esc(place.photo)}" alt="${esc(place.photoAlt)}" width="800" height="600">
    <p class="count"><span id="soonNum">0</span> / ${esc(place.goal)} Founding Pros</p>
    <div class="bar" aria-hidden="true"><i id="soonBar"></i></div>
    <p id="soonLeft">${esc(place.goal)} spots left</p>
    <ul class="perks">${perks}</ul>
    <p class="rent">Suites start at $${esc(start)} a week.</p>
    <ul class="sizes">${rents}</ul>
    <p class="actions"><a class="btn" href="#join">Join the list</a><a class="call-link" href="${esc(place.mapUrl)}">See the map</a></p>
  </div>
</header>
<section class="band">
  <div class="wrap proof">
    <img src="${esc(proof.photo)}" alt="${esc(proof.photoAlt)}" width="800" height="500">
    <div>
      <h2>Already open in ${esc(proof.name)}</h2>
      <p>${esc(proof.address)}</p>
      <ul class="includes">${facts}</ul>
      <p><a href="${esc(proof.url)}">See the Summerville studio</a></p>
    </div>
  </div>
</section>
<section class="band" style="background:#fff">
  <div class="wrap">
    <h2>What you get in a suite</h2>
    <ul class="includes">${includes}</ul>
  </div>
</section>
<section class="band">
  <div class="wrap">
    <h2>How it works</h2>
    <ol class="steps">
      <li><b>Join the list.</b> It takes a minute. You do not pay.</li>
      <li><b>We hit ${esc(place.goal)} founding pros.</b> The number on this page is the real count.</li>
      <li><b>We sign the lease.</b> Then you pick your suite. Your founder rent stays locked.</li>
    </ol>
  </div>
</section>
<section class="band" style="background:#fff">
  <div class="wrap">
    <h2>See the math</h2>
    <p>This is the same idea as our earnings page. Drag the sliders. Rent stays inside the math. It is an estimate only.</p>
    <div class="math" data-math>
      <label for="rev">Your weekly service revenue</label>
      <input id="rev" data-rev type="range" min="500" max="10000" step="100" value="2500">
      <p data-rev-label>$2,500 / week</p>
      <label for="split">What a salon keeps today</label>
      <input id="split" data-split type="range" min="20" max="70" step="1" value="45">
      <p data-split-label>45%</p>
      <label for="suite">Suite size</label>
      <select id="suite" data-suite>
        <option value="s" selected>Small studio (100 sq ft)</option>
        <option value="m">Medium studio (140 sq ft)</option>
        <option value="l">Large studio (200 sq ft)</option>
      </select>
      <div class="math-row"><span>You keep today</span><b data-today>$0 / mo</b></div>
      <div class="math-row"><span>You keep at Oh La La</span><b data-here>$0 / mo</b></div>
      <div class="math-row"><span>Difference each month</span><b data-diff>$0</b></div>
      <p class="note">Estimate only, before taxes and product costs.</p>
    </div>
  </div>
</section>
<section class="band faq">
  <div class="wrap">
    <h2>Questions</h2>
    <details><summary>Is the lease signed?</summary><p>No. This is a proposed site. We sign only if founding pros join the list.</p></details>
    <details><summary>Do I pay to join?</summary><p>No. No payment is taken on this page.</p></details>
    <details><summary>What does rent start at?</summary><p>Small suites start at $${esc(start)} a week. Medium is $400. Large is $500. That is the founder rent we lock if we open.</p></details>
    <details><summary>What if we do not hit ${esc(place.goal)}?</summary><p>We do not open this spot. You still paid nothing.</p></details>
    <details><summary>Can I tell a friend?</summary><p>Yes. After you join, you get a link. Friends who use it are counted on your signup.</p></details>
  </div>
</section>
<section class="band" id="join">
  <div class="wrap card">
    <h2>Join the founding list</h2>
    <p id="stepLabel">Step 1 of 2. We save your name as soon as you continue.</p>
    <form id="soonForm" novalidate>
      <div class="grid" id="step1">
        <div class="fg"><label for="name">Name</label><input id="name" required autocomplete="name"></div>
        <div class="fg"><label for="phone">Phone</label><input id="phone" type="tel" required autocomplete="tel" inputmode="tel"></div>
        <div class="fg"><label for="email">Email</label><input id="email" type="email" required autocomplete="email"></div>
        <label class="chip"><input id="consent" type="checkbox" required> Oh La La can text and call me about this studio.</label>
        <div class="hp" aria-hidden="true"><label for="company">Company</label><input id="company" tabindex="-1" autocomplete="off"></div>
        <button class="btn btn-wine" type="button" id="next">Save and continue</button>
      </div>
      <div class="grid" id="step2" hidden>
        <div class="fg type-field">
          <label id="typeLabel" for="typeSearch">Type of business</label>
          <div class="type-control">
            <div class="type-tags" id="typeTags"></div>
            <input id="typeSearch" type="search" role="combobox" aria-expanded="false" aria-controls="typeMenu" aria-labelledby="typeLabel" placeholder="Search services" autocomplete="off">
            <button class="type-toggle" id="typeToggle" type="button" aria-label="Show types of business">⌄</button>
          </div>
          <ul class="type-menu" id="typeMenu" role="listbox" hidden></ul>
          <p>You can choose more than one.</p>
        </div>
        <div class="fg"><label for="size">Suite size wanted</label>
          <select id="size"><option value="">Choose one</option><option>Small</option><option>Medium</option><option>Large</option><option>Not sure</option></select>
        </div>
        <div class="fg"><label for="timing">When could you move in?</label>
          <select id="timing"><option value="">Choose one</option><option>ASAP</option><option>1-3 months</option><option>3-6 months</option><option>Just looking</option></select>
        </div>
        <div class="fg"><label for="current">Where do you work now? (optional)</label><input id="current" placeholder="Salon name or city"></div>
        <button class="btn btn-wine" type="submit">Finish joining</button>
      </div>
      <p class="err" id="formErr" role="alert"></p>
    </form>
    <div class="ok" id="formOk">
      <p class="big">You’re on the list</p>
      <p>No payment was taken. Share your link if you want friends to join with you.</p>
      <p id="shareUrl"></p>
      <div class="share">
        <button class="btn btn-line" type="button" id="copyLink">Copy link</button>
        <a class="btn btn-line" id="smsLink" href="#">Text it</a>
        <a class="btn btn-line" id="mailLink" href="#">Email it</a>
      </div>
    </div>
  </div>
</section>
<footer class="foot"><div class="wrap"><p>Oh La La Salon &amp; Studios</p><p><a href="tel:${esc(phone.tel)}">${esc(phone.display)}</a></p><p><a class="home" href="${esc(homeUrl)}">ohlalasalonstudio.com</a></p></div></footer>
<script>
const SLUG=${JSON.stringify(place.slug)};
const GOAL=${Number(place.goal) || 30};
const TYPES=${JSON.stringify(BUSINESS_TYPES)};
const params=new URLSearchParams(location.search);
const utm={source:params.get('utm_source')||'',medium:params.get('utm_medium')||'',campaign:params.get('utm_campaign')||'',content:params.get('utm_content')||'',term:params.get('utm_term')||''};
const refCode=(params.get('ref')||'').toLowerCase();
const chosen=[];
const typeSearch=document.getElementById('typeSearch');
const typeMenu=document.getElementById('typeMenu');
const typeTags=document.getElementById('typeTags');
const typeToggle=document.getElementById('typeToggle');
const typeField=document.querySelector('.type-field');
let typeOpen=false,typeActive=0;
function escType(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function matches(){const q=typeSearch.value.trim().toLowerCase();return TYPES.filter(n=>!q||n.toLowerCase().includes(q));}
function paintTags(){typeTags.innerHTML=chosen.map(n=>'<span class="type-tag"><span>'+escType(n)+'</span><button type="button" data-remove="'+escType(n)+'" aria-label="Remove '+escType(n)+'">×</button></span>').join('');}
function paintMenu(){const rows=matches();if(typeActive>=rows.length)typeActive=0;typeMenu.innerHTML=rows.map((n,i)=>'<li role="option" class="type-option" aria-selected="'+(chosen.includes(n)?'true':'false')+'" data-name="'+escType(n)+'">'+escType(n)+(chosen.includes(n)?' ✓':'')+'</li>').join('')||'<li>No matching service</li>';}
function setOpen(on){typeOpen=on;typeMenu.hidden=!on;typeSearch.setAttribute('aria-expanded',on?'true':'false');if(on)paintMenu();}
function toggle(name){const i=chosen.indexOf(name);if(i>=0)chosen.splice(i,1);else chosen.push(name);paintTags();if(typeOpen)paintMenu();}
typeSearch.addEventListener('focus',()=>setOpen(true));
typeSearch.addEventListener('input',()=>{typeActive=0;setOpen(true);});
typeSearch.addEventListener('keydown',e=>{const rows=matches();if(e.key==='ArrowDown'){e.preventDefault();if(!typeOpen){setOpen(true);return;}typeActive=Math.min(rows.length-1,typeActive+1);paintMenu();}if(e.key==='Enter'&&typeOpen){e.preventDefault();if(rows[typeActive])toggle(rows[typeActive]);}if(e.key==='Escape')setOpen(false);});
typeToggle.addEventListener('mousedown',e=>e.preventDefault());
typeToggle.addEventListener('click',()=>{const next=!typeOpen;typeSearch.focus();setOpen(next);});
typeMenu.addEventListener('mousedown',e=>e.preventDefault());
typeMenu.addEventListener('click',e=>{const o=e.target.closest('[data-name]');if(o){toggle(o.dataset.name);typeSearch.focus();}});
typeTags.addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b)toggle(b.dataset.remove);});
document.addEventListener('click',e=>{if(!typeField.contains(e.target))setOpen(false);});
function paintCount(data){const count=Number(data.count)||0;const goal=Number(data.goal)||GOAL;document.getElementById('soonNum').textContent=String(count);document.getElementById('soonBar').style.width=Math.round(count/goal*100)+'%';document.getElementById('soonLeft').textContent=(Number(data.left)||0)?data.left+' spots left':'The founding list is full. Call ${esc(phone.display)}.';}
fetch('/api/coming-soon?slug='+encodeURIComponent(SLUG)).then(r=>r.ok?r.json():null).then(d=>{if(d&&d.ok)paintCount(d);}).catch(()=>{});
const WEEKS=4.33,R={s:300,m:400,l:500};
function paintMath(){const rev=+document.querySelector('[data-rev]').value;const split=+document.querySelector('[data-split]').value/100;const rent=R[document.querySelector('[data-suite]').value]||300;const today=rev*(1-split)*WEEKS;const here=(rev-rent)*WEEKS;const money=n=>'$'+Math.round(n).toLocaleString('en-US');document.querySelector('[data-rev-label]').textContent=money(rev)+' / week';document.querySelector('[data-split-label]').textContent=document.querySelector('[data-split]').value+'%';document.querySelector('[data-today]').textContent=money(today)+' / mo';document.querySelector('[data-here]').textContent=money(here)+' / mo';document.querySelector('[data-diff]').textContent=(here-today<0?'':'+')+money(here-today);}
document.querySelector('[data-math]').addEventListener('input',paintMath);paintMath();
const err=document.getElementById('formErr');
const show=msg=>{err.textContent=msg;err.style.display='block';};
function payload(step){return{step,slug:SLUG,name:document.getElementById('name').value.trim(),phone:document.getElementById('phone').value.trim(),email:document.getElementById('email').value.trim(),consent:document.getElementById('consent').checked,company:document.getElementById('company').value,categories:chosen.slice(),size:document.getElementById('size').value,timing:document.getElementById('timing').value,current:document.getElementById('current').value.trim(),ref:refCodeSafe(),utm,referrer:document.referrer||''};}
function refCodeSafe(){return (paramsRef||'').replace(/[^a-z0-9]/g,'').slice(0,12);}
const paramsRef=refCode;
async function send(body){const res=await fetch('/api/coming-soon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)throw new Error(data.error||'save failed');if(typeof data.count==='number')paintCount(data);return data;}
document.getElementById('next').addEventListener('click',async()=>{err.style.display='none';const p=payload('1');if(!p.name)return show('Please add your name.');if(p.phone.replace(/\\D/g,'').length<10)return show('Please add a phone number.');if(!p.email.includes('@'))return show('Please add your email.');if(!p.consent)return show('Please say we can text and call you.');const btn=document.getElementById('next');btn.disabled=true;try{await send(p);document.getElementById('step1').hidden=true;document.getElementById('step2').hidden=false;document.getElementById('stepLabel').textContent='Step 2 of 2. Tell us about your work.';}catch(e){show(e.message||'Please call ${esc(phone.display)}.');btn.disabled=false;}});
document.getElementById('soonForm').addEventListener('submit',async event=>{event.preventDefault();err.style.display='none';if(!chosen.length)return show('Please choose at least one type of business.');if(!document.getElementById('size').value)return show('Please choose a suite size.');if(!document.getElementById('timing').value)return show('Please tell us when you could move in.');const btn=event.target.querySelector('button[type="submit"]');btn.disabled=true;try{const data=await send(payload('2'));const url=data.shareUrl||'';document.getElementById('shareUrl').textContent=url;document.getElementById('smsLink').href='sms:?&body='+encodeURIComponent('Join me on the Oh La La founding list: '+url);document.getElementById('mailLink').href='mailto:?subject='+encodeURIComponent('Oh La La founding list')+'&body='+encodeURIComponent(url);document.getElementById('copyLink').onclick=()=>navigator.clipboard&&navigator.clipboard.writeText(url);document.getElementById('soonForm').hidden=true;document.getElementById('formOk').style.display='block';document.getElementById('stepLabel').hidden=true;}catch(e){show(e.message||'Please call ${esc(phone.display)}.');btn.disabled=false;}});
</script>
</body></html>`;
}

export async function onRequest(context) {
  const slug = String((context.params && context.params.slug) || "").replace(/\/$/, "");
  const place = findLocation(slug);
  if (!place) {
    return new Response("That studio is not on the list yet. Call (843) 420-9965.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const origin = new URL(context.request.url).origin;
  return new Response(page(place, origin), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
