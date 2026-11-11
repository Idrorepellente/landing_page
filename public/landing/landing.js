/* v4.12 · navigazione interna indipendente dall'ospite: la landing cambia pagina da sola al clic su un link "#…",
   anche quando la pagina che la contiene (il canvas, un'anteprima) annulla il comportamento predefinito dei link.
   Si registra per primo, in cattura sulla finestra, quindi parte prima di qualunque altro gestore. */
(function () {
  if (window.__lyraNav412) return; window.__lyraNav412 = true;
  var norm = function (h) { h = String(h || '').replace(/^#/, ''); try { h = decodeURIComponent(h); } catch (e) {} return h; };
  var esc = function (s) { return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&'); };
  window.addEventListener('click', function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target, a = t && t.closest ? t.closest('a[href^="#"]') : null; if (!a) return;
    var root = a.closest('.lyra-landing-live'); if (!root) return;
    if (a.classList.contains('da-fare') || a.hasAttribute('data-ph') && a.getAttribute('href') === '#') return;
    var dest = norm(a.getAttribute('href'));
    var route = dest === '' ? 'home' : dest;
    var isRoute = !!root.querySelector('.pagina[data-route="' + esc(route) + '"]');
    var isTarget = !isRoute && !!document.getElementById(dest);
    if (!isRoute && !isTarget) return;
    e.preventDefault();
    var cur = norm(location.hash), curRoute = cur === '' ? 'home' : cur;
    if (isRoute && route === curRoute) {
      // gia' su questa pagina: torna in cima (era il ritocco v4.7)
      var lento = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      scrollTo({ top: 0, behavior: lento }); try { a.blur(); } catch (er) {}
      return;
    }
    var want = '#' + (route === 'home' && dest === '' ? '' : dest);
    var fire = function () { try { dispatchEvent(new HashChangeEvent('hashchange')); } catch (er) { dispatchEvent(new Event('hashchange')); } };
    if (dest === cur) { fire(); return; }          // stessa ancora: riporta alla sezione
    try { location.hash = want; } catch (er) {}
    // se l'ospite blocca anche il cambio d'indirizzo, lo si scrive nella cronologia e si avvisa il router
    setTimeout(function () {
      if (norm(location.hash) === dest) return;
      try { history.pushState(null, '', want === '#' ? location.pathname + location.search : want); } catch (er) {}
      fire();
    }, 0);
  }, true);
})();

/* Lyra Capital landing, importata senza modifiche: markup, tema e script originali. */
window.__LYRA_LANDING_RUN = function () {
(function(){var t=null;try{t=localStorage.getItem("lyra-tema")}catch(e){}if(t!=="chiaro"&&t!=="scuro"){t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"chiaro":"scuro"}document.documentElement.setAttribute("data-tema",t)})();
/* ============================================================
   LYRA CAPITAL — anteprima sito. I link definitivi vanno qui: lascia "" per vedere il segnaposto.
   ============================================================ */
const LYRA_CONFIG = {
  github: "https://github.com/Lyra-Capital", download: "", demo: "", docs: "docs/lyra-user-guide.pdf", discord: "", kickstarter: "", sponsors: "",
  email_desk: "", email_gestori: "", email_data: "",
  darwin1: "", darwin2: "", darwin3: "", darwin4: "",
  darwin_url1: "", darwin_url2: "", darwin_url3: "", darwin_url4: "",
  f1_name: "Marco Bassa", f2_name: "Eghosa Igbinedion", f4_name: "Matteo Betro",
  f1_in: "", f2_in: "", f4_in: ""
};

(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RIDOTTO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lim = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const html = document.documentElement;
html.classList.add('js');
const store = { g(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, s(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  sg(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, ss(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
const visible = el => !!el && el.getClientRects().length > 0;
const pageOf = el => el.closest('.pagina');
const onScreenPage = () => $('.pagina:not([hidden])');

/* ============================================================ low-poly: terreni, gemme, sfere, in SVG ============================================================ */
function rng(seed) { let a = (seed * 1000003) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeNoise(seed) {
  const r = rng(seed), G = 16, g = new Float32Array(G * G); for (let i = 0; i < g.length; i++) g[i] = r();
  const at = (i, j) => g[((j % G + G) % G) * G + ((i % G + G) % G)];
  const sm = t => t * t * (3 - 2 * t);
  const n = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = sm(x - i), v = sm(y - j); return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v; };
  return (x, y) => { let s = 0, a = .5, f = 1; for (let k = 0; k < 4; k++) { s += a * n(x * f, y * f); a *= .5; f *= 2.05; } return s / .9375; };
}
const PAL = {
  notte: ['#070a14', '#16233f', '#355a8f', '#9cc0ef'],
  acciaio: ['#0d1117', '#2a3340', '#5c6b7d', '#c4ccd6'],
  alba: ['#2a160c', '#7d4320', '#dc8d3c', '#f8dcae'],
  bosco: ['#07201e', '#124a44', '#2f8c7e', '#b1e7da'],
  rame: ['#2a120e', '#742f22', '#c66b4a', '#f2c3a7'],
  carta: ['#b8b2a8', '#d8d2c8', '#eae6df', '#fbfaf7'],
  grafite: ['#111111', '#2a2a2a', '#5b5b5b', '#a6a6a6'],
  viola: ['#140c22', '#38235c', '#6f4fa8', '#cbb8ee'],
};
function walk(n, seed, drift = .25, vol = 1) { const r = rng(seed); let v = 0; const a = []; for (let i = 0; i < n; i++) { v += drift + (r() - .5) * 2 * vol; a.push(v); } return a; }
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function palAt(p, t) { const c = p.map(hex); t = lim(t) * (c.length - 1); const i = Math.min(c.length - 2, Math.floor(t)), u = t - i; return [0, 1, 2].map(k => c[i][k] + (c[i + 1][k] - c[i][k]) * u); }
const rgb = (c, s) => `rgb(${c.map(v => Math.round(lim(v * s, 0, 255))).join(',')})`;
function tri(points, light, pal, zs) {
  // un triangolo: la normale dai tre punti, la luce da una direzione, il colore dall'altezza media
  let s = '';
  for (const [a, b, c] of points) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = (b[2] - a[2]) * zs, vx = c[0] - a[0], vy = c[1] - a[1], vz = (c[2] - a[2]) * zs;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const d = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
    const sh = .42 + .75 * d + (a[3] || 0);
    const col = rgb(palAt(pal, (a[2] + b[2] + c[2]) / 3), sh);
    s += `<polygon points="${a[0].toFixed(1)},${a[1].toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}" fill="${col}" stroke="${col}" stroke-width=".7" stroke-linejoin="round"/>`;
  }
  return s;
}
function terrain(W, H, o) {
  const r = rng(o.seed), nz = makeNoise(o.seed + 7), cols = o.cols || 9, rows = o.rows || Math.round(cols * H / W);
  const ser = o.series; const pts = [];
  for (let j = 0; j <= rows; j++) { pts[j] = []; for (let i = 0; i <= cols; i++) {
    const x = i / cols * W + (i > 0 && i < cols ? (r() - .5) * W / cols * .7 : 0), y = j / rows * H + (j > 0 && j < rows ? (r() - .5) * H / rows * .7 : 0);
    let z = nz(x / W * 2.2, y / H * 2.2);
    if (o.wave) z = z * .35 + (.5 + .5 * Math.sin(x / W * Math.PI * 2 * o.wave + y / H * 2.2)) * .65 * (1 - y / H * .4);
    if (ser) { const t = lim(x / W); const k = t * (ser.length - 1), i0 = Math.floor(k), v = ser[i0] + (ser[Math.min(ser.length - 1, i0 + 1)] - ser[i0]) * (k - i0); z = z * .45 + lim(1 - Math.abs((1 - y / H) - v) * 2.4) * .75; }
    if (o.slope) z = z * .6 + (1 - y / H) * .4 * o.slope;
    pts[j][i] = [x, y, z, 0];
  } }
  const tris = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i], d = pts[j + 1][i + 1]; if ((i + j) % 2) { tris.push([a, b, c], [b, d, c]); } else { tris.push([a, b, d], [a, d, c]); } }
  let sun = '';
  if (o.sun) { const sx = W * .62, sy = H * .34, sr = Math.min(W, H) * .17; sun = `<rect width="${W}" height="${H}" fill="${o.pal[0]}"/><radialGradient id="s${o.seed}" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="${o.pal[3]}" stop-opacity=".95"/><stop offset="1" stop-color="${o.pal[3]}" stop-opacity="0"/></radialGradient><circle cx="${sx}" cy="${sy}" r="${sr * 1.9}" fill="url(#s${o.seed})" opacity=".55"/><circle cx="${sx}" cy="${sy}" r="${sr}" fill="${o.pal[3]}"/>`; }
  return sun + tri(o.sun ? tris.filter(t => (t[0][1] + t[1][1] + t[2][1]) / 3 > H * .36) : tris, o.light || [-.45, -.5, .74], o.pal, o.zs || W * .9);
}
function gem(W, H, o) {
  const r = rng(o.seed), cx = W * (o.cx || .5), cy = H * (o.cy || .52), R = Math.min(W, H) * (o.R || .36), rings = o.rings || 4, m = o.m || 9;
  const ring = k => { const out = []; const rad = R * k / rings; for (let t = 0; t < m; t++) { const a = (t / m) * Math.PI * 2 + (k ? (r() - .5) * .35 : 0) + k * .25; const rr = rad * (k ? .85 + r() * .3 : 0); out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (o.squash || .92), Math.max(0, 1 - k / rings) ** .8 * (.7 + r() * .3), 0]); } return out; };
  const rs = []; for (let k = 0; k <= rings; k++) rs.push(ring(k));
  const tris = [];
  for (let k = 0; k < rings; k++) for (let t = 0; t < m; t++) { const a = rs[k][t], b = rs[k][(t + 1) % m], c = rs[k + 1][t], d = rs[k + 1][(t + 1) % m]; if (k === 0) tris.push([a, c, d]); else tris.push([a, b, d], [a, d, c]); }
  const bg = o.nobg ? '' : terrain(W, H, { seed: o.seed + 3, cols: 7, pal: o.bg || PAL.grafite, light: [.3, -.6, .74], zs: W * .25 });
  return bg + `<ellipse cx="${cx}" cy="${cy + R * .95}" rx="${R * .9}" ry="${R * .22}" fill="#000" opacity="${o.nobg ? .14 : .35}"/>` + tri(tris, o.light || [-.5, -.55, .67], o.pal, Math.min(W, H) * .9);
}
function sphere(W, H, o) {
  const r = rng(o.seed), nz = makeNoise(o.seed + 11), cx = W * (o.cx || .5), cy = H * (o.cy || .5), R = Math.min(W, H) * (o.R || .38), LA = o.la || 7, LO = o.lo || 14;
  const P = []; for (let a = 0; a <= LA; a++) { P[a] = []; for (let b = 0; b <= LO; b++) { const th = (a / LA) * Math.PI + (a > 0 && a < LA ? (r() - .5) * .18 : 0), ph = (b / LO) * Math.PI * 2 + (r() - .5) * .18; const x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph); P[a][b] = [x, y, z]; } }
  const tris = [];
  for (let a = 0; a < LA; a++) for (let b = 0; b < LO; b++) { const p = (q) => { const [x, y, z] = q; const h = nz(x + 1, y + 1) * .6 + .2 + (z > 0 ? z * .25 : 0); return [cx + x * R, cy - y * R, h, z * .05]; }; const A = P[a][b], B = P[a][(b + 1) % LO], C = P[a + 1][b], D = P[a + 1][(b + 1) % LO];
    const front = (A[2] + B[2] + C[2] + D[2]) > -.1; if (!front) continue;
    if (a === 0) tris.push([p(A), p(D), p(C)]); else if (a === LA - 1) tris.push([p(A), p(B), p(C)]); else tris.push([p(A), p(B), p(D)], [p(A), p(D), p(C)]); }
  let bg = o.nobg ? `<ellipse cx="${cx}" cy="${cy + R * 1.08}" rx="${R * .8}" ry="${R * .14}" fill="#000" opacity=".14"/>` : `<rect width="${W}" height="${H}" fill="${o.bgc || '#0b0e16'}"/>`;
  if (o.stars && !o.nobg) { const sr = rng(o.seed + 99); for (let i = 0; i < 46; i++) bg += `<circle cx="${(sr() * W).toFixed(1)}" cy="${(sr() * H).toFixed(1)}" r="${(.4 + sr() * 1.1).toFixed(2)}" fill="#fff" opacity="${(.3 + sr() * .6).toFixed(2)}"/>`; }
  if (!o.nobg) bg += `<circle cx="${cx}" cy="${cy}" r="${R * 1.02}" fill="#000" opacity=".5"/>`;
  return bg + tri(tris, o.light || [-.5, -.5, .7], o.pal, R * .5);
}
function boxes(tris, x0, x1, yt, yb, zc, dx, dy, lift) {
  tris.push([[x0, yt, zc, lift], [x1, yt, zc, lift], [x1, yb, zc, lift]], [[x0, yt, zc, lift], [x1, yb, zc, lift], [x0, yb, zc, lift]]);
  tris.push([[x1, yt, zc, lift - .28], [x1 + dx, yt - dy, zc, lift - .28], [x1 + dx, yb - dy, zc, lift - .28]], [[x1, yt, zc, lift - .28], [x1 + dx, yb - dy, zc, lift - .28], [x1, yb, zc, lift - .28]]);
  tris.push([[x0, yt, zc, lift + .32], [x0 + dx, yt - dy, zc, lift + .32], [x1 + dx, yt - dy, zc, lift + .32]], [[x0, yt, zc, lift + .32], [x1 + dx, yt - dy, zc, lift + .32], [x1, yt, zc, lift + .32]]);
}
function towers(W, H, o) {
  const r = rng(o.seed), n = o.n || 8, ser = o.series || SERIES.up, tris = [], bw = W / (n + 1.6);
  let s = `<rect width="${W}" height="${H}" fill="${o.bgc || '#0a0c12'}"/><rect x="0" y="${H * .86}" width="${W}" height="${H * .14}" fill="#000" opacity=".35"/>`;
  for (let i = 0; i < n; i++) { const v = ser[Math.round(i / (n - 1) * (ser.length - 1))]; const h = (v * .75 + .12) * H * .72 + r() * 6; const x0 = bw * (i + .8), x1 = x0 + bw * .6; boxes(tris, x0, x1, H * .86 - h, H * .86, v, bw * .26, bw * .15, 0); }
  return s + tri(tris, o.light || [-.5, -.5, .7], o.pal, 1);
}
function candles(W, H, o) {
  const r = rng(o.seed), n = o.n || 11, tris = [], bw = W / (n + 1.6); let v = H * .5, s = `<rect width="${W}" height="${H}" fill="${o.bgc || '#0a0c12'}"/>`;
  for (let i = 0; i < n; i++) { const op = v; v += (r() - (o.bias || .5)) * H * .2; v = Math.max(H * .18, Math.min(H * .82, v)); const hi = Math.min(op, v) - r() * H * .07, lo = Math.max(op, v) + r() * H * .07; const x0 = bw * (i + .8), x1 = x0 + bw * .58, cxm = (x0 + x1) / 2; s += `<line x1="${cxm}" y1="${hi}" x2="${cxm}" y2="${lo}" stroke="${o.pal[2]}" stroke-width="1.4" stroke-linecap="round"/>`; boxes(tris, x0, x1, Math.min(op, v), Math.max(op, v) + 1.5, v < op ? .9 : .25, bw * .22, bw * .13, 0); }
  return s + tri(tris, o.light || [-.5, -.5, .7], o.pal, 1);
}
const SERIES = {
  up: [.2, .25, .22, .3, .36, .33, .42, .5, .47, .56, .62, .6, .7, .78, .76, .86],
  crash: [.35, .4, .45, .5, .58, .62, .7, .74, .6, .42, .3, .26, .3, .34, .32, .36],
  flat: [.4, .42, .38, .44, .4, .45, .43, .47, .44, .48, .46, .5, .47, .52, .5, .53],
  wf: [.3, .34, .32, .4, .44, .42, .5, .48, .55, .6, .58, .66, .7, .68, .74, .8],
};
function lowpoly(kind, o) {
  const W = o.W || 200, H = o.H || 200;
  let inner = '';
  inner = ({ gem, sphere, towers, candles }[kind] || terrain)(W, H, o);
  if (o.nobg) o.grain = false;
  const grain = o.grain === false ? '' : `<rect width="${W}" height="${H}" fill="url(#g${o.seed})" opacity=".08"/>`;
  const defs = o.grain === false ? '' : `<defs><pattern id="g${o.seed}" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#fff"/><circle cx="3" cy="3" r=".5" fill="#000"/></pattern></defs>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}${inner}${grain}</svg>`;
}
/* il repertorio delle tessere: scena + palette + seme; il mosaico pesca da qui */
const POOL = [
  ['terrain', { pal: PAL.notte, series: SERIES.up }], ['gem', { pal: PAL.alba, bg: PAL.grafite }], ['sphere', { pal: PAL.bosco, stars: true }], ['towers', { pal: PAL.carta, bgc: '#15161a' }],
  ['terrain', { pal: PAL.alba, series: SERIES.crash, sun: true }], ['candles', { pal: PAL.bosco, bgc: '#06110f' }], ['gem', { pal: PAL.notte, bg: PAL.acciaio, rings: 5, m: 11 }], ['terrain', { pal: PAL.acciaio, wave: 1.5 }],
  ['sphere', { pal: PAL.alba, bgc: '#120b06' }], ['towers', { pal: PAL.viola, bgc: '#0c0714', series: SERIES.wf }], ['terrain', { pal: PAL.viola, slope: .8 }], ['candles', { pal: PAL.rame, bgc: '#140a08', bias: .55 }],
  ['gem', { pal: PAL.carta, bg: PAL.acciaio, rings: 3, m: 8 }], ['terrain', { pal: PAL.rame, series: SERIES.crash }], ['sphere', { pal: PAL.grafite, bgc: '#050608', stars: true }], ['terrain', { pal: PAL.bosco, wave: 2 }],
  ['towers', { pal: PAL.alba, bgc: '#1a1008', series: SERIES.up }], ['gem', { pal: PAL.rame, bg: PAL.grafite, rings: 4, m: 7 }], ['terrain', { pal: PAL.notte, series: SERIES.up, sun: true }], ['candles', { pal: PAL.acciaio, bgc: '#0b0e12' }],
  ['sphere', { pal: PAL.viola, bgc: '#0c0714' }], ['terrain', { pal: PAL.carta, slope: 1 }], ['gem', { pal: PAL.bosco, bg: PAL.grafite, rings: 5, m: 9 }], ['towers', { pal: PAL.notte, bgc: '#06080f', series: SERIES.crash }],
  ['terrain', { pal: PAL.grafite, series: SERIES.wf }], ['sphere', { pal: PAL.carta, bgc: '#1a1a1a' }], ['candles', { pal: PAL.viola, bgc: '#0c0714', bias: .45 }], ['terrain', { pal: PAL.alba, wave: 1.2 }],
];
let seedN = 11;
const pick = i => { const [k, o] = POOL[i % POOL.length]; return lowpoly(k, Object.assign({ seed: 100 + i * 13 + (seedN++ % 7), cols: 9 }, o)); };
function paintPolys(scope = document) {
  $$('[data-poly]', scope).forEach(el => {
    if (el.dataset.painted) return; el.dataset.painted = '1';
    const d = el.dataset, o = { seed: +(d.seed || 1), cols: +(d.cols || 10), W: +(d.w || 200), H: +(d.h || 200), pal: PAL[d.pal] || PAL.notte, bg: PAL[d.bg] || PAL.grafite, series: SERIES[d.series], slope: +(d.slope || 0), rings: +(d.rings || 4), m: +(d.m || 9), R: +(d.r || 0) || undefined, bgc: d.bgc, wave: +(d.wave || 0), sun: !!d.sun, stars: !!d.stars, nobg: !!d.nobg };
    el.innerHTML = lowpoly(d.poly, o);
  });
}

/* ============================================================ il vetro scanalato: uno shader, nessuna immagine ============================================================ */
const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG = `precision highp float;uniform vec2 u_res;uniform float u_time;uniform vec2 u_mouse;uniform float u_ribs,u_strength,u_seed,u_center;uniform vec3 u_c0,u_c1,u_c2,u_c3;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+u_seed)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return v;}
vec3 field(vec2 p){float t=u_time*0.045;vec2 q=vec2(fbm(p+vec2(0.0,t)),fbm(p+vec2(5.2,1.3)-t));vec2 r=vec2(fbm(p+2.6*q+vec2(1.7,9.2)+0.2*t),fbm(p+2.6*q+vec2(8.3,2.8)-0.15*t));float f=fbm(p+2.4*r);float column=pow(0.5+0.5*sin(p.x*2.1+r.y*3.0+t*3.0),3.0);vec3 c=mix(u_c0,u_c1,smoothstep(0.15,0.85,f));c=mix(c,u_c2,smoothstep(0.35,1.0,f*0.8+column*0.55));c=mix(c,u_c3,smoothstep(0.62,1.0,f*0.55+column*0.6+r.x*0.25));return c;}
void main(){vec2 frag=gl_FragCoord.xy,uv=frag/u_res;float aspect=u_res.x/u_res.y;float wx=uv.x+0.018*sin(uv.x*11.0+u_seed)+0.01*sin(uv.x*29.0);float x=wx*u_ribs,id=floor(x),fx=fract(x),lens=fx-0.5;float jitter=(hash(vec2(id,3.0))-0.5)*0.35;vec2 s=uv;s.x=(id+0.5+jitter)/u_ribs-lens*u_strength/u_ribs;s.y+=lens*lens*0.08*u_strength+(hash(vec2(id,7.0))-0.5)*0.04;s+=(u_mouse-0.5)*vec2(0.035,0.02);vec2 p=vec2(s.x*aspect,s.y)*1.35;vec3 c=field(p);c+=smoothstep(0.86,1.0,fx)*0.16*(0.4+c.b);c*=1.0-smoothstep(0.35,0.0,fx)*0.18;c*=1.0-u_center*smoothstep(0.75,0.0,length((uv-vec2(0.5,0.52))*vec2(1.25,1.6)));c*=mix(0.7,1.0,smoothstep(1.05,0.35,length((uv-0.5)*vec2(1.0,1.25))));c+=(fract(sin(dot(frag,vec2(12.9898,78.233)))*43758.5453)-0.5)*0.014;gl_FragColor=vec4(c,1.0);}`;
const GREYS = ['#000000', '#262626', '#808080', '#f4f4f4'];
const BUDGET = 420000;
function glass(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return;
  const d = canvas.dataset, num = (v, x) => v === undefined ? x : +v;
  const ribs = num(d.ribs, 22), strength = num(d.strength, 1.6), center = num(d.center, .45), seed = num(d.seed, 1.3), scale = num(d.scale, .65);
  const colors = d.colors ? d.colors.split(',') : GREYS;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = n => gl.getUniformLocation(prog, n), uRes = u('u_res'), uTime = u('u_time'), uMouse = u('u_mouse');
  gl.uniform1f(u('u_ribs'), ribs); gl.uniform1f(u('u_strength'), strength); gl.uniform1f(u('u_seed'), seed); gl.uniform1f(u('u_center'), center);
  ['u_c0', 'u_c1', 'u_c2', 'u_c3'].forEach((k, i) => gl.uniform3fv(u(k), hex(colors[i]).map(v => v / 255)));
  let raf = 0, vis = true, last = 0; const mouse = { x: .5, y: .5, tx: .5, ty: .5 }, t0 = performance.now() - seed * 40000;
  const resize = () => { const r = canvas.getBoundingClientRect(); if (!r.width) return; const k = Math.min(Math.min(devicePixelRatio || 1, 2) * scale, Math.sqrt(BUDGET / Math.max(1, r.width * r.height))); canvas.width = Math.max(1, Math.round(r.width * k)); canvas.height = Math.max(1, Math.round(r.height * k)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(uRes, canvas.width, canvas.height); };
  const draw = now => { mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04; gl.uniform1f(uTime, (now - t0) / 1000); gl.uniform2f(uMouse, mouse.x, mouse.y); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  const loop = now => { if (now - last > 30) { last = now; draw(now); } if (vis && !RIDOTTO) raf = requestAnimationFrame(loop); };
  new ResizeObserver(() => { resize(); if (RIDOTTO || !vis) draw(performance.now()); }).observe(canvas);
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; cancelAnimationFrame(raf); if (vis && !RIDOTTO) raf = requestAnimationFrame(loop); }).observe(canvas);
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth; mouse.ty = 1 - e.clientY / innerHeight; }, { passive: true });
  resize(); draw(performance.now()); raf = requestAnimationFrame(loop);
}

/* ============================================================ il loader ============================================================ */
function loader() {
  // v4.16: niente schermata di caricamento, il sito si mostra direttamente quando e' pronto
  const box = $('.loader'); if (box) box.remove(); return;
  store.ss('lyra-seen', '1');
  html.classList.add('loading');
  const p = $('p', box);
  if ('it' === 'en' || (!'it' && /^en/i.test(navigator.language || ''))) p.innerHTML = 'If it holds, it <span data-roll="goes.|lasts.|pays.">goes.</span>';
  const roll = $('[data-roll]', p);
  // le parole una alla volta; la colonna che rotola porta le alternative sulla riga
  const words = [];
  [...p.childNodes].forEach(n => { if (n.nodeType === 3) { n.nodeValue.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) words.push(document.createTextNode(w)); else { const s = document.createElement('span'); s.textContent = w; words.push(s); } }); } else words.push(n); });
  p.replaceChildren(...words);
  const spans = $$('span', p).filter(s => !s.closest('.ld-col') || s === roll);
  let col = null;
  if (roll) { const opts = roll.dataset.roll.split('|'); col = document.createElement('span'); col.className = 'ld-col'; col.innerHTML = opts.map((o, i) => `<b class="${i ? '' : 'on'}" style="--n:${i}">${o}</b>`).join(''); roll.replaceWith(col); }
  const all = $$(':scope > span', p);
  all.forEach((s, i) => { s.style.animationDelay = (i * .14) + 's'; });
  requestAnimationFrame(() => box.classList.add('go'));
  let k = 0; const bs = col ? $$('b', col) : [];
  const tick = () => { if (!col || k >= bs.length - 1) return; k++; col.style.setProperty('--k', k); bs.forEach((b, i) => b.classList.toggle('on', i === k)); };
  setTimeout(tick, 1500); setTimeout(tick, 2100);
  const lift = () => { box.classList.add('fade'); html.classList.add('lifting'); setTimeout(() => { html.classList.remove('loading', 'lifting'); box.remove(); dispatchEvent(new Event('loader-done')); }, 1700); };
  setTimeout(lift, 2900);
}

/* ============================================================ la barra ============================================================ */
const barra = $('#barra');
const piena = () => barra.classList.toggle('piena', scrollY > 8);
function tema() {
  const pg = onScreenPage(); if (!pg) return;
  const y = 36 + (barra.classList.contains('piena') ? 12 : 0);
  if (html.dataset.tema === 'chiaro') {
    const sotto = document.elementsFromPoint(innerWidth / 2, y).find(e => !e.closest('.barra, .menu'));
    barra.classList.toggle('sul-giorno', !(sotto && sotto.closest('.rh-stage:not(.giorno), .st-stage:not(.chiaro), .rs-dark:not(.rs-plans), .scena')));
    return;
  }
  const giorni = $$('.giorno', pg).filter(visible);
  barra.classList.toggle('sul-giorno', giorni.some(g => { const b = g.getBoundingClientRect(); return b.top <= y && b.bottom > y; }));
}

/* ============================================================ rivelazione ============================================================ */
const dentro = new IntersectionObserver(es => es.forEach(e => { const n = e.target; if (e.isIntersecting && !n.classList.contains('vis')) { n.classList.toggle('su', e.boundingClientRect.top < e.rootBounds.top + 40); n.classList.remove('via'); n.classList.add('vis'); } }), { rootMargin: '-6% 0px -14% 0px' });
const sullo = n => { const r = n.getBoundingClientRect(); return r.bottom > innerHeight * .01 && r.top < innerHeight * .97; };
const fuori = new IntersectionObserver(es => es.forEach(e => { const n = e.target; if (!e.isIntersecting && n.classList.contains('vis') && !sullo(n)) { n.classList.remove('vis'); n.classList.add('via'); } }), { rootMargin: '-1% 0px -3% 0px' });
const RVS = new Set();
const rv = n => { RVS.add(n); dentro.observe(n); fuori.observe(n); };
// rete di sicurezza: alcuni visualizzatori (iframe su iOS) non consegnano gli eventi dell'IntersectionObserver;
// lo stesso controllo, fatto a mano a ogni scroll, garantisce che nulla resti invisibile
let rvRaf = 0;
const rvScan = () => { rvRaf = 0; const vh = innerHeight; RVS.forEach(n => { if (n.classList.contains('vis') || !n.isConnected) return; const r = n.getBoundingClientRect(); if (!r.width && !r.height) return; if (r.top < vh * .9 && r.bottom > vh * .05) { n.classList.toggle('su', r.top < 40); n.classList.remove('via'); n.classList.add('vis'); } }); };
const rvTick = () => { if (!rvRaf) rvRaf = requestAnimationFrame(rvScan); };
addEventListener('scroll', rvTick, { passive: true }); addEventListener('resize', rvTick); addEventListener('hashchange', () => setTimeout(rvTick, 120));
setInterval(rvTick, 700);
let quieto = 0;
addEventListener('scroll', () => { clearTimeout(quieto); quieto = setTimeout(() => $$('.rv.via').forEach(n => { const r = n.getBoundingClientRect(); if (r.top < innerHeight * .86 && r.bottom > innerHeight * .06) { n.classList.remove('via'); n.classList.add('vis'); } }), 160); }, { passive: true });

/* ============================================================ il mosaico ============================================================ */
function mosaic() {
  const box = $('[data-mosaic]'); if (!box) return;
  const tiles = $$('.mz-tile', box); let n = 0;
  tiles.forEach(t => { const d = document.createElement('div'); d.className = 'mz-pic'; d.innerHTML = pick(n); d.dataset.k = n % POOL.length; n++; t.appendChild(d); });
  const seen = t => t.offsetParent !== null, cur = t => t.querySelector('.mz-pic.on') || t.querySelector('.mz-pic');
  const STAGGER = 110, EVERY = 2000, FADE = 1100;
  let started = false, timer = 0, busy = false, inView = true, last = [];
  function reveal() {
    const order = tiles.filter(seen).sort(() => Math.random() - .5);
    if (RIDOTTO) { tiles.forEach(t => $$('.mz-pic', t).forEach(i => i.classList.add('on'))); return; }
    order.forEach((t, i) => setTimeout(() => cur(t).classList.add('on'), i * STAGGER));
    setTimeout(() => { started = true; resume(); }, order.length * STAGGER + 1000);
  }
  function swap() {
    const live = tiles.filter(seen), shown = new Set(live.map(t => +cur(t).dataset.k)); const free = []; for (let i = 0; i < POOL.length; i++) if (!shown.has(i)) free.push(i);
    const choices = live.filter(t => !last.includes(t)); if (!free.length || !choices.length) return;
    const k = free[Math.floor(Math.random() * free.length)], tile = choices[Math.floor(Math.random() * choices.length)];
    busy = true; const old = cur(tile), d = document.createElement('div'); d.className = 'mz-pic swap'; d.dataset.k = k; d.innerHTML = pick(k); tile.appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('on')));
    setTimeout(() => { old.remove(); busy = false; }, FADE + 100);
    last = [tile, ...last].slice(0, 3);
  }
  const paused = () => !started || RIDOTTO || document.hidden || !inView || box.closest('.pagina').hidden;
  function tick() { timer = 0; if (paused()) return; if (!busy) swap(); timer = setTimeout(tick, EVERY); }
  function resume() { if (!timer && !paused()) timer = setTimeout(tick, EVERY / 2); }
  function stop() { clearTimeout(timer); timer = 0; }
  const onChange = () => paused() ? stop() : resume();
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; onChange(); }).observe(box);
  document.addEventListener('visibilitychange', onChange);
  box._resume = onChange;
  // il claim e la riga sotto devono stare nelle loro celle qualunque sia il font: si misurano e si stringono finché ci stanno
  const claim = $('.mz-claim', box), sub = $('.mz-sub', box);
  const fit = () => {
    const t = tiles.find(seen); if (!t || !claim) return; const T = t.offsetHeight; if (!T) return;
    const gap = parseFloat(getComputedStyle(box).gap) || 8, rows = innerWidth >= 900 ? 1 : 2, max = T * rows + (rows - 1) * gap - 4;
    let f = T * (innerWidth >= 900 ? .36 : innerWidth >= 600 ? .34 : .4); claim.style.fontSize = f + 'px';
    for (let i = 0; i < 16 && claim.offsetHeight > max; i++) { f *= .95; claim.style.fontSize = f.toFixed(1) + 'px'; }
    if (sub) { const smax = innerWidth >= 900 ? T - 2 : T * 2 + gap - 2; let g = innerWidth >= 900 ? 15.5 : innerWidth >= 600 ? 15.5 : 14.5; sub.style.fontSize = ''; for (let i = 0; i < 8 && sub.offsetHeight > smax; i++) { g *= .95; sub.style.fontSize = g.toFixed(1) + 'px'; } }
  };
  fit(); addEventListener('resize', fit); addEventListener('lyra-lang', fit); if (document.fonts) document.fonts.ready.then(fit); setTimeout(fit, 1200);
  box._fit = fit;
  if (html.classList.contains('loading')) addEventListener('loader-lifting', () => setTimeout(reveal, 250), { once: true }); else reveal();
}

/* ============================================================ la frase grande e le sue piccole cose vive ============================================================ */
const POPS = {
  curva: `<span class="pop-box"><span class="pop-clip"><svg viewBox="0 0 130 100" preserveAspectRatio="xMidYMid meet"><g stroke="currentColor" stroke-opacity=".14" stroke-width=".8"><line x1="0" y1="25" x2="130" y2="25"/><line x1="0" y1="50" x2="130" y2="50"/><line x1="0" y1="75" x2="130" y2="75"/><line x1="33" y1="0" x2="33" y2="100"/><line x1="66" y1="0" x2="66" y2="100"/><line x1="99" y1="0" x2="99" y2="100"/></g><line class="pc-oos" x1="84" y1="6" x2="84" y2="94"/><path class="pc-line" pathLength="1" d="M6 82 C 30 80, 48 70, 62 62 S 80 44, 92 36 S 108 26, 124 14"/><g class="pc-dot" transform="translate(124 14)"><circle r="5" fill="currentColor" opacity=".25"/><circle r="2.6" fill="currentColor"/></g></svg></span></span>`,
  prova: `<span class="pop-box"><span class="pop-clip"><svg viewBox="0 0 120 100" preserveAspectRatio="xMidYMid meet"><g fill="currentColor"><rect class="pp-bar" x="6" y="8" width="60" height="9" rx="4" opacity=".35"/><rect class="pp-bar" x="16" y="23" width="60" height="9" rx="4" opacity=".35"/><rect class="pp-bar" x="26" y="38" width="60" height="9" rx="4" opacity=".35"/><rect class="pp-bar" x="36" y="53" width="60" height="9" rx="4" opacity=".35"/><rect class="pp-bar" x="46" y="68" width="60" height="9" rx="4" opacity=".35"/><rect class="pp-bar" x="56" y="83" width="40" height="9" rx="4" opacity=".35"/></g><g class="pp-oos" fill="currentColor"><rect x="68" y="8" width="14" height="9" rx="4"/><rect x="78" y="23" width="14" height="9" rx="4"/><rect x="88" y="38" width="14" height="9" rx="4"/><rect x="98" y="53" width="14" height="9" rx="4"/><rect x="108" y="68" width="8" height="9" rx="4"/><rect x="98" y="83" width="18" height="9" rx="4"/></g><g class="pp-x" fill="none"><path pathLength="1" d="M100 80 l14 14"/><path pathLength="1" d="M114 80 l-14 14"/></g></svg></span></span>`,
  switch: `<span class="pop-box"><span class="pop-clip"><svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><rect class="ps-track" x="18" y="34" width="64" height="32" rx="16" fill="currentColor" fill-opacity=".28"/><circle class="ps-knob" cx="34" cy="50" r="12" fill="currentColor"/><g class="ps-l" fill="currentColor"><circle cx="30" cy="84" r="3"/><circle cx="50" cy="84" r="3"/><circle cx="70" cy="84" r="3"/></g></svg></span></span>`,
  globo: `<span class="pop-box"><span class="pop-clip"><span class="pg-c"></span><span class="pg-sheen"></span></span></span>`,
};
/* v4.4 · icone 3D low-poly delle tre frasi: piccoli solidi a facce piatte, illuminati, che ruotano piano.
   globo -> "persone" (il mondo), curva -> "strategie di trading" (barre che salgono con freccia),
   prova -> "backtest" (clessidra: il passato rigiocato), switch -> "STRATEGIA" (re degli scacchi). */
const P3 = (() => {
  const TAU = Math.PI * 2;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mesh = () => ({ V: [], F: [] });
  // F: [a, b, c, colore, alfa]
  const tri = (m, a, b, c, col, al) => m.F.push([a, b, c, col, al == null ? 1 : al]);
  const quad = (m, a, b, c, d, col, al) => { tri(m, a, b, c, col, al); tri(m, a, c, d, col, al); };
  const add = (m, x, y, z) => (m.V.push([x, y, z]), m.V.length - 1);
  const merge = (a, b) => { const o = a.V.length; b.V.forEach(v => a.V.push(v)); b.F.forEach(f => a.F.push([f[0] + o, f[1] + o, f[2] + o, f[3], f[4]])); return a; };
  // solido di rotazione: profilo [[r, y, colore], ...] dall'alto in basso, n spicchi (pochi: è low-poly)
  const lathe = (prof, n, al, rot) => {
    const m = mesh(), rings = prof.map(([r, y]) => { const ring = []; for (let i = 0; i < n; i++) { const a = i / n * TAU + (rot || 0); ring.push(r < 1e-4 ? add(m, 0, y, 0) : add(m, Math.cos(a) * r, y, Math.sin(a) * r)); } return ring; });
    for (let k = 0; k < prof.length - 1; k++) {
      const A = rings[k], B = rings[k + 1], col = prof[k][2];
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (prof[k][0] < 1e-4) tri(m, A[i], B[j], B[i], col, al); else if (prof[k + 1][0] < 1e-4) tri(m, A[i], A[j], B[i], col, al); else quad(m, A[i], A[j], B[j], B[i], col, al); }
    }
    return m;
  };
  const box = (x0, y0, z0, x1, y1, z1, col, top) => {
    const m = mesh(), P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(p => add(m, ...p));
    quad(m, P[0], P[1], P[2], P[3], col); quad(m, P[5], P[4], P[7], P[6], col); quad(m, P[4], P[0], P[3], P[7], col);
    quad(m, P[1], P[5], P[6], P[2], col); quad(m, P[3], P[2], P[6], P[7], top || col); quad(m, P[4], P[5], P[1], P[0], col);
    return m;
  };
  // icosfera a un livello di suddivisione, con "terre" e "mari" scelti da un rumore fisso
  const globe = () => {
    const m = mesh(), t = (1 + Math.sqrt(5)) / 2;
    let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const norm = v => { const l = Math.hypot(...v); return v.map(c => c / l); };
    V = V.map(norm);
    const cache = {}, mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (cache[k] != null) return cache[k]; V.push(norm(V[a].map((c, i) => (c + V[b][i]) / 2))); return (cache[k] = V.length - 1); };
    const F2 = []; F.forEach(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); F2.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); });
    V.forEach(v => add(m, v[0] * .78, v[1] * .78, v[2] * .78));
    F2.forEach(([a, b, c]) => {
      const cx = (V[a][0] + V[b][0] + V[c][0]) / 3, cy = (V[a][1] + V[b][1] + V[c][1]) / 3, cz = (V[a][2] + V[b][2] + V[c][2]) / 3;
      const n = Math.sin(cx * 3.1 + 1.3) + Math.sin(cy * 4.3 - .4) * .8 + Math.sin(cz * 3.7 + 2.1) * .9;
      tri(m, a, b, c, n > .35 ? (n > 1.1 ? '#2f9e6a' : '#45bd7f') : (n > -.2 ? '#3aa7c9' : '#2a86bf'));
    });
    return m;
  };
  const bars = () => {
    const m = box(-.82, -.86, -.5, .82, -.74, .5, '#c3cad6', '#d5dbe4');
    const H = [.32, .62, .5, 1.02], C = ['#2f8f7c', '#2fa58a', '#33b997', '#4fd1a1'];
    H.forEach((h, i) => merge(m, box(-.7 + i * .37, -.74, -.15, -.7 + i * .37 + .26, -.74 + h, .15, C[i], C[i])));
    // freccia che sale sopra le barre
    const ar = mesh(), w = .07, pts = [[-.66, -.12], [-.26, .2], [.06, .02], [.5, .56]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l * w, ny = dx / l * w;
      const a = add(ar, x0 + nx, y0 + ny, .26), b = add(ar, x1 + nx, y1 + ny, .26), c = add(ar, x1 - nx, y1 - ny, .26), d = add(ar, x0 - nx, y0 - ny, .26);
      const a2 = add(ar, x0 + nx, y0 + ny, .14), b2 = add(ar, x1 + nx, y1 + ny, .14), c2 = add(ar, x1 - nx, y1 - ny, .14), d2 = add(ar, x0 - nx, y0 - ny, .14);
      quad(ar, a, b, c, d, '#f2b45a'); quad(ar, b2, a2, d2, c2, '#f2b45a'); quad(ar, a2, b2, b, a, '#e09a3a'); quad(ar, d, c, c2, d2, '#e09a3a');
    }
    const [hx, hy] = pts[3], hd = Math.atan2(.54, .44), s = .2;
    const t1 = add(ar, hx + Math.cos(hd) * s * 1.1, hy + Math.sin(hd) * s * 1.1, .2), t2 = add(ar, hx + Math.cos(hd + 2.2) * s, hy + Math.sin(hd + 2.2) * s, .2), t3 = add(ar, hx + Math.cos(hd - 2.2) * s, hy + Math.sin(hd - 2.2) * s, .2);
    const u1 = add(ar, hx, hy, .3), u2 = add(ar, hx, hy, .1);
    tri(ar, t1, t2, u1, '#f2b45a'); tri(ar, t2, t3, u1, '#e09a3a'); tri(ar, t3, t1, u1, '#f2b45a'); tri(ar, t2, t1, u2, '#e09a3a'); tri(ar, t3, t2, u2, '#e09a3a'); tri(ar, t1, t3, u2, '#e09a3a');
    return merge(m, ar);
  };
  const hourglass = () => {
    const cap = '#b07a3c', capT = '#c98f4c';
    const m = merge(lathe([[.0, .92, capT], [.62, .92, cap], [.62, .78, cap], [0, .78, cap]], 8), lathe([[0, -.78, cap], [.62, -.78, cap], [.62, -.92, cap], [0, -.92, cap]], 8));
    // montanti
    [0, 1, 2].forEach(i => { const a = i / 3 * TAU + .3, x = Math.cos(a) * .52, z = Math.sin(a) * .52; merge(m, box(x - .045, -.78, z - .045, x + .045, .78, z + .045, '#8a5c2c')); });
    // sabbia: sotto un cono pieno, sopra quel che resta, e il filo che scende
    merge(m, lathe([[0, -.28, '#f2b45a'], [.36, -.62, '#f2b45a'], [.4, -.76, '#e8a347'], [0, -.76, '#e8a347']], 7));
    merge(m, lathe([[0, .36, '#f2b45a'], [.33, .5, '#f2b45a'], [.2, .2, '#e8a347'], [0, .08, '#e8a347']], 7));
    merge(m, box(-.022, -.3, -.022, .022, .12, .022, '#f2b45a'));
    // vetro: semitrasparente, sopra a tutto
    merge(m, lathe([[.44, .76, '#bfe6f2'], [.42, .52, '#bfe6f2'], [.1, .06, '#bfe6f2'], [.06, 0, '#bfe6f2'], [.1, -.06, '#bfe6f2'], [.42, -.52, '#bfe6f2'], [.44, -.76, '#bfe6f2']], 8, .32));
    return m;
  };
  const king = () => {
    const v = '#7c6be0', v2 = '#9a8cf0', g = '#f2c14e';
    const m = lathe([[0, -.92, v], [.62, -.92, v], [.62, -.8, v], [.5, -.72, v2], [.5, -.62, v], [.3, -.5, v], [.2, -.05, v], [.18, .22, v2], [.36, .3, v2], [.36, .38, v], [.2, .44, v], [.3, .64, v], [.22, .72, v2], [0, .74, v2]], 8);
    merge(m, box(-.055, .72, -.055, .055, 1.08, .055, g, g));
    merge(m, box(-.17, .86, -.055, .17, .96, .055, g, g));
    return m;
  };
  const MAKE = { globo: globe, curva: bars, prova: hourglass, switch: king };
  const SCALE = { globo: 1.08, curva: .98, prova: .95, switch: .9 };
  const TILT = { globo: -.28, curva: -.32, prova: -.22, switch: -.18 };
  const CACHE = {};
  const L = (() => { const l = [-.45, .7, .55], n = Math.hypot(...l); return l.map(c => c / n); })();
  function draw(cv, kind, yaw, grow) {
    const m = CACHE[kind] || (CACHE[kind] = MAKE[kind]());
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const s = W * .4 * SCALE[kind] * grow, cy = Math.cos(yaw), sy = Math.sin(yaw), tx = TILT[kind], cx = Math.cos(tx), sx = Math.sin(tx);
    const P = m.V.map(([x, y, z]) => { const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx; return [x1, y2, z2]; });
    const list = [];
    m.F.forEach(([a, b, c, col, al]) => {
      const A = P[a], B = P[b], C = P[c];
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      if (al >= 1 && nz < 0) return; // faccia rivolta indietro
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const d = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), k = .5 + .62 * d, rim = Math.pow(1 - nz, 3) * .1;
      const [r, g, bb] = hex(col);
      list.push({ z: (A[2] + B[2] + C[2]) / 3, al, pts: [A, B, C], fill: `rgba(${Math.min(255, r * k + 255 * rim) | 0},${Math.min(255, g * k + 255 * rim) | 0},${Math.min(255, bb * k + 255 * rim) | 0},${al})` });
    });
    list.sort((p, q) => p.z - q.z);
    ctx.lineJoin = 'round';
    list.forEach(f => {
      ctx.beginPath();
      f.pts.forEach(([x, y], i) => { const X = W / 2 + x * s, Y = H / 2 - y * s; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.fillStyle = f.fill; ctx.fill();
      if (f.al >= 1) { ctx.strokeStyle = f.fill; ctx.lineWidth = Math.max(.6, W / 260); ctx.stroke(); }
    });
  }
  const live = new Set();
  let raf = 0;
  const fit = p => { const cv = p._cv, dpr = Math.min(3, window.devicePixelRatio || 1), w = Math.max(24, Math.round(p._box.offsetWidth * 1.16 * dpr * 1.6)); if (cv.width !== w) { cv.width = w; cv.height = w; } };
  const tick = now => {
    raf = 0;
    live.forEach(p => {
      if (!p.isConnected) { live.delete(p); return; }
      const t = (now - p._t0) / 1000, g = Math.min(1, t / .9), e = 1 - Math.pow(1 - g, 3), over = g < 1 ? 1 + Math.sin(g * Math.PI) * .08 : 1;
      fit(p);
      draw(p._cv, p.dataset.pop, p._y0 + t * .9 + (1 - e) * 2.4, (.35 + .65 * e) * over);
    });
    if (live.size) raf = requestAnimationFrame(tick);
  };
  function mount(p) {
    if (p._cv) return;
    p._box = p.querySelector('.pop-box'); p._cv = p.querySelector('canvas.p3');
    p._y0 = { globo: .6, curva: -.55, prova: .3, switch: .4 }[p.dataset.pop] || 0;
  }
  return {
    html: () => '<span class="pop-box"><span class="pop-clip pop-3d"><canvas class="p3"></canvas></span></span>',
    start(p) { mount(p); p._t0 = performance.now(); live.add(p); if (!raf) raf = requestAnimationFrame(tick); },
    stop(p) { live.delete(p); },
    still(p) { mount(p); fit(p); draw(p._cv, p.dataset.pop, p._y0 + .5, 1); }
  };
})();

Object.keys(POPS).forEach(k => { POPS[k] = P3.html(); });
const FILMS = { curva: [['go', 250]], prova: [['go', 250]], switch: [['go', 250]], globo: [['go', 250]] };
const ALL = ['go', 'cross'];
function popGlobe(p) {
  const c = $('.pg-c', p); if (!c || c.dataset.done) return; c.dataset.done = '1';
  const frames = []; for (let f = 0; f < 10; f++) frames.push(lowpoly('sphere', { seed: 300 + f, pal: PAL.bosco, bgc: '#000', R: .5, la: 8, lo: 16, grain: false }));
  c.innerHTML = frames.map((s, i) => `<div style="position:absolute;inset:0;opacity:${i ? 0 : 1}">${s}</div>`).join('');
  let i = 0; const kids = [...c.children]; setInterval(() => { if (!p.classList.contains('on') || p.closest('.pagina').hidden) return; kids[i].style.opacity = 0; i = (i + 1) % kids.length; kids[i].style.opacity = 1; kids[i].style.transition = 'opacity .5s'; }, 700);
}
function play(p) { stop(p); p._t = FILMS[p.dataset.pop].map(([c, ms]) => setTimeout(() => { p.classList.add(c); if (c === 'go') P3.start(p); }, ms)); }
function stop(p) { (p._t || []).forEach(clearTimeout); p._t = []; p.classList.remove(...ALL); P3.stop(p); }
const arrive = p => { if (p.classList.contains('on')) return; p.classList.add('on'); play(p); };
const leave = p => { if (!p.classList.contains('on')) return; p.classList.remove('on', 'dim'); stop(p); };

function frase(sez) {
  // v3.8 · stesso motore della sezione "Perché" di Hopaway: ogni frase entra da 1/R, le parole salgono e si accendono una per una, poi la frase esce crescendo fino a R
  const esc = x => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  $$('.fr-t', sez).forEach(t => {
    if (t.dataset.cut) return; t.dataset.cut = '1';
    $$('.fr-seg', t).forEach(seg => {
      const units = []; let glue = false, pend = null;
      const add = (h, em) => { const u = units[units.length - 1]; if (glue && u && !pend) { u.h += h; u.em = u.em || em; } else { units.push({ h, em, pop: pend }); pend = null; } glue = true; };
      [...seg.childNodes].forEach(n => {
        if (n.nodeType === 3) { n.nodeValue.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { glue = false; return; } add(esc(w), false); }); }
        else if (n.classList && n.classList.contains('pop')) { pend = n; glue = false; }
        else if (n.nodeType === 1) add(esc(n.textContent), n.tagName === 'EM');
      });
      seg.textContent = '';
      units.forEach(u => { const s = document.createElement('span'); s.className = 'fr-p' + (u.em ? ' fr-em' : ''); if (u.pop) { u.pop.innerHTML = POPS[u.pop.dataset.pop] || ''; u.pop.setAttribute('aria-hidden', 'true'); s.appendChild(u.pop); s._pop = u.pop; } s.insertAdjacentHTML('beforeend', u.h); seg.appendChild(s); });
    });
  });
  const eti = $('.fr-eti', sez), num = $('.fr-n', sez), dots = $$('.fr-dots i', sez);
  // v4.19 · con "riduci movimento" nel sistema le tre frasi scorrono lo stesso, ma senza movimento: solo dissolvenze, icone ferme
  const CALMO = RIDOTTO;
  const fermo = p => { if (p.classList.contains('on')) return; p.classList.add('on'); FILMS[p.dataset.pop].forEach(([c]) => p.classList.add(c)); requestAnimationFrame(() => P3.still(p)); };
  sez.classList.add('fr-vivo'); if (CALMO) sez.classList.add('fr-calmo');
  const palco = $('.fr-palco', sez);
  const R = 2.4, ENTER = .2, PRE = .14, LIT0 = .2, LIT1 = .74, EXIT = .86;
  const smooth = x => { x = lim(x); return x * x * (3 - 2 * x); };
  const easeOut = x => 1 - Math.pow(1 - lim(x), 3);
  const easeIn = x => Math.pow(lim(x), 2.2);
  let t, segs, words;
  const collect = () => {
    t = $$('.fr-t', sez).find(visible) || $('.fr-t', sez);
    segs = $$('.fr-seg', t); words = segs.map(g => $$('.fr-p', g));
    $$('.fr-t', sez).forEach(x => { if (x !== t) $$('.pop', x).forEach(leave); });
  };
  let raf = 0, last = '';
  const disegna = () => {
    raf = 0; if (sez.closest('.pagina').hidden) return;
    const r = palco.getBoundingClientRect(), vh = innerHeight;
    const pPal = Math.round(lim(-r.top / Math.max(1, r.height - vh)) * 400) / 400;
    const pIn = Math.round(lim(1 - r.top / vh) * 200) / 200;
    const key = pPal + '|' + pIn; if (key === last) return; last = key;
    const N = segs.length, seg = 1 / N; let cur = 0, best = -1;
    segs.forEach((g, di) => {
      const u = (pPal - di * seg) / seg; let op = 0, sc = 1 / R, f = 0, bl = 0;
      if (di === 0 && pIn < 1) { const k = lim(pIn / .85); op = smooth(k * 1.25); sc = .3 + .7 * easeOut(k); bl = (1 - k) * 10; f = lim((k - .1) / .9); }
      else if (di > 0 && u < -PRE) { op = 0; sc = 1 / R; f = 0; }
      else if (di > 0 && u < ENTER) { const k = (u + PRE) / (ENTER + PRE); op = smooth(k); sc = 1 / R + (1 - 1 / R) * easeOut(k); f = 0; }
      else if (u <= EXIT || di === N - 1) { op = 1; sc = 1; f = di === 0 ? 1 : lim((Math.max(0, u) - LIT0) / (LIT1 - LIT0)); }
      else if (u < 1) { const k = (u - EXIT) / (1 - EXIT); op = 1 - smooth(k); sc = 1 + (R - 1) * easeIn(k); f = 1; }
      else { op = 0; sc = R; f = 1; }
      if (op > best) { best = op; cur = di; }
      if (CALMO) { sc = 1; bl = 0; }
      g.style.opacity = op.toFixed(3); g.style.transform = `scale(${sc.toFixed(4)})`; g.style.filter = bl > .05 ? `blur(${bl.toFixed(1)}px)` : '';
      g.classList.toggle('on', op > .5); g.setAttribute('aria-hidden', op < .05 ? 'true' : 'false');
      const n = words[di].length;
      words[di].forEach((w, i) => {
        const lit = lim(f * (n + 1) - i);
        w.style.opacity = (.1 + .9 * lit).toFixed(3); w.style.transform = lit >= 1 || CALMO ? 'none' : `translateY(${((1 - lit) * .6).toFixed(3)}em)`;
        if (w._pop) { if (lit >= 1 && op > .05) (CALMO ? fermo : arrive)(w._pop); else if (lit < .5 || op < .05) leave(w._pop); }
      });
    });
    if (eti) { eti.classList.toggle('on', pPal > 0 || pIn > .15); eti.style.setProperty('--fr-top', (40 + 56 * pIn).toFixed(1)); }
    if (num) num.textContent = (cur + 1) + ' / ' + segs.length;
    dots.forEach((d, i) => d.classList.toggle('on', i === cur));
  };
  const misura = () => { if (!raf) raf = requestAnimationFrame(disegna); };
  collect();
  addEventListener('scroll', misura, { passive: true }); addEventListener('resize', () => { last = ''; misura(); }); addEventListener('lyra-lang', () => { collect(); last = ''; misura(); }); misura();
  sez._misura = () => { last = ''; misura(); };
  if (!CALMO) $$('.pop', sez).forEach(p => p.addEventListener('click', () => { if (!p.classList.contains('on')) return; stop(p); setTimeout(() => play(p), 380); }));
}

/* ============================================================ i divisori e i nomi che salgono dalle maschere ============================================================ */
const masks = t => { if (!t || t.querySelector('.w')) return; const langs = $$(':scope > .l-it, :scope > .l-en', t); if (langs.length) { langs.forEach(masks); return; } let i = 0; t.innerHTML = t.textContent.trim().split(/\s+/).map(w => `<span class="w"><span style="--i:${i++}">${w}</span></span>`).join(' '); };
function engines() {
  const engs = $$('.eng'); if (!engs.length) return;
  engs.forEach(e => $$('.eng-t', e).forEach(masks));
  const inn = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('on'); }), { rootMargin: '-30% 0px -30% 0px' });
  const out = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) e.target.classList.remove('on'); }), { rootMargin: '30% 0px 30% 0px' });
  engs.forEach(e => { inn.observe(e); out.observe(e); });
  if (RIDOTTO) { engs.forEach(e => e.classList.add('on')); return; }
  let raf = 0;
  const lean = () => { raf = 0; engs.forEach(e => { if (!visible(e)) return; const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; e.style.setProperty('--p', lim(-r.top / (r.height - innerHeight)).toFixed(3)); }); };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(lean); }, { passive: true }); lean();
  // le voci della barra: il pubblico in cui sta la pagina è acceso
  const blocks = $$('.eng-group'), voci = $$('.barra nav a[data-voce]');
  let inn2 = -2;
  const place = () => { if (!visible(blocks[0])) { if (inn2 !== -1) { inn2 = -1; voci.forEach(a => a.classList.remove('on')); } return; } let inside = -1; blocks.forEach((b, i) => { const r = b.getBoundingClientRect(); if (r.top < innerHeight * .5 && r.bottom > innerHeight * .5) inside = i; }); if (inside !== inn2) { inn2 = inside; voci.forEach(a => a.classList.toggle('on', inside > -1 && a.getAttribute('href') === '#' + blocks[inside].dataset.engine)); } };
  addEventListener('scroll', place, { passive: true }); addEventListener('resize', place); place();
}

/* ============================================================ il contenitore bianco che cresce (scroll-open, scrubbed) ============================================================ */
function grow(track, box) {
  if (RIDOTTO) return;
  let t = 0, z = 0, raf = 0, last = 0;
  const scrubbed = () => { const u = lim((innerHeight * 1 - track.getBoundingClientRect().top) / (innerHeight * 1)); return u * u * (3 - 2 * u); };
  const draw = now => {
    const dt = last ? Math.min(.034, (now - last) / 1000) : .016; last = now;
    const r = track.getBoundingClientRect(), p = lim(-r.top / Math.max(1, r.height - innerHeight));
    const want = scrubbed(); t += (want - t) * Math.min(1, dt * 14); if (Math.abs(want - t) < 1e-4) t = want;
    const zGoal = .05 * p; z += (zGoal - z) * Math.min(1, dt * 9);
    box.style.setProperty('--g', t.toFixed(4)); box.style.setProperty('--z', z.toFixed(4)); tema();
    const moving = t !== want || Math.abs(zGoal - z) > 1e-4;
    raf = moving ? requestAnimationFrame(draw) : 0; if (!moving) last = 0;
  };
  const ask = () => { if (!visible(track)) return; if (!raf) raf = requestAnimationFrame(draw); };
  addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); ask();
}

/* ============================================================ la fila di card ============================================================ */
function rails() {
  $$('.cr').forEach(sec => {
    const rail = $('.cr-rail', sec), prev = $('.cr-prev', sec), next = $('.cr-next', sec);
    const step = () => { const a = $('.cr-item', sec), b = a && a.nextElementSibling; return b ? b.offsetLeft - a.offsetLeft : rail.clientWidth * .8; };
    const ends = () => { if (!prev) return; prev.disabled = rail.scrollLeft < 4; next.disabled = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 4; };
    prev && prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: RIDOTTO ? 'auto' : 'smooth' }));
    next && next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: RIDOTTO ? 'auto' : 'smooth' }));
    rail.addEventListener('scroll', ends, { passive: true }); addEventListener('resize', ends); ends();
    if (!matchMedia('(hover: hover)').matches) return;
    const states = $$('.cr-card', sec).map(a => {
      const pv = $('.cr-pv', a), vid = $('.cr-vid', a); const s = { a, pv, vid, x: 0, y: 0, tx: 0, ty: 0 };
      const aim = e => { const r = a.getBoundingClientRect(); s.tx = e ? (e.clientX - r.left) / r.width - .5 : 0; s.ty = e ? (e.clientY - r.top) / r.height - .5 : 0; };
      const enter = e => { aim(e && e.clientX != null ? e : null); a.classList.add('pv-on'); go(); };
      const leave = () => { s.tx = s.ty = 0; a.classList.remove('pv-on'); go(); };
      a.addEventListener('pointerenter', enter); a.addEventListener('pointermove', e => { aim(e); go(); }); a.addEventListener('pointerleave', leave);
      a.addEventListener('focus', () => enter(null)); a.addEventListener('blur', leave);
      return s;
    });
    let raf = 0, last = 0;
    const frame = now => { raf = 0; const dt = Math.min(.1, last ? (now - last) / 1000 : .016); last = now; let moving = false;
      states.forEach(s => { const r = s.a.getBoundingClientRect(), w = s.pv.offsetWidth, h = s.pv.offsetHeight; const lm = (v, m) => Math.max(-m, Math.min(m, v)); const tx = lm(s.tx, .5 - w * .5 / r.width) * .7, ty = lm(s.ty, .5 - h * .5 / r.height) * .7; const k = 1 - Math.exp(-8 * dt); s.x += (tx - s.x) * k; s.y += (ty - s.y) * k; if (Math.abs(tx - s.x) > .0005 || Math.abs(ty - s.y) > .0005) moving = true; s.pv.style.transform = `translate3d(${s.x * r.width - w / 2}px,${s.y * r.height - h / 2}px,0)`; const sv = s.vid.firstElementChild; if (sv) sv.style.transform = `scale(1.1) translate3d(${-s.x * 9}%,0,0)`; });
      if (moving) raf = requestAnimationFrame(frame); else last = 0; };
    const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
  });
  // l'anteprima che si apre al passaggio: un piccolo film di numeri, disegnato
  $$('.cr-vid[data-film]').forEach((v, i) => {
    const k = v.dataset.film, ser = SERIES[k] || SERIES.up, W = 240, H = 140;
    const p = ser.map((y, j) => `${j ? 'L' : 'M'}${(14 + j / (ser.length - 1) * (W - 28)).toFixed(1)} ${(H - 18 - y * (H - 40)).toFixed(1)}`).join(' ');
    const lab = (v.dataset.label || '').split('|'), le = (v.dataset.labelEn || v.dataset.label || '').split('|');
    const T = (a, b) => a === b ? a : `<tspan class="l-it">${a}</tspan><tspan class="l-en">${b}</tspan>`;
    v.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><rect width="${W}" height="${H}" fill="#0b0b0b"/><g stroke="#fff" stroke-opacity=".1"><line x1="14" y1="${H - 18}" x2="${W - 14}" y2="${H - 18}"/><line x1="14" y1="${(H - 18) / 2}" x2="${W - 14}" y2="${(H - 18) / 2}"/></g><path d="${p}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;animation:cr-draw 2.4s cubic-bezier(.55,0,.35,1) .2s forwards"/><text x="14" y="20" fill="#fff" font-family="Inter,sans-serif" font-size="8.5" font-weight="500" letter-spacing=".8" fill-opacity=".8">${T(lab[0] || '', le[0] || '')}</text><text x="${W - 14}" y="20" fill="#fff" font-family="Inter,sans-serif" font-size="8.5" font-weight="500" text-anchor="end" fill-opacity=".55">${T(lab[1] || '', le[1] || '')}</text></svg>`;
  });
}

/* ============================================================ il volano ============================================================ */
function wheel() {
  $$('[data-wheel]').forEach(w => {
    const bi = x => x.includes('//') ? `<span class="l-it">${x.split('//')[0]}</span><span class="l-en">${x.split('//')[1]}</span>` : x;
    const nodes = w.dataset.wheel.split('|').map(bi), hub = bi(w.dataset.hub || ''), N = nodes.length, R = 43;
    const ang = i => (i / N) * Math.PI * 2 - Math.PI / 2;
    const arc = i => { const a0 = ang(i) + .34, a1 = ang(i + 1) - .34; const p0 = [Math.cos(a0) * R, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, Math.sin(a1) * R]; const t = [-Math.sin(a1), Math.cos(a1)], n = [Math.cos(a1), Math.sin(a1)]; const h = `M${p1[0] + t[0] * 2.2} ${p1[1] + t[1] * 2.2} L${p1[0] - t[0] * 1.2 + n[0] * 2} ${p1[1] - t[1] * 1.2 + n[1] * 2} L${p1[0] - t[0] * 1.2 - n[0] * 2} ${p1[1] - t[1] * 1.2 - n[1] * 2}Z`; return `<g class="fwl-arc on"><path d="M${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A${R} ${R} 0 0 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}"/><path class="head" d="${h}"/></g>`; };
    const icons = ['<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>', '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.6c2.3.2 3.9 1.9 4.5 4.6"/>', '<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>', '<path d="M12 3 4 6v6c0 4.4 3.4 8 8 9 4.6-1 8-4.6 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>', '<path d="M3 9 12 4l9 5M5 9v9m4.7-9v9m4.6-9v9M19 9v9M3 20h18"/>', '<circle cx="12" cy="12" r="8"/><path d="M14.8 9.2c-.6-.8-1.6-1.2-2.8-1.2-1.7 0-2.8.9-2.8 2.1 0 2.9 5.8 1.4 5.8 4.2 0 1.3-1.2 2.2-3 2.2-1.3 0-2.4-.5-3-1.4M12 6.5v11"/>', '<path d="M12 5v14M5 12h14"/>'];
    w.innerHTML = `<div class="fwl lit"><div class="fwl-rl"><svg viewBox="-50 -50 100 100" aria-hidden="true"><circle class="fwl-base" r="${R}"/>${nodes.map((_, i) => arc(i)).join('')}</svg></div><div class="fwh-hub"><i class="fwh-lit"></i><i class="fwh-pulse"></i><span class="fwl-hl"><svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 4.4 3.4 8 8 9 4.6-1 8-4.6 8-9V6z"/></svg><b>${hub}</b></span></div>${nodes.map((n, i) => `<div class="fwl-n on" style="transform:translate(${(Math.cos(ang(i)) * R).toFixed(2)}cqw,${(Math.sin(ang(i)) * R).toFixed(2)}cqw)"><span class="fwl-p"><svg viewBox="0 0 24 24">${icons[i % icons.length]}</svg><b>${n}</b></span></div>`).join('')}</div>`;
    const fwl = $('.fwl', w), ns = $$('.fwl-n', w), rl = $('.fwl-rl', w); let i = -1, a = 0, last = 0;
    if (RIDOTTO) return;
    const turn = () => { if (!visible(w)) { i = -1; ns.forEach(n => n.classList.remove('now')); return; } i = (i + 1) % N; ns.forEach((n, j) => n.classList.toggle('now', j === i)); fwl.classList.remove('push'); void fwl.offsetWidth; fwl.classList.add('push'); };
    setInterval(turn, 1500);
    const spin = now => { const dt = last ? (now - last) / 1000 : 0; last = now; if (visible(w)) { a = (a + dt * 4) % 360; rl.style.transform = `rotate(${a.toFixed(2)}deg)`; } requestAnimationFrame(spin); };
    requestAnimationFrame(spin);
  });
}

/* ============================================================ il muro di parole: scorre con la pagina ============================================================ */
function wall() {
  $$('.jn-wall').forEach(wall => {
    const rows = $$('.jn-row', wall); if (RIDOTTO) return;
    rows.forEach(r => { r.innerHTML += r.innerHTML; });
    const tick = () => { if (!visible(wall)) return; const rect = wall.getBoundingClientRect(); const p = (innerHeight - rect.top) / (innerHeight + rect.height); rows.forEach((r, i) => { const half = r.scrollWidth / 2 || 1; const dir = i % 2 ? 1 : -1; const x = (p * 600 + performance.now() * .012) * dir * (1 - i * .18); r.style.transform = `translate3d(${(((x % half) + half) % half) - half}px,0,0)`; }); };
    addEventListener('scroll', tick, { passive: true }); const loop = () => { tick(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  });
}

/* ============================================================ i capitoli delle pagine interne ============================================================ */
function chapters() {
  const add = (n, i = 0) => { if (!n || n.classList.contains('rv')) return; n.classList.add('rv'); if (i) n.style.animationDelay = (i * .09).toFixed(2) + 's'; rv(n); };
  $$('.pagina').forEach(pg => {
    const chs = $$('.ch', pg), pad = n => String(n).padStart(2, '0');
    chs.forEach((ch, k) => {
      const h = $('.ch-head', ch); if (!h) return;
      const eb = $('.ch-eyebrow', h), t = $('.ch-title', h);
      if (eb && !eb.querySelector('.ch-rule')) { const n = chs.length > 1 ? `<span class="ch-n">${pad(k + 1)} / ${pad(chs.length)}</span>` : ''; eb.innerHTML = `<i class="ch-rule" aria-hidden="true"></i>${n}<span class="ch-g">${eb.innerHTML}</span>`; add($('.ch-rule', eb)); if (n) add($('.ch-n', eb), 1); add($('.ch-g', eb), 1); }
      if (t) { masks(t); add(t); }
      add($('.ch-hook', h), 2); add($('.ch-lede', h), 3);
      $$('.ch-facts li', ch).forEach((li, i) => add(li, i % 4));
    });
  });
}

/* ============================================================ lingua, segnaposto, menu, moduli, prezzi ============================================================ */
function setLang(l) {
  html.dataset.lang = l; html.lang = l; void 0 /* v4.17: solo italiano, la lingua non si salva piu' */;
  $$('[data-setlang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setlang === l)));
  $$('*').forEach(el => { for (const at of el.attributes) if (at.name.startsWith('data-i18n-')) { const [it, en] = at.value.split('|'); el.setAttribute(at.name.slice(10), l === 'en' ? en : it); } });
  const pg = onScreenPage(); if (pg) document.title = (l === 'en' ? pg.dataset.titleEn : pg.dataset.titleIt) || 'Lyra Capital';
  dispatchEvent(new Event('lyra-lang'));
}
['load', 'loader-done', 'hashchange', 'resize'].forEach(ev => addEventListener(ev, () => { setTimeout(tema, 160); setTimeout(tema, 900); }));
function setTema(t) {
  if (t !== 'chiaro' && t !== 'scuro') t = 'scuro';
  html.dataset.tema = t; store.s('lyra-tema', t);
  $$('[data-gt]').forEach(x => x.classList.toggle('giorno', t === 'chiaro'));
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === 'chiaro' ? '#ffffff' : '#000000';
  $$('[data-tema-toggle]').forEach(b => b.setAttribute('aria-pressed', String(t === 'chiaro')));
  tema(); dispatchEvent(new Event('lyra-tema'));
}
function placeholders() {
  $$('[data-ph]').forEach(a => { const url = LYRA_CONFIG[a.dataset.ph]; if (!url && (a.dataset.ph === 'download' || a.dataset.ph === 'demo')) { a.setAttribute('href', '#beta'); a.setAttribute('data-beta-open', ''); return; } if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; } else { a.classList.add('da-fare'); a.setAttribute('href', '#'); a.addEventListener('click', e => e.preventDefault()); if (a.classList.contains('btn') && !a.querySelector('small')) a.insertAdjacentHTML('beforeend', '<small><span class="l-it">da completare</span><span class="l-en">to complete</span></small>'); } });
  $$('[data-phk]').forEach(s => { const v = LYRA_CONFIG[s.dataset.phk]; if (v) { s.textContent = v; s.classList.remove('ph'); } });
}
function menu() {
  const b = $('.burger'), m = $('.menu'); if (!b || !m) return;
  const set = o => { m.classList.toggle('open', o); const br = $('.barra'); if (br) br.classList.toggle('menu-aperto', o); b.setAttribute('aria-expanded', String(o)); document.body.style.overflow = o ? 'hidden' : ''; };
  b.addEventListener('click', () => set(!m.classList.contains('open')));
  $$('a', m).forEach(a => a.addEventListener('click', () => set(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && m.classList.contains('open')) { set(false); b.focus(); } });
}
function misc() {
  $$('[data-bill]').forEach(b => b.addEventListener('click', () => { const w = document.getElementById(b.dataset.target); if (!w) return; w.classList.toggle('annuale', b.dataset.bill === 'y'); $$(`[data-target="${b.dataset.target}"]`).forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
  $$('form[data-preview]').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); const ok = $('.form-ok', f); if (ok) ok.hidden = false; }));
  $$('[data-setlang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.setlang)));
  $$('[data-gt]').forEach(x => x.classList.toggle('giorno', html.dataset.tema === 'chiaro'));
  $$('[data-tema-toggle]').forEach(b => b.addEventListener('click', () => setTema(html.dataset.tema === 'chiaro' ? 'scuro' : 'chiaro')));
  $$('[data-tema-toggle]').forEach(b => b.setAttribute('aria-pressed', String(html.dataset.tema === 'chiaro')));
}

/* ============================================================ il router: una pagina per percorso, l'ancora dopo il punto ============================================================ */
const pages = $$('.pagina');
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  let pg = pages.find(p => p.dataset.route === h), target = null;
  if (!pg && h) { const el = document.getElementById(h); if (el) { pg = pageOf(el); target = el; } }
  if (!pg) pg = pages.find(p => p.dataset.route === 'home');
  const cur = onScreenPage(); const changed = cur !== pg;
  pages.forEach(p => { p.hidden = p !== pg; });
  document.title = (html.dataset.lang === 'en' ? pg.dataset.titleEn : pg.dataset.titleIt) || 'Lyra Capital';
  $$('.barra nav a, .menu a, .piede-voci a').forEach(a => { const hr = (a.getAttribute('href') || '').slice(1); if (hr === pg.dataset.route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (changed) { pg.classList.remove('pagina'); void pg.offsetWidth; pg.classList.add('pagina'); }
  if (target) setTimeout(() => target.scrollIntoView({ behavior: changed || RIDOTTO ? 'auto' : 'smooth', block: 'start' }), changed ? 40 : 0);
  else if (changed) scrollTo({ top: 0, behavior: 'auto' });
  const mz = $('[data-mosaic]', pg); if (mz && mz._resume) setTimeout(() => { mz._resume(); mz._fit && mz._fit(); }, 100);
  $$('.frase', pg).forEach(f => f._misura && f._misura());
  [$('.rh', pg), $('.st', pg)].forEach(x => x && x._m && setTimeout(x._m, 30));
  piena(); tema();
}


/* ============================================================ HOME v3: hero a ventaglio (Revolut) ============================================================ */
const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const span = (p, a, b) => lim((p - a) / (b - a));
function heroFan() {
  const sec = $('.rh'); if (!sec) return;
  const track = $('.rh-track', sec), stage = $('.rh-stage', sec), bg = $('.rh-bg', sec), shade = $('.rh-shade', sec), copy = $('.rh-copy', sec), after = $('.rh-after', sec), mid = $('.rh-mid', sec), L = $('.rh-l', sec), Rr = $('.rh-r', sec);
  let raf = 0, cur = 0, goal = 0;
  const draw = () => {
    raf = 0; cur += (goal - cur) * .2; if (Math.abs(goal - cur) < .0005) cur = goal;
    const vw = stage.clientWidth, vh = stage.clientHeight, small = vw < 700;
    if (small !== stage.classList.contains('small')) stage.classList.toggle('small', small);
    // le card stanno sotto il testo che compare (rh-after), mai sotto la barra: lo spazio si misura, non si indovina
    const aBot = after.offsetTop + after.offsetHeight, gapT = small ? 26 : 44, padB = small ? 30 : 48;
    const avail = Math.max(160, vh - aBot - gapT - padB);
    let cw = small ? Math.min(vw * .6, 260) : Math.min(vw * (vw < 900 ? .3 : .22), 330), ch = cw * 1.36;
    if (ch > avail) { ch = avail; cw = ch / 1.36; }
    const top = aBot + gapT + Math.max(0, avail - ch) * (vw < 900 ? .32 : .5);
    const e = ease(span(cur, .05, .7));
    const t = top * e, b = Math.max(0, vh - top - ch) * e, l = (vw - cw) / 2 * e, rad = 30 * e;
    bg.style.clipPath = `inset(${t.toFixed(1)}px ${l.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round ${rad.toFixed(1)}px)`;
    shade.style.opacity = (1 - e * .9).toFixed(3);
    const day = e > .55; if (day !== stage.classList.contains('giorno')) { stage.classList.toggle('giorno', day); tema(); }
    const c = span(cur, 0, .3); copy.style.opacity = (1 - c).toFixed(3); copy.style.transform = `translateY(${(-c * 60).toFixed(1)}px)`; copy.style.visibility = c >= 1 ? 'hidden' : '';
    const a = ease(span(cur, .5, .85)); after.style.opacity = a.toFixed(3); after.style.transform = `translateY(${((1 - a) * 30).toFixed(1)}px)`;
    const m = span(cur, .62, .9); stage.style.setProperty('--cw', cw + 'px'); Object.assign(mid.style, { width: cw + 'px', height: ch + 'px', transform: `translate(${(vw - cw) / 2}px,${top}px)`, opacity: m.toFixed(3) });
    const f = ease(span(cur, .4, .95));
    // su telefono: ventaglio vero, le laterali dietro la centrale e tutte dentro lo schermo; su schermi larghi: affiancate
    const sw = cw * (small ? .78 : .9), sh = ch * (small ? .78 : .9), gap = 22;
    const d = small ? Math.max(cw / 2 - sw / 2 + 30, vw / 2 - 10 - sw / 2) : cw / 2 + gap + sw / 2;
    [[L, -1], [Rr, 1]].forEach(([el, k]) => {
      const fx = vw / 2 + k * d - sw / 2, fy = small ? top + (ch - sh) / 2 + 18 : top + (ch - sh) + 8;
      const x = fx + k * (1 - f) * vw * .45, rot = k * (small ? 7 + (1 - f) * 10 : (1 - f) * 14);
      el.style.setProperty('--cw', sw + 'px'); Object.assign(el.style, { width: sw + 'px', height: sh + 'px', transform: `translate(${x.toFixed(1)}px,${(fy + (1 - f) * 60).toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`, opacity: f.toFixed(3) });
    });
    if (cur !== goal) raf = requestAnimationFrame(draw);
  };
  const measure = () => { if (!visible(track)) return; const r = track.getBoundingClientRect(); goal = lim(-r.top / Math.max(1, r.height - innerHeight)); if (!raf) raf = requestAnimationFrame(draw); };
  addEventListener('scroll', measure, { passive: true }); addEventListener('resize', () => { cur = goal - .001; measure(); }); measure(); cur = goal; draw();
  sec._m = measure;
}

/* ============================================================ HOME v3: la storia col desktop (Satispay) ============================================================ */
// v4.15: i passi non si alternano piu' tra scuro e chiaro, seguono il tema del sito
const STEP_BG = () => { const c = document.documentElement.dataset.tema === 'chiaro' ? ['#ebe8e1', 1] : ['#0d1426', 0]; return [c, c, c, c, c]; };
const mix = (a, b, u) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * u)).join(',')})`; };
function story() {
  const sec = $('.st'); if (!sec) return;
  const track = $('.st-track', sec), stage = $('.st-stage', sec), mon = $('.mon', sec), n = $('.st-n b', sec);
  const ts = $$('.st-stack .st-t', sec), panes = $$('.pane', sec), navs = $$('.app-nav', sec), bars = $$('.st-prog i', sec), N = panes.length;
  let raf = 0, last = -2, wasLight = null;
  const draw = () => {
    raf = 0; if (!visible(track)) return;
    const r = track.getBoundingClientRect(), vh = innerHeight, s = -r.top, span = Math.max(1, r.height - vh);
    // il monitor entra mentre la sezione sale; poi resta fermo
    const ent = ease(lim(1 - r.top / vh));
    mon.style.transform = RIDOTTO ? '' : `translateY(${((1 - ent) * vh * .18).toFixed(1)}px)`;
    const k = lim(s / span) * N * .9999, idx = Math.min(N - 1, Math.floor(k)), fr = k - idx;
    bars.forEach((b, i) => b.style.setProperty('--f', i < idx ? 1 : i === idx ? fr.toFixed(3) : 0));
    const cu = idx >= N - 1 ? 0 : lim((fr - .78) / .22);
    const SB = STEP_BG(), from = SB[idx], to = SB[Math.min(N - 1, idx + 1)];
    sec.style.setProperty('--sbg', mix(from[0], to[0], ease(cu))); // sul <section>, cosi' anche lo spazio sotto la scena (quando la barra del browser si nasconde) ha lo stesso colore
    const light = (cu < .5 ? from[1] : to[1]) === 1;
    if (light !== wasLight) { stage.classList.toggle('chiaro', light); stage.classList.toggle('giorno', light); wasLight = light; tema(); }
    if (idx !== last) {
      ts.forEach((el, i) => { el.classList.toggle('on', i === idx); el.classList.toggle('past', i < idx); });
      panes.forEach((el, i) => el.classList.toggle('on', i === idx)); navs.forEach((el, i) => el.classList.toggle('on', i === idx));
      if (n) n.textContent = String(idx + 1).padStart(2, '0'); last = idx;
    }
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(draw); };
  if (window.MutationObserver) new MutationObserver(() => { wasLight = null; ask(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
  addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); draw();
  sec._m = ask;
}

/* i grafici dentro lo schermo: disegnati in scala da serie fisse, dichiarate dati di esempio */
function appCharts() {
  const line = (arr, W, H, pad, mn, mx) => { mn = mn ?? Math.min(...arr); mx = mx ?? Math.max(...arr); const rg = (mx - mn) || 1; return arr.map((v, i) => `${i ? 'L' : 'M'}${(pad + i / (arr.length - 1) * (W - pad * 2)).toFixed(1)} ${(H - pad - (v - mn) / rg * (H - pad * 2)).toFixed(1)}`).join(' '); };
  $$('[data-chart]').forEach(el => {
    const k = el.dataset.chart, W = 400, H = 160;
    let svg = '';
    if (k === 'wf') {
      const a = walk(120, 77, .32, 1.6); const mn = Math.min(...a), mx = Math.max(...a);
      let wins = ''; for (let i = 0; i < 6; i++) { const x0 = 10 + (i * 15 + 30) / 120 * (W - 20), w = 15 / 120 * (W - 20); wins += `<rect x="${x0.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${H}" fill="#7fb0ff" opacity="${i % 2 ? .07 : .12}"/>`; }
      const p = line(a, W, H, 10, mn, mx);
      svg = `${wins}<path d="${p} L${W - 10} ${H - 10} L10 ${H - 10}Z" fill="#7fb0ff" opacity=".1"/><path d="${p}" fill="none" stroke="#7fb0ff" stroke-width="2" vector-effect="non-scaling-stroke"/><line x1="${10 + 30 / 120 * (W - 20)}" x2="${10 + 30 / 120 * (W - 20)}" y1="0" y2="${H}" stroke="#fff" stroke-opacity=".35" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`;
      el.insertAdjacentHTML('beforeend', `<span class="lbl" style="left:.8em;top:.6em">IN-SAMPLE</span><span class="lbl" style="right:.8em;top:.6em;color:#7fb0ff">6 × OOS</span>`);
    } else if (k === 'live') {
      const a = walk(80, 31, .25, 1.1), p = line(a, W, H, 10);
      svg = `<path d="${p} L${W - 10} ${H - 10} L10 ${H - 10}Z" fill="#4fd1a1" opacity=".12"/><path d="${p}" fill="none" stroke="#4fd1a1" stroke-width="2" vector-effect="non-scaling-stroke"/><line x1="${W * .62}" x2="${W * .62}" y1="0" y2="${H}" stroke="#fff" stroke-opacity=".3" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`;
      el.insertAdjacentHTML('beforeend', `<span class="lbl" style="left:.8em;top:.6em">PAPER</span><span class="lbl" style="left:63%;top:.6em;color:#4fd1a1">LIVE</span>`);
    } else {
      const a = walk(60, 13, .3, .8), p = line(a, W, H, 10);
      svg = `<path d="${p}" fill="none" stroke="#f2b45a" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    }
    el.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${svg}</svg>`);
  });
  $$('[data-heat]').forEach(el => { const R = rng(9); let h = ''; const m = []; for (let i = 0; i < 6; i++) { m[i] = []; for (let j = 0; j < 6; j++) m[i][j] = i === j ? 1 : j < i ? m[j][i] : R() * .7; } for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) h += `<i style="opacity:${(.12 + m[i][j] * .88).toFixed(2)}"></i>`; el.innerHTML = h; });
}

/* ============================================================ HOME v3: le sezioni Revolut ============================================================ */
function rises() {
  const secs = $$('[data-rise]'); if (!secs.length) return;
  let raf = 0;
  const draw = () => { raf = 0; secs.forEach(s => { if (!visible(s)) return; const r = s.getBoundingClientRect(), vh = innerHeight; const q = RIDOTTO ? 1 : ease(lim((vh - r.top) / (vh * .95))); s.style.setProperty('--q', q.toFixed(4)); }); };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(draw); }, { passive: true }); addEventListener('resize', draw); draw();
}
function tabs() {
  $$('.rs-tabs').forEach(sec => {
    const bs = $$('[role="tab"]', sec), objs = $$('.tob', sec), pns = $$('.tpn', sec);
    const go = i => { bs.forEach((b, j) => b.setAttribute('aria-selected', String(j === i))); objs.forEach((o, j) => o.classList.toggle('on', j === i)); pns.forEach((p, j) => { p.hidden = j !== i; p.classList.toggle('on', j === i); }); };
    bs.forEach((b, i) => { b.addEventListener('click', () => go(i)); b.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = (i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length; bs[n].focus(); go(n); } }); });
  });
}

/* ============================================================ avvio ============================================================ */
loader();
addEventListener('scroll', () => { piena(); tema(); requestAnimationFrame(tema); }, { passive: true }); addEventListener('resize', tema);
// il mosaico aspetta la tenda: appena si alza (lifting), le tessere entrano
new MutationObserver(() => { if (html.classList.contains('lifting')) dispatchEvent(new Event('loader-lifting')); }).observe(html, { attributes: true, attributeFilter: ['class'] });
placeholders(); paintPolys(); mosaic();
$$('.frase').forEach(frase); engines();
(() => {
  const fr = document.querySelector('#frase'); if (!fr) return;
  const lines = t => [...t.querySelectorAll('.fr-seg')].map(s => { const lh = parseFloat(getComputedStyle(t).fontSize) * .5; let n = 0, last = -1e9; [...s.querySelectorAll('.fr-p')].map(x => x.offsetTop + x.offsetHeight / 2).sort((a, b) => a - b).forEach(v => { if (v - last > lh) { n++; last = v; } }); return n; });
  const fit = () => {
    fr.style.removeProperty('--fr-fs');
    if (innerWidth >= 600) { if (fr._misura) fr._misura(); return; }
    const t = [...fr.querySelectorAll('.fr-t')].find(x => x.offsetParent); if (!t) return;
    let fs = parseFloat(getComputedStyle(t).fontSize);
    for (let i = 0; i < 8 && Math.max(...lines(t)) > 3; i++) { fs *= .96; fr.style.setProperty('--fr-fs', fs.toFixed(2) + 'px'); }
    if (fr._misura) fr._misura();
  };
  let ft = 0; const later = () => { clearTimeout(ft); ft = setTimeout(fit, 120); };
  addEventListener('resize', later); addEventListener('lyra-lang', later);
  if (document.fonts) document.fonts.ready.then(fit); fit();
})();
$$('.cr-track').forEach(tr => grow(tr, $('.cr', tr)));
rails(); wheel(); wall(); chapters(); menu(); misc();
appCharts(); heroFan(); story(); rises(); tabs();
$$('canvas[data-glass]').forEach(glass);
$$('.rv').forEach(rv);
setLang('it' === 'en' ? 'en' : 'it');
addEventListener('hashchange', route); route();
if (!html.classList.contains('loading')) dispatchEvent(new Event('loader-done'));
})();

/* v3.7 · il carosello dei principi: le frecce scorrono di una card */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pr]'); if (!b) return;
  const rail = b.closest('.pr') && b.closest('.pr').querySelector('.pr-rail'); if (!rail) return;
  const c = rail.querySelector('.pr-c'); const step = c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 16) : rail.clientWidth * .8;
  rail.scrollBy({ left: step * +b.dataset.pr, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});

/* v3.7 · piani: frecce del carosello e pannello dei dettagli */
(() => {
  const sec = document.querySelector('.pn'); if (!sec) return;
  const rail = sec.querySelector('.pn-rail');
  const lento = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const apri = id => {
    sec.querySelectorAll('.pd').forEach(p => { p.hidden = p.dataset.pd !== id; });
    sec.querySelectorAll('.pn-c').forEach(c => c.classList.toggle('on', c.dataset.piano === id));
    sec.querySelectorAll('[data-pn-apri]').forEach(b => b.setAttribute('aria-expanded', String(b.dataset.pnApri === id)));
    const p = id && sec.querySelector(`.pd[data-pd="${id}"]`);
    if (p) setTimeout(() => p.scrollIntoView({ behavior: lento(), block: 'nearest' }), 60);
  };
  sec.addEventListener('click', e => {
    const f = e.target.closest('[data-pn]');
    if (f) { const c = rail.querySelector('.pn-c'); rail.scrollBy({ left: (c ? c.getBoundingClientRect().width + 16 : rail.clientWidth * .8) * +f.dataset.pn, behavior: lento() }); return; }
    if (e.target.closest('[data-pn-chiudi]')) { apri(null); return; }
    const b = e.target.closest('[data-pn-apri]');
    if (b) { apri(b.getAttribute('aria-expanded') === 'true' ? null : b.dataset.pnApri); return; }
    if (e.target.closest('a,button')) return;
    const c = e.target.closest('.pn-c');
    if (c) apri(c.classList.contains('on') ? null : c.dataset.piano);
  });
  sec.addEventListener('keydown', e => { if (e.key === 'Escape') apri(null); });
  // v3.8 · il modulo demo del Desk vive nel pannello del piano: #desk-demo lo apre e ci porta lì
  const demo = () => { if (location.hash !== '#desk-demo') return; apri('desk'); setTimeout(() => { const f = document.getElementById('desk-demo'); if (f) f.scrollIntoView({ behavior: lento(), block: 'start' }); }, 160); };
  addEventListener('hashchange', demo); demo();
  sec.addEventListener('click', e => { if (e.target.closest('a[href="#desk-demo"]') && location.hash === '#desk-demo') demo(); });
})();

/* v3.8 · titoli dei capitoli su una riga: se il titolo non entra nella larghezza, il corpo scende quanto basta */
(() => {
  const $$ = (q, r = document) => [...r.querySelectorAll(q)], visible = el => !!el && el.getClientRects().length > 0, lim = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), RIDOTTO = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fit = () => $$('.ch-title').forEach(t => {
    if (!visible(t)) return;
    if (innerWidth < 768) { t.style.removeProperty('--fit'); return; }
    t.style.removeProperty('--fit');
    const w = t.clientWidth, sw = t.scrollWidth;
    if (sw > w + 1) { const fs = parseFloat(getComputedStyle(t).fontSize); t.style.setProperty('--fit', Math.floor(fs * w / sw * .985) + 'px'); }
  });
  let raf = 0; const go = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fit(); }); };
  addEventListener('resize', go); addEventListener('hashchange', () => setTimeout(go, 60)); addEventListener('lyra-lang', go);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); go(); setTimeout(go, 400);
})();

/* v3.8 · scorrimento sovrapposto (come Hopaway): stesso calcolo di updateStack */
(() => {
  const $$ = (q, r = document) => [...r.querySelectorAll(q)], visible = el => !!el && el.getClientRects().length > 0, lim = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), RIDOTTO = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pile = $$('.ch-pila'); if (!pile.length || RIDOTTO) return;
  let raf = 0;
  const draw = () => {
    raf = 0; const vh = innerHeight; const STOP = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sopra')) || 66;
    pile.forEach(p => {
      if (!visible(p)) return;
      const els = $$(':scope > .ch', p);
      const info = els.map(el => { const sc = el._sc || 1; const h = el.getBoundingClientRect().height / sc; const top = h <= vh - STOP ? STOP : Math.min(STOP, vh - h); return { el, h, top }; });
      info.forEach((o, i) => {
        const nx = info[i + 1]; let cover = 0;
        if (nx) { const nt = nx.el.getBoundingClientRect().top; cover = lim((vh - nt) / Math.max(1, vh - nx.top)); }
        const sc = 1 - .06 * cover; o.el._sc = sc;
        const s = o.el.style;
        s.setProperty('--st-top', o.top.toFixed(1) + 'px'); s.setProperty('--st-sc', sc.toFixed(4)); s.setProperty('--st-oy', Math.round(Math.max(0, -o.top)) + 'px'); s.setProperty('--st-veil', (.55 * cover).toFixed(3));
        o.el.classList.toggle('st-via', cover >= .999);
      });
    });
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(draw); };
  addEventListener('scroll', go, { passive: true }); addEventListener('resize', go); addEventListener('hashchange', () => setTimeout(go, 80)); addEventListener('lyra-lang', go); go();
})();

/* v3.8 · prezzi su tablet e smartphone: un piano per volta */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pz]'); if (!b) return;
  const w = document.getElementById('ptab'); if (!w) return;
  w.dataset.col = b.dataset.pz;
  b.parentElement.querySelectorAll('[data-pz]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
});

/* v3.8 · Piattaforma: il monitor della home, clonato con la schermata del capitolo */
(() => {
  const src = document.querySelector('.st .mon'); if (!src) return;
  document.querySelectorAll('[data-mon]').forEach(f => {
    const i = f.dataset.mon, m = src.cloneNode(true), own = f.querySelector(':scope > template.mon-own');
    m.removeAttribute('style'); m.querySelectorAll('[style*="transform"]').forEach(x => { if (x.classList.contains('mon')) x.removeAttribute('style'); });
    m.querySelectorAll('.pane').forEach(p => { p.classList.toggle('on', !own && p.dataset.i === i); if (own || p.dataset.i !== i) p.remove(); });
    // v3.9 · schermata propria del capitolo (Protocollo): la pagina la porta in un <template>
    if (own) { const pn = own.content.firstElementChild.cloneNode(true); pn.classList.add('on'); m.querySelector('.app-main').appendChild(pn); }
    m.querySelectorAll('.app-nav').forEach(n => n.classList.toggle('on', n.dataset.i === i));
    m.setAttribute('aria-hidden', 'true'); f.appendChild(m);
  });
})();

/* v3.8 · titolo della vetrina: maschere che salgono e parola che cambia, come l'hero di Hopaway */
(() => {
  const h = document.querySelector('.vt-h1'); if (!h) return;
  const RID = matchMedia('(prefers-reduced-motion: reduce)').matches;
  h.querySelectorAll(':scope > .l-it, :scope > .l-en').forEach(lang => {
    let i = 0;
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; } const o = document.createElement('span'); o.className = 'vt-w'; o.innerHTML = `<span style="--i:${i++}"></span>`; o.firstChild.textContent = w; frag.appendChild(o); });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.classList.contains('vt-rot')) {
          const words = n.dataset.rot.split('|'); n._words = words; n._k = 0;
          n.innerHTML = `<span class="vt-rprev" aria-hidden="true"></span><span class="vt-rcur">${n.textContent}</span>`;
          const o = document.createElement('span'); o.className = 'vt-w vt-wrot'; const inner = document.createElement('span'); inner.style.setProperty('--i', i++);
          n.replaceWith(o); o.appendChild(inner); inner.appendChild(n);
          // il punto finale dopo la parola resta attaccato
        } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('tic')) wrap(n);
      });
    };
    wrap(lang);
  });
  let started = false;
  const go = () => requestAnimationFrame(() => { h.classList.add('on'); if (!started) { started = true; setTimeout(tick, 3400); } });
  if (RID) { h.classList.add('on'); return; }
  const tick = () => {
    const pg = h.closest('.pagina');
    if (!document.hidden && pg && !pg.hidden && h.getBoundingClientRect().bottom > 0) {
      h.querySelectorAll('.vt-rot').forEach(r => {
        const cur = r.querySelector('.vt-rcur'), prev = r.querySelector('.vt-rprev');
        r._k = (r._k + 1) % r._words.length;
        prev.textContent = cur.textContent; cur.textContent = r._words[r._k];
        prev.classList.remove('out'); cur.classList.remove('in'); void r.offsetWidth; prev.classList.add('out'); cur.classList.add('in');
      });
    }
    setTimeout(tick, 2800);
  };
  if (document.documentElement.classList.contains('loading')) addEventListener('loader-lifting', () => setTimeout(go, 200), { once: true });
  else setTimeout(go, 120);
})();

/* v3.8 · Dal backtest al capitale: quattro schermate della dashboard; al cambio cambiano anche i testi delle card */
(() => {
  const box = document.querySelector('[data-cp]'); if (!box) return;
  const RID = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D = JSON.parse(box.querySelector('.cp-data').textContent);
  const scr = [...box.querySelectorAll('.cp-s')], ticks = [...box.querySelectorAll('.cp-bar>i')];
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const N = D.length, DUR = 5600;
  let cur = 0, t0 = performance.now(), paused = false, raf = 0, vis = false;
  const fill = p => { const on = Math.round((cur + p) / N * ticks.length); ticks.forEach((t, i) => t.classList.toggle('on', i < Math.max(1, on))); };
  const ring = (k, v) => { const r = box.querySelector(`[data-r="${k}"]`); if (!r) return; r.hidden = v == null; if (v != null) { r.style.setProperty('--p', v); r.querySelector('i').textContent = v + '%'; } };
  const go = n => {
    n = (n + N) % N; if (n === cur) return;
    const prev = cur; cur = n; t0 = performance.now();
    scr.forEach((s, i) => { s.classList.toggle('on', i === n); s.classList.toggle('via', i === prev); });
    setTimeout(() => scr[prev].classList.remove('via'), 700);
    const st = D[n];
    box.querySelectorAll('.cp-sw').forEach(el => {
      const v = st[el.dataset.f]; if (!v) return;
      el.classList.add('out');
      setTimeout(() => { el.innerHTML = `<span class="l-it">${esc(v[0])}</span><span class="l-en">${esc(v[1])}</span>`; el.classList.remove('out'); }, RID ? 0 : 220);
    });
    ring('a_r', st.a_r); ring('d_r', st.d_r);
    box.classList.add('cambia'); setTimeout(() => box.classList.remove('cambia'), 500);
    fill(0);
  };
  // altezza stabile: ogni card prende l'altezza massima che raggiunge nei quattro passi, così la sezione non salta
  const cards = [...box.querySelectorAll('.cp-card')], sws = [...box.querySelectorAll('.cp-sw')];
  const html = (el, v) => { el.innerHTML = `<span class="l-it">${esc(v[0])}</span><span class="l-en">${esc(v[1])}</span>`; };
  const fit = () => {
    const keep = sws.map(el => el.innerHTML), rk = ['a_r', 'd_r'].map(k => { const r = box.querySelector(`[data-r="${k}"]`); return r && [r, r.hidden, r.style.getPropertyValue('--p'), r.querySelector('i').textContent]; });
    cards.forEach(c => { c.style.minHeight = ''; });
    const mx = cards.map(() => 0);
    D.forEach(st => {
      sws.forEach(el => { const v = st[el.dataset.f]; if (v) html(el, v); });
      ['a_r', 'd_r'].forEach(k => { const r = box.querySelector(`[data-r="${k}"]`); if (r) r.hidden = st[k] == null; });
      cards.forEach((c, i) => { mx[i] = Math.max(mx[i], c.offsetHeight); });
    });
    sws.forEach((el, i) => { el.innerHTML = keep[i]; });
    rk.forEach(x => { if (x) { x[0].hidden = x[1]; x[0].style.setProperty('--p', x[2]); x[0].querySelector('i').textContent = x[3]; } });
    cards.forEach((c, i) => { c.style.minHeight = mx[i] ? mx[i] + 'px' : ''; });
  };
  fit();
  let fw = box.offsetWidth, ft = 0;
  new ResizeObserver(() => { if (box.offsetWidth === fw) return; fw = box.offsetWidth; clearTimeout(ft); ft = setTimeout(fit, 120); }).observe(box);
  addEventListener('lyra-lang', fit);
  if (document.fonts) document.fonts.ready.then(fit);
  // v3.9 · scorrimento bloccato: quando la sezione arriva, il pannello si ferma e lo scroll fa avanzare i passi.
  // Se il pannello non sta nello schermo (o con "riduci movimento") torna il carosello automatico.
  const pin = box.closest('.cp-pin'), bar = document.querySelector('.barra'), stick = pin && pin.querySelector('.cp-stick');
  let pinned = false, run = 0, topPx = 0, off = 0;
  const stepLen = () => Math.round(Math.min(innerHeight * .6, 560));
  const layout = () => {
    if (!pin) return;
    const h = box.offsetHeight; if (!h) return;
    const TOP = (bar ? bar.getBoundingClientRect().height : 60) + 14, avail = innerHeight - TOP - 14;
    pin.classList.remove('on', 'all'); pin.style.height = ''; box.style.top = ''; if (stick) stick.style.top = '';
    const hd = stick && stick.firstElementChild, hAll = hd ? Math.ceil(box.getBoundingClientRect().bottom - hd.getBoundingClientRect().top) : h;
    const mode = pin.hasAttribute('data-fermo') ? '' : (stick && hAll <= avail ? 'all' : (h <= avail ? 'box' : ''));
    pinned = !!mode; run = N * stepLen();
    if (mode === 'all') {
      off = 0; topPx = Math.round(TOP + Math.min(18, (avail - hAll) / 2));
      pin.classList.add('on', 'all'); stick.style.top = topPx + 'px'; pin.style.height = (Math.ceil(stick.getBoundingClientRect().height) + run) + 'px';
    } else if (mode === 'box') {
      off = Math.round(box.getBoundingClientRect().top - pin.getBoundingClientRect().top);
      topPx = Math.round(TOP + (avail - h) / 2);
      pin.classList.add('on'); box.style.top = topPx + 'px'; pin.style.height = (off + h + run) + 'px';
    }
    onScroll();
  };
  const onScroll = () => {
    if (!pinned || !pin.classList.contains('on')) return;
    const p = Math.min(1, Math.max(0, (topPx - off - pin.getBoundingClientRect().top) / run));
    const k = Math.min(N - 1, Math.floor(p * N));
    if (k !== cur) go(k);
    fill(Math.min(1, p * N - k));
  };
  const toStep = k => {
    k = Math.max(0, Math.min(N - 1, k));
    if (!pinned) { go(k); return; }
    const y = scrollY + pin.getBoundingClientRect().top + off - topPx + (k + .08) / N * run;
    scrollTo({ top: y, behavior: RID ? 'auto' : 'smooth' });
  };
  addEventListener('scroll', onScroll, { passive: true });
  let lt = 0; addEventListener('resize', () => { clearTimeout(lt); lt = setTimeout(() => { fit(); layout(); }, 140); });
  new ResizeObserver(() => { clearTimeout(lt); lt = setTimeout(layout, 140); }).observe(box);
  addEventListener('lyra-lang', () => setTimeout(layout, 0));
  if (document.fonts) document.fonts.ready.then(layout);
  layout();
  const loop = now => {
    raf = 0; if (!vis || RID || pinned) return;
    if (!paused) { const p = (now - t0) / DUR; if (p >= 1) go(cur + 1); else fill(p); } else t0 = now - (t0 ? (now - t0) : 0);
    raf = requestAnimationFrame(loop);
  };
  fill(0);
  let pauseAt = 0;
  const pause = on => { if (on && !paused) { paused = true; pauseAt = performance.now() - t0; } else if (!on && paused) { paused = false; t0 = performance.now() - pauseAt; } };
  box.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') pause(true); });
  box.addEventListener('pointerleave', () => pause(false));
  box.addEventListener('focusin', () => pause(true)); box.addEventListener('focusout', () => pause(false));
  box.addEventListener('click', e => {
    const to = e.target.closest('[data-cp-to]'); if (to) { toStep(+to.dataset.cpTo); return; }
    if (e.target.closest('[data-cp-go]')) toStep(cur + 1 > N - 1 && !pinned ? 0 : cur + 1);
  });
  // scorrimento col dito sul tablet
  const tab = box.querySelector('.cp-tab'); let sx = null;
  tab.addEventListener('pointerdown', e => { sx = e.clientX; });
  tab.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) toStep(cur + (dx < 0 ? 1 : -1)); });
  tab.style.touchAction = 'pan-y';
  new IntersectionObserver(es => es.forEach(en => { vis = en.isIntersecting; if (vis) { t0 = performance.now() - (paused ? pauseAt : 0); if (!raf) raf = requestAnimationFrame(loop); } }), { threshold: .35 }).observe(box);
})();

/* v3.9 · vetrina: carosello di tablet. La schermata in primo piano si rimpicciolisce e scivola indietro,
   la successiva cresce e prende il suo posto. Avanza da solo ogni 5 s quando è in vista; frecce, puntini,
   clic sulle schermate laterali, trascinamento e tastiera per guidarlo a mano. */
(() => {
  const car = document.querySelector('[data-vt]'); if (!car) return;
  const RID = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = car.querySelector('.vt-stage'), sl = [...car.querySelectorAll('.vt-sl')], N = sl.length;
  const dots = [...car.querySelectorAll('[data-vt-to]')], caps = [...car.querySelectorAll('.vt-cap>span')];
  const SC = [1, .6, .42, .3], DUR = 3000;
  let cur = 0, prevD = sl.map((_, i) => i), tm = 0, vis = false, hold = false;
  const off = i => { let d = (i - cur) % N; if (d < -Math.floor((N - 1) / 2)) d += N; if (d > Math.ceil((N - 1) / 2)) d -= N; return d; }; // da -2 a +3 con 6 schermate
  const place = (instant) => {
    const W = sl[0].offsetWidth || 1, x1 = W * (.5 + SC[1] / 2 - .17), x2 = x1 + W * (SC[1] / 2 + SC[2] / 2 - .1), x3 = x2 + W * SC[2] * .7, X = [0, x1, x2, x3];
    sl.forEach((el, i) => {
      const d = off(i), a = Math.min(3, Math.abs(d)), sg = Math.sign(d);
      const jump = Math.abs(d - prevD[i]) > 1; prevD[i] = d;
      el.classList.toggle('salta', jump || !!instant); el.classList.toggle('on', d === 0);
      el.style.transform = `translateX(${sg * X[a]}px) scale(${SC[a]})`;
      el.style.opacity = a >= 3 ? 0 : a === 2 ? .7 : 1;
      el.style.zIndex = 10 - a;
      el.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
      el.inert = d !== 0;
    });
    dots.forEach((b, i) => b.toggleAttribute('aria-current', i === cur));
    caps.forEach((c, i) => c.classList.toggle('on', i === cur));
  };
  const go = (n, user) => { cur = ((n % N) + N) % N; place(RID); if (user) tick(); };
  const tick = () => { clearTimeout(tm); if (!RID && vis && !hold && !document.hidden) tm = setTimeout(() => { go(cur + 1); tick(); }, DUR); };
  // clic: frecce, puntini, schermate laterali
  car.addEventListener('click', e => {
    if (moved) { moved = false; return; }
    const g = e.target.closest('[data-vt-go]'); if (g) { go(cur + +g.dataset.vtGo, true); return; }
    const t = e.target.closest('[data-vt-to]'); if (t) { go(+t.dataset.vtTo, true); return; }
    const s = e.target.closest('.vt-sl'); if (s && !s.classList.contains('on')) go(cur + off(+s.dataset.i), true);
  });
  // trascinamento orizzontale (mouse e dito)
  let sx = null, sy = 0, moved = false;
  stage.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; moved = false; });
  addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { moved = true; go(cur + (dx < 0 ? 1 : -1), true); setTimeout(() => { moved = false; }, 0); } });
  stage.addEventListener('dragstart', e => e.preventDefault());
  car.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { go(cur + 1, true); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(cur - 1, true); e.preventDefault(); } });
  // pausa: mouse sopra, focus dentro, fuori schermo, scheda nascosta
  car.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hold = true; clearTimeout(tm); } });
  car.addEventListener('pointerleave', () => { hold = false; tick(); });
  car.addEventListener('focusin', () => { hold = true; clearTimeout(tm); });
  car.addEventListener('focusout', () => { hold = false; tick(); });
  document.addEventListener('visibilitychange', tick);
  new IntersectionObserver(es => es.forEach(en => { vis = en.isIntersecting; tick(); }), { threshold: .3 }).observe(stage);
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => place(true), 120); });
  new ResizeObserver(() => place(true)).observe(stage);
  place(true);
})();

/* v4.6 · motore: carosello a pila delle cinque fasi, senza sovrapposizioni.
   Le card restano incollate a sinistra (position: sticky, una sfasata di --o px dall'altra) e la card nuova copre la precedente,
   ma le fermate dello scorrimento tengono conto dello sfasamento: le card che la didascalia dice in vista ("Fasi 3–5 di 5")
   sono intere, mai coperte dalla successiva. Le fermate le calcola lo script (lo snap del browser con elementi sticky
   e' imprevedibile): frecce sempre attive (in fondo ripartono dall'inizio), barra a 40 tacche, didascalia, avanzamento
   automatico ogni 3,5 s quando la fila e' in vista (si ferma col mouse sopra, al tocco, col focus e a scheda nascosta). */
(() => {
  const r = document.querySelector('[data-mt]'); if (!r) return;
  const RID = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctl = r.parentElement.querySelector('.mt-ctl'), ticks = ctl ? [...ctl.querySelectorAll('.mt-bar>i')] : [], cap = ctl && ctl.querySelector('.mt-cap');
  const cards = [...r.querySelectorAll(':scope > .mt-node')], N = cards.length;
  const css = () => getComputedStyle(r);
  const off = () => parseFloat(css().getPropertyValue('--o')) || 0;
  const pitch = () => { const c = cards[0]; return c ? c.offsetWidth + (parseFloat(getComputedStyle(c).marginRight) || 0) : r.clientWidth / 3; };
  const step = () => Math.max(1, pitch() - off());
  const vis = () => { const v = parseInt(css().getPropertyValue('--vis'), 10); return Math.max(1, Math.min(N, v || Math.round(r.clientWidth / pitch()))); };
  const last = () => Math.max(0, N - vis());
  const idx = () => Math.max(0, Math.min(last(), Math.round(r.scrollLeft / step())));
  const lang = () => document.documentElement.dataset.lang === 'en';
  const name = i => { const k = cards[i] && cards[i].querySelector('.mt-k'); if (!k) return ''; const l = k.querySelector(lang() ? '.l-en' : '.l-it'); return (l || k).textContent.trim(); };
  let target = null;
  const to = (i, wrap = true) => {
    const L = last();
    if (wrap) { if (i > L) i = 0; if (i < 0) i = L; } else i = Math.max(0, Math.min(L, i));
    target = Math.min(r.scrollWidth - r.clientWidth, Math.round(i * step()));
    r.scrollTo({ left: target, behavior: RID ? 'auto' : 'smooth' });
  };
  const upd = () => {
    const i = idx(), v = vis(), upto = Math.min(N, i + v), on = Math.round(upto / N * ticks.length);
    ticks.forEach((t, k) => t.classList.toggle('on', k < on));
    if (cap) { const en = lang(); cap.textContent = v > 1 ? (en ? `Stages ${i + 1}–${upto} of ${N}` : `Fasi ${i + 1}–${upto} di ${N}`) : (en ? `Stage ${i + 1} of ${N} · ${name(i)}` : `Fase ${i + 1} di ${N} · ${name(i)}`); }
  };
  // fine di uno scorrimento a mano (rotella, trackpad, dito): si va alla fermata piu' vicina
  let et = 0;
  const settle = () => {
    if (x0 != null) return;
    if (target != null && Math.abs(r.scrollLeft - target) < 2) { target = null; return; }
    target = null;
    const want = Math.round(idx() * step());
    if (Math.abs(r.scrollLeft - want) > 1) to(idx(), false);
  };
  r.addEventListener('scroll', () => { upd(); clearTimeout(et); et = setTimeout(settle, 160); }, { passive: true });
  let tm = 0, hold = false, inView = false;
  const arm = () => { clearTimeout(tm); if (RID || hold || !inView || document.hidden) return; tm = setTimeout(() => { to(idx() + 1); arm(); }, 3500); };
  const pause = () => { hold = true; clearTimeout(tm); };
  const sopra = () => [r, ctl].some(x => x && x.matches(':hover'));
  ctl && ctl.addEventListener('click', e => {
    const g = e.target.closest('[data-mt-go]'), t = e.target.closest('[data-mt-to]');
    if (g) to(idx() + +g.dataset.mtGo);
    else if (t) to(Math.min(last(), +t.dataset.mtTo), false);
    else return;
    // col mouse ancora sopra i comandi l'avanzamento automatico resta fermo
    hold = sopra(); arm();
  });
  r.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { to(idx() + (e.key === 'ArrowRight' ? 1 : -1)); e.preventDefault(); } });
  addEventListener('resize', () => { upd(); clearTimeout(et); et = setTimeout(() => to(idx(), false), 160); });
  addEventListener('lyra-lang', upd);
  [r, ctl].forEach(x => x && x.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') pause(); }));
  [r, ctl].forEach(x => x && x.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !sopra()) { hold = false; arm(); } }));
  r.addEventListener('touchstart', pause, { passive: true });
  r.addEventListener('focusin', pause); r.addEventListener('focusout', () => { hold = false; arm(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { inView = es[0].isIntersecting; arm(); }, { threshold: .5 }).observe(r);
  document.addEventListener('visibilitychange', arm);
  upd();
  // trascinamento col mouse (al dito ci pensa lo scroll nativo, poi la fermata piu' vicina)
  let x0 = null, s0 = 0, mosso = false;
  r.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; x0 = e.clientX; s0 = r.scrollLeft; mosso = false; r.classList.add('tira'); });
  addEventListener('pointermove', e => { if (x0 == null) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) mosso = true; r.scrollLeft = s0 - dx; });
  addEventListener('pointerup', () => { if (x0 == null) return; x0 = null; r.classList.remove('tira'); to(idx(), false); });
  r.addEventListener('click', e => { if (mosso) { e.preventDefault(); e.stopPropagation(); mosso = false; } }, true);
  r.addEventListener('dragstart', e => e.preventDefault());
})();

/* v4.7 · un link alla pagina in cui si e' gia' (barra in alto, menu, pulsanti) non faceva nulla: l'indirizzo non cambia,
   quindi il cambio di pagina non scatta. Ora riporta in cima alla pagina (e chiude il menu, che si chiude da se' al clic). */
(() => {
  const routes = new Set([...document.querySelectorAll('.pagina[data-route]')].map(s => s.dataset.route));
  const norm = h => { h = String(h || '').replace(/^#/, ''); return h === '' ? 'home' : h; };
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const dest = norm(a.getAttribute('href'));
    if (!routes.has(dest) || dest !== norm(location.hash)) return;
    e.preventDefault();
    const lento = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    scrollTo({ top: 0, behavior: lento });
    a.blur();
  });
})();

/* v4.9 · Capitale: la schermata accanto ai quattro passaggi segue il passaggio aperto */
(() => {
  document.querySelectorAll('[data-cap-shot]').forEach(fig => {
    const box = fig.parentElement, dets = [...box.querySelectorAll('details.rg')], frs = [...fig.querySelectorAll('.cap-fr')];
    const show = i => frs.forEach((f, k) => f.classList.toggle('on', k === i));
    dets.forEach((d, i) => {
      d.addEventListener('toggle', () => { if (d.open) show(i); else { const j = dets.findIndex(x => x.open); show(j < 0 ? 0 : j); } });
      // col mouse basta passare sul passaggio per vederne la schermata
      d.querySelector('summary').addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(i); });
    });
    box.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { const j = dets.findIndex(x => x.open); show(j < 0 ? 0 : j); } });
    show(Math.max(0, dets.findIndex(d => d.open)));
  });
})();

/* v4.0 · tessere-icona nei titoli: entrano quando il titolo è in vista */
(() => {
  const tics = document.querySelectorAll('.tic');
  if (!tics.length || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('tic-js');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const t = e.target; t.style.transitionDelay = (t.dataset.d || 0) + 'ms';
    t.classList.add('go'); io.unobserve(t);
  }), { threshold: .6 });
  tics.forEach(t => io.observe(t));
})();

};

/* v4.14 · iscrizione alla beta: i pulsanti "Prova la demo" e "Scarica gratis" aprono il modulo finche' i link veri non ci sono.
   Il modulo scrive su /api/beta del sito (email + profilo), la stessa lista che apre l'accesso durante la beta. */
(function () {
  if (window.__lyraBeta) return; window.__lyraBeta = true;
  var html = document.documentElement, ultimo = null, dlg = null, pronto = false;
  var init = function () { if (pronto) return true; dlg = document.getElementById('beta-dlg'); if (!dlg) return false; pronto = true; wire(); return true; };
  var apri = function (da) { ultimo = da || document.activeElement; dlg.hidden = false; html.classList.add('beta-aperta'); var f = dlg.querySelector('input'); setTimeout(function () { if (f && !dlg.querySelector('.beta-ok:not([hidden])')) f.focus(); }, 60); };
  var chiudi = function () { dlg.hidden = true; html.classList.remove('beta-aperta'); if (ultimo && ultimo.focus) try { ultimo.focus(); } catch (e) {} };
  document.addEventListener('click', function (e) {
    var o = e.target.closest ? e.target.closest('[data-beta-open]') : null;
    if ((o || (e.target.closest && e.target.closest('[data-beta-close]'))) && !init()) return;
    if (o) { e.preventDefault(); apri(o); return; }
    if (e.target.closest && e.target.closest('[data-beta-close]')) { e.preventDefault(); chiudi(); }
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && dlg && !dlg.hidden) chiudi(); });
  var wire = function () { var form = dlg.querySelector('[data-beta-form]'), ok = dlg.querySelector('.beta-ok'), err = dlg.querySelector('.beta-err');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.email.value.trim().toLowerCase(), profile = form.profile.value;
    var valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    form.email.classList.toggle('ko', !valido);
    if (!valido) { err.textContent = 'Controlla l\'indirizzo email.'; err.hidden = false; form.email.focus(); return; }
    if (!profile) { err.textContent = 'Scegli il tuo profilo.'; err.hidden = false; form.profile.focus(); return; }
    err.hidden = true; var b = form.querySelector('button[type=submit]'); b.disabled = true;
    fetch('/api/beta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, profile: profile }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d && d.ok !== false, d: d }; }); })
      .then(function (x) { if (!x.ok) throw new Error((x.d && x.d.error) || 'errore'); form.hidden = true; ok.hidden = false; ok.querySelector('button').focus(); })
      .catch(function () { err.textContent = 'Non siamo riusciti a registrarti. Riprova tra poco.'; err.hidden = false; })
      .then(function () { b.disabled = false; });
  }); };
})();

/* v4.14 · le pagine interne hanno nomi inglesi: i vecchi indirizzi italiani (#prezzi, #termini…) portano ancora alla pagina giusta */
(function () {
  var alias = {"piattaforma":"platform","motore":"engine","mappa":"map","protocollo":"protocol","capitale":"capital","per-gestori":"for-managers","dati":"data","prezzi":"pricing","termini":"terms","rischi":"risks","piattaforma-costruisci":"platform-build","piattaforma-esegui":"platform-run","piattaforma-portafoglio":"platform-portfolio","gestori-contatto":"managers-contact","inizio":"top","principale":"main"};
  var fix = function () { var h = location.hash.replace(/^#/, ''); if (alias[h]) { try { history.replaceState(null, '', '#' + alias[h]); } catch (e) { location.hash = alias[h]; return; } try { dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { dispatchEvent(new Event('hashchange')); } } };
  addEventListener('hashchange', fix, true); fix();
  // sul sito, React rimette l'indirizzo iniziale quando si attiva: si ricontrolla dopo
  var tardi = function () { fix(); var pg = document.querySelector('.pagina[data-route]'); if (pg) { var h = location.hash.replace(/^#/, '') || 'home', s = document.querySelector('.pagina[data-route="' + h + '"]'); if (s && s.dataset.titleIt && document.title !== s.dataset.titleIt) document.title = s.dataset.titleIt; } };
  addEventListener('load', function () { setTimeout(tardi, 50); setTimeout(tardi, 1200); setTimeout(tardi, 3000); });
})();

/* Avvio sul sito: il markup e' gia' nella pagina (reso dal server), basta far partire la landing. */
(function () {
  var pronto = function () { document.documentElement.classList.add('lyra-pronta'); };
  var go = function () {
    if (window.__lyraCapitalStarted) return; window.__lyraCapitalStarted = true;
    window.__LYRA_LANDING_RUN();
    // la pagina resta invisibile (vedi lo stile in page.tsx) finche' stile, script e caratteri non sono pronti
    var f = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    f.then(function () { requestAnimationFrame(pronto); }, pronto);
    setTimeout(pronto, 2500);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
