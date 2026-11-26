export const theme = `
:root{--wine:#5D1A3A;--deep:#3D0F26;--rose:#E8B4A8;--blush:#EFD9CE;--cream:#FDFAF8;--ink:#2A1720;--muted:#5E5156;--serif:'Playfair Display',Georgia,serif;--sans:'Montserrat',system-ui,sans-serif}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--sans);color:var(--ink);background:var(--cream);font-size:16px;line-height:1.5}
img{max-width:100%;display:block}
a{color:inherit}
h1,h2,h3{font-family:var(--serif);font-weight:600;line-height:1.15;color:var(--wine)}
.wrap{max-width:760px;margin:0 auto;padding:0 16px}
.skip{position:absolute;left:-999px;top:8px;background:#fff;padding:8px 12px;z-index:5}
.skip:focus{left:8px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0}
.logo{height:46px;width:auto;background:#fff;border-radius:10px;padding:4px 8px}
.top a.call{color:#fff;font-weight:700;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.hero{background:var(--deep);color:#fff;padding-bottom:32px}
.hero h1{color:#fff;font-size:clamp(36px,8vw,56px);max-width:14ch}
.kicker{color:var(--rose);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:13px;margin-bottom:8px}
.lead{margin-top:10px;font-size:18px;max-width:36ch}
.flag{display:inline-block;margin-top:14px;background:var(--rose);color:var(--deep);font-weight:700;border-radius:999px;padding:8px 14px}
.address{margin-top:10px;font-size:18px}
.shot{margin-top:16px;border-radius:18px;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border:3px solid rgba(232,180,168,.7)}
.count{font-family:var(--serif);font-size:clamp(40px,10vw,64px);line-height:1;margin:14px 0 6px}
.count span{color:var(--rose)}
.bar{height:14px;border-radius:999px;background:rgba(255,255,255,.18);overflow:hidden}
.bar i{display:block;height:100%;width:0;background:var(--rose)}
.perks,.includes,.steps{list-style:none;display:grid;gap:8px;margin:14px 0}
.perks li,.includes li{background:rgba(255,255,255,.08);border:1px solid rgba(232,180,168,.45);border-radius:14px;padding:12px 14px}
.includes li{background:#fff;border-color:rgba(93,26,58,.16);color:var(--ink)}
.rent{font-size:20px;font-weight:700}
.sizes{margin:8px 0 14px 18px}
.actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 18px;border-radius:999px;font:700 16px var(--sans);text-decoration:none;border:2px solid transparent;cursor:pointer;background:var(--rose);color:var(--deep)}
.btn-wine{background:var(--wine);color:#fff;border-color:var(--wine);width:100%}
.btn-line{background:transparent;color:var(--wine);border-color:var(--wine)}
.call-link{color:var(--rose);font-weight:700;text-decoration:none;min-height:48px;display:inline-flex;align-items:center}
.band{padding:28px 0}
.band h2{font-size:clamp(28px,6vw,40px);margin-bottom:8px}
.steps{counter-reset:step}
.steps li{background:#fff;border:1px solid rgba(93,26,58,.16);border-radius:14px;padding:14px 14px 14px 58px;position:relative}
.steps li::before{counter-increment:step;content:counter(step);position:absolute;left:12px;top:12px;width:32px;height:32px;border-radius:50%;background:var(--wine);color:#fff;display:grid;place-items:center;font-weight:700}
.proof{display:grid;gap:12px}
.proof img{border-radius:16px;width:100%;height:220px;object-fit:cover}
.math{background:#fff;border:1px solid rgba(93,26,58,.16);border-radius:16px;padding:16px}
.math label{display:block;font-weight:700;color:var(--wine);margin-top:10px}
.math input[type=range]{width:100%;accent-color:var(--wine)}
.math select{min-height:48px;width:100%;border-radius:12px;border:1px solid rgba(93,26,58,.28);padding:8px 12px;font:16px var(--sans);background:var(--cream)}
.math-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid rgba(93,26,58,.12)}
.note{color:var(--muted);font-size:14px;margin-top:8px}
.faq details{background:#fff;border:1px solid rgba(93,26,58,.16);border-radius:12px;padding:12px 14px;margin-top:8px}
.faq summary{font-weight:700;color:var(--wine);cursor:pointer;min-height:44px;display:flex;align-items:center}
.card{background:#fff;border:1px solid rgba(93,26,58,.16);border-radius:20px;padding:20px}
.card h2{margin-bottom:8px}
.grid{display:grid;gap:14px}
.fg{display:flex;flex-direction:column;gap:6px}
.fg label{font-weight:700;color:var(--wine)}
.fg input,.fg select{min-height:48px;padding:12px 14px;border:1px solid rgba(93,26,58,.28);border-radius:12px;font:16px var(--sans);background:var(--cream);width:100%}
.chip{display:flex;gap:8px;align-items:flex-start;min-height:48px}
.err{display:none;background:#fdecef;color:var(--wine);border-radius:12px;padding:12px}
.ok{display:none}
.ok .big{font-family:var(--serif);font-size:34px;color:var(--wine)}
.share{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.hp{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
.type-field{position:relative}
.type-control{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:48px;padding:6px 48px 6px 8px;border:1px solid rgba(93,26,58,.28);border-radius:12px;background:var(--cream);position:relative}
.type-control input{flex:1 1 140px;min-height:36px;border:0;background:transparent;font:16px var(--sans)}
.type-control input:focus{outline:none}
.type-control:focus-within{outline:3px solid var(--wine);outline-offset:2px}
.type-toggle{position:absolute;right:2px;top:50%;transform:translateY(-50%);width:44px;height:44px;border:0;background:transparent;color:var(--wine)}
.type-tags{display:contents}
.type-tag{display:inline-flex;align-items:center;background:var(--rose);color:var(--deep);border-radius:999px;padding-left:12px;font-weight:700;font-size:14px}
.type-tag button{width:44px;height:44px;border:0;background:transparent;color:var(--deep);font:700 20px var(--sans)}
.type-menu{position:absolute;z-index:5;left:0;right:0;top:100%;margin-top:6px;padding:6px;list-style:none;background:#fff;border:1px solid var(--wine);border-radius:12px;max-height:260px;overflow:auto}
.type-option{min-height:48px;display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px}
.type-option[aria-selected="true"]{background:var(--blush);font-weight:700}
.foot{background:var(--deep);color:#f3e4ea;padding:22px 0 28px}
.foot a{color:#fff;font-weight:700;text-decoration:none}
.foot .home{color:var(--rose)}
.foot p+p{margin-top:6px}
.locs{display:grid;gap:12px;margin-top:16px}
.loc{display:block;background:#fff;border:1px solid rgba(93,26,58,.16);border-radius:16px;padding:16px;text-decoration:none}
.loc b{color:var(--wine);font-family:var(--serif);font-size:26px;font-weight:600}
@media(min-width:800px){.proof{grid-template-columns:1fr 1fr;align-items:center}.proof img{height:100%}}
`;
