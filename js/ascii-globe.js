/*
 * ascii-globe.js
 * Bumi halftone ASCII dengan peta sebenar, penanda lokasi dan jaringan PERKIM.
 * Tiada dependency. Perlu dimuat selepas js/ascii-globe-land.js.
 *
 *   <div class="ag" data-ascii-globe data-src="data/perkim-network.json"></div>
 *
 * Pilihan: data-cell="8" (saiz sel px), data-speed="7" (darjah/saat),
 * data-hide-contoh (sembunyikan entri yang bertanda "contoh": true)
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2, RAD = Math.PI / 180;

  var JENIS = {
    ibu_pejabat: 'Ibu pejabat',
    negeri: 'Cawangan negeri',
    daerah: 'Cawangan daerah',
    antarabangsa: 'Jaringan antarabangsa'
  };
  var RADIUS = { ibu_pejabat: 5.5, negeri: 4, daerah: 3, antarabangsa: 4.5 };
  var RANK = { antarabangsa: 0, daerah: 1, negeri: 2, ibu_pejabat: 3 };
  var INFRA = {
    bangunan: 'Bangunan', kenderaan: 'Kenderaan', utiliti: 'Utiliti',
    peralatan: 'Peralatan', lain: 'Lain-lain'
  };

  var LIGHT = (function () {
    var x = -0.55, y = 0.5, z = 0.67, l = Math.sqrt(x * x + y * y + z * z);
    return [x / l, y / l, z / l];
  })();

  /* ---------- utiliti ---------- */

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrap180(d) { return ((d + 540) % 360 + 360) % 360 - 180; }

  function decodeLand(L) {
    var bin = atob(L.rle), out = new Uint8Array(L.w * L.h);
    var pos = 0, val = 0, i = 0, x, shift, b;
    while (i < bin.length) {
      x = 0; shift = 0;
      do { b = bin.charCodeAt(i++); x |= (b & 0x7f) << shift; shift += 7; } while (b & 0x80);
      if (val) out.fill(1, pos, pos + x);
      pos += x; val ^= 1;
    }
    return out;
  }

  // Lengkok bulatan besar (slerp) antara dua titik -> [[lat, lon], ...]
  function arc(a, b, n) {
    function vec(lat, lon) {
      var p = lat * RAD, l = lon * RAD;
      return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
    }
    var va = vec(a.lat, a.lon), vb = vec(b.lat, b.lon);
    var dot = clamp(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2], -1, 1);
    var w = Math.acos(dot), sw = Math.sin(w), pts = [];
    if (sw < 1e-6) return pts;
    for (var i = 0; i <= n; i++) {
      var t = i / n, s1 = Math.sin((1 - t) * w) / sw, s2 = Math.sin(t * w) / sw;
      var x = s1 * va[0] + s2 * vb[0], y = s1 * va[1] + s2 * vb[1], z = s1 * va[2] + s2 * vb[2];
      pts.push([Math.asin(z) / RAD, Math.atan2(y, x) / RAD]);
    }
    return pts;
  }

  /* ---------- komponen ---------- */

  function Globe(root) {
    var cfg = {
      cell: parseFloat(root.dataset.cell) || 8,
      speed: parseFloat(root.dataset.speed) || 7,
      src: root.dataset.src || 'data/perkim-network.json',
      hideContoh: root.hasAttribute('data-hide-contoh')
    };
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function fail(msg) {
      root.textContent = '';
      root.appendChild(h('p', 'ag-error', msg));
    }
    if (!window.ASCII_GLOBE_LAND) {
      return fail('Fail js/ascii-globe-land.js belum dimuat. Pastikan ia disertakan sebelum ascii-globe.js.');
    }
    var land = decodeLand(window.ASCII_GLOBE_LAND);
    var LW = window.ASCII_GLOBE_LAND.w, LH = window.ASCII_GLOBE_LAND.h;

    // ---- DOM ----
    root.textContent = '';
    var stage = h('div', 'ag-stage');
    var canvas = h('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Peta dunia ASCII menunjukkan cawangan dan jaringan PERKIM. Senarai lokasi tersedia di sebelah.');
    var tip = h('div', 'ag-tip'); tip.hidden = true;
    stage.appendChild(canvas); stage.appendChild(tip);

    var panel = h('div', 'ag-panel');
    var modes = h('div', 'ag-modes');
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', 'Paparan peta');
    var btnDunia = h('button', null, 'Dunia'); btnDunia.type = 'button';
    var btnMy = h('button', null, 'Malaysia'); btnMy.type = 'button';
    modes.appendChild(btnMy); modes.appendChild(btnDunia);
    var stats = h('p', 'ag-stats');
    var legend = h('ul', 'ag-legend');
    [['hq', 'Ibu pejabat'], ['cawangan', 'Cawangan'], ['antarabangsa', 'Jaringan luar negara']].forEach(function (k) {
      var li = h('li'); li.appendChild(h('span', 'ag-key ag-key--' + k[0])); li.appendChild(document.createTextNode(k[1]));
      legend.appendChild(li);
    });
    var card = h('div', 'ag-card'); card.setAttribute('aria-live', 'polite');
    var list = h('ul', 'ag-list');
    panel.appendChild(modes); panel.appendChild(stats); panel.appendChild(legend);
    panel.appendChild(card); panel.appendChild(list);
    root.appendChild(stage); root.appendChild(panel);

    var ctx = canvas.getContext('2d');

    // ---- keadaan ----
    var data = null, byId = {}, hq = null, arcs = [];
    var mode = 'malaysia', selected = null, hovered = null;
    var cam = { lon: 101.7, lat: 12, zoom: 1 };
    var tgt = { lon: 101.7, lat: 12, zoom: 1 };
    var size = 0, dpr = 1, ink = '#111', accent = '#0b7a4b';
    var s0 = 0, c0 = 1, hits = [], oceanPts = [], oceanR = 1;
    var raf = 0, last = 0, visible = true;

    function readColors() {
      var cs = getComputedStyle(root);
      ink = cs.color;
      accent = cs.getPropertyValue('--ag-accent').trim() || '#0b7a4b';
    }

    function resize() {
      var w = stage.clientWidth || 400;
      size = Math.floor(w);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr; canvas.height = size * dpr;
      canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
      readColors();
      if (reduce) frame(performance.now(), true);
    }

    function project(lat, lon) {
      var phi = lat * RAD, dl = (lon - cam.lon) * RAD, cp = Math.cos(phi);
      var cosc = s0 * Math.sin(phi) + c0 * cp * Math.cos(dl);
      var X = cp * Math.sin(dl), Y = c0 * Math.sin(phi) - s0 * cp * Math.cos(dl);
      return { x: (X * cam.zoom * 0.5 + 0.5) * size, y: (-Y * cam.zoom * 0.5 + 0.5) * size, vis: cosc > 0.03 };
    }

    /* ---------- lukisan ---------- */

    function drawLand() {
      var cells = Math.max(24, Math.round(size / cfg.cell)), cell = size / cells, z = cam.zoom;
      var lonR = cam.lon * RAD;
      ctx.fillStyle = ink;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = Math.round(cell * 0.95) + 'px ui-monospace, Consolas, monospace';

      // Laut: titik halus supaya bentuk glob sentiasa jelas (pudar bila dizum).
      var oceanA = clamp((2.2 - z) / 1.0, 0, 1) * 0.22;
      oceanPts.length = 0;
      oceanR = Math.max(0.6, cell * 0.08);

      for (var row = 0; row < cells; row++) {
        for (var col = 0; col < cells; col++) {
          var nx = (col + 0.5) / cells * 2 - 1, ny = (row + 0.5) / cells * 2 - 1;
          var X = nx / z, Y = -ny / z, r2 = X * X + Y * Y;
          if (r2 > 1) continue;
          var Z = Math.sqrt(1 - r2);
          var phi = Math.asin(clamp(Z * s0 + Y * c0, -1, 1));
          var lon = (lonR + Math.atan2(X, Z * c0 - Y * s0)) / RAD;
          lon = ((lon + 180) % 360 + 360) % 360;
          var u = Math.floor(lon / 360 * LW) % LW;
          var v = clamp(Math.floor((90 - phi / RAD) / 180 * LH), 0, LH - 1);
          if (!land[v * LW + u]) {
            if (oceanA > 0.01) {
              oceanPts.push((col + 0.5) * cell, (row + 0.5) * cell);
            }
            continue;
          }

          // Bayang kubah ikut skrin supaya halftone kekal walau dizum.
          var sx = nx, sy = -ny, d2 = sx * sx + sy * sy;
          if (d2 > 0.96) { var f = Math.sqrt(0.96 / d2); sx *= f; sy *= f; d2 = 0.96; }
          var sz = Math.sqrt(1 - d2);
          var lit = sx * LIGHT[0] + sy * LIGHT[1] + sz * LIGHT[2];
          var level = clamp(lit * 0.5 + 0.55, 0, 1) * (0.55 + 0.45 * sz);

          var x = (col + 0.5) * cell, y = (row + 0.5) * cell;
          if (level < 0.2) ctx.fillText('/', x, y);
          else if (level < 0.38) ctx.fillText('*', x, y);
          else if (level < 0.55) ctx.fillText('#', x, y);
          else if (level < 0.72) {
            var s = cell * 0.46;
            ctx.beginPath();
            ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.8); ctx.lineTo(x - s, y + s * 0.8);
            ctx.closePath(); ctx.fill();
          } else {
            ctx.beginPath(); ctx.arc(x, y, cell * (0.3 + 0.2 * level), 0, TAU); ctx.fill();
          }
        }
      }
    }

    function withAlpha(color, a) {
      var m = /^rgba?\(([^)]+)\)$/.exec(color);
      if (!m) return color;
      var p = m[1].split(',').slice(0, 3).join(',');
      return 'rgba(' + p + ',' + a + ')';
    }

    function drawGlobeEdge() {
      var oceanA = clamp((2.2 - cam.zoom) / 1.0, 0, 1) * 0.22;
      if (oceanA > 0.01) {
        ctx.fillStyle = withAlpha(ink, oceanA);
        ctx.beginPath();
        for (var i = 0; i < oceanPts.length; i += 2) {
          ctx.rect(oceanPts[i] - oceanR, oceanPts[i + 1] - oceanR, oceanR * 2, oceanR * 2);
        }
        ctx.fill();
      }
      var edgeA = clamp((1.6 - cam.zoom) / 0.6, 0, 1);
      if (edgeA > 0.01) {
        ctx.strokeStyle = withAlpha(ink, 0.35 * edgeA);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, cam.zoom * size / 2 - 1, 0, TAU);
        ctx.stroke();
      }
    }

    function drawArcs() {
      if (cam.zoom >= 3) return;
      ctx.fillStyle = accent;
      for (var i = 0; i < arcs.length; i++) {
        var a = arcs[i], on = (selected === a.m || hovered === a.m);
        ctx.globalAlpha = on ? 0.95 : 0.5;
        for (var j = 0; j < a.pts.length; j += 1) {
          var p = project(a.pts[j][0], a.pts[j][1]);
          if (!p.vis) continue;
          ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawMarker(hit, now) {
      var m = hit.m, isSel = selected === m, isHov = hovered === m, a = hit.a;
      var r = RADIUS[m.jenis] + (isSel || isHov ? 1.5 : 0), x = hit.x, y = hit.y;

      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      ctx.fillStyle = accent; ctx.strokeStyle = accent;
      if (m.jenis === 'antarabangsa') {
        var d = r * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y - d); ctx.lineTo(x + d, y); ctx.lineTo(x, y + d); ctx.lineTo(x - d, y);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
      if (m.jenis === 'ibu_pejabat' || m.jenis === 'negeri' || isSel) {
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.stroke();
      }
      if (!reduce && (m.jenis === 'ibu_pejabat' || isSel)) {
        var ph = (now / 1800) % 1;
        ctx.globalAlpha = a * (1 - ph); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, r + 3 + ph * 9, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function collectHits() {
      hits.length = 0;
      if (!data) return;
      var fade = clamp((cam.zoom - 2) / 1.5, 0, 1);
      for (var i = 0; i < data.lokasi.length; i++) {
        var m = data.lokasi[i];
        var a = (m.jenis === 'negeri' || m.jenis === 'daerah') ? fade : 1;
        if (a < 0.02) continue;
        var p = project(m.lat, m.lon);
        if (!p.vis || p.x < -8 || p.x > size + 8 || p.y < -8 || p.y > size + 8) continue;
        hits.push({ m: m, x: p.x, y: p.y, a: a });
      }
      hits.sort(function (p, q) {
        var rp = RANK[p.m.jenis] + (p.m === selected || p.m === hovered ? 4 : 0);
        var rq = RANK[q.m.jenis] + (q.m === selected || q.m === hovered ? 4 : 0);
        return rp - rq;
      });
    }

    function frame(now, force) {
      if (!size) return;
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;

      // kamera
      var k = reduce ? 1 : 1 - Math.exp(-dt * 4.5);
      if (mode === 'dunia' && !selected && !hovered && !reduce) {
        cam.lon += cfg.speed * dt; tgt.lon = cam.lon;
      }
      cam.lon += wrap180(tgt.lon - cam.lon) * k;
      cam.lat += (tgt.lat - cam.lat) * k;
      cam.zoom *= Math.pow(tgt.zoom / cam.zoom, k);
      cam.lon = wrap180(cam.lon);

      var lat0 = cam.lat * RAD; s0 = Math.sin(lat0); c0 = Math.cos(lat0);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      drawLand();
      drawGlobeEdge();
      drawArcs();
      collectHits();
      for (var i = 0; i < hits.length; i++) drawMarker(hits[i], now);
    }

    function loop(now) {
      raf = 0;
      if (!visible) return;
      if (now - last >= 30) frame(now); // ~30 fps
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (reduce || raf || !visible) return;
      raf = requestAnimationFrame(loop);
    }
    function redraw() { if (reduce) frame(performance.now(), true); }

    /* ---------- interaksi ---------- */

    function nearest(px, py, maxd) {
      var best = null, bd = maxd * maxd;
      for (var i = hits.length - 1; i >= 0; i--) {
        var dx = hits[i].x - px, dy = hits[i].y - py, d = dx * dx + dy * dy;
        if (d <= bd) { bd = d; best = hits[i]; }
      }
      return best;
    }
    function pointer(e) {
      var r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }

    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var p = pointer(e), hit = nearest(p[0], p[1], 14);
      hovered = hit ? hit.m : null;
      canvas.style.cursor = hit ? 'pointer' : '';
      if (hit) {
        tip.textContent = hit.m.nama + ' · ' + JENIS[hit.m.jenis];
        tip.hidden = false;
        tip.style.left = clamp(hit.x + 12, 0, size - 160) + 'px';
        tip.style.top = clamp(hit.y - 10, 0, size - 28) + 'px';
      } else tip.hidden = true;
      redraw();
    });
    canvas.addEventListener('pointerleave', function () {
      hovered = null; tip.hidden = true; canvas.style.cursor = ''; redraw();
    });
    canvas.addEventListener('click', function (e) {
      var p = pointer(e), hit = nearest(p[0], p[1], 16);
      if (hit) select(hit.m.id);
    });

    function setMode(m) {
      mode = m; selected = null; hovered = null;
      if (m === 'malaysia') {
        tgt.lon = 109; tgt.lat = 4.3; tgt.zoom = 5.2;
      } else {
        tgt.lat = 12; tgt.zoom = 1; tgt.lon = cam.lon;
      }
      btnDunia.setAttribute('aria-pressed', String(m === 'dunia'));
      btnMy.setAttribute('aria-pressed', String(m === 'malaysia'));
      renderList(); renderCard(); redraw();
    }

    function select(id) {
      var m = byId[id]; if (!m) return;
      if (mode === 'dunia' && m.jenis !== 'antarabangsa') setMode('malaysia');
      selected = m;
      tgt.lon = m.lon; tgt.lat = m.lat;
      tgt.zoom = m.jenis === 'antarabangsa' ? 2.4 : 9;
      renderList(); renderCard(); redraw();
    }

    btnDunia.addEventListener('click', function () { setMode('dunia'); });
    btnMy.addEventListener('click', function () { setMode('malaysia'); });

    /* ---------- panel ---------- */

    function addDetail(title, arr, fmt) {
      if (!arr || !arr.length) return;
      card.appendChild(h('h4', 'ag-sub', title));
      var ul = h('ul', 'ag-detail');
      arr.forEach(function (it) { ul.appendChild(h('li', null, fmt(it))); });
      card.appendChild(ul);
    }

    function renderCard() {
      card.textContent = '';
      if (selected) {
        card.appendChild(h('h3', null, selected.nama));
        card.appendChild(h('p', 'ag-meta', JENIS[selected.jenis] + (selected.negara ? ' · ' + selected.negara : '')));
        if (selected.disahkan && selected.disahkan.tarikh) {
          var v = 'Disahkan';
          if (selected.disahkan.oleh) v += ' oleh ' + selected.disahkan.oleh;
          v += ' pada ' + selected.disahkan.tarikh;
          card.appendChild(h('p', 'ag-verified', v));
        }
        if (selected.peranan) card.appendChild(h('p', null, selected.peranan));
        if (selected.alamat) card.appendChild(h('p', 'ag-contact', selected.alamat));
        if (selected.telefon) {
          var tel = h('p', 'ag-contact'), a = h('a', null, selected.telefon);
          a.href = 'tel:' + selected.telefon.replace(/[^+\d]/g, '');
          tel.appendChild(a);
          card.appendChild(tel);
        }
        addDetail('Sejarah', selected.sejarah, function (it) { return it.tahun + ' · ' + it.teks; });
        addDetail('Kolaborasi', selected.kolaborasi, function (it) { return it.tahun + ' · ' + it.teks; });
        addDetail('Kemudahan', selected.infra, function (it) {
          return (INFRA[it.kategori] || it.kategori) + ': ' + it.butiran;
        });
        if (selected.contoh) card.appendChild(h('p', 'ag-note', 'Data contoh. Sahkan rekod dalam data/database_lokasi_perkim.md.'));
      } else {
        var s = (data.ringkasan && data.ringkasan[mode]) || '';
        card.appendChild(h('p', null, s));
      }
    }

    function renderList() {
      list.textContent = '';
      data.lokasi.forEach(function (m) {
        var show = mode === 'dunia'
          ? (m.jenis === 'antarabangsa' || m.jenis === 'ibu_pejabat')
          : (m.jenis !== 'antarabangsa');
        if (!show) return;
        var li = h('li'), b = h('button');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(selected === m));
        b.appendChild(h('span', 'ag-name', m.nama));
        b.appendChild(h('span', 'ag-sub', m.negara || JENIS[m.jenis]));
        b.addEventListener('click', function () { select(m.id); });
        li.appendChild(b); list.appendChild(li);
      });
    }

    function init(json) {
      data = json;
      if (cfg.hideContoh) {
        data.lokasi = data.lokasi.filter(function (m) { return m.contoh !== true; });
      }
      if (!data.lokasi.length) {
        return fail('Tiada lokasi disahkan untuk dipaparkan. Kemas kini data/database_lokasi_perkim.md dan jalankan bina --awam.');
      }
      data.lokasi.forEach(function (m) { byId[m.id] = m; });
      hq = data.lokasi.filter(function (m) { return m.jenis === 'ibu_pejabat'; })[0];
      if (hq) {
        data.lokasi.forEach(function (m) {
          if (m.jenis === 'antarabangsa') arcs.push({ m: m, pts: arc(hq, m, 64) });
        });
        cam.lon = tgt.lon = hq.lon;
      }
      var n = data.lokasi.filter(function (m) { return m.jenis === 'negeri'; }).length;
      var i = data.lokasi.filter(function (m) { return m.jenis === 'antarabangsa'; }).length;
      stats.textContent = n + ' cawangan negeri · ' + i + ' jaringan antarabangsa';
      setMode('malaysia');
      resize();
      start();
    }

    fetch(cfg.src)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(init)
      .catch(function () {
        fail('Data lokasi tidak dapat dimuat dari ' + cfg.src + '. Buka laman melalui server tempatan (contoh start.bat), bukan terus dari fail.');
      });

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) { last = 0; start(); }
      }).observe(root);
    }
  }

  function boot() {
    var nodes = document.querySelectorAll('[data-ascii-globe]');
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i].__ag) { nodes[i].__ag = true; Globe(nodes[i]); }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
