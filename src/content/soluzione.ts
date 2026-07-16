export const css = `
*{box-sizing:border-box}
html{scroll-behavior:smooth}
section[id]{scroll-margin-top:80px}
body{margin:0;background:#f3f3f4;color:#18181b;font-family:Mulish,ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:clip}
a{color:#5B57D9;text-decoration:none}
a:hover{color:#4744C4}
::selection{background:rgba(82,82,91,.22)}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-thumb{background:#d4d4d8;border-radius:999px;border:3px solid transparent;background-clip:content-box}
@keyframes qsUp{0%{opacity:0;transform:translateY(24px)}100%{opacity:1;transform:none}}
@keyframes qsFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes qsBlink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes qsMarq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes qsMarqR{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}
@keyframes qsVUp{0%{transform:translateY(0)}100%{transform:translateY(-50%)}}
@keyframes qsSpin{to{transform:rotate(360deg)}}
@keyframes qsSpinR{to{transform:rotate(-360deg)}}
@keyframes qsFlow{to{stroke-dashoffset:-220}}
@keyframes qsStep{0%,66%,100%{color:#AEB7C9;opacity:.42;filter:none}33%{color:#27272a;opacity:1;filter:drop-shadow(0 0 5px rgba(88,80,230,.55))}}
@keyframes qsPulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.7);opacity:.25}}
@keyframes qsFloatB{0%,100%{translate:0 0}50%{translate:0 -13px}}
/* ---------- DARK THEME (overrides keyed on runtime-serialized inline styles) ---------- */
[data-theme="dark"]{background:#0e0e10!important;color:#e7e7ea}
body[data-theme="dark"]{background:#0e0e10;color:#e7e7ea}
[data-theme="dark"] [data-nav]{background:rgba(12,17,28,.85)!important;box-shadow:0 10px 30px -12px rgba(0,0,0,.55)!important}
/* surfaces */
[data-theme="dark"] [style*="background: rgb(255, 255, 255)"]{background:#1c1c1f!important}
[data-theme="dark"] [style*="background: rgb(245, 247, 251)"],[data-theme="dark"] [style*="background: rgb(247, 249, 252)"],[data-theme="dark"] [style*="background: rgb(241, 244, 249)"],[data-theme="dark"] [style*="background: rgb(238, 241, 248)"],[data-theme="dark"] [style*="background: rgb(238, 242, 248)"]{background:#161618!important}
[data-theme="dark"] [style*="background: rgb(238, 241, 255)"]{background:rgba(63,63,70,.2)!important}
[data-theme="dark"] [style*="background: rgb(236, 253, 246)"]{background:rgba(82,82,91,.2)!important}
[data-theme="dark"] [style*="background: rgb(251, 243, 224)"]{background:rgba(224,168,58,.22)!important}
[data-theme="dark"] [style*="background: rgb(15, 23, 42)"]{background:#27272a!important}
[data-theme="dark"] [style*="background: rgba(15, 23, 42, 0.08)"]{background:rgba(255,255,255,.12)!important}
/* text + currentColor icons */
[data-theme="dark"] [style*="color: rgb(15, 23, 42)"]{color:#e7e7ea!important}
[data-theme="dark"] [style*="color: rgb(30, 41, 59)"]{color:#e7e7ea!important}
[data-theme="dark"] [style*="color: rgb(51, 65, 85)"]{color:#d4d4d8!important}
[data-theme="dark"] [style*="color: rgb(71, 85, 105)"]{color:#d4d4d8!important}
[data-theme="dark"] [style*="color: rgb(100, 116, 139)"]{color:#a1a1aa!important}
[data-theme="dark"] [style*="color: rgb(148, 163, 184)"]{color:#a1a1aa!important}
/* borders (scoped by 'solid' to avoid box-shadow rgba) */
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.05)"]{border-color:rgba(255,255,255,.07)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.06)"]{border-color:rgba(255,255,255,.08)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.07)"]{border-color:rgba(255,255,255,.09)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.1)"]{border-color:rgba(255,255,255,.12)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.12)"]{border-color:rgba(255,255,255,.14)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.14)"]{border-color:rgba(255,255,255,.16)!important}
[data-theme="dark"] [style*="solid rgba(15, 23, 42, 0.16)"]{border-color:rgba(255,255,255,.18)!important}
/* --- dark-theme fixes for light-built elements (glows, stat banner, always-dark card buttons) --- */
[data-theme="dark"] [data-lightglow]{background:radial-gradient(closest-side,rgba(10,14,26,.94),rgba(10,14,26,.6) 60%,transparent)!important}
[data-theme="dark"] [data-statbar]{background:rgba(17,24,42,.72)!important;border-color:rgba(255,255,255,.08)!important;box-shadow:0 1px 2px rgba(0,0,0,.3),0 18px 48px -26px rgba(0,0,0,.55)!important}
[data-theme="dark"] [data-statbar] [style*="background: rgba(15, 23, 42, 0.1)"]{background:rgba(255,255,255,.14)!important}
[data-theme="dark"] [data-btn-light]{background:#fff!important;color:#131316!important}
/* ===================== RESPONSIVE — 3 range (desktop >1024 · tablet 769-1024 · mobile <=768) ===================== */
[data-nav-toggle]{display:none}
@media (min-width:1025px){[data-nav-menu]{display:none!important}[data-hscroll-bar]{display:none!important}}
@media (max-width:1024px){
  /* NAV → hamburger */
  [data-nav-links],[data-nav-desklink]{display:none!important}
  [data-nav-toggle]{display:grid!important}
  /* split testo+visual → stack */
  [data-r="split"],#nocode>div{grid-template-columns:1fr!important;gap:32px!important}
  /* footer resta su una riga sola, gap più stretto */
  [data-r="foot"]{gap:18px!important}
  /* ---- scorrimento orizzontale card: drag + frecce, niente scrollbar ---- */
  [data-hscroll]{display:flex!important;grid-template-columns:none!important;flex-wrap:nowrap!important;align-items:flex-start;overflow-x:auto;gap:16px!important;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;padding-bottom:4px;scrollbar-width:none;-ms-overflow-style:none;cursor:grab}
  [data-hscroll]::-webkit-scrollbar{display:none}
  [data-hscroll]>*{scroll-snap-align:start;grid-row:auto!important}
  /* card dei caroselli: sempre visibili (il reveal on-scroll non scatta per le card fuori vista in orizzontale) */
  [data-hscroll]>[data-reveal]{opacity:1!important;transform:none!important}
  /* Screen 1 — le tre card larghe uguali, quasi a tutto schermo con un piccolo peek + altezza uniforme */
  [data-hscroll="cards"]{align-items:stretch!important}
  [data-hscroll="cards"]>*{flex:0 0 86%!important}
  [data-hscroll="wide"]>*{flex:0 0 clamp(320px,90%,460px)!important}
  /* copilota: immagine (chat) sopra, testo sotto (colonna) */
  [data-hscroll="cards"]>div:first-child{flex-direction:column!important}
  [data-hscroll="cards"]>div:first-child>div:first-child{min-height:230px!important}
  /* Problema: card screen4 → immagine sotto, testo sopra */
  /* card 2 e 3: stessa altezza della card 1 (flex column), testo sopra, immagine centrata, spazio riempito */
  [data-r="card-stack"]{display:flex!important;flex-direction:column!important;align-items:stretch!important}
  [data-r="card-stack"]>div:nth-child(2){order:1}
  [data-r="card-stack"]>div:first-child{order:2;width:320px!important;max-width:100%!important;align-self:center}
  [data-r="card-stack"]>[data-fill]{order:3}
  [data-hscroll="cards"]>div:last-child{display:flex!important;flex-direction:column!important;align-items:stretch!important}
  [data-hscroll="cards"]>div:last-child>div:nth-child(2){zoom:1.4;align-self:center}
  [data-fill]{display:flex!important;flex:1 1 auto;flex-wrap:wrap;gap:8px;align-content:stretch;min-height:76px;margin-top:16px}
  [data-fill]>*{min-height:50px}
  /* Perche: card larghe immagine-sx / testo-dx */
  [data-hscroll="wide"]>div{display:flex!important;flex-direction:row!important;align-items:center;gap:16px}
  [data-hscroll="wide"]>div>div:first-child{flex:0 0 45%!important}
  [data-hscroll="wide"]>div>div:last-child{flex:1;padding:0!important}
  /* Screen 3 — niente animazioni fluttuanti nelle card in vista ridotta */
  [data-hscroll="wide"] [style*="qsFloatB"]{animation:none!important}
  /* frecce carosello — barra discreta in basso */
  [data-hscroll-arrow]:hover{background:#fff!important;color:#18181b!important}
  /* Screen 2 — percorso: step in orizzontale sopra il visual (che resta animato) */
  [data-percorso]{grid-template-columns:1fr!important;gap:22px!important}
  [data-percorso]>div:last-child{max-width:600px;width:100%;margin-left:auto;margin-right:auto}
  [data-percorso] [data-steps]{flex-direction:row!important;gap:6px!important;position:relative}
  [data-steps-trail]{display:block!important;position:absolute;top:5px;left:12.5%;right:12.5%;height:26px;z-index:0;pointer-events:none}
  [data-percorso] [data-steps]>button [data-stepdot]{position:relative;z-index:1}
  [data-percorso] [data-steps]>button{flex:1 1 0!important;min-width:0;flex-direction:column!important;align-items:center!important;text-align:center;gap:8px!important;padding-bottom:0!important}
  [data-percorso] [data-steps]>button>div:first-child>span:nth-child(2){display:none!important}
  [data-percorso] [data-steps]>button>div:last-child{padding-bottom:0!important}
  [data-percorso] [data-steps] [data-step-title]{font-size:15px!important;margin-top:0!important}
  [data-percorso] [data-steps] [data-stepdesc]{display:none!important}
  [data-percorso] [data-stepdesc-live]{display:block!important}
}
@media (max-width:768px){
  [data-nav-cta]{display:none!important}
  [style*="max-width: 1152px"],[style*="max-width: 1140px"]{padding-left:20px!important;padding-right:20px!important}
  [data-r="g3"]{grid-template-columns:1fr!important}
  #nocode>div{padding:22px!important}
  #community [style*="height: 600px"]{height:460px!important}
  /* Caroselli orizzontali (macro-categorie · community · principi): sempre ~1,5 card, in scala */
  [data-mscroll]{grid-template-columns:none!important;grid-auto-flow:column!important;grid-auto-columns:53%!important;overflow-x:auto!important;gap:12px!important;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;padding-bottom:6px}
  [data-mscroll]::-webkit-scrollbar{display:none}
  [data-mscroll]>*{scroll-snap-align:start;grid-column:auto!important;margin-top:0!important}
  /* Numeri del metodo: restano 4 in riga, font in scala, icone nascoste per fare spazio */
  /* Numeri del metodo: loop orizzontale a dimensioni invariate (niente shrink) */
  [data-r="logos"]>div{text-align:center}
  [data-r="logos"]>div>div:first-child{justify-content:center!important}
  [data-r="logos"] [data-mloop-track]>*{width:210px!important;max-width:210px!important}
  /* Footer: 4 colonne in una riga, brand Lyra centrato e leggermente più grande sopra */
  [data-r="foot"]{grid-template-columns:repeat(4,1fr)!important;gap:14px!important}
  [data-r="foot"]>div:first-child{grid-column:1/-1!important;display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:8px}
  [data-r="foot"]>div:first-child p{max-width:460px!important;font-size:14.5px!important}
  [data-r="foot"]>div:first-child a[href="#top"] span:last-child{font-size:21px!important}
  [data-r="foot"]>div:not(:first-child) a{font-size:12px!important}
  /* macro-categorie: card tutte della stessa altezza + frecce di comando dx/sx */
  [data-tabpanel]{align-items:stretch!important}
  [data-tab-arrows]{display:flex!important}
  /* community + principi: loop marquee continuo lento, card ~20% più strette */
  [data-mloop]{--mloop-on:1}
  [data-mloop-track]>*{flex:0 0 auto!important;width:48vw!important;max-width:300px!important;margin-top:0!important}
  /* CTA "Entra nella beta" centrato sopra le card */
  #principi [data-beta-open]{display:flex!important;width:-moz-fit-content;width:fit-content;margin-left:auto!important;margin-right:auto!important}
}
/* Dropdown "Il motore" all'hover */
[data-motore-wrap] [data-motore-menu]{opacity:0;visibility:hidden;transform:translateY(6px);transition:opacity .18s ease,transform .18s ease,visibility .18s}
[data-motore-wrap]:hover [data-motore-menu],[data-motore-wrap]:focus-within [data-motore-menu]{opacity:1;visibility:visible;transform:translateY(0)}
[data-motore-wrap]:hover [data-motore-caret],[data-motore-wrap]:focus-within [data-motore-caret]{transform:rotate(180deg)}
`;

export const html = `
<div style="min-height: 100vh;background: transparent;color: #18181b;overflow-x: clip;position: relative">

<!-- sfondo animato full-page -->


<div style="position: relative;z-index: 1">

<!-- ============ TOP NAV ============ -->
<header data-nav="" style="position: fixed;top: 0;left: 0;right: 0;z-index: 50;transition: transform .3s ease,box-shadow .3s ease,background .3s ease;background: rgba(255,255,255,.8);backdrop-filter: blur(12px);-webkit-backdrop-filter: blur(12px)">
  <div style="max-width: 1152px;margin: 0 auto;display: flex;align-items: center;gap: 12px;padding: 0 32px;height: 60px">
    <a href="#top" style="display: flex;align-items: center;gap: 9px">
      <span style="display: grid;place-items: center;height: 30px;width: 30px;border-radius: 9px;background: linear-gradient(135deg,#5B57D9,#18181b);box-shadow: 0 6px 16px -6px rgba(24,24,27,.55)">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20c0-8 2.5-12 9.5-16"></path><path d="M10.5 20c0-6 2.2-9 7-11"></path><path d="M14 20c0-4 1.6-6 5-7.2"></path></svg>
      </span>
      <span style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 16px;letter-spacing: -.02em;color: #18181b">Lyra</span>
    </a>
    <nav data-nav-links="" style="display: flex;align-items: center;gap: 26px;margin-left: 34px;font-size: 13.5px;font-weight: 600;color: #52525b">
      <a href="/soluzione" style="color: #18181b">La nostra soluzione</a>
      <a href="/pricing" style="color: #52525b">Pricing</a>
      <a href="/roadmap" style="color: #52525b">Roadmap</a>
    </nav>
    <div style="margin-left: auto;display: flex;align-items: center;gap: 10px">
      
      
      <div data-motore-wrap="" data-nav-desklink="" style="position: relative;align-self: stretch;display: inline-flex;align-items: center">
        <a href="/ecosistema" style="display: inline-flex;align-items: center;gap: 5px;font-size: 13.5px;font-weight: 600;color: #3f3f46;padding: 0 8px;cursor: pointer">Il motore<svg data-motore-caret="" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="transition: transform .22s ease;opacity: .7"><path d="m6 9 6 6 6-6"></path></svg></a>
        <div data-motore-menu="" style="position: absolute;top: 100%;left: 0;padding-top: 10px;z-index: 60">
          <div style="min-width: 266px;background: #fff;border: 1px solid rgba(15,23,42,.1);border-radius: 14px;box-shadow: 0 20px 44px -18px rgba(15,23,42,.4);padding: 7px">
            <a href="/motore-mappa" style="display: flex;align-items: center;gap: 12px;padding: 9px 10px;border-radius: 10px;color: #18181b" style-hover="background:#f4f4f5">
              <span style="flex: none;display: grid;place-items: center;height: 36px;width: 36px;border-radius: 10px;background: #f4f4f5;color: #18181b"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2.5"></circle><circle cx="18" cy="5" r="2.5"></circle><path d="M8.5 18.5A6 6 0 0 0 15.5 6.5"></path></svg></span>
              <span style="display: flex;flex-direction: column;gap: 1px"><span style="font: 700 13.5px Mulish,sans-serif;color: #18181b">Mappa interattiva</span><span style="font: 500 11.5px Mulish,sans-serif;color: #a1a1aa">Il flusso del motore, nodo per nodo</span></span>
            </a>
            <a href="/obiettivo-fondo" style="display: flex;align-items: center;gap: 12px;padding: 9px 10px;border-radius: 10px;color: #18181b" style-hover="background:#f4f4f5">
              <span style="flex: none;display: grid;place-items: center;height: 36px;width: 36px;border-radius: 10px;background: #f4f4f5;color: #3f3f46"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4"></path><path d="M4 4h13l-2.5 4L17 12H4"></path></svg></span>
              <span style="display: flex;flex-direction: column;gap: 1px"><span style="font: 700 13.5px Mulish,sans-serif;color: #18181b">Obiettivo del fondo</span><span style="font: 500 11.5px Mulish,sans-serif;color: #a1a1aa">Dove punta il capitale collettivo</span></span>
            </a>
          </div>
        </div>
      </div>
      <button data-beta-open="" data-nav-cta="" style="display: inline-flex;align-items: center;gap: 6px;height: 38px;padding: 0 18px;border-radius: 999px;border: none;cursor: pointer;white-space: nowrap;font: 700 13.5px Mulish,sans-serif;color: #fff;background: #18181b">Entra nella beta</button>
      <button data-nav-toggle="" aria-label="Menu" aria-expanded="false" style="display: none;place-items: center;height: 36px;width: 36px;border-radius: 10px;border: 1px solid rgba(15,23,42,.12);background: #fff;cursor: pointer;color: #3f3f46"><svg data-nav-icon="" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"></path></svg></button>
    </div>
  </div>
  <div data-nav-menu="" style="display: none;position: absolute;top: 56px;right: 20px;flex-direction: column;gap: 1px;min-width: 200px;background: #fff;border: 1px solid rgba(15,23,42,.1);border-radius: 14px;box-shadow: 0 18px 40px -16px rgba(15,23,42,.34);padding: 7px">
    <a href="/soluzione" style="padding: 9px 12px;border-radius: 9px;font: 600 13.5px Mulish,sans-serif;color: #3f3f46" style-hover="background:#f4f4f5">La nostra soluzione</a>
    <a href="/pricing" style="padding: 9px 12px;border-radius: 9px;font: 600 13.5px Mulish,sans-serif;color: #3f3f46" style-hover="background:#f4f4f5">Pricing</a>
    <a href="/roadmap" style="padding: 9px 12px;border-radius: 9px;font: 600 13.5px Mulish,sans-serif;color: #3f3f46" style-hover="background:#f4f4f5">Roadmap</a>
    <a href="/ecosistema" style="padding: 9px 12px;border-radius: 9px;font: 600 13.5px Mulish,sans-serif;color: #3f3f46" style-hover="background:#f4f4f5">Il motore</a>
    <a href="/motore-mappa" style="padding: 7px 12px 7px 24px;border-radius: 9px;font: 600 12.5px Mulish,sans-serif;color: #6b7280" style-hover="background:#f4f4f5">↳ Mappa interattiva</a>
    <a href="/obiettivo-fondo" style="padding: 7px 12px 7px 24px;border-radius: 9px;font: 600 12.5px Mulish,sans-serif;color: #6b7280" style-hover="background:#f4f4f5">↳ Obiettivo del fondo</a>
    <span style="height: 1px;background: rgba(15,23,42,.08);margin: 5px 6px"></span>
    <button data-beta-open="" style="margin: 2px;height: 40px;border-radius: 10px;border: none;cursor: pointer;font: 700 13.5px Mulish,sans-serif;color: #fff;background: #18181b">Entra nella beta</button>
  </div>
</header>

<!-- ============ SOLUZIONE HERO ============ -->
<section id="top" style="max-width: 1152px;margin: 0 auto;padding: 128px 32px 16px">
  <div data-reveal="" style="text-align: center;max-width: 780px;margin: 0 auto;opacity: 0;transform: translateY(28px);transition: opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)">
    <span style="display: inline-flex;align-items: center;gap: 6px;border-radius: 999px;padding: 5px 12px;font: 600 11.5px/1 'IBM Plex Mono',monospace;letter-spacing: .12em;text-transform: uppercase;white-space: nowrap;background: #EEEDFB;color: #5B57D9">UN'UNICA PIATTAFORMA</span>
    <h1 style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 42px;line-height: 1.1;letter-spacing: -.02em;margin: 18px 0 0;color: #18181b">Costruisci, valida, esegui — <span style="background: linear-gradient(100deg,#18181b,#5B57D9);-webkit-background-clip: text;background-clip: text;color: transparent">senza cambiare finestra</span></h1>
    <p style="color: #6b7280;font-size: 16px;line-height: 1.6;margin: 18px auto 0;max-width: 560px">Editor, backtest, scanner, portafoglio live e community in un solo posto, senza strumenti scollegati da tenere insieme a mano.</p>
    <div style="display: flex;justify-content: center;gap: 10px;margin-top: 24px;flex-wrap: wrap">
      <span style="display: inline-flex;align-items: center;gap: 7px;height: 36px;padding: 0 15px;border-radius: 10px;background: #fff;border: 1px solid rgba(15,23,42,.1);box-shadow: 0 1px 2px rgba(15,23,42,.04);font: 700 12.5px Mulish,sans-serif;color: #3f3f46"><span style="display: inline-flex;color: #3f3f46"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"></path></svg></span>Editor no-code</span><span style="display: inline-flex;align-items: center;gap: 7px;height: 36px;padding: 0 15px;border-radius: 10px;background: #fff;border: 1px solid rgba(15,23,42,.1);box-shadow: 0 1px 2px rgba(15,23,42,.04);font: 700 12.5px Mulish,sans-serif;color: #3f3f46"><span style="display: inline-flex;color: #3f3f46"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"></path></svg></span>Backtest riproducibili</span><span style="display: inline-flex;align-items: center;gap: 7px;height: 36px;padding: 0 15px;border-radius: 10px;background: #fff;border: 1px solid rgba(15,23,42,.1);box-shadow: 0 1px 2px rgba(15,23,42,.04);font: 700 12.5px Mulish,sans-serif;color: #3f3f46"><span style="display: inline-flex;color: #3f3f46"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"></path></svg></span>Scanner</span><span style="display: inline-flex;align-items: center;gap: 7px;height: 36px;padding: 0 15px;border-radius: 10px;background: #fff;border: 1px solid rgba(15,23,42,.1);box-shadow: 0 1px 2px rgba(15,23,42,.04);font: 700 12.5px Mulish,sans-serif;color: #3f3f46"><span style="display: inline-flex;color: #3f3f46"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"></path></svg></span>Portafoglio live</span><span style="display: inline-flex;align-items: center;gap: 7px;height: 36px;padding: 0 15px;border-radius: 10px;background: #fff;border: 1px solid rgba(15,23,42,.1);box-shadow: 0 1px 2px rgba(15,23,42,.04);font: 700 12.5px Mulish,sans-serif;color: #3f3f46"><span style="display: inline-flex;color: #3f3f46"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"></path></svg></span>Community</span>
    </div>
  </div>
</section>
<!-- ============ ANTEPRIMA (MacBook) ============ -->
<section style="max-width: 1152px;margin: 0 auto;padding: 36px 32px 30px">
  <div data-reveal="" data-reveal-d="80" style="max-width: 920px;margin: 0 auto;opacity: 0;transform: translateY(28px);transition: opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)">
    <div style="border-radius: 22px 22px 6px 6px;background: linear-gradient(180deg,#2A3448,#18181b);padding: 14px 14px 18px;box-shadow: 0 40px 90px -34px rgba(15,23,42,.6)">
      <div style="display: flex;justify-content: center;padding: 0 0 9px"><span style="height: 5px;width: 5px;border-radius: 999px;background: #39445C"></span></div><div style="display: flex;align-items: center;gap: 7px;padding: 2px 10px 10px"><span style="height: 11px;width: 11px;border-radius: 999px;background: #fb7185"></span><span style="height: 11px;width: 11px;border-radius: 999px;background: #fbbf24"></span><span style="height: 11px;width: 11px;border-radius: 999px;background: #34d399"></span><span style="margin-left: 12px;font: 500 11px 'IBM Plex Mono',monospace;color: #71717a">lyra.app / workspace</span></div>
      <div style="border-radius: 16px;overflow: hidden;background: #0e0e10;aspect-ratio: 16/9;display: flex">
        <div style="width: 56px;background: #141416;display: flex;flex-direction: column;align-items: center;padding: 14px 0;gap: 16px;flex: none;border-right: 1px solid rgba(150,180,190,.1)">
          <span style="display: grid;place-items: center;height: 28px;width: 28px;border-radius: 8px;background: linear-gradient(135deg,#5B57D9,#18181b)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20c0-8 2.5-12 9.5-16"></path><path d="M10.5 20c0-6 2.2-9 7-11"></path><path d="M14 20c0-4 1.6-6 5-7.2"></path></svg></span>
          <span style="height: 26px;width: 26px;border-radius: 7px;display: grid;place-items: center;color: #a1a1aa;background: rgba(70,214,192,.12)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg></span>
          <span style="height: 26px;width: 26px;border-radius: 7px;display: grid;place-items: center;color: #71717a"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><rect x="7" y="9" width="3" height="8"></rect><rect x="13" y="5" width="3" height="12"></rect></svg></span>
          <span style="height: 26px;width: 26px;border-radius: 7px;display: grid;place-items: center;color: #71717a"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg></span>
        </div>
        <div style="flex: 1;padding: 18px;display: grid;grid-template-columns: 2fr 1fr;grid-template-rows: auto 1fr;gap: 14px">
          <div style="grid-column: 1;grid-row: 1 / span 2;border-radius: 14px;background: #1c1c1f;border: 1px solid rgba(150,180,190,.12);padding: 16px;display: flex;flex-direction: column">
            <div style="display: flex;align-items: baseline;justify-content: space-between"><span style="font: 600 11px 'IBM Plex Mono',monospace;color: #a1a1aa;letter-spacing: .1em;text-transform: uppercase">Equity · portafoglio</span><span style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 20px;color: #E9EFF1">+34.2%</span></div>
            <svg viewBox="0 0 340 150" preserveAspectRatio="none" style="width: 100%;flex: 1;margin-top: 10px"><defs><linearGradient id="pm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(70,214,192,.35)"></stop><stop offset="1" stop-color="rgba(70,214,192,0)"></stop></linearGradient></defs><path d="M0 130 L30 122 L60 128 L95 100 L130 108 L165 78 L200 86 L240 54 L280 60 L340 26 L340 150 L0 150 Z" fill="url(#pm)"></path><path d="M0 130 L30 122 L60 128 L95 100 L130 108 L165 78 L200 86 L240 54 L280 60 L340 26" fill="none" stroke="#a1a1aa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            <div style="display: flex;gap: 8px;margin-top: 8px">
              <span style="padding: 5px 9px;border-radius: 6px;background: rgba(70,214,192,.12);color: #e4e4e7;font: 600 10.5px 'IBM Plex Mono',monospace">Sharpe 1.6</span>
              <span style="padding: 5px 9px;border-radius: 6px;background: rgba(255,255,255,.05);color: #d4d4d8;font: 600 10.5px 'IBM Plex Mono',monospace">MaxDD -8%</span>
              <span style="padding: 5px 9px;border-radius: 6px;background: rgba(235,177,70,.14);color: #f0d59a;font: 600 10.5px 'IBM Plex Mono',monospace">vol 10%</span>
            </div>
          </div>
          <div style="grid-column: 2;grid-row: 1;border-radius: 14px;background: #1c1c1f;border: 1px solid rgba(150,180,190,.12);padding: 14px">
            <span style="font: 600 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;letter-spacing: .1em;text-transform: uppercase">Allocazione</span>
            <div style="display: flex;flex-direction: column;gap: 8px;margin-top: 10px">
              <div><div style="display: flex;justify-content: space-between;font: 500 10px 'IBM Plex Mono',monospace;color: #a1a1aa"><span>Trend</span><span>38%</span></div><div style="height: 5px;border-radius: 999px;background: rgba(255,255,255,.06);margin-top: 3px"><div style="height: 100%;width: 38%;border-radius: 999px;background: #3f3f46"></div></div></div>
              <div><div style="display: flex;justify-content: space-between;font: 500 10px 'IBM Plex Mono',monospace;color: #a1a1aa"><span>Mean-rev</span><span>34%</span></div><div style="height: 5px;border-radius: 999px;background: rgba(255,255,255,.06);margin-top: 3px"><div style="height: 100%;width: 34%;border-radius: 999px;background: #a1a1aa"></div></div></div>
              <div><div style="display: flex;justify-content: space-between;font: 500 10px 'IBM Plex Mono',monospace;color: #a1a1aa"><span>Factor</span><span>28%</span></div><div style="height: 5px;border-radius: 999px;background: rgba(255,255,255,.06);margin-top: 3px"><div style="height: 100%;width: 28%;border-radius: 999px;background: #71717a"></div></div></div>
            </div>
          </div>
          <div style="grid-column: 2;grid-row: 2;border-radius: 14px;background: #1c1c1f;border: 1px solid rgba(150,180,190,.12);padding: 14px;display: flex;flex-direction: column;gap: 8px">
            <span style="font: 600 10.5px 'IBM Plex Mono',monospace;color: #a1a1aa;letter-spacing: .1em;text-transform: uppercase">Live</span>
            <div style="display: flex;align-items: center;justify-content: space-between"><span style="color: #E9EFF1;font-size: 11.5px;font-weight: 600">Trend FX</span><span style="color: #a1a1aa;font: 600 11px 'IBM Plex Mono',monospace">+2.1%</span></div>
            <div style="display: flex;align-items: center;justify-content: space-between"><span style="color: #E9EFF1;font-size: 11.5px;font-weight: 600">Mean-rev</span><span style="color: #a1a1aa;font: 600 11px 'IBM Plex Mono',monospace">+0.7%</span></div>
            <div style="display: flex;align-items: center;gap: 6px;margin-top: 2px"><span style="width: 7px;height: 7px;border-radius: 999px;background: #a1a1aa;box-shadow: 0 0 8px #a1a1aa"></span><span style="color: #a1a1aa;font: 500 10px 'IBM Plex Mono',monospace">kill-switch attivo</span></div>
          </div>
        </div>
      </div>
    </div>
  
      <div style="position: relative;height: 18px;margin: 0 -34px;background: linear-gradient(180deg,#E6EAF2,#C3CBD9);border-radius: 2px 2px 15px 15px;box-shadow: 0 26px 50px -22px rgba(15,23,42,.5)"><span style="position: absolute;left: 50%;top: 0;transform: translateX(-50%);width: 110px;height: 8px;background: #AEB7C8;border-radius: 0 0 10px 10px"></span></div>
    </div>
  <p style="text-align: center;color: #a1a1aa;font-size: 12.5px;margin: 26px 0 0">Anteprima del workspace · le schermate definitive arriveranno con la beta</p>
</section>

<!-- ============ CTA FINALE ============ -->
<section style="max-width: 1152px;margin: 0 auto;padding: 64px 32px 72px">
  <div data-reveal="" style="position: relative;overflow: hidden;border-radius: 28px;text-align: center;padding: 64px 24px;box-shadow: 0 30px 70px -30px rgba(0,0,0,.55);opacity: 0;transform: translateY(28px);transition: opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1);background: radial-gradient(120% 100% at 50% 0%,rgba(24,24,27,.32),transparent 55%),#131316;border: 1px solid rgba(255,255,255,.08)">
    <div style="position: absolute;inset: 0;background-image: linear-gradient(rgba(150,180,190,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(150,180,190,.08) 1px,transparent 1px);background-size: 34px 34px;-webkit-mask-image: radial-gradient(120% 90% at 50% 0,#000 42%,transparent 82%);mask-image: radial-gradient(120% 90% at 50% 0,#000 42%,transparent 82%);pointer-events: none"></div>
    <div style="position: relative">
      <span style="display: inline-flex;align-items: center;gap: 6px;border-radius: 999px;padding: 5px 12px;font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;background: rgba(82,82,91,.16);color: #d4d4d8">Pronto a partire?</span>
      <h2 style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 34px;line-height: 1.12;margin: 16px 0 0;color: #F1F5FB;max-width: 640px;margin-left: auto;margin-right: auto">Trasforma la tua prossima idea in una <span style="background: linear-gradient(100deg,#71717a,#a1a1aa);-webkit-background-clip: text;background-clip: text;color: transparent">strategia che conta</span></h2>
      <p style="color: #a1a1aa;font-size: 15.5px;margin: 14px auto 0;max-width: 520px;line-height: 1.6">Costruisci, dimostra, automatizza — e punta al fondo collettivo. Il percorso, e la community, ti aspettano.</p>
      <div style="display: flex;flex-wrap: wrap;align-items: center;justify-content: center;gap: 12px;margin-top: 30px">
        <button data-beta-open="" data-btn-light="" style="display: inline-flex;align-items: center;gap: 8px;height: 48px;padding: 0 26px;border-radius: 12px;border: none;cursor: pointer;white-space: nowrap;font: 700 15px Mulish,sans-serif;color: #131316;background: #fff">Entra nella beta <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></button>
        <a href="#top" style="display: inline-flex;align-items: center;gap: 8px;height: 48px;padding: 0 22px;border-radius: 12px;cursor: pointer;white-space: nowrap;font: 700 15px Mulish,sans-serif;color: #e6ecf5;background: rgba(255,255,255,.08);border: 1px solid rgba(255,255,255,.16)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg> Unisciti al Discord</a>
      </div>
      <p style="color: #6E7E92;font-size: 12.5px;margin: 22px 0 0">Beta gratuita · Nessuna carta richiesta · Verifica trasparente</p>
    </div>
  </div>
</section>

<!-- ============ FOOTER ============ -->
<footer style="background: #0e0e10;color: #a1a1aa">
  <div style="max-width: 1152px;margin: 0 auto;padding: 56px 32px 28px">
    <div data-r="foot" style="display: grid;grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr;gap: 32px">
      <div>
        <a href="#top" style="display: flex;align-items: center;gap: 9px"><span style="display: grid;place-items: center;height: 30px;width: 30px;border-radius: 9px;background: linear-gradient(135deg,#5B57D9,#18181b)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20c0-8 2.5-12 9.5-16"></path><path d="M10.5 20c0-6 2.2-9 7-11"></path><path d="M14 20c0-4 1.6-6 5-7.2"></path></svg></span><span style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 16px;color: #fff">Lyra</span></a>
        <p style="font-size: 13px;line-height: 1.6;margin: 14px 0 0;max-width: 280px">Dall'idea al fondo: costruisci strategie, dimostra che funzionano, guadagnaci — insieme a una community.</p>
        <div style="display: flex;gap: 10px;margin-top: 16px">
          <a href="#top" aria-label="Discord" style="display: grid;place-items: center;height: 34px;width: 34px;border-radius: 9px;background: rgba(255,255,255,.06);color: #d4d4d8"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg></a>
          <a href="#top" aria-label="GitHub" style="display: grid;place-items: center;height: 34px;width: 34px;border-radius: 9px;background: rgba(255,255,255,.06);color: #d4d4d8"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg></a>
          <a href="#top" aria-label="X" style="display: grid;place-items: center;height: 34px;width: 34px;border-radius: 9px;background: rgba(255,255,255,.06);color: #d4d4d8"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg></a>
        </div>
      </div>
      <div>
        <p style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;color: #71717a;margin: 0 0 14px">Prodotto</p>
        <div style="display: flex;flex-direction: column;gap: 9px;font-size: 13px">
          <a href="#soluzione" style="color: #a1a1aa">Come funziona</a><a href="/soluzione" style="color: #a1a1aa">La nostra soluzione</a><a href="#funzioni" style="color: #a1a1aa">Scanner</a><a href="#funzioni" style="color: #a1a1aa">No-code builder</a>
        </div>
      </div>
      <div>
        <p style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;color: #71717a;margin: 0 0 14px">Sviluppatori</p>
        <div style="display: flex;flex-direction: column;gap: 9px;font-size: 13px">
          <a href="#top" style="color: #a1a1aa">API REST</a><a href="#top" style="color: #a1a1aa">SDK Python</a><a href="#top" style="color: #a1a1aa">Documentazione</a><a href="#top" style="color: #a1a1aa">GitHub</a><a href="#top" style="color: #a1a1aa">Changelog</a>
        </div>
      </div>
      <div>
        <p style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;color: #71717a;margin: 0 0 14px">Ecosistema</p>
        <div style="display: flex;flex-direction: column;gap: 9px;font-size: 13px">
          <a href="/ecosistema" style="color: #a1a1aa">Il motore</a><a href="/obiettivo-fondo" style="color: #a1a1aa">Obiettivo · Fondo</a><a href="#community" style="color: #a1a1aa">Community &amp; Contest</a><a href="#community" style="color: #a1a1aa">Marketplace</a>
        </div>
      </div>
      <div>
        <p style="font: 600 11px 'IBM Plex Mono',monospace;letter-spacing: .14em;text-transform: uppercase;color: #71717a;margin: 0 0 14px">Legale</p>
        <div style="display: flex;flex-direction: column;gap: 9px;font-size: 13px">
          <a href="#top" style="color: #a1a1aa">Termini</a><a href="#top" style="color: #a1a1aa">Privacy</a><a href="#top" style="color: #a1a1aa">Cookie</a><a href="#top" style="color: #a1a1aa">Disclaimer rischi</a>
        </div>
      </div>
    </div>
    <div style="margin-top: 36px;padding-top: 22px;border-top: 1px solid rgba(150,180,190,.12)">
      <p style="font-size: 11.5px;line-height: 1.6;color: #71717a;margin: 0;max-width: 900px">Il trading comporta rischi di perdita del capitale. Lyra è una piattaforma di ricerca, sviluppo e automazione di strategie: nulla in questa pagina costituisce consulenza finanziaria o sollecitazione all'investimento. I risultati dei backtest e i rendimenti passati non garantiscono risultati futuri. L'accesso al fondo collettivo è soggetto a verifica e ai requisiti previsti dalla normativa applicabile.</p>
      <p style="font: 500 11.5px 'IBM Plex Mono',monospace;color: #71717a;margin: 14px 0 0">© 2026 Lyra · P.IVA 00000000000 · Italia</p>
    </div>
  </div>
</footer>

<!-- ============ BETA MODAL ============ -->
<div data-beta-modal="" style="position: fixed;inset: 0;z-index: 100;display: none;align-items: center;justify-content: center;padding: 20px;background: rgba(12,17,19,.55);backdrop-filter: blur(6px);-webkit-backdrop-filter: blur(6px);opacity: 0;transition: opacity .26s ease">
  <div data-beta-panel="" style="width: 100%;max-width: 440px;background: #fff;border-radius: 22px;box-shadow: 0 40px 80px -30px rgba(15,23,42,.6);padding: 28px;opacity: 0;transform: translateY(12px) scale(.98);transition: opacity .26s ease,transform .26s ease">
    <div data-beta-formbox="">
      <div style="display: flex;align-items: center;justify-content: space-between">
        <span style="display: grid;place-items: center;height: 44px;width: 44px;border-radius: 13px;background: linear-gradient(135deg,#5B57D9,#18181b);color: #fff"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20c0-8 2.5-12 9.5-16"></path><path d="M10.5 20c0-6 2.2-9 7-11"></path><path d="M14 20c0-4 1.6-6 5-7.2"></path></svg></span>
        <button data-beta-close="" style="all: unset;box-sizing: border-box;cursor: pointer;display: grid;place-items: center;height: 32px;width: 32px;border-radius: 9px;color: #a1a1aa;background: #f4f4f5"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button>
      </div>
      <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 22px;margin: 18px 0 0;color: #18181b">Entra nella beta</h3>
      <p style="color: #6b7280;font-size: 14px;line-height: 1.55;margin: 8px 0 0">Lasciaci un contatto: apriamo gli accessi a ondate, partendo dalla community.</p>
      <form data-beta-form="" style="margin-top: 18px;display: flex;flex-direction: column;gap: 12px">
        <label style="display: block"><span style="font-size: 13px;font-weight: 700;color: #3f3f46">Email</span><input type="email" required="" placeholder="tu@email.com" style="width: 100%;margin-top: 6px;height: 44px;border-radius: 11px;border: 1px solid rgba(15,23,42,.16);padding: 0 14px;font: 400 14px Mulish,sans-serif;outline: none"></label>
        <label style="display: block"><span style="font-size: 13px;font-weight: 700;color: #3f3f46">Il tuo profilo</span>
          <select required="" style="width: 100%;margin-top: 6px;height: 44px;border-radius: 11px;border: 1px solid rgba(15,23,42,.16);padding: 0 14px;font: 400 14px Mulish,sans-serif;outline: none;background: #fff;-webkit-appearance: none;appearance: none">
            <option value="">Seleziona…</option><option>Non programmo</option><option>So programmare un po'</option><option>Quant / esperto</option>
          </select>
        </label>
        <label style="display: flex;align-items: flex-start;gap: 8px;font-size: 12.5px;color: #6b7280;line-height: 1.45"><input type="checkbox" required="" style="margin-top: 2px;accent-color: #18181b">Accetto il trattamento dei dati secondo la Privacy Policy.</label>
        <button type="submit" style="margin-top: 4px;height: 46px;border-radius: 12px;border: none;cursor: pointer;font: 700 14.5px Mulish,sans-serif;color: #fff;background: var(--primary,#18181b);box-shadow: 0 10px 24px -8px rgba(24,24,27,.55);display: inline-flex;align-items: center;justify-content: center;gap: 8px">Richiedi accesso <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></button>
      </form>
    </div>
    <div data-beta-success="" style="display: none;text-align: center;padding: 16px 4px 8px">
      <div style="display: grid;place-items: center;height: 64px;width: 64px;border-radius: 999px;background: #f4f4f5;color: #3f3f46;margin: 0 auto 16px"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"></path></svg></div>
      <h3 style="font-family: 'Space Grotesk',sans-serif;font-weight: 700;font-size: 22px;margin: 0;color: #18181b">Sei in lista! 🎉</h3>
      <p style="color: #6b7280;font-size: 14px;line-height: 1.55;margin: 8px 0 20px">Ti scriviamo appena apriamo la prossima ondata. Intanto, fai un salto sul Discord.</p>
      <button data-beta-close="" style="all: unset;box-sizing: border-box;cursor: pointer;height: 44px;padding: 0 22px;border-radius: 12px;font: 700 14px Mulish,sans-serif;color: #fff;background: #18181b">Chiudi</button>
    </div>
  </div>
</div>

</div></div>
`;
