// @ts-nocheck
/* Auto-generated from the Lyra design components — do not edit by hand.
   Re-run the generator if the source .dc.html changes. */

export function initBehaviors(rootEl){
  if (!rootEl) return () => {};
  class LyraBehaviors {
    constructor(root){ this.root = root; this.props = {}; this._to = []; this._iv = []; }
    _sT(fn, ms) { const id = setTimeout(fn, ms); this._to.push(id); return id; }
    _sI(fn, ms) { const id = setInterval(fn, ms); this._iv.push(id); return id; }
    _q(sel) { return (this.root || document).querySelectorAll(sel); }
    _q1(sel) { return (this.root || document).querySelector(sel); }
  
    _initNeural() {
      const canvas = this._q1('[data-neural]'); if (!canvas) return;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      const container = canvas.parentElement;
      const paletteLight = ['#3f3f46', '#52525b', '#18181b', '#71717a', '#a1a1aa'];
      const paletteDark = ['#d4d4d8', '#a1a1aa', '#e7e7ea', '#8a8a92', '#c7c7cc'];
      const isDark = () => document.body.getAttribute('data-theme') === 'dark';
      const speed = 0.9, trailOpacity = 0.1, particleCount = 460;
      let width = container.clientWidth, height = container.clientHeight, particles = [];
      const mouse = { x: -1000, y: -1000 };
      class P {
        constructor() { this.reset(); }
        reset() { this.x = Math.random() * width; this.y = Math.random() * height; this.vx = 0; this.vy = 0; this.age = 0; this.life = Math.random() * 200 + 100; this.ci = (Math.random() * 5) | 0; }
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
        draw() { ctx.fillStyle = (isDark() ? paletteDark : paletteLight)[this.ci]; ctx.globalAlpha = 0.7 * (1 - Math.abs(this.age / this.life - 0.5) * 2); ctx.fillRect(this.x, this.y, 1.6, 1.6); }
      }
      const init = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = width * dpr; canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        particles = []; for (let i = 0; i < particleCount; i++) particles.push(new P());
      };
      const animate = () => {
        ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(' + (isDark() ? '14,14,16' : '243,243,244') + ',' + trailOpacity + ')'; ctx.fillRect(0, 0, width, height);
        for (const p of particles) { p.update(); p.draw(); }
        this._raf = requestAnimationFrame(animate);
      };
      const onResize = () => { width = container.clientWidth; height = container.clientHeight; init(); };
      const onMove = (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
      const onLeave = () => { mouse.x = -1000; mouse.y = -1000; };
      init(); animate();
      window.addEventListener('resize', onResize); window.addEventListener('mousemove', onMove); window.addEventListener('mouseout', onLeave);
      this._neuralCleanup = () => { window.removeEventListener('resize', onResize); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseout', onLeave); };
    }
  
    _initNav() {
      const nav = this._q1('[data-nav]'); if (!nav) return;
      let last = window.scrollY;
      const onScroll = () => {
        const y = window.scrollY, atTop = y < 12;
        nav.style.boxShadow = atTop ? 'none' : '0 10px 30px -12px rgba(15,20,43,.18)';
        nav.style.background = atTop ? 'rgba(255,255,255,.8)' : '#ffffff';
        nav.style.transform = (y > last && y > 90) ? 'translateY(-100%)' : 'translateY(0)';
        last = y;
      };
      window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
      const toggle = this._q1('[data-nav-toggle]'), menu = this._q1('[data-nav-menu]'), navIcon = this._q1('[data-nav-icon]');
      const burger = '<path d="M3 6h18M3 12h18M3 18h18"></path>', closeIco = '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>';
      let navOpen = false;
      const setNavOpen = (v) => { navOpen = v; if (menu) menu.style.display = v ? 'flex' : 'none'; if (toggle) toggle.setAttribute('aria-expanded', v ? 'true' : 'false'); if (navIcon) navIcon.innerHTML = v ? closeIco : burger; };
      if (toggle && menu) {
        toggle.addEventListener('click', (e) => { e.stopPropagation(); setNavOpen(!navOpen); });
        [...menu.querySelectorAll('a,button')].forEach((el) => el.addEventListener('click', () => setNavOpen(false)));
      }
      const onNavRz = () => { if (window.innerWidth > 1024 && navOpen) setNavOpen(false); };
      window.addEventListener('resize', onNavRz);
      this._navCleanup = () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onNavRz); };
    }
  
    _initTypewriter() {
      const el = this._q1('[data-tw]'); if (!el) return;
      const words = ['fondo collettivo', 'reddito reale', 'tuo portafoglio quant'];
      let wi = 0, ci = 0, del = false;
      const tick = () => {
        const w = words[wi];
        if (!del) { el.textContent = w.slice(0, ci + 1); ci++; if (ci >= w.length) { del = true; this._sT(tick, 1800); return; } }
        else { el.textContent = w.slice(0, ci - 1); ci--; if (ci <= 0) { del = false; wi = (wi + 1) % words.length; } }
        this._sT(tick, del ? 45 : 85);
      };
      this._sT(tick, 400);
    }
  
    _initRing() {
      const cards = [...this._q('[data-ring]')]; if (!cards.length) return;
      const COL = 356;
      const POS = [
        { x: 0, y: 96, s: 0.83, z: 10, o: 0.9 }, { x: 0, y: 50, s: 0.91, z: 20, o: 1 }, { x: 0, y: 0, s: 1, z: 30, o: 1 },
        { x: COL, y: 96, s: 1, z: 30, o: 1 }, { x: COL, y: 50, s: 0.91, z: 20, o: 1 }, { x: COL, y: 0, s: 0.83, z: 10, o: 0.9 }
      ];
      const N = 6; let step = 0;
      const place = () => cards.forEach((c, i) => { const p = POS[(i + step) % N]; c.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px) scale(' + p.s + ')'; c.style.zIndex = p.z; c.style.opacity = p.o; });
      place();
      this._sI(() => { step = (step + 1) % N; place(); }, 2900);
    }
  
    _initDiffMenu() {
      const items = [...this._q('[data-diff-item]')], panels = [...this._q('[data-diff-panel]')];
      if (!items.length || !panels.length) return;
      const set = (i) => {
        items.forEach((b) => {
          const on = +b.getAttribute('data-diff-item') === i;
          b.style.background = on ? '#18181b' : '#fff';
          b.style.borderColor = on ? '#18181b' : 'rgba(24,24,27,.08)';
          b.style.color = on ? '#fff' : '#3f3f46';
          b.querySelectorAll('[data-di-t]').forEach((t) => { t.style.color = on ? '#fff' : '#18181b'; });
          b.querySelectorAll('[data-di-s]').forEach((t) => { t.style.color = on ? '#a1a1aa' : '#6b7280'; });
          b.querySelectorAll('[data-di-i]').forEach((t) => { t.style.background = on ? 'rgba(255,255,255,.14)' : '#f4f4f5'; t.style.color = on ? '#fff' : '#3f3f46'; });
        });
        panels.forEach((p) => {
          const on = +p.getAttribute('data-diff-panel') === i;
          p.style.display = on ? 'block' : 'none';
          if (on) { p.style.animation = 'none'; void p.offsetHeight; p.style.animation = 'qsUp .45s both'; }
        });
      };
      items.forEach((b) => b.addEventListener('click', () => set(+b.getAttribute('data-diff-item'))));
      set(0);
    }
  
    _initArc() {
      const wrap = (this._q('[data-arc-wrap]') || [])[0]; if (!wrap) return;
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
  
    _initStatFit() {
      const holder = this._q1('[data-statbar-holder]'), bar = this._q1('[data-statbar]');
      if (!holder || !bar) return;
      const NAT = 1080;
      const fit = () => { const sc = Math.min(0.8, holder.clientWidth / NAT); bar.style.transform = 'scale(' + sc + ')'; holder.style.height = (bar.offsetHeight * sc) + 'px'; };
      fit(); requestAnimationFrame(fit); window.addEventListener('resize', fit);
      this._statCleanup = () => window.removeEventListener('resize', fit);
    }
  
    _initStepTrail() {
      const trail = this._q1('[data-steps-trail]'); if (!trail) return;
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
          html += '<span data-seg="' + s + '" style="position:absolute;left:' + x.toFixed(1) + '%;top:' + topv + ';transform:translate(-50%,-50%) rotate(90deg)' + mirror + ';color:#27272a;opacity:.1;transition:opacity .45s ease,filter .45s ease;transition-delay:' + (j * 0.14).toFixed(2) + 's">' + foot + '</span>';
        }
      }
      trail.innerHTML = html;
      this._trailFeet = [...trail.children];
      this._setTrail(this._curStep || 0);
    }
  
    _setTrail(active) {
      if (!this._trailFeet) return;
      this._trailFeet.forEach((f) => {
        const seg = +f.getAttribute('data-seg');
        const lit = seg < active;
        f.style.opacity = lit ? '1' : '.1';
        f.style.filter = lit ? 'drop-shadow(0 0 4px rgba(88,80,230,.45))' : 'none';
      });
    }
  
    _initMobileLoops() {
      const groups = [...this._q('[data-mloop]')];
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
        const setFinal = (root) => { root.querySelectorAll('[data-count]').forEach((cd) => { const v = cd.getAttribute('data-count'); if (v != null) cd.textContent = v + (cd.getAttribute('data-count-suffix') || ''); }); };
        const prep = (el) => { el.style.flex = '0 0 auto'; el.style.marginRight = '14px'; el.style.opacity = '1'; el.style.transform = 'none'; };
        items.forEach((it) => { if (this._cio) it.querySelectorAll('[data-count]').forEach((cd) => this._cio.unobserve(cd)); setFinal(it); prep(it); track.appendChild(it); });
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
      const onR = () => { clearTimeout(this._mloopT); this._mloopT = setTimeout(apply, 160); };
      window.addEventListener('resize', onR);
      this._hsCleanups = this._hsCleanups || [];
      this._hsCleanups.push(() => window.removeEventListener('resize', onR));
    }
  
    _initTabArrows() {
      const bar = this._q1('[data-tab-arrows]'); if (!bar) return;
      const panels = [...this._q('[data-tabpanel]')];
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
  
    _initHScroll() {
      this._hsCleanups = this._hsCleanups || [];
      [...this._q('[data-hscroll]')].forEach((sc) => {
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
          b.style.cssText = 'flex:none;display:grid;place-items:center;height:34px;width:34px;border-radius:999px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.85);color:#52525b;cursor:pointer;box-shadow:0 4px 12px -6px rgba(15,23,42,.3);transition:opacity .2s ease,background .2s ease,color .2s ease';
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
        this._hsCleanups.push(() => window.removeEventListener('resize', upd));
        requestAnimationFrame(upd); this._sT(upd, 350);
      });
    }
  
    _initReveal() {
      const els = [...this._q('[data-reveal]')]; if (!els.length) return;
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
      this._io = io;
    }
  
    _initCount() {
      const els = [...this._q('[data-count]')]; if (!els.length) return;
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
      this._cio = io;
    }
  
    _initTabs() {
      const wrap = this._q1('[data-tabs]'); if (!wrap) return;
      const btns = [...this._q('[data-tab]')], panels = [...this._q('[data-tabpanel]')];
      const set = (i) => {
        btns.forEach((b) => { const on = +b.getAttribute('data-tab') === i; b.style.color = on ? '#18181b' : '#a1a1aa'; b.style.background = on ? '#fff' : 'transparent'; b.style.boxShadow = on ? '0 1px 2px rgba(15,23,42,.04),0 8px 24px -12px rgba(15,23,42,.12)' : 'none'; });
        panels.forEach((pn) => {
          const on = +pn.getAttribute('data-tabpanel') === i;
          pn.style.display = on ? 'grid' : 'none';
          if (on) [...pn.querySelectorAll('[data-tabcard]')].forEach((c, k) => { c.style.animation = 'none'; void c.offsetHeight; c.style.animation = 'qsUp .5s both'; c.style.animationDelay = (k * 0.12) + 's'; });
        });
      };
      btns.forEach((b) => b.addEventListener('click', () => set(+b.getAttribute('data-tab'))));
      set(0);
    }
  
    _initSteps() {
      const stepBtns = [...this._q('[data-step]')]; if (!stepBtns.length) return;
      const descs = [...this._q('[data-stepdesc]')], viss = [...this._q('[data-stepvis]')], dots = [...this._q('[data-stepdot]')];
      const liveP = this._q1('[data-stepdesc-live] p');
      let cur = 0, auto;
      const set = (i) => {
        cur = i;
        this._curStep = i; this._setTrail(i);
        if (liveP) { const ad = descs.find(d => +d.getAttribute('data-stepdesc') === i); const p = ad && ad.querySelector('p'); liveP.textContent = p ? p.textContent : ''; }
        stepBtns.forEach((b) => { const on = +b.getAttribute('data-step') === i; const t = b.querySelector('[data-step-title]'); if (t) t.style.color = on ? '#18181b' : '#3f3f46'; });
        dots.forEach((d) => { const on = +d.getAttribute('data-stepdot') === i; d.style.background = on ? 'var(--primary,#18181b)' : '#e4e4e7'; d.style.color = on ? '#fff' : '#a1a1aa'; });
        descs.forEach((dd) => { const on = +dd.getAttribute('data-stepdesc') === i; dd.style.maxHeight = on ? '180px' : '0px'; dd.style.opacity = on ? '1' : '0'; dd.style.marginTop = on ? '8px' : '0px'; });
        viss.forEach((v) => { const on = +v.getAttribute('data-stepvis') === i; v.style.opacity = on ? '1' : '0'; v.style.transform = on ? 'scale(1)' : 'scale(1.04)'; v.style.pointerEvents = on ? '' : 'none'; });
      };
      const start = () => { auto = this._sI(() => set((cur + 1) % stepBtns.length), 5000); };
      stepBtns.forEach((b) => b.addEventListener('click', () => { clearInterval(auto); set(+b.getAttribute('data-step')); start(); }));
      set(0); start();
    }
  
    _initProfiles() {
      const btns = [...this._q('[data-prof]')]; if (!btns.length) return;
      const quotes = [...this._q('[data-profquote]')];
      const meta = this._q1('[data-profmeta]');
      let cur = 0, paused = false, auto;
      const set = (i) => {
        cur = i;
        btns.forEach((b) => {
          const on = +b.getAttribute('data-prof') === i;
          b.style.background = on ? '#18181b' : 'transparent';
          b.style.padding = on ? '4px 16px 4px 4px' : '3px';
          b.style.boxShadow = on ? '0 10px 24px -10px rgba(15,23,42,.5)' : 'none';
          const nm = b.querySelector('[data-prof-name]');
          if (nm) { nm.style.maxWidth = on ? '190px' : '0px'; nm.style.opacity = on ? '1' : '0'; nm.style.marginLeft = on ? '10px' : '0px'; }
          const av = b.querySelector('img');
          if (av) av.style.boxShadow = on ? '0 0 0 2px #18181b' : '0 0 0 2px rgba(15,23,42,.1)';
        });
        quotes.forEach((qd) => { const on = +qd.getAttribute('data-profquote') === i; qd.style.opacity = on ? '1' : '0'; qd.style.transform = on ? 'none' : 'translateY(8px)'; qd.style.pointerEvents = on ? '' : 'none'; });
        if (meta && btns[i]) meta.textContent = btns[i].getAttribute('data-meta') || '';
      };
      const start = () => { auto = this._sI(() => { if (!paused) set((cur + 1) % btns.length); }, 4200); };
      btns.forEach((b) => {
        b.addEventListener('click', () => { clearInterval(auto); set(+b.getAttribute('data-prof')); start(); });
        b.addEventListener('mouseenter', () => { paused = true; });
        b.addEventListener('mouseleave', () => { paused = false; });
      });
      set(0); start();
    }
  
    _initGlow() {
      const cards = [...this._q('[data-glow]')]; if (!cards.length) return;
      cards.forEach((card) => {
        const spot = card.querySelector('[data-glow-spot]');
        card.addEventListener('mousemove', (e) => { const r = card.getBoundingClientRect(); card.style.setProperty('--gx', (e.clientX - r.left) + 'px'); card.style.setProperty('--gy', (e.clientY - r.top) + 'px'); if (spot) spot.style.opacity = '1'; });
        card.addEventListener('mouseleave', () => { if (spot) spot.style.opacity = '0'; });
      });
    }
  
    _initDataBorders() {
      const cards = [...this._q('[data-databorder]')]; if (!cards.length) return;
      const base = 'rgba(15,23,42,.08)';
      cards.forEach((card) => {
        card.addEventListener('mousemove', (e) => {
          const r = card.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          card.style.background = 'radial-gradient(220px circle at ' + x + 'px ' + y + 'px, #3f3f46, #52525b 42%, ' + base + ' 76%)';
          card.style.boxShadow = '0 0 34px -8px rgba(63,63,70,.45)';
        });
        card.addEventListener('mouseleave', () => { card.style.background = base; card.style.boxShadow = 'none'; });
      });
    }
  
    _initModal() {
      const openers = [...this._q('[data-beta-open]')], modal = this._q1('[data-beta-modal]'); if (!modal) return;
      const closers = [...this._q('[data-beta-close]')], form = this._q1('[data-beta-form]'), success = this._q1('[data-beta-success]'), formBox = this._q1('[data-beta-formbox]'), panel = modal.querySelector('[data-beta-panel]');
      const show = () => { modal.style.display = 'flex'; requestAnimationFrame(() => { modal.style.opacity = '1'; if (panel) { panel.style.opacity = '1'; panel.style.transform = 'translateY(0) scale(1)'; } }); };
      const hide = () => { modal.style.opacity = '0'; if (panel) { panel.style.transform = 'translateY(12px) scale(.98)'; } this._sT(() => { modal.style.display = 'none'; if (success && formBox) { success.style.display = 'none'; formBox.style.display = ''; } }, 260); };
      openers.forEach((b) => b.addEventListener('click', show));
      closers.forEach((b) => b.addEventListener('click', hide));
      modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
      if (form) form.addEventListener('submit', (e) => { e.preventDefault(); if (formBox) formBox.style.display = 'none'; if (success) success.style.display = ''; });
    }
  
    _initPseudoStyles(){
      const nodes = [...this._q('[style-hover],[style-active],[style-focus]')];
      nodes.forEach((el) => {
        const hov = el.getAttribute('style-hover');
        const foc = el.getAttribute('style-focus');
        const act = el.getAttribute('style-active');
        let snap = null;
        const enter = (extra) => { if (snap == null) snap = el.getAttribute('style') || ''; el.setAttribute('style', snap + ';' + extra); };
        const leave = () => { if (snap != null) { el.setAttribute('style', snap); snap = null; } };
        if (hov) { el.addEventListener('mouseenter', () => enter(hov)); el.addEventListener('mouseleave', leave); }
        if (foc) { el.addEventListener('focus', () => enter(foc)); el.addEventListener('blur', leave); }
        if (act) { el.addEventListener('mousedown', () => enter(act)); el.addEventListener('mouseup', leave); window.addEventListener('mouseup', leave); }
      });
    }
  
    
    _initMap() {
      const holder = this._q1('[data-map-holder]'), inner = this._q1('[data-map]');
      if (!holder || !inner) return;
      const W = 1160, H = 1050;
      const fit = () => { const s = Math.min(1, (holder.clientWidth - 24) / W); inner.style.transform = 'scale(' + s + ')'; holder.style.height = (H * s) + 'px'; };
      fit();
      window.addEventListener('resize', fit);
      this._mapCleanup = () => window.removeEventListener('resize', fit);
    }
  }

  const b = new LyraBehaviors(rootEl);
  try { b._initPseudoStyles(); } catch (e) {}
  const inits = ['_initNeural','_initNav','_initTypewriter','_initRing','_initReveal','_initCount','_initTabs','_initSteps','_initProfiles','_initGlow','_initDataBorders','_initModal','_initArc','_initDiffMenu','_initStatFit','_initHScroll','_initMobileLoops','_initTabArrows','_initStepTrail','_initMap'];
  inits.forEach((m) => { try { if (typeof b[m] === 'function') b[m](); } catch (e) {} });

  return () => {
    try {
      (b._to || []).forEach(clearTimeout);
      (b._iv || []).forEach(clearInterval);
      if (b._raf) cancelAnimationFrame(b._raf);
      if (b._io) b._io.disconnect();
      if (b._cio) b._cio.disconnect();
      if (b._neuralCleanup) b._neuralCleanup();
      if (b._navCleanup) b._navCleanup();
      if (b._statCleanup) b._statCleanup();
      (b._hsCleanups || []).forEach((fn) => { try { fn(); } catch (e) {} });
    } catch (e) {}
  };
}
