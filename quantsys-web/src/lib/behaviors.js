/* QuantSys — Landing page behavior (vanilla port of the original component logic).
   HTML lives in ../index.html, styling in ./styles.css. This file owns all interactivity. */

const root = document.getElementById('app-root');
const S = {};                     // shared runtime state
const _to = [], _iv = [];
const sT = (fn, ms) => { const id = setTimeout(fn, ms); _to.push(id); return id; };
const sI = (fn, ms) => { const id = setInterval(fn, ms); _iv.push(id); return id; };
const q  = (sel) => (root || document).querySelectorAll(sel);
const q1 = (sel) => (root || document).querySelector(sel);

/* ---------- hover styles (data-hover="prop:val;prop2:val2") ---------- */
function initHover() {
  q('[data-hover]').forEach((el) => {
    const decls = (el.getAttribute('data-hover') || '').split(';').map((s) => s.trim()).filter(Boolean)
      .map((s) => { const i = s.indexOf(':'); return [s.slice(0, i).trim(), s.slice(i + 1).trim()]; });
    if (!decls.length) return;
    const prev = {};
    el.addEventListener('mouseenter', () => { decls.forEach(([p, v]) => { prev[p] = el.style.getPropertyValue(p); el.style.setProperty(p, v); }); });
    el.addEventListener('mouseleave', () => { decls.forEach(([p]) => { if (prev[p]) el.style.setProperty(p, prev[p]); else el.style.removeProperty(p); }); });
  });
}

/* ---------- animated neural background ---------- */
function initNeural() {
  const canvas = q1('[data-neural]'); if (!canvas) return;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const container = canvas.parentElement;
  const palette = ['#6366F1', '#14B8A6', '#4F46E5', '#818CF6', '#2DD4BF'];
  const speed = 0.9, trailOpacity = 0.1, particleCount = 460, fadeRgb = '246,248,251';
  let width = container.clientWidth, height = container.clientHeight, particles = [];
  const mouse = { x: -1000, y: -1000 };
  class P {
    constructor() { this.reset(); }
    reset() { this.x = Math.random() * width; this.y = Math.random() * height; this.vx = 0; this.vy = 0; this.age = 0; this.life = Math.random() * 200 + 100; this.color = palette[(Math.random() * palette.length) | 0]; }
    update() {
      const a = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;
      this.vx += Math.cos(a) * 0.2 * speed; this.vy += Math.sin(a) * 0.2 * speed;
      const dx = mouse.x - this.x, dy = mouse.y - this.y, d = Math.hypot(dx, dy), r = 150;
      if (d < r) { const f = (r - d) / r; this.vx -= dx * f * 0.05; this.vy -= dy * f * 0.05; }
      this.x += this.vx; this.y += this.vy; this.vx *= 0.95; this.vy *= 0.95; this.age++;
      if (this.age > this.life) this.reset();
      if (this.x < 0) this.x = width; if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height; if (this.y > height) this.y = 0;
    }
    draw() { ctx.fillStyle = this.color; ctx.globalAlpha = 0.7 * (1 - Math.abs(this.age / this.life - 0.5) * 2); ctx.fillRect(this.x, this.y, 1.6, 1.6); }
  }
  const init = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    particles = []; for (let i = 0; i < particleCount; i++) particles.push(new P());
  };
  const animate = () => {
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(' + (S.fadeRgb || fadeRgb) + ',' + trailOpacity + ')'; ctx.fillRect(0, 0, width, height);
    for (const p of particles) { p.update(); p.draw(); }
    S.raf = requestAnimationFrame(animate);
  };
  const onResize = () => { width = container.clientWidth; height = container.clientHeight; init(); };
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
  const onLeave = () => { mouse.x = -1000; mouse.y = -1000; };
  init(); animate();
  window.addEventListener('resize', onResize); window.addEventListener('mousemove', onMove); window.addEventListener('mouseout', onLeave);
}

/* ---------- sticky nav + hamburger ---------- */
function initNav() {
  const nav = q1('[data-nav]'); if (!nav) return;
  let last = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY, atTop = y < 12;
    nav.style.boxShadow = atTop ? 'none' : '0 10px 30px -12px rgba(15,20,43,.18)';
    nav.style.background = atTop ? 'rgba(255,255,255,.8)' : '#ffffff';
    nav.style.transform = (y > last && y > 90) ? 'translateY(-100%)' : 'translateY(0)';
    last = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const toggle = q1('[data-nav-toggle]'), menu = q1('[data-nav-menu]'), navIcon = q1('[data-nav-icon]');
  const burger = '<path d="M3 6h18M3 12h18M3 18h18"></path>', closeIco = '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>';
  let navOpen = false;
  const setNavOpen = (v) => { navOpen = v; if (menu) menu.style.display = v ? 'flex' : 'none'; if (toggle) toggle.setAttribute('aria-expanded', v ? 'true' : 'false'); if (navIcon) navIcon.innerHTML = v ? closeIco : burger; };
  if (toggle && menu) {
    toggle.addEventListener('click', (e) => { e.stopPropagation(); setNavOpen(!navOpen); });
    [...menu.querySelectorAll('a,button')].forEach((el) => el.addEventListener('click', () => setNavOpen(false)));
  }
  window.addEventListener('resize', () => { if (window.innerWidth > 1024 && navOpen) setNavOpen(false); });
}

/* ---------- typewriter (if present) ---------- */
function initTypewriter() {
  const el = q1('[data-tw]'); if (!el) return;
  const words = ['fondo collettivo', 'reddito reale', 'tuo portafoglio quant'];
  let wi = 0, ci = 0, del = false;
  const tick = () => {
    const w = words[wi];
    if (!del) { el.textContent = w.slice(0, ci + 1); ci++; if (ci >= w.length) { del = true; sT(tick, 1800); return; } }
    else { el.textContent = w.slice(0, ci - 1); ci--; if (ci <= 0) { del = false; wi = (wi + 1) % words.length; } }
    sT(tick, del ? 45 : 85);
  };
  sT(tick, 400);
}

/* ---------- rotating ring of cards (if present) ---------- */
function initRing() {
  const cards = [...q('[data-ring]')]; if (!cards.length) return;
  const COL = 356;
  const POS = [
    { x: 0, y: 96, s: 0.83, z: 10, o: 0.9 }, { x: 0, y: 50, s: 0.91, z: 20, o: 1 }, { x: 0, y: 0, s: 1, z: 30, o: 1 },
    { x: COL, y: 96, s: 1, z: 30, o: 1 }, { x: COL, y: 50, s: 0.91, z: 20, o: 1 }, { x: COL, y: 0, s: 0.83, z: 10, o: 0.9 }
  ];
  const N = 6; let step = 0;
  const place = () => cards.forEach((c, i) => { const p = POS[(i + step) % N]; c.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px) scale(' + p.s + ')'; c.style.zIndex = p.z; c.style.opacity = p.o; });
  place();
  sI(() => { step = (step + 1) % N; place(); }, 2900);
}

/* ---------- reveal on scroll ---------- */
function initReveal() {
  const els = [...q('[data-reveal]')]; if (!els.length) return;
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (e.isIntersecting) {
        const d = parseInt(e.target.getAttribute('data-reveal-d') || '0', 10);
        e.target.style.transitionDelay = (d / 1000) + 's';
        e.target.style.opacity = '1'; e.target.style.transform = 'none';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => io.observe(el));
  S.io = io;
}

/* ---------- count-up ---------- */
function initCount() {
  const els = [...q('[data-count]')]; if (!els.length) return;
  const run = (el) => {
    const to = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-count-suffix') || '';
    const dur = parseInt(el.getAttribute('data-count-dur') || '1400', 10), dec = parseInt(el.getAttribute('data-count-dec') || '0', 10);
    const t0 = performance.now();
    const fmt = (v) => v.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const frame = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e) + suf; if (p < 1) requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver((ents) => { ents.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: 0.5 });
  els.forEach((el) => { el.textContent = '0' + (el.getAttribute('data-count-suffix') || ''); io.observe(el); });
  S.cio = io;
}

/* ---------- macro-categorie tabs ---------- */
function initTabs() {
  const wrap = q1('[data-tabs]'); if (!wrap) return;
  const btns = [...q('[data-tab]')], panels = [...q('[data-tabpanel]')];
  const set = (i) => {
    btns.forEach((b) => { const on = +b.getAttribute('data-tab') === i; b.style.color = on ? '#0F172A' : '#94A3B8'; b.style.background = on ? '#fff' : 'transparent'; b.style.boxShadow = on ? '0 1px 2px rgba(15,23,42,.04),0 8px 24px -12px rgba(15,23,42,.12)' : 'none'; });
    panels.forEach((pn) => {
      const on = +pn.getAttribute('data-tabpanel') === i;
      pn.style.display = on ? 'grid' : 'none';
      if (on) [...pn.querySelectorAll('[data-tabcard]')].forEach((c, k) => { c.style.animation = 'none'; void c.offsetHeight; c.style.animation = 'qsUp .5s both'; c.style.animationDelay = (k * 0.12) + 's'; });
    });
  };
  btns.forEach((b) => b.addEventListener('click', () => set(+b.getAttribute('data-tab'))));
  set(0);
}

/* ---------- percorso stepper (auto-advance + click + live desc + footprint sync) ---------- */
function initSteps() {
  const stepBtns = [...q('[data-step]')]; if (!stepBtns.length) return;
  const descs = [...q('[data-stepdesc]')], viss = [...q('[data-stepvis]')], dots = [...q('[data-stepdot]')];
  const liveP = q1('[data-stepdesc-live] p');
  let cur = 0, auto;
  const set = (i) => {
    cur = i;
    S.curStep = i; setTrail(i);
    if (liveP) { const ad = descs.find((d) => +d.getAttribute('data-stepdesc') === i); const p = ad && ad.querySelector('p'); liveP.textContent = p ? p.textContent : ''; }
    stepBtns.forEach((b) => { const on = +b.getAttribute('data-step') === i; const t = b.querySelector('[data-step-title]'); if (t) t.style.color = on ? '#0F172A' : '#334155'; });
    dots.forEach((d) => { const on = +d.getAttribute('data-stepdot') === i; d.style.background = on ? 'var(--primary,#4F46E5)' : '#E2E6F0'; d.style.color = on ? '#fff' : '#94A3B8'; });
    descs.forEach((dd) => { const on = +dd.getAttribute('data-stepdesc') === i; dd.style.maxHeight = on ? '180px' : '0px'; dd.style.opacity = on ? '1' : '0'; dd.style.marginTop = on ? '8px' : '0px'; });
    viss.forEach((v) => { const on = +v.getAttribute('data-stepvis') === i; v.style.opacity = on ? '1' : '0'; v.style.transform = on ? 'scale(1)' : 'scale(1.04)'; v.style.pointerEvents = on ? '' : 'none'; });
  };
  const start = () => { auto = sI(() => set((cur + 1) % stepBtns.length), 5000); };
  stepBtns.forEach((b) => b.addEventListener('click', () => { clearInterval(auto); set(+b.getAttribute('data-step')); start(); }));
  set(0); start();
}

/* ---------- profile testimonial switcher (if present) ---------- */
function initProfiles() {
  const btns = [...q('[data-prof]')]; if (!btns.length) return;
  const quotes = [...q('[data-profquote]')];
  const meta = q1('[data-profmeta]');
  let cur = 0, paused = false, auto;
  const set = (i) => {
    cur = i;
    btns.forEach((b) => {
      const on = +b.getAttribute('data-prof') === i;
      b.style.background = on ? '#0F172A' : 'transparent';
      b.style.padding = on ? '4px 16px 4px 4px' : '3px';
      b.style.boxShadow = on ? '0 10px 24px -10px rgba(15,23,42,.5)' : 'none';
      const nm = b.querySelector('[data-prof-name]');
      if (nm) { nm.style.maxWidth = on ? '190px' : '0px'; nm.style.opacity = on ? '1' : '0'; nm.style.marginLeft = on ? '10px' : '0px'; }
      const av = b.querySelector('img');
      if (av) av.style.boxShadow = on ? '0 0 0 2px #0F172A' : '0 0 0 2px rgba(15,23,42,.1)';
    });
    quotes.forEach((qd) => { const on = +qd.getAttribute('data-profquote') === i; qd.style.opacity = on ? '1' : '0'; qd.style.transform = on ? 'none' : 'translateY(8px)'; qd.style.pointerEvents = on ? '' : 'none'; });
    if (meta && btns[i]) meta.textContent = btns[i].getAttribute('data-meta') || '';
  };
  const start = () => { auto = sI(() => { if (!paused) set((cur + 1) % btns.length); }, 4200); };
  btns.forEach((b) => {
    b.addEventListener('click', () => { clearInterval(auto); set(+b.getAttribute('data-prof')); start(); });
    b.addEventListener('mouseenter', () => { paused = true; });
    b.addEventListener('mouseleave', () => { paused = false; });
  });
  set(0); start();
}

/* ---------- cursor glow cards ---------- */
function initGlow() {
  const cards = [...q('[data-glow]')]; if (!cards.length) return;
  cards.forEach((card) => {
    const spot = card.querySelector('[data-glow-spot]');
    card.addEventListener('mousemove', (e) => { const r = card.getBoundingClientRect(); card.style.setProperty('--gx', (e.clientX - r.left) + 'px'); card.style.setProperty('--gy', (e.clientY - r.top) + 'px'); if (spot) spot.style.opacity = '1'; });
    card.addEventListener('mouseleave', () => { if (spot) spot.style.opacity = '0'; });
  });
}

/* ---------- gradient data-borders ---------- */
function initDataBorders() {
  const cards = [...q('[data-databorder]')]; if (!cards.length) return;
  const base = 'rgba(15,23,42,.08)';
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.background = 'radial-gradient(220px circle at ' + x + 'px ' + y + 'px, #6366F1, #14B8A6 42%, ' + base + ' 76%)';
      card.style.boxShadow = '0 0 34px -8px rgba(99,102,241,.45)';
    });
    card.addEventListener('mouseleave', () => { card.style.background = base; card.style.boxShadow = 'none'; });
  });
}

/* ---------- beta modal ---------- */
function initModal() {
  const openers = [...q('[data-beta-open]')], modal = q1('[data-beta-modal]'); if (!modal) return;
  const closers = [...q('[data-beta-close]')], form = q1('[data-beta-form]'), success = q1('[data-beta-success]'), formBox = q1('[data-beta-formbox]'), panel = modal.querySelector('[data-beta-panel]');
  const show = () => { modal.style.display = 'flex'; requestAnimationFrame(() => { modal.style.opacity = '1'; if (panel) { panel.style.opacity = '1'; panel.style.transform = 'translateY(0) scale(1)'; } }); };
  const hide = () => { modal.style.opacity = '0'; if (panel) { panel.style.transform = 'translateY(12px) scale(.98)'; } sT(() => { modal.style.display = 'none'; if (success && formBox) { success.style.display = 'none'; formBox.style.display = ''; } }, 260); };
  openers.forEach((b) => b.addEventListener('click', show));
  closers.forEach((b) => b.addEventListener('click', hide));
  modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
  if (form) form.addEventListener('submit', (e) => { e.preventDefault(); if (formBox) formBox.style.display = 'none'; if (success) success.style.display = ''; });
}

/* ---------- hero orbiting arc ---------- */
function initArc() {
  const wrap = (q('[data-arc-wrap]') || [])[0]; if (!wrap) return;
  const holder = wrap.parentElement;
  if (holder) { const fit = () => { const sc = Math.max(0.6, Math.min(1, holder.clientWidth / 1040)); wrap.style.transform = 'scale(' + sc + ')'; holder.style.height = (400 * sc) + 'px'; }; fit(); requestAnimationFrame(fit); window.addEventListener('resize', fit); }
  const outer = "M 140 380 A 380 380 0 0 1 900 380";
  const inner = "M 220 380 A 300 300 0 0 1 820 380";
  const setup = (arc, path, dur, ccw) => {
    const list = [...wrap.querySelectorAll('[data-arc="' + arc + '"]')];
    const n = list.length; if (!n) return;
    list.forEach((el, i) => {
      el.style.offsetPath = "path('" + path + "')";
      el.style.offsetRotate = "0deg";
      el.style.offsetAnchor = "50% 50%";
      const kf = ccw
        ? [{ offset: 0, offsetDistance: '100%', opacity: 0 }, { offset: 0.1, offsetDistance: '90%', opacity: 1 }, { offset: 0.9, offsetDistance: '10%', opacity: 1 }, { offset: 1, offsetDistance: '0%', opacity: 0 }]
        : [{ offset: 0, offsetDistance: '0%', opacity: 0 }, { offset: 0.1, offsetDistance: '10%', opacity: 1 }, { offset: 0.9, offsetDistance: '90%', opacity: 1 }, { offset: 1, offsetDistance: '100%', opacity: 0 }];
      try { el.animate(kf, { duration: dur, iterations: Infinity, easing: 'linear', delay: -(dur * i / n) }); } catch (e) { el.style.opacity = '1'; }
    });
  };
  setup('outer', outer, 30000, false);
  setup('inner', inner, 26000, true);
}

/* ---------- hero stat-bar scale-to-fit ---------- */
function initStatFit() {
  const holder = q1('[data-statbar-holder]'), bar = q1('[data-statbar]');
  if (!holder || !bar) return;
  const NAT = 1080;
  const fit = () => { const sc = Math.min(1, holder.clientWidth / NAT); bar.style.transform = 'scale(' + sc + ')'; holder.style.height = (bar.offsetHeight * sc) + 'px'; };
  fit(); requestAnimationFrame(fit); window.addEventListener('resize', fit);
}

/* ---------- horizontal card scrollers (drag + arrow bar) ---------- */
function initHScroll() {
  [...q('[data-hscroll]')].forEach((sc) => {
    if (sc.parentNode && sc.parentNode.getAttribute && sc.parentNode.getAttribute('data-hscroll-wrap') !== null) return;
    const wrap = document.createElement('div');
    wrap.setAttribute('data-hscroll-wrap', '');
    wrap.style.position = 'relative';
    sc.parentNode.insertBefore(wrap, sc);
    wrap.appendChild(sc);
    const bar = document.createElement('div');
    bar.setAttribute('data-hscroll-bar', '');
    bar.style.cssText = 'display:none;justify-content:flex-end;align-items:center;gap:8px;margin-top:14px';
    const mkArrow = (dir) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-hscroll-arrow', dir);
      b.setAttribute('aria-label', dir === 'prev' ? 'Precedente' : 'Successivo');
      b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + (dir === 'prev' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6') + '"></path></svg>';
      b.style.cssText = 'flex:none;display:grid;place-items:center;height:34px;width:34px;border-radius:999px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.85);color:#475569;cursor:pointer;box-shadow:0 4px 12px -6px rgba(15,23,42,.3);transition:opacity .2s ease,background .2s ease,color .2s ease';
      b.addEventListener('click', () => { const items = [...sc.children]; const scLeft = sc.getBoundingClientRect().left; let target = null; if (dir === 'next') { for (let k = 0; k < items.length; k++) { const rel = items[k].getBoundingClientRect().left - scLeft; if (rel > 8) { target = sc.scrollLeft + rel; break; } } if (target == null) target = sc.scrollWidth; } else { for (let k = items.length - 1; k >= 0; k--) { const rel = items[k].getBoundingClientRect().left - scLeft; if (rel < -8) { target = sc.scrollLeft + rel; break; } } if (target == null) target = 0; } sc.scrollTo({ left: Math.max(0, target), behavior: 'smooth' }); });
      bar.appendChild(b);
      return b;
    };
    const prev = mkArrow('prev'), next = mkArrow('next');
    wrap.appendChild(bar);
    const upd = () => {
      const can = sc.scrollWidth > sc.clientWidth + 4;
      bar.style.display = can ? 'flex' : 'none';
      const max = sc.scrollWidth - sc.clientWidth - 2;
      const showP = can && sc.scrollLeft > 4, showN = can && sc.scrollLeft < max;
      prev.style.opacity = showP ? '1' : '.3'; prev.style.pointerEvents = showP ? 'auto' : 'none';
      next.style.opacity = showN ? '1' : '.3'; next.style.pointerEvents = showN ? 'auto' : 'none';
    };
    sc.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    let down = false, sx = 0, sl = 0, moved = false;
    sc.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; down = true; moved = false; sx = e.clientX; sl = sc.scrollLeft; sc.style.scrollBehavior = 'auto'; });
    sc.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; sc.style.cursor = 'grabbing'; } sc.scrollLeft = sl - dx; });
    const end = () => { down = false; sc.style.cursor = ''; sc.style.scrollBehavior = ''; };
    sc.addEventListener('pointerup', end); sc.addEventListener('pointerleave', end); sc.addEventListener('pointercancel', end);
    sc.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    requestAnimationFrame(upd); sT(upd, 350);
  });
}

/* ---------- mobile marquee loops (community / principi / numeri) ---------- */
function initMobileLoops() {
  const groups = [...q('[data-mloop]')];
  if (!groups.length) return;
  const build = (g) => {
    if (g._mloopBuilt) return;
    const items = [...g.children];
    if (!items.length) return;
    g._mloopDisplay = g.style.display;
    const track = document.createElement('div');
    track.setAttribute('data-mloop-track', '');
    const spd = g.getAttribute('data-mloop-speed') || '36';
    track.style.cssText = 'display:flex;flex-wrap:nowrap;align-items:stretch;width:max-content;animation:qsMarq ' + spd + 's linear infinite;will-change:transform';
    track.addEventListener('mouseenter', () => { track.style.animationPlayState = 'paused'; });
    track.addEventListener('mouseleave', () => { track.style.animationPlayState = 'running'; });
    const setFinal = (rt) => { rt.querySelectorAll('[data-count]').forEach((cd) => { const v = cd.getAttribute('data-count'); if (v != null) cd.textContent = v + (cd.getAttribute('data-count-suffix') || ''); }); };
    const prep = (el) => { el.style.flex = '0 0 auto'; el.style.marginRight = '14px'; el.style.opacity = '1'; el.style.transform = 'none'; };
    items.forEach((it) => { if (S.cio) it.querySelectorAll('[data-count]').forEach((cd) => S.cio.unobserve(cd)); setFinal(it); prep(it); track.appendChild(it); });
    items.forEach((it) => { const c = it.cloneNode(true); c.setAttribute('aria-hidden', 'true'); setFinal(c); prep(c); track.appendChild(c); });
    g.appendChild(track);
    g.style.overflow = 'hidden';
    g.style.display = 'block';
    g._mloopTrack = track; g._mloopItems = items; g._mloopBuilt = true;
  };
  const teardown = (g) => {
    if (!g._mloopBuilt) return;
    g._mloopItems.forEach((it) => { it.style.flex = ''; it.style.marginRight = ''; it.style.opacity = ''; it.style.transform = ''; g.appendChild(it); });
    if (g._mloopTrack) g._mloopTrack.remove();
    g.style.overflow = ''; g.style.display = g._mloopDisplay || '';
    g._mloopBuilt = false;
  };
  const apply = () => { groups.forEach((g) => { (getComputedStyle(g).getPropertyValue('--mloop-on').trim() === '1') ? build(g) : teardown(g); }); };
  apply();
  window.addEventListener('resize', () => { clearTimeout(S.mloopT); S.mloopT = setTimeout(apply, 160); });
}

/* ---------- macro-categorie arrow paging (mobile) ---------- */
function initTabArrows() {
  const bar = q1('[data-tab-arrows]'); if (!bar) return;
  const panels = [...q('[data-tabpanel]')];
  const active = () => panels.find((p) => getComputedStyle(p).display !== 'none');
  const go = (dir) => {
    const sc = active(); if (!sc) return;
    const items = [...sc.children], scLeft = sc.getBoundingClientRect().left;
    let t = null;
    if (dir === 'next') { for (let k = 0; k < items.length; k++) { const rel = items[k].getBoundingClientRect().left - scLeft; if (rel > 8) { t = sc.scrollLeft + rel; break; } } if (t == null) t = sc.scrollWidth; }
    else { for (let k = items.length - 1; k >= 0; k--) { const rel = items[k].getBoundingClientRect().left - scLeft; if (rel < -8) { t = sc.scrollLeft + rel; break; } } if (t == null) t = 0; }
    sc.scrollTo({ left: Math.max(0, t), behavior: 'smooth' });
  };
  const pb = bar.querySelector('[data-tab-arrow="prev"]'), nb = bar.querySelector('[data-tab-arrow="next"]');
  if (pb) pb.addEventListener('click', () => go('prev'));
  if (nb) nb.addEventListener('click', () => go('next'));
}

/* ---------- percorso footprint trail ---------- */
function initStepTrail() {
  const trail = q1('[data-steps-trail]'); if (!trail) return;
  const foot = '<svg viewBox="0 0 22 30" width="15" height="20" style="display:block"><path d="M11 9.5c3.4 0 5.4 3.2 5.4 8.4 0 5.6-2.8 11-5.9 11-2.7 0-4.4-2.8-4.4-7.2 0-1.9.3-3.4.3-5.2 0-3.9 1.4-7 4.6-7Z" fill="currentColor"></path><ellipse cx="4.6" cy="10.3" rx="1.5" ry="1.9" fill="currentColor"></ellipse><ellipse cx="7.7" cy="6.6" rx="1.6" ry="2.1" fill="currentColor"></ellipse><ellipse cx="11.2" cy="5.2" rx="1.7" ry="2.2" fill="currentColor"></ellipse><ellipse cx="14.6" cy="5.9" rx="1.5" ry="2" fill="currentColor"></ellipse><ellipse cx="17.4" cy="8.2" rx="1.3" ry="1.7" fill="currentColor"></ellipse></svg>';
  const segs = 3, per = 3; let html = '';
  for (let s = 0; s < segs; s++) {
    const a = 12.5 + s * 25;
    for (let j = 0; j < per; j++) {
      const gi = s * per + j;
      const t = (j + 1) / (per + 1);
      const x = a + t * 25;
      const wob = (gi % 2 ? 6 : -6) + Math.sin(t * Math.PI) * (s % 2 ? -3 : 3);
      const topv = 'calc(50% ' + (wob >= 0 ? '+ ' : '- ') + Math.abs(wob).toFixed(1) + 'px)';
      const mirror = gi % 2 ? ' scaleX(-1)' : '';
      html += '<span data-seg="' + s + '" style="position:absolute;left:' + x.toFixed(1) + '%;top:' + topv + ';transform:translate(-50%,-50%) rotate(90deg)' + mirror + ';color:#5B54E6;opacity:.1;transition:opacity .45s ease,filter .45s ease;transition-delay:' + (j * 0.14).toFixed(2) + 's">' + foot + '</span>';
    }
  }
  trail.innerHTML = html;
  S.trailFeet = [...trail.children];
  setTrail(S.curStep || 0);
}

function setTrail(active) {
  if (!S.trailFeet) return;
  S.trailFeet.forEach((f) => {
    const seg = +f.getAttribute('data-seg');
    const lit = seg < active;
    f.style.opacity = lit ? '1' : '.1';
    f.style.filter = lit ? 'drop-shadow(0 0 4px rgba(88,80,230,.45))' : 'none';
  });
}

/* ---------- theme toggle ---------- */
function initTheme() {
  const moon = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>';
  const sun = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>';
  let theme = 'light';
  try { theme = localStorage.getItem('qs-theme') || 'light'; } catch (e) {}
  const apply = (t) => {
    theme = t;
    document.body.setAttribute('data-theme', t);
    if (root) root.setAttribute('data-theme', t);
    S.fadeRgb = t === 'dark' ? '10,14,26' : '246,248,251';
    const icon = q1('[data-theme-icon]');
    if (icon) icon.innerHTML = t === 'dark' ? sun : moon;
    try { localStorage.setItem('qs-theme', t); } catch (e) {}
  };
  apply(theme);
  const btn = q1('[data-theme-toggle]');
  if (btn) btn.addEventListener('click', () => apply(theme === 'dark' ? 'light' : 'dark'));
}

/* ---------- language switcher (translation needs a claude.complete host; falls back to IT) ---------- */
function initLang() {
  if (!root || typeof document === 'undefined') return;
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const core = (n.nodeValue || '').replace(/^\s+|\s+$/g, '');
      if (core.length < 2 || !/[A-Za-z\u00C0-\u017F]/.test(core)) return NodeFilter.FILTER_REJECT;
      let p = n.parentElement;
      while (p && p !== root) {
        const nn = (p.nodeName || '').toUpperCase();
        if (nn === 'SCRIPT' || nn === 'STYLE' || nn === 'CANVAS' || nn === 'SVG' || nn === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        if (p.getAttribute && p.getAttribute('aria-hidden') === 'true') return NodeFilter.FILTER_REJECT;
        if (p.hasAttribute && p.hasAttribute('data-lang-wrap')) return NodeFilter.FILTER_REJECT;
        p = p.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let cur;
  while ((cur = walker.nextNode())) {
    const v = cur.nodeValue || '';
    const lead = (v.match(/^\s*/) || [''])[0];
    const trail = (v.match(/\s*$/) || [''])[0];
    nodes.push({ node: cur, it: v.slice(lead.length, v.length - trail.length), lead: lead, trail: trail });
  }
  S.langNodes = nodes;
  S.curLang = 'it';
  S.langCache = S.langCache || { en: {}, es: {}, de: {} };
  root.querySelectorAll('[data-lang]').forEach((b) => { b.addEventListener('click', () => setLang(b.getAttribute('data-lang'))); });
  const toggle = root.querySelector('[data-lang-toggle]');
  const menu = root.querySelector('[data-lang-menu]');
  if (toggle && menu) {
    toggle.addEventListener('click', (e) => { e.stopPropagation(); menu.style.display = (menu.style.display === 'block' ? 'none' : 'block'); });
    document.addEventListener('click', () => { menu.style.display = 'none'; });
  }
  let lang = 'it';
  try { lang = localStorage.getItem('qs-lang') || 'it'; } catch (e) {}
  const lbl = root.querySelector('[data-lang-label]'); if (lbl) lbl.textContent = (lang || 'it').toUpperCase();
  if (lang !== 'it') setLang(lang);
}

async function setLang(lang) {
  if (!root || !S.langNodes) return;
  try { localStorage.setItem('qs-lang', lang); } catch (e) {}
  const lbl = root.querySelector('[data-lang-label]'); if (lbl) lbl.textContent = (lang || 'it').toUpperCase();
  const menu = root.querySelector('[data-lang-menu]'); if (menu) menu.style.display = 'none';
  if (S.curLang && S.curLang !== 'it') {
    S.langNodes.forEach((n) => { n.node.nodeValue = n.lead + n.it + n.trail; });
  } else {
    S.langNodes.forEach((n) => { const v = n.node.nodeValue || ''; n.lead = (v.match(/^\s*/) || [''])[0]; n.trail = (v.match(/\s*$/) || [''])[0]; n.it = v.slice(n.lead.length, v.length - n.trail.length); });
  }
  if (lang === 'it') { S.curLang = 'it'; return; }
  S.curLang = lang;
  const cache = (S.langCache[lang] = S.langCache[lang] || {});
  const apply = () => S.langNodes.forEach((n) => { if (cache[n.it]) n.node.nodeValue = n.lead + cache[n.it] + n.trail; });
  apply();
  const missing = Array.from(new Set(S.langNodes.map((n) => n.it).filter((it) => !cache[it])));
  if (!missing.length) return;
  if (!(typeof window !== 'undefined' && window.claude && window.claude.complete)) return; // no host → stays IT
  const names = { en: 'English', es: 'Spanish', de: 'German' };
  const size = 40;
  for (let i = 0; i < missing.length; i += size) {
    if (S.curLang !== lang) return;
    const batch = missing.slice(i, i + size);
    try {
      const out = await window.claude.complete({
        max_tokens: 8000,
        system: 'You are a professional UI localizer for a fintech web app. Translate each string from Italian into ' + names[lang] + '. Preserve meaning and tone; keep the product name "QuantSys", tickers, numbers and punctuation intact. Return ONLY a JSON array of strings — same length and order as the input, translations only, no commentary.',
        messages: [{ role: 'user', content: JSON.stringify(batch) }]
      });
      let arr = null;
      try { arr = JSON.parse(out); } catch (e) { const m = out && out.match(/\[[\s\S]*\]/); if (m) { try { arr = JSON.parse(m[0]); } catch (e2) {} } }
      if (Array.isArray(arr)) { batch.forEach((it, k) => { if (typeof arr[k] === 'string' && arr[k].trim()) cache[it] = arr[k]; }); if (S.curLang === lang) apply(); }
    } catch (e) {}
  }
}

/* ---------- page-specific: map scale-to-fit (Motore · Mappa) ---------- */
function initMap() {
  const holder = q1('[data-map-holder]'), inner = q1('[data-map]');
  if (!holder || !inner) return;
  const W = 1160, H = 1050;
  const fit = () => { const s = Math.min(1, (holder.clientWidth - 24) / W); inner.style.transform = 'scale(' + s + ')'; holder.style.height = (H * s) + 'px'; };
  fit();
  window.addEventListener('resize', fit);
}

/* ---------- registry + per-page runner ---------- */
const REGISTRY = { neural: initNeural, nav: initNav, typewriter: initTypewriter, ring: initRing, reveal: initReveal, count: initCount, tabs: initTabs, steps: initSteps, profiles: initProfiles, glow: initGlow, dataBorders: initDataBorders, modal: initModal, arc: initArc, statFit: initStatFit, hscroll: initHScroll, mobileLoops: initMobileLoops, tabArrows: initTabArrows, stepTrail: initStepTrail, theme: initTheme, lang: initLang, hover: initHover, map: initMap };

export function run(list) {
  const go = () => { if (!root) return; list.forEach((name) => { const fn = REGISTRY[name]; if (fn) { try { fn(); } catch (e) { console.warn('[qs] ' + name, e); } } }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
}
