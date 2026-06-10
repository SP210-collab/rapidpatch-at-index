/* Rapidpatch — Auckland Pothole Map home-page section.
 * Served from https://sp210-collab.github.io/rapidpatch-at-index/embed.js
 * Injected on rapidpatch.co.nz home page by Wix Custom Embed (BODY_END bootstrap).
 * Renders before #SITE_FOOTER; survives Wix React hydration wipes via keep-alive loop.
 * Map (Leaflet + heat) lazy-boots via IntersectionObserver. Data: map-data.json (same origin, CORS *).
 */
(function () {
  'use strict';
  if (window.__rpmapBooted) return;
  window.__rpmapBooted = true;
  var p = location.pathname.replace(/\/+$/, '');
  if (p !== '' && p !== '/') return; // home page only

  var BASE = 'https://sp210-collab.github.io/rapidpatch-at-index/';
  var D = null, libsLoading = false, libsReady = false, mapBooted = false;

  var CSS = [
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

  function fmt(n) { return n.toLocaleString('en-NZ'); }

  function ensureStyle() {
    if (!document.getElementById('rpmap-css')) {
      var st = document.createElement('style');
      st.id = 'rpmap-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
  }

  function sectionHTML() {
    var s = D ? D.stats : null;
    return '<div class="rpm-wrap">' +
      '<p class="rpm-kicker">Official AT data · released under LGOIMA, June 2026</p>' +
      '<h2>The Auckland Pothole Map</h2>' +
      '<p class="rpm-sub">We asked Auckland Transport for its full pothole dispatch log — every job, every road, 29 months. Here’s where Auckland is breaking, mapped from AT’s own data.</p>' +
      '<div class="rpm-stats">' +
        '<div class="rpm-stat"><div class="n">' + (s ? fmt(s.total) : '26,863') + '</div><div class="l">Pothole dispatches</div></div>' +
        '<div class="rpm-stat"><div class="n">' + (s ? s.publicBinnedPct : '45.7') + '%</div><div class="l">Public reports closed, no repair recorded</div></div>' +
        '<div class="rpm-stat"><div class="n">$' + (s ? (s.spend / 1e6).toFixed(2) : '4.87') + 'M</div><div class="l">Paid to repair contractors</div></div>' +
      '</div>' +
      '<div class="rpm-map" id="rpmapCanvas"><div class="rpm-loading">Loading the map…</div></div>' +
      '<p class="rpm-cap">Dot = road, sized by pothole dispatch count · top 300 roads · source: AT LGOIMA CAS-1344360-H7J1V4 · tiles © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></p>' +
      '<div class="rpm-ctas">' +
        '<a class="rpm-btn primary" href="' + BASE + '" target="_blank" rel="noopener">Explore the full AT Pothole Index →</a>' +
        '<a class="rpm-btn ghost" href="/form">Got a pothole on your property? Get a quote</a>' +
      '</div>' +
    '</div>';
  }

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

  function bootMap() {
    if (mapBooted) return;
    var el = document.getElementById('rpmapCanvas');
    if (!el) return;
    mapBooted = true;
    Promise.all([loadLibs(), loadData()]).then(function () {
      var el2 = document.getElementById('rpmapCanvas');
      if (!el2) { mapBooted = false; return; }
      el2.innerHTML = '';
      var L = window.L;
      var map = L.map(el2, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM contributors', maxZoom: 18
      }).addTo(map);
      var maxN = Math.max.apply(null, D.roads.map(function (r) { return r.n; }));
      L.heatLayer(D.roads.map(function (r) { return [r.lat, r.lng, Math.sqrt(r.n / maxN)]; }), {
        radius: 24, blur: 18, maxZoom: 13,
        gradient: { 0.3: '#FFD89A', 0.5: '#FF9D2E', 0.7: '#FF6B00', 1: '#C04400' }
      }).addTo(map);
      D.roads.forEach(function (r) {
        L.circleMarker([r.lat, r.lng], {
          radius: 3 + 11 * Math.sqrt(r.n / maxN),
          color: '#fff', weight: 1.2, fillColor: '#FF9D2E', fillOpacity: .85
        }).addTo(map).bindPopup('<strong>' + r.road + '</strong><br>' + r.rawArea +
          '<br><strong>' + fmt(r.n) + '</strong> pothole dispatches in 29 months');
      });
      map.fitBounds(L.latLngBounds(D.roads.map(function (r) { return [r.lat, r.lng]; })).pad(0.05));
      map.on('click', function () { map.scrollWheelZoom.enable(); });
      map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
      // re-render stats now data is live
      var wrap = document.querySelector('#rpmap .rpm-stats');
      if (wrap && D.stats) {
        wrap.innerHTML =
          '<div class="rpm-stat"><div class="n">' + fmt(D.stats.total) + '</div><div class="l">Pothole dispatches</div></div>' +
          '<div class="rpm-stat"><div class="n">' + D.stats.publicBinnedPct + '%</div><div class="l">Public reports closed, no repair recorded</div></div>' +
          '<div class="rpm-stat"><div class="n">$' + (D.stats.spend / 1e6).toFixed(2) + 'M</div><div class="l">Paid to repair contractors</div></div>';
      }
    }).catch(function () { mapBooted = false; });
  }

  function armObserver(sec) {
    var canvas = sec.querySelector('.rpm-map');
    if (!canvas) return;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { bootMap(); io.disconnect(); }
        });
      }, { rootMargin: '400px' });
      io.observe(canvas);
    } else {
      bootMap();
    }
  }

  function findAnchor() {
    // classic editor first, then Studio (footer tag), then end of main
    var f = document.getElementById('SITE_FOOTER') || document.querySelector('footer');
    if (f && f.parentNode) return { parent: f.parentNode, before: f };
    var m = document.querySelector('main');
    if (m) return { parent: m, before: null };
    return null;
  }

  function inject() {
    if (document.getElementById('rpmap')) return true;
    var a = findAnchor();
    if (!a) return false;
    ensureStyle();
    var sec = document.createElement('section');
    sec.id = 'rpmap';
    sec.setAttribute('aria-label', 'The Auckland Pothole Map');
    sec.innerHTML = sectionHTML();
    if (a.before) a.parent.insertBefore(sec, a.before);
    else a.parent.appendChild(sec);
    mapBooted = false;
    armObserver(sec);
    return true;
  }

  // keep-alive: re-inject if Wix hydration wipes the node. Fast for 2 min, then slow for 10 min.
  var t0 = Date.now();
  var iv = setInterval(function () {
    var age = Date.now() - t0;
    inject();
    if (age > 12 * 60 * 1000) clearInterval(iv);
  }, 1500);
  setTimeout(function () {
    clearInterval(iv);
    var slow = setInterval(function () {
      inject();
      if (Date.now() - t0 > 12 * 60 * 1000) clearInterval(slow);
    }, 8000);
  }, 2 * 60 * 1000);
  inject();
})();
