/* Rapidpatch — AT Pothole Index embeds for rapidpatch.co.nz.
 * Served from https://sp210-collab.github.io/rapidpatch-at-index/embed.js
 * Loaded by a Wix Custom Embed bootstrap (BODY_END). Two modes by path:
 *   home  ('/')            -> map section injected before the site footer
 *   dash  ('/at-index' or the anchor post URL) -> full dashboard rendered on-domain,
 *          native page body hidden (visitor never leaves rapidpatch.co.nz)
 * Survives Wix React hydration wipes via keep-alive re-inject loop.
 * Data: map-data.json (GitHub Pages, CORS *). Maps: Leaflet + leaflet.heat (unpkg).
 */
(function () {
  'use strict';
  if (window.__rpmapBooted) return;
  window.__rpmapBooted = true;

  var p = location.pathname.replace(/\/+$/, '');
  var MODE = null;
  if (p === '' || p === '/') MODE = 'home';
  else if (p === '/at-index' || p.indexOf('/post/the-rapidpatch-at-pothole-index') === 0) MODE = 'dash';
  if (!MODE) return;

  var BASE = 'https://sp210-collab.github.io/rapidpatch-at-index/';
  var DAYS = 884; // 1 Jan 2024 – 3 Jun 2026
  var D = null, libsLoading = null, libsReady = false, mapBooted = false;

  function fmt(n) { return n.toLocaleString('en-NZ'); }

  /* ---------------- shared loaders ---------------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var sc = document.createElement('script');
      sc.src = src; sc.onload = res; sc.onerror = rej;
      document.head.appendChild(sc);
    });
  }
  function loadLibs() {
    if (libsReady) return Promise.resolve();
    if (libsLoading) return libsLoading;
    if (!document.getElementById('rpmap-leaflet-css')) {
      var lk = document.createElement('link');
      lk.id = 'rpmap-leaflet-css'; lk.rel = 'stylesheet';
      lk.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(lk);
    }
    libsLoading = loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
      .then(function () { return loadScript('https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'); })
      .then(function () { libsReady = true; });
    return libsLoading;
  }
  function loadData() {
    if (D) return Promise.resolve(D);
    return fetch(BASE + 'map-data.json').then(function (r) { return r.json(); })
      .then(function (j) { D = j; return D; });
  }

  function bootMap(canvasId, opts) {
    if (mapBooted) return;
    if (!document.getElementById(canvasId)) return;
    mapBooted = true;
    Promise.all([loadLibs(), loadData()]).then(function () {
      var el = document.getElementById(canvasId);
      if (!el) { mapBooted = false; return; }
      el.innerHTML = '';
      var L = window.L;
      var map = L.map(el, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM contributors', maxZoom: 18
      }).addTo(map);
      var maxN = Math.max.apply(null, D.roads.map(function (r) { return r.n; }));
      L.heatLayer(D.roads.map(function (r) { return [r.lat, r.lng, Math.sqrt(r.n / maxN)]; }), {
        radius: opts && opts.big ? 26 : 24, blur: opts && opts.big ? 20 : 18, maxZoom: 13,
        gradient: { 0.3: '#FFD89A', 0.5: '#FF9D2E', 0.7: '#FF6B00', 1: '#C04400' }
      }).addTo(map);
      D.roads.forEach(function (r) {
        L.circleMarker([r.lat, r.lng], {
          radius: (opts && opts.big ? 4 : 3) + (opts && opts.big ? 14 : 11) * Math.sqrt(r.n / maxN),
          color: '#fff', weight: 1.2, fillColor: '#FF9D2E', fillOpacity: .85
        }).addTo(map).bindPopup('<strong>' + r.road + '</strong><br>' + r.rawArea +
          '<br><strong>' + fmt(r.n) + '</strong> pothole dispatches in 29 months');
      });
      map.fitBounds(L.latLngBounds(D.roads.map(function (r) { return [r.lat, r.lng]; })).pad(0.05));
      map.on('click', function () { map.scrollWheelZoom.enable(); });
      map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
      if (opts && opts.after) opts.after();
    }).catch(function () { mapBooted = false; });
  }

  function ensureStyle(id, css) {
    if (!document.getElementById(id)) {
      var st = document.createElement('style');
      st.id = id;
      st.textContent = css;
      document.head.appendChild(st);
    }
  }

  /* ================= HOME: map section ================= */
  var CSS_HOME = [
    '#rpmap{pointer-events:auto;background:#0F2540;color:#FAFBF8;padding:56px 24px 64px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.5;position:relative;z-index:1}',
    '#rpmap *{box-sizing:border-box}',
    '#rpmap .rpm-wrap{max-width:1160px;margin:0 auto}',
    '#rpmap .rpm-kicker{color:#FF9D2E;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;text-align:center}',
    '#rpmap h2{font-size:clamp(26px,4vw,40px);font-weight:900;letter-spacing:-.5px;margin:0 0 10px;text-align:center;color:#FAFBF8}',
    '#rpmap .rpm-sub{font-size:16px;opacity:.85;max-width:760px;margin:0 auto 26px;text-align:center}',
    '#rpmap .rpm-stats{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:0 0 26px}',
    '#rpmap .rpm-stat{background:rgba(250,251,248,.06);border:1px solid rgba(255,157,46,.25);border-radius:8px;padding:14px 22px;text-align:center;min-width:170px}',
    '#rpmap .rpm-stat .n{font-size:28px;font-weight:900;color:#FF9D2E;font-variant-numeric:tabular-nums;line-height:1.1}',
    '#rpmap .rpm-stat .l{font-size:11px;opacity:.75;text-transform:uppercase;letter-spacing:1px;margin-top:4px}',
    '#rpmap .rpm-map{height:460px;border-radius:10px;overflow:hidden;background:#16304f;box-shadow:0 4px 24px rgba(0,0,0,.35);position:relative}',
    '#rpmap .rpm-map .rpm-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;opacity:.7}',
    '#rpmap .rpm-cap{font-size:12px;opacity:.6;margin:10px 2px 24px;text-align:right}',
    '#rpmap .rpm-cap a{color:inherit}',
    '#rpmap .rpm-ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}',
    '#rpmap .rpm-btn{display:inline-block;padding:13px 26px;border-radius:999px;font-weight:800;font-size:15px;text-decoration:none;letter-spacing:.2px}',
    '#rpmap .rpm-btn.primary{background:#FF9D2E;color:#0F2540}',
    '#rpmap .rpm-btn.ghost{background:transparent;color:#FAFBF8;border:2px solid rgba(255,157,46,.6)}',
    '#rpmap .leaflet-container{font:inherit}',
    '@media(max-width:540px){#rpmap{padding:40px 14px 48px}#rpmap .rpm-map{height:380px}#rpmap .rpm-stat{min-width:130px;padding:10px 14px}#rpmap .rpm-stat .n{font-size:22px}}'
  ].join('\n');

  function homeHTML() {
    var s = D ? D.stats : null;
    return '<div class="rpm-wrap">' +
      '<p class="rpm-kicker">Official AT data · released under LGOIMA, June 2026</p>' +
      '<h2>The Auckland Pothole Map</h2>' +
      '<p class="rpm-sub">We asked Auckland Transport for its full pothole dispatch log — every job, every road, 29 months. Here’s where Auckland is breaking, mapped from AT’s own data.</p>' +
      '<div class="rpm-stats">' + statChips(s) + '</div>' +
      '<div class="rpm-map" id="rpmapCanvas"><div class="rpm-loading">Loading the map…</div></div>' +
      '<p class="rpm-cap">Dot = road, sized by pothole dispatch count · top 300 roads · source: AT LGOIMA CAS-1344360-H7J1V4 · tiles © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></p>' +
      '<div class="rpm-ctas">' +
        '<a class="rpm-btn primary" href="/post/the-rapidpatch-at-pothole-index-auckland-transport-s-response-time-data-suburb-by-suburb">Explore the full AT Pothole Index →</a>' +
        '<a class="rpm-btn ghost" href="/form">Got a pothole on your property? Get a quote</a>' +
      '</div>' +
    '</div>';
  }
  function statChips(s) {
    return '<div class="rpm-stat"><div class="n">' + (s ? fmt(s.total) : '26,863') + '</div><div class="l">Pothole dispatches</div></div>' +
      '<div class="rpm-stat"><div class="n">' + (s ? s.publicBinnedPct : '45.7') + '%</div><div class="l">Public reports closed, no repair recorded</div></div>' +
      '<div class="rpm-stat"><div class="n">$' + (s ? (s.spend / 1e6).toFixed(2) : '4.87') + 'M</div><div class="l">Paid to repair contractors</div></div>';
  }

  function injectHome() {
    if (document.getElementById('rpmap')) return true;
    var f = document.getElementById('SITE_FOOTER') || document.querySelector('footer');
    var anchor = (f && f.parentNode) ? { parent: f.parentNode, before: f } :
      (document.querySelector('main') ? { parent: document.querySelector('main'), before: null } : null);
    if (!anchor) return false;
    ensureStyle('rpmap-css', CSS_HOME);
    var sec = document.createElement('section');
    sec.id = 'rpmap';
    sec.setAttribute('aria-label', 'The Auckland Pothole Map');
    sec.innerHTML = homeHTML();
    if (anchor.before) anchor.parent.insertBefore(sec, anchor.before);
    else anchor.parent.appendChild(sec);
    mapBooted = false;
    setTimeout(function () {
      bootMap('rpmapCanvas', { big: false, after: function () {
        var wrap = document.querySelector('#rpmap .rpm-stats');
        if (wrap && D) wrap.innerHTML = statChips(D.stats);
      }});
    }, 250);
    return true;
  }

  /* ================= DASH: full on-domain dashboard ================= */
  var CSS_DASH = [
    '#rpdash{pointer-events:auto;background:#FAFBF8;color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.5;width:100%;position:relative;z-index:1}',
    '#rpdash *{box-sizing:border-box}',
    '#rp-pothole-index-v2,#rp-credentials-strip{display:none !important}', /* stale May-2026 placeholder embeds on the anchor post */
    '#rpdash .rpd-hero{background:#0F2540;color:#FAFBF8;padding:56px 24px 64px;text-align:center;position:relative;overflow:hidden}',
    '#rpdash .rpd-hero:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 100%,rgba(255,157,46,.08),transparent 60%);pointer-events:none}',
    '#rpdash .rpd-badge{display:inline-block;background:rgba(255,157,46,.15);color:#FF9D2E;padding:6px 14px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:18px;border:1px solid rgba(255,157,46,.3)}',
    '#rpdash h1{font-size:clamp(32px,5vw,52px);font-weight:900;letter-spacing:-1px;margin:0 0 14px;line-height:1.08;position:relative;z-index:1;color:#FAFBF8}',
    '#rpdash h1 .acc{color:#FF9D2E}',
    '#rpdash .rpd-lede{font-size:17px;opacity:.88;max-width:720px;margin:0 auto;position:relative;z-index:1}',
    '#rpdash .rpd-src{font-size:12px;opacity:.6;margin-top:18px;position:relative;z-index:1}',
    '#rpdash .rpd-stats{background:#fff;padding:36px 24px;border-bottom:1px solid #d9d6cc}',
    '#rpdash .rpd-stats-wrap{max-width:1160px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}',
    '#rpdash .rpd-stat{padding:20px;border-radius:8px;background:#FAFBF8;border-left:4px solid #FF9D2E;text-align:center}',
    '#rpdash .rpd-stat .l{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:6px}',
    '#rpdash .rpd-stat .n{font-size:38px;font-weight:900;color:#0F2540;letter-spacing:-1px;line-height:1;font-variant-numeric:tabular-nums}',
    '#rpdash .rpd-stat .n.bad{color:#c43c2c}',
    '#rpdash .rpd-stat .n.good{color:#2da14b}',
    '#rpdash .rpd-stat .s{font-size:12px;color:#666;margin-top:6px;line-height:1.4}',
    '#rpdash section{padding:44px 24px;max-width:1160px;margin:0 auto}',
    '#rpdash section.rpd-wide{max-width:1400px}',
    '#rpdash h2{font-size:28px;color:#0F2540;font-weight:900;letter-spacing:-.5px;margin:0 0 8px}',
    '#rpdash .rpd-l{color:#666;font-size:15px;margin:0 0 22px;max-width:820px}',
    '#rpdash .rpd-map{height:68vh;min-height:480px;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(15,37,64,.12);background:#e8e6dd;position:relative}',
    '#rpdash .rpm-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:#666}',
    '#rpdash .rpd-cap{font-size:12px;color:#999;margin-top:10px;text-align:right}',
    '#rpdash .rpd-cap a{color:#666}',
    '#rpdash .rpd-tbox{background:#fff;border-radius:8px;overflow-x:auto;box-shadow:0 2px 12px rgba(15,37,64,.06)}',
    '#rpdash table{width:100%;border-collapse:collapse;font-size:14px;min-width:720px}',
    '#rpdash th{background:#0F2540;color:#FAFBF8;padding:11px 13px;text-align:left;font-weight:700;font-size:11px;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap}',
    '#rpdash th.num,#rpdash td.num{text-align:right}',
    '#rpdash td{padding:11px 13px;border-bottom:1px solid #d9d6cc;color:#333}',
    '#rpdash td.num{font-variant-numeric:tabular-nums;font-weight:600}',
    '#rpdash tr:last-child td{border-bottom:none}',
    '#rpdash .rpd-boards{display:block;font-size:11px;color:#666;font-weight:400;margin-top:2px}',
    '#rpdash .rpd-grade{display:inline-block;min-width:36px;text-align:center;padding:3px 9px;border-radius:6px;font-weight:900;font-size:14px}',
    '#rpdash .gA{background:#e6f4ea;color:#1c5d2f}#rpdash .gB{background:#eef7e6;color:#3c6e1f}#rpdash .gC{background:#fff2dc;color:#8a4a00}#rpdash .gD{background:#ffe3cf;color:#a04400}#rpdash .gF{background:#fde8e6;color:#a82820}#rpdash .gN{background:#eee;color:#777}',
    '#rpdash .rpd-binned{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700}',
    '#rpdash .bLow{background:#e6f4ea;color:#1c5d2f}#rpdash .bMed{background:#fff2dc;color:#8a4a00}#rpdash .bHigh{background:#fde8e6;color:#a82820}',
    '#rpdash .rpd-chart{background:#fff;border-radius:8px;padding:24px;box-shadow:0 2px 12px rgba(15,37,64,.06)}',
    '#rpdash .rpd-chart svg{width:100%;height:auto;display:block}',
    '#rpdash .rpd-find{background:#fff;border-radius:8px;padding:28px;box-shadow:0 2px 12px rgba(15,37,64,.06)}',
    '#rpdash .rpd-find h3{color:#0F2540;font-size:17px;margin:20px 0 8px;font-weight:800}',
    '#rpdash .rpd-find h3:first-child{margin-top:0}',
    '#rpdash .rpd-find p{margin:0 0 12px;font-size:14px;line-height:1.65;color:#333}',
    '#rpdash .rpd-find strong{color:#0F2540}',
    '#rpdash .rpd-method{background:#FAFBF8;border:1px solid #d9d6cc;border-radius:8px;padding:24px;font-size:13px;line-height:1.7;color:#444}',
    '#rpdash .rpd-method h3{color:#0F2540;font-size:14px;margin:0 0 10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}',
    '#rpdash .rpd-method ul{padding-left:22px;margin:0}',
    '#rpdash .rpd-method li{margin-bottom:6px}',
    '#rpdash .rpd-cta{background:#FF9D2E;color:#0F2540;padding:44px 24px;text-align:center}',
    '#rpdash .rpd-cta h2{margin:0 0 10px;font-size:26px;font-weight:900;color:#0F2540}',
    '#rpdash .rpd-cta p{font-size:15px;max-width:620px;margin:0 auto 18px;color:#3a1a05}',
    '#rpdash .rpd-cta a{display:inline-block;background:#0F2540;color:#FAFBF8;padding:13px 26px;border-radius:999px;font-weight:800;text-decoration:none;font-size:15px}',
    '#rpdash .rpd-press{background:#0F2540;color:#FAFBF8;padding:26px 24px;text-align:center;font-size:13px}',
    '#rpdash .rpd-press a{color:#FF9D2E;font-weight:600;text-decoration:none}',
    '#rpdash .leaflet-container{font:inherit}',
    '@media(max-width:540px){#rpdash .rpd-hero{padding:38px 16px 46px}#rpdash section{padding:30px 14px}#rpdash .rpd-map{height:58vh;min-height:380px}#rpdash .rpd-stat .n{font-size:30px}}'
  ].join('\n');

  function gradeCls(g) { return g === 'A' ? 'gA' : g === 'A-' ? 'gB' : g === 'C' ? 'gC' : g === 'D' ? 'gD' : g === 'F' ? 'gF' : 'gN'; }
  function binCls(v) { return v === null ? '' : v < 30 ? 'bLow' : v < 50 ? 'bMed' : 'bHigh'; }

  function leagueRows() {
    return D.areas.map(function (a) {
      return '<tr><td><strong>' + a.area + '</strong><span class="rpd-boards">' + a.boards + '</span></td>' +
        '<td class="num">' + fmt(a.n) + '</td>' +
        '<td class="num">' + (a.publicBinnedPct === null ? '–' : '<span class="rpd-binned ' + binCls(a.publicBinnedPct) + '">' + a.publicBinnedPct + '%</span>') + '</td>' +
        '<td class="num">' + (a.onTargetPct === null ? '–' : a.onTargetPct + '%') + '</td>' +
        '<td class="num">' + (a.p90h === null ? '–' : a.p90h < 48 ? a.p90h + ' h' : (a.p90h / 24).toFixed(1) + ' days') + '</td>' +
        '<td class="num">$' + (a.spend / 1000).toFixed(0) + 'k</td>' +
        '<td><span class="rpd-grade ' + gradeCls(a.grade) + '">' + a.grade + '</span></td></tr>';
    }).join('');
  }
  function roadRows() {
    return D.roads.slice().sort(function (a, b) { return b.n - a.n; }).slice(0, 15).map(function (r, i) {
      return '<tr><td>' + (i + 1) + '</td><td><strong>' + r.road + '</strong></td><td>' + r.rawArea + '</td>' +
        '<td class="num">' + fmt(r.n) + '</td><td class="num">' + (DAYS / r.n).toFixed(1) + ' days</td></tr>';
    }).join('');
  }
  function trendSVG() {
    var M = D.monthly.filter(function (m) { return m.ym < '2026-06'; });
    var W = 1040, H = 300, PL = 44, PR = 8, PT = 16, PB = 42;
    var bw = (W - PL - PR) / M.length;
    var mx = Math.max.apply(null, M.map(function (m) { return m.n; }));
    function y(v) { return PT + (H - PT - PB) * (1 - v / mx); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Monthly pothole dispatches">';
    [0, 500, 1000, 1500, 2000].forEach(function (v) {
      if (v > mx) return;
      s += '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#e4e1d6" stroke-width="1"/>' +
        '<text x="' + (PL - 7) + '" y="' + (y(v) + 4) + '" font-size="11" fill="#999" text-anchor="end">' + (v >= 1000 ? (v / 1000) + 'k' : v) + '</text>';
    });
    M.forEach(function (m, i) {
      var parts = m.ym.split('-');
      var yy = +parts[0], mm = +parts[1];
      var winter = mm >= 6 && mm <= 9;
      var x = PL + i * bw;
      s += '<rect x="' + (x + 1) + '" y="' + y(m.n) + '" width="' + (bw - 2) + '" height="' + (H - PB - y(m.n)) + '" rx="2" fill="' + (winter ? '#FF9D2E' : '#0F2540') + '" opacity="' + (winter ? '1' : '.55') + '"><title>' + m.ym + ': ' + m.n + '</title></rect>';
      if (mm === 1) s += '<text x="' + (x + bw / 2) + '" y="' + (H - PB + 16) + '" font-size="11" fill="#666" text-anchor="middle">' + yy + '</text>';
      if (m.n === mx) s += '<text x="' + (x + bw / 2) + '" y="' + (y(m.n) - 6) + '" font-size="11" font-weight="700" fill="#C04400" text-anchor="middle">' + m.ym + ' · ' + fmt(m.n) + '</text>';
    });
    s += '<rect x="' + PL + '" y="' + (H - 14) + '" width="10" height="10" fill="#FF9D2E"/><text x="' + (PL + 16) + '" y="' + (H - 5) + '" font-size="11" fill="#666">Jun–Sep (winter)</text>' +
      '<rect x="' + (PL + 130) + '" y="' + (H - 14) + '" width="10" height="10" fill="#0F2540" opacity=".55"/><text x="' + (PL + 146) + '" y="' + (H - 5) + '" font-size="11" fill="#666">Oct–May</text></svg>';
    return s;
  }

  function dashHTML() {
    var s = D.stats, m = D.meta;
    return '' +
    '<div class="rpd-hero"><div class="rpd-badge">Official AT data · LGOIMA CAS-1344360-H7J1V4 · Jan 2024 – Jun 2026</div>' +
      '<h1>26,863 potholes.<br><span class="acc">Auckland Transport’s own data, mapped.</span></h1>' +
      '<p class="rpd-lede">In June 2026 Auckland Transport released its full pothole dispatch log to Rapidpatch under the Local Government Official Information and Meetings Act — every pothole job across its contract areas for 29 months. This page maps it, ranks it, and reports what it shows. The numbers are AT’s, not ours.</p>' +
      '<p class="rpd-src">Source: AT response to LGOIMA request CAS-1344360-H7J1V4, released 9 June 2026 · Appendix A, CT_DISPATCH, ' + fmt(s.total) + ' records</p></div>' +
    '<div class="rpd-stats"><div class="rpd-stats-wrap">' +
      '<div class="rpd-stat"><div class="l">Pothole dispatches logged</div><div class="n">' + fmt(s.total) + '</div><div class="s">1 Jan 2024 – 3 Jun 2026, all AT contract areas</div></div>' +
      '<div class="rpd-stat"><div class="l">Public reports closed, no repair recorded</div><div class="n bad">' + s.publicBinnedPct + '%</div><div class="s">Of ' + fmt(s.publicReports) + ' phone/online reports. AT says it does not record why.</div></div>' +
      '<div class="rpd-stat"><div class="l">Responses within AT’s own target</div><div class="n good">' + s.onTargetPct + '%</div><div class="s">Of completed dispatches with a logged target. When AT dispatches, it’s fast.</div></div>' +
      '<div class="rpd-stat"><div class="l">Paid to contractors in itemised claims</div><div class="n">$' + (s.spend / 1e6).toFixed(2) + 'M</div><div class="s">29 months. Undercount — one contract area’s lump-sum payments excluded by AT.</div></div>' +
    '</div></div>' +
    '<section class="rpd-wide"><h2>The pothole map of Auckland</h2>' +
      '<p class="rpd-l">Every dot is a road, sized by how many pothole dispatches AT logged on it — Rodney to Franklin, Waiheke to the Waitākeres. Heat shows where the network is breaking. Click a dot for the road’s count. Dots cover the ' + fmt(m.geocoded) + ' busiest roads — ' + m.coveredPct + '% of all dispatches.</p>' +
      '<div class="rpd-map" id="rpdashCanvas"><div class="rpm-loading">Loading the map…</div></div>' +
      '<p class="rpd-cap">Road positions geocoded from road names (AT released no coordinates) · tiles © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</p></section>' +
    '<section><h2>The league table</h2>' +
      '<p class="rpd-l">AT’s eight maintenance contract areas, ranked. “Public reports binned” = phone/online pothole reports closed “No Action Required” — no repair recorded, and AT holds no record of the reason (declined under LGOIMA s17(e): the information does not exist).</p>' +
      '<div class="rpd-tbox"><table><thead><tr><th>Area</th><th class="num">Dispatches</th><th class="num">Public reports binned</th><th class="num">Responses on target</th><th class="num">P90 response (public)</th><th class="num">Claims paid</th><th>Grade</th></tr></thead><tbody>' + leagueRows() + '</tbody></table></div></section>' +
    '<section><h2>Auckland’s most pothole-plagued roads</h2>' +
      '<p class="rpd-l">By dispatch count over 29 months. Rural Rodney and Franklin dominate — 20 of the top 25 are rural roads.</p>' +
      '<div class="rpd-tbox"><table><thead><tr><th>#</th><th>Road</th><th>Area</th><th class="num">Pothole dispatches</th><th class="num">≈ one every</th></tr></thead><tbody>' + roadRows() + '</tbody></table></div></section>' +
    '<section><h2>Pothole season is real</h2>' +
      '<p class="rpd-l">Monthly dispatches across the full dataset. Winter (June–September) runs at 1.77× the rest of the year. July 2025 — 2,029 dispatches — is the worst month on record.</p>' +
      '<div class="rpd-chart">' + trendSVG() + '</div></section>' +
    '<section><h2>What the data shows</h2><div class="rpd-find">' +
      '<h3>1. Nearly half of public pothole reports go nowhere — and AT can’t say why</h3>' +
      '<p>Aucklanders filed <strong>' + fmt(s.publicReports) + '</strong> pothole reports by phone and online in 29 months. <strong>' + fmt(s.publicBinned) + ' of them — ' + s.publicBinnedPct + '% — were closed “No Action Required”</strong>: no repair recorded. When AT’s own patrols spot a pothole, just 1.6% end that way. Some of the public’s reports will be duplicates or holes below AT’s intervention threshold — but nobody can say how many, because AT told us it <strong>does not record the reason</strong> a report is binned, declining that part of the request under s17(e) of LGOIMA. What doesn’t get measured doesn’t get fixed.</p>' +
      '<h3>2. Rodney is a different planet</h3>' +
      '<p>In the North Rural contract area — Rodney — <strong>85.9% of public pothole reports were closed with no repair recorded</strong>. Rodney also logged the most pothole dispatches of any area (6,703) and is home to the region’s most pothole-plagued road: <strong>Wayby Valley Road, 186 dispatches — one every 4.7 days</strong>.</p>' +
      '<h3>3. When AT does dispatch, it’s genuinely fast</h3>' +
      '<p>Credit where due: <strong>' + s.onTargetPct + '% of completed dispatches met AT’s own response target</strong>. Median response on completed public reports runs 0.5–8 hours by area. The grievance in this data isn’t speed — it’s what never gets dispatched at all. (Response is not the same as a repair that lasts; this dataset doesn’t measure durability.)</p>' +
      '<h3>4. Central Auckland misses its own targets most</h3>' +
      '<p>The Central area — Puketāpapa, Albert-Eden, Maungakiekie-Tāmaki, Ōrākei, Waitematā — hit its response target just <strong>85.4%</strong> of the time, the worst in Auckland, with a 90th-percentile response of <strong>3.5 days</strong> on public reports. It also consumed the most claims spend: $1.22M.</p>' +
      '<h3>5. The bill is climbing</h3>' +
      '<p>AT paid contractors <strong>at least $4.87M in itemised pothole claims over 29 months</strong> — and the run-rate rose <strong>26% year-on-year</strong> ($1.80M in the 12 months to May 2025 → $2.28M in the 12 months to May 2026). That’s an undercount: one contract area’s pothole work is paid inside a monthly lump sum AT excluded from the data.</p>' +
      '<h3>6. One emergency report in five: no action</h3>' +
      '<p>Even among public reports AT itself classed as <strong>Emergency</strong>, <strong>19.5% (398 of 2,038)</strong> were closed with no repair recorded.</p>' +
    '</div></section>' +
    '<section><div class="rpd-method"><h3>Methodology &amp; caveats</h3><ul>' +
      '<li><strong>Source:</strong> Auckland Transport’s response to LGOIMA request <strong>CAS-1344360-H7J1V4</strong> (released 9 June 2026): Appendix A, sheet CT_DISPATCH — ' + fmt(s.total) + ' pothole dispatch records, 1 January 2024 – 3 June 2026.</li>' +
      '<li><strong>“Public reports”</strong> = records with call type <em>Call Centre</em> (phone/online/app), ' + fmt(s.publicReports) + ' records. Patrol, contractor and council-logged jobs counted separately.</li>' +
      '<li><strong>“Binned” / “no repair recorded”</strong> = call status <em>No Action Required</em>. Plausibly includes duplicates, private land, and holes below AT’s intervention threshold (&gt;100&nbsp;mm wide or &gt;50&nbsp;mm deep). AT holds no breakdown of reasons (s17(e)). We report the rate, not a cause.</li>' +
      '<li><strong>Response performance</strong> = actual vs target response time on completed dispatches, both as logged by AT. Response ≠ permanence of repair.</li>' +
      '<li><strong>Spend</strong> = sum of itemised claim values. South Rural’s pothole repairs are paid in a monthly lump sum; AT supplied only that area’s out-of-lump-sum claims, so the true total is higher.</li>' +
      '<li><strong>Map positions:</strong> AT released road names, not coordinates. Top 300 roads geocoded via OpenStreetMap Nominatim (' + m.coveredPct + '% of dispatches); dots mark the road, not individual potholes.</li>' +
      '<li><strong>Refresh cadence:</strong> annual LGOIMA re-request — first entry in the Pothole Report Card series.</li>' +
      '<li><strong>Full dataset:</strong> available to journalists on request, as released by AT.</li>' +
    '</ul></div></section>' +
    '<div class="rpd-cta"><h2>Got a pothole AT won’t fix?</h2>' +
      '<p>Auckland Transport fixes the road. We fix everything else — driveways, body corp carparks, retail centres, fleet yards, retirement villages. Photo a pothole. Fixed-price quote. 12-month warranty.</p>' +
      '<a href="/form">Get a quote →</a></div>' +
    '<div class="rpd-press"><strong style="color:#FF9D2E;letter-spacing:1px;font-size:11px;text-transform:uppercase;margin-right:8px">For press</strong> First run at the dataset, embed-ready charts, or comment from a 22-year asphalt contractor: <a href="mailto:fix@rapidpatch.co.nz?subject=AT%20Pothole%20Index%20press%20enquiry">fix@rapidpatch.co.nz</a> · <strong>027 737 2858</strong> (Steve Parker, founder)</div>';
  }

  function dashContainer() {
    // Wix Studio post/page flow container. Prefer the parent of the old May embed
    // (a direct child of the page container), then a generic Studio container, then main.
    var old = document.getElementById('rp-pothole-index-v2');
    if (old && old.parentElement) return old.parentElement;
    var c = document.querySelector('#SITE_PAGES [class*="-container"]');
    if (c) return c;
    return document.querySelector('main') || document.getElementById('PAGES_CONTAINER');
  }

  function injectDash() {
    if (document.getElementById('rpdash')) return true;
    var container = dashContainer();
    if (!container) return false;
    if (!D) { loadData().then(function () { injectDash(); }); return false; }
    ensureStyle('rpdash-css', CSS_DASH);
    var sec = document.createElement('div');
    sec.id = 'rpdash';
    sec.innerHTML = dashHTML();
    container.insertBefore(sec, container.firstChild);
    document.title = 'The AT Pothole Index — 26,863 Auckland potholes, mapped | Rapidpatch';
    mapBooted = false;
    setTimeout(function () { bootMap('rpdashCanvas', { big: true }); }, 250);
    return true;
  }

  /* ---------------- keep-alive ---------------- */
  var injectFn = MODE === 'home' ? injectHome : injectDash;
  var t0 = Date.now();
  var iv = setInterval(function () {
    injectFn();
    if (Date.now() - t0 > 12 * 60 * 1000) clearInterval(iv);
  }, 1500);
  setTimeout(function () {
    clearInterval(iv);
    var slow = setInterval(function () {
      injectFn();
      if (Date.now() - t0 > 12 * 60 * 1000) clearInterval(slow);
    }, 8000);
  }, 2 * 60 * 1000);
  injectFn();
})();
