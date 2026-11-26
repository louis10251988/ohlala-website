import { header, footer, cssHref, fontHref } from "../../scripts/chrome.mjs";
import { BUSINESS_TYPES } from "../api/business-types.js";
import { findLocation } from "../api/coming-soon.js";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function page(place) {
  const rents = (place.rents || []).map((item) => `<li>${esc(item.size)} — $${esc(item.weekly)} a week</li>`).join("");
  const title = "Coming soon: Oh La La at " + place.name;
  const description = "Proposed studio at " + place.address + ". No lease signed yet. " + place.goal + " founding pros needed to open. No payment needed.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Oh La La Salon &amp; Studios</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="https://ohlalasalonstudio.com/coming-soon/${esc(place.slug)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<link rel="stylesheet" href="${cssHref}">
<link rel="stylesheet" href="${fontHref}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
<body>
${header("")}
<main id="main" class="soon">
  <section class="soon-hero">
    <div class="wrap soon-hero-in">
      <p class="soon-kicker">Coming soon · ${esc(place.city)}, ${esc(place.state)}</p>
      <h1>We want to open a studio here.</h1>
      <p class="soon-lead">Private suites for beauty and wellness pros. One pro. One client. Your own room.</p>
      <p class="soon-flag">Proposed site — no lease signed yet</p>
      <p class="soon-address">${esc(place.address)}</p>
      <p class="soon-need" id="soonNeed">${esc(place.goal)} founding pros needed to open.</p>
      <p class="soon-count" id="soonCount"><span id="soonNum">0</span> / ${esc(place.goal)} Founding Pros</p>
      <div class="soon-bar" aria-hidden="true"><i id="soonBar"></i></div>
      <p class="soon-left" id="soonLeft">${esc(place.goal)} spots left</p>
      <ul class="soon-perks">
        <li>Your founder rent stays locked.</li>
        <li>Free launch package.</li>
        <li>You pick your suite first.</li>
        <li>No payment needed to join the list.</li>
      </ul>
      <p class="soon-rent">Suites start at $${esc((place.rents[0] || {}).weekly || 300)} a week.</p>
      <ul class="soon-sizes">${rents}</ul>
      <p><a class="btn btn-gold" href="#join">Join the list</a> <a class="soon-call" href="tel:+18434209965">Call (843) 420-9965</a></p>
    </div>
  </section>
  <section class="soon-form" id="join">
    <div class="wrap soon-card">
      <h2>Join the founding list</h2>
      <p>Tell us you want a suite here. We will text or call you. You do not pay anything today.</p>
      <form id="soonForm" novalidate>
        <div class="form-grid">
          <div class="fg"><label for="name">Name</label><input id="name" name="name" required autocomplete="name"></div>
          <div class="fg"><label for="phone">Phone</label><input id="phone" name="phone" type="tel" required autocomplete="tel" inputmode="tel"></div>
          <div class="fg"><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email"></div>
          <div class="fg type-field">
            <label id="typeLabel" for="typeSearch">Type of business</label>
            <div class="type-control">
              <div class="type-tags" id="typeTags"></div>
              <input id="typeSearch" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="typeMenu" aria-labelledby="typeLabel" placeholder="Search services" autocomplete="off">
              <button class="type-toggle" id="typeToggle" type="button" aria-label="Show types of business" aria-expanded="false" aria-controls="typeMenu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
            </div>
            <ul class="type-menu" id="typeMenu" role="listbox" aria-multiselectable="true" hidden></ul>
            <p class="join-note">You can choose more than one.</p>
          </div>
          <div class="fg"><label for="size">Suite size wanted</label>
            <select id="size" name="size" required>
              <option value="">Choose one</option>
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
              <option>Not sure</option>
            </select>
          </div>
          <div class="fg"><label for="timing">When could you move in?</label>
            <select id="timing" name="timing" required>
              <option value="">Choose one</option>
              <option>ASAP</option>
              <option>1-3 months</option>
              <option>3-6 months</option>
              <option>Just looking</option>
            </select>
          </div>
          <div class="fg"><label for="current">Where do you work now? (optional)</label><input id="current" name="current" placeholder="Salon name or city"></div>
          <label class="chip"><input id="consent" name="consent" type="checkbox" required> Oh La La can text and call me about this studio.</label>
          <div class="hp" aria-hidden="true"><label for="company">Company</label><input id="company" name="company" tabindex="-1" autocomplete="off"></div>
          <p class="form-err" id="formErr" role="alert"></p>
          <button class="btn btn-gold" type="submit">Join the list</button>
        </div>
      </form>
      <div class="form-ok" id="formOk">
        <p class="big">You’re on the list</p>
        <p>No payment was taken. We will text or call you. Questions? Call <a href="tel:+18434209965">(843) 420-9965</a>.</p>
      </div>
    </div>
  </section>
</main>
<script>
const SLUG=${JSON.stringify(place.slug)};
const GOAL=${Number(place.goal) || 30};
const TYPES=${JSON.stringify(BUSINESS_TYPES)};
const chosen=[];
const typeSearch=document.getElementById('typeSearch');
const typeMenu=document.getElementById('typeMenu');
const typeTags=document.getElementById('typeTags');
const typeToggle=document.getElementById('typeToggle');
const typeField=document.querySelector('.type-field');
let typeOpen=false, typeActive=0;
function escType(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function typeMatches(){const q=typeSearch.value.trim().toLowerCase();return TYPES.filter(name=>!q||name.toLowerCase().includes(q));}
function paintTags(){typeTags.innerHTML=chosen.map(name=>'<span class="type-tag"><span>'+escType(name)+'</span><button type="button" data-remove="'+escType(name)+'" aria-label="Remove '+escType(name)+'">×</button></span>').join('');typeSearch.placeholder=chosen.length?'Add another':'Search services';}
function paintMenu(){const rows=typeMatches();if(typeActive>=rows.length)typeActive=0;if(!rows.length){typeMenu.innerHTML='<li class="type-empty">No matching service</li>';return;}typeMenu.innerHTML=rows.map((name,i)=>'<li role="option" class="type-option'+(i===typeActive?' is-active':'')+'" aria-selected="'+(chosen.includes(name)?'true':'false')+'" data-name="'+escType(name)+'"><span>'+escType(name)+'</span>'+(chosen.includes(name)?'<span class="type-check" aria-hidden="true">✓</span>':'')+'</li>').join('');}
function setTypeOpen(next){typeOpen=next;typeMenu.hidden=!next;typeSearch.setAttribute('aria-expanded',next?'true':'false');typeToggle.setAttribute('aria-expanded',next?'true':'false');if(next)paintMenu();}
function toggleType(name){const at=chosen.indexOf(name);if(at>=0)chosen.splice(at,1);else chosen.push(name);paintTags();if(typeOpen)paintMenu();}
typeSearch.addEventListener('focus',()=>setTypeOpen(true));
typeSearch.addEventListener('input',()=>{typeActive=0;setTypeOpen(true);});
typeSearch.addEventListener('keydown',event=>{const rows=typeMatches();if(event.key==='ArrowDown'){event.preventDefault();if(!typeOpen){typeActive=0;setTypeOpen(true);return;}if(!rows.length)return;typeActive=Math.min(rows.length-1,typeActive+1);paintMenu();return;}if(event.key==='ArrowUp'){event.preventDefault();typeActive=Math.max(0,typeActive-1);if(typeOpen)paintMenu();return;}if(event.key==='Enter'&&typeOpen){event.preventDefault();if(rows[typeActive])toggleType(rows[typeActive]);return;}if(event.key==='Escape')setTypeOpen(false);});
typeToggle.addEventListener('mousedown',event=>event.preventDefault());
typeToggle.addEventListener('click',()=>{const next=!typeOpen;typeSearch.focus();setTypeOpen(next);});
typeMenu.addEventListener('mousedown',event=>event.preventDefault());
typeMenu.addEventListener('click',event=>{const option=event.target.closest('[data-name]');if(!option)return;toggleType(option.dataset.name);typeSearch.focus();});
typeTags.addEventListener('click',event=>{const btn=event.target.closest('[data-remove]');if(btn)toggleType(btn.dataset.remove);});
document.addEventListener('click',event=>{if(!typeField.contains(event.target))setTypeOpen(false);});
function paintCount(data){const count=Number(data.count)||0;const goal=Number(data.goal)||GOAL;const left=Number(data.left)||0;document.getElementById('soonNum').textContent=String(count);document.getElementById('soonBar').style.width=Math.round((count/goal)*100)+'%';document.getElementById('soonLeft').textContent=left?left+' spots left':'The founding list is full. Call (843) 420-9965.';}
fetch('/api/coming-soon?slug='+encodeURIComponent(SLUG)).then(res=>res.ok?res.json():null).then(data=>{if(data&&data.ok)paintCount(data);}).catch(()=>{});
document.getElementById('soonForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.target;
  const err=document.getElementById('formErr');
  const show=msg=>{err.textContent=msg;err.style.display='block';};
  err.style.display='none';
  if(!form.name.value.trim()){show('Please add your name.');return;}
  if(form.phone.value.replace(/\\D/g,'').length<10){show('Please add a phone number we can text or call.');return;}
  if(!form.email.value.includes('@')){show('Please add your email.');return;}
  if(!chosen.length){show('Please choose at least one type of business.');return;}
  if(!form.size.value){show('Please choose a suite size.');return;}
  if(!form.timing.value){show('Please tell us when you could move in.');return;}
  if(!form.consent.checked){show('Please say we can text and call you.');return;}
  const btn=form.querySelector('button[type="submit"]');
  btn.disabled=true;
  try{
    const res=await fetch('/api/coming-soon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:SLUG,name:form.name.value.trim(),phone:form.phone.value.trim(),email:form.email.value.trim(),categories:chosen.slice(),size:form.size.value,timing:form.timing.value,current:form.current.value.trim(),consent:form.consent.checked,company:form.company.value})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok)throw new Error(data.error||'save failed');
    if(typeof data.count==='number')paintCount(data);
    form.style.display='none';
    document.getElementById('formOk').style.display='block';
  }catch(error){
    show((error.message&&error.message!=='save failed'?error.message+' ':'')+'Please call (843) 420-9965.');
    btn.disabled=false;
  }
});
</script>
${footer({ sticky: false })}
</body>
</html>`;
}

function missing() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Studio not listed | Oh La La Salon &amp; Studios</title>
<link rel="stylesheet" href="${cssHref}">
<link rel="stylesheet" href="${fontHref}">
</head>
<body>
${header("")}
<main id="main" class="wrap" style="padding:48px 16px">
  <h1>That studio is not on the list yet.</h1>
  <p>Call <a href="tel:+18434209965">(843) 420-9965</a>.</p>
</main>
${footer({ sticky: false })}
</body>
</html>`;
}

export async function onRequest(context) {
  const slug = String((context.params && context.params.slug) || "").replace(/\/$/, "");
  const place = findLocation(slug);
  const body = place ? page(place) : missing();
  return new Response(body, {
    status: place ? 200 : 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
