/* 전체 지도: 장르마다 트리를 한 구역씩 담은 지도. 끌어서 이동·휠/핀치로 확대, 원을 누르면 정보 */
(function () {
  const esc = WT.esc;
  const DAYK = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
  const hex6 = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : null);
  const shade = (h, k) => { const n = parseInt(h.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0'); return '#' + c(n >> 16 & 255) + c(n >> 8 & 255) + c(n & 255); };
  const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };
  const mixW = (h, t) => { const n = parseInt(h.slice(1), 16); const c = (v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0'); return '#' + c(n >> 16 & 255) + c(n >> 8 & 255) + c(n & 255); };

  function view() {
    const S = WT.store.state;
    const trees = WT.data.trees || {};
    const genres = WT.liveGenres().filter((g) => trees[g.id] && Object.keys(trees[g.id].nodes || {}).some((id) => WT.toon(id)));
    const inTree = new Set(genres.flatMap((g) => Object.keys(trees[g.id].nodes).filter((id) => WT.toon(id))));
    const done = (id) => { const w = WT.toon(id); return !!w && ((S.progress[id] || 0) >= WT.eps(w) || !!(S.rewarded || {})[id + ':done']); };

    // ---------- 구역 배치: 트리 모양을 줄여 상자에 담고, 상자를 줄 맞춰 쌓아요 ----------
    const K = 0.42, PAD = 34, HEAD = 56, GAP = 40, MAXW = 1500;
    const regions = genres.map((g) => {
      const T = trees[g.id];
      const ids = Object.keys(T.nodes).filter((id) => WT.toon(id));
      const xs = ids.map((id) => T.nodes[id][0]), ys = ids.map((id) => T.nodes[id][1]);
      const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
      const w = Math.max(240, (maxx - minx) * K) + PAD * 2;
      const perRow = Math.max(4, Math.floor((w - PAD * 2) / 22) + 1);
      const extra = WT.data.webtoons.filter((x) => !inTree.has(x.id) && (x.genres || [])[0] === g.id).map((x) => x.id);
      const exRows = extra.length ? Math.ceil(extra.length / perRow) : 0;
      const h = HEAD + Math.max(60, (maxy - miny) * K) + PAD + 26 + exRows * 24 + (exRows ? 18 : 0);
      return { g, T, ids, minx, miny, w, h, perRow, extra, exRows, links: (T.links || []).filter((l) => T.nodes[l.from] && T.nodes[l.to] && WT.toon(l.from) && WT.toon(l.to)) };
    });
    const rows = [];
    regions.slice().sort((a, b) => b.w * b.h - a.w * a.h).forEach((r) => {
      let row = rows.find((x) => x.w + GAP + r.w <= MAXW);
      if (!row) { row = { items: [], w: -GAP, h: 0 }; rows.push(row); }
      row.items.push(r); row.w += GAP + r.w; row.h = Math.max(row.h, r.h);
    });
    let yy = 0, WW = 0;
    rows.forEach((row) => { let x = (MAXW - row.w) / 2; row.items.forEach((r) => { r.x = x; r.y = yy + (row.h - r.h) / 2; x += r.w + GAP; }); yy += row.h + GAP; WW = Math.max(WW, row.w); });
    const WH = Math.max(1, yy - GAP);
    const P = {};
    regions.forEach((r) => {
      r.ids.forEach((id) => { const p = r.T.nodes[id]; P[id] = { x: r.x + PAD + (p[0] - r.minx) * K, y: r.y + HEAD + (p[1] - r.miny) * K, r, tree: true }; });
      r.exY = r.y + r.h - 22 - (r.exRows - 1) * 24;
      r.extra.forEach((id, i) => { P[id] = { x: r.x + PAD + (i % r.perRow) * 22, y: r.exY + Math.floor(i / r.perRow) * 24, r, tree: false }; });
    });
    const allTree = regions.flatMap((r) => r.ids);
    const prog = (ids) => [ids.filter(done).length, ids.length];

    // ---------- 화면 ----------
    const [ad, at] = prog(allTree);
    document.getElementById('app').innerHTML = `<div class="view lib-view lb-view mp-view">
      <main class="lb-shell mp-shell">
        <section class="lb-main mp-main" id="mp-main">
          <div class="lb-top">
            <label class="lb-search mp-search">${WT.icon.search}<input id="mp-q" placeholder="웹툰 제목, 작가 검색" autocomplete="off" aria-label="지도에서 웹툰 찾기"><div class="mp-results" id="mp-results" role="listbox"></div></label>
            <div class="lb-me">${WT.coinPill ? WT.coinPill() : ''}${WT.themeBtn()}${WT.userChip()}</div>
          </div>
          <div class="lb-hero mp-hero">
            <div>
              <h1 class="lb-h1 one-line">모든 장르가 한 장에, 웹툰 세계 전체 지도</h1>
              <p class="lb-lead">장르마다 웹툰 트리가 한 구역씩 모여 있어요. 끌어서 둘러보고, 원을 눌러 웹툰을 확인한 뒤 바로 그 트리로 들어가 보세요.</p>
              <div class="mp-stats"><div><b>${Object.keys(P).length}</b><span>모든 웹툰</span></div><div><b><em>${ad}</em> / ${at}</b><span>트리 완독</span></div></div>
            </div>
            <div class="lb-info" id="mp-info" aria-live="polite"></div>
          </div>
          <div class="mp-filters">
            <div class="mp-chips" id="mp-chips" role="group" aria-label="장르만 보기 · 장르별 트리 진행도">${[['all', '전체', '#E0565B', [ad, at]]].concat(regions.map((r) => [r.g.id, r.g.name, r.g.color, prog(r.ids)])).map(([id, n, c, [d, t]]) =>
              `<button type="button" data-only="${id}" aria-pressed="${id === 'all'}" style="--gc:${c}; --p:${t ? d / t * 100 : 0}%" aria-label="${esc(n)} 트리 ${t}편 중 ${d}편 완독"><i></i>${esc(n)} <small><b>${d}</b>/${t}</small><span class="cbar"></span></button>`).join('')}</div>
            <label class="mp-toggle"><input type="checkbox" id="mp-extra" checked> 트리 밖 웹툰도 보기</label>
            <div class="mp-zoom"><button type="button" id="mp-zo" aria-label="축소">−</button><span id="mp-zv">100%</span><button type="button" id="mp-zi" aria-label="확대">+</button><button type="button" id="mp-zf">전체 보기</button></div>
          </div>
          <div class="mp-canvas" id="mp-canvas" aria-label="전체 웹툰 지도">
            <svg id="mp-svg"><defs id="mp-defs"></defs><g id="mp-world"></g></svg>
            <div class="mp-tip" id="mp-tip"></div>
            <div class="mp-mini" aria-hidden="true"><svg id="mp-mini"></svg></div>
            <span class="mp-hint">끌어서 이동 · 휠로 확대 · 원을 누르면 정보</span>
          </div>
        </section>
      </main>
    </div>`;

    const canvas = document.getElementById('mp-canvas'), world = document.getElementById('mp-world');
    let only = 'all', showExtra = true, sel = null, hits = new Set();
    const dark = () => WT.theme() !== 'light';
    const nameColor = (c) => (dark() ? (lum(c) < .5 ? mixW(c, .55) : c) : (lum(c) > .55 ? shade(c, .6) : c));

    function draw() {
      let defs = '', s = '';
      regions.forEach((r) => {
        const c = r.g.color, dim = only !== 'all' && only !== r.g.id;
        const [d, n] = prog(r.ids);
        s += `<g class="mp-region${dim ? ' dim' : ''}" data-r="${r.g.id}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="22" fill="${c}" fill-opacity=".10" stroke="${c}" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="6 6"/>
          <circle cx="${r.x + 26}" cy="${r.y + 28}" r="6" fill="${c}"/><text class="mp-rname" x="${r.x + 40}" y="${r.y + 35}" fill="${nameColor(c)}">${esc(r.g.name)}</text>
          <text class="mp-rsub" x="${r.x + r.w - 18}" y="${r.y + 26}" text-anchor="end">트리 진행 ${d} / ${n}${r.extra.length ? ` · 트리 밖 ${r.extra.length}` : ''}</text>
          <rect x="${r.x + r.w - 118}" y="${r.y + 34}" width="100" height="6" rx="3" fill="${c}" fill-opacity=".18"/><rect x="${r.x + r.w - 118}" y="${r.y + 34}" width="${Math.max(d ? 6 : 0, 100 * d / n)}" height="6" rx="3" fill="${c}"/>
          ${r.extra.length && showExtra ? `<line x1="${r.x + 18}" x2="${r.x + r.w - 18}" y1="${r.exY - 22}" y2="${r.exY - 22}" stroke="${c}" stroke-opacity=".3" stroke-dasharray="2 5"/>` : ''}</g>`;
      });
      regions.forEach((r) => {
        const dim = only !== 'all' && only !== r.g.id;
        r.links.forEach((l) => { const A = P[l.from], B = P[l.to]; const lit = done(l.from); s += `<path class="mp-lk${dim ? ' dim' : ''}" d="M${A.x} ${A.y} L${B.x} ${B.y}" stroke="${lit ? '#D9A22E' : r.g.color}" stroke-opacity="${lit ? 1 : .45}" stroke-width="${lit ? 3 : 2}"/>`; });
      });
      Object.entries(P).forEach(([id, p]) => {
        if (!p.tree && !showExtra) return;
        const w = WT.toon(id), dim = only !== 'all' && only !== p.r.g.id;
        const base = hex6(w.color) || p.r.g.color, rad = p.tree ? (id === p.r.T.start ? 15 : 12) : 8;
        const dn = done(id), ring = dn ? '#E8B53A' : w.pick ? '#E5141B' : '#fff';
        const clip = `mpc-${id}`;
        if (w.cover && p.tree) defs += `<clipPath id="${clip}"><circle cx="${p.x}" cy="${p.y}" r="${rad}"/></clipPath>`;
        const title = w.title.length > 10 ? w.title.slice(0, 9) + '…' : w.title;
        s += `<g class="mp-nd${p.tree ? '' : ' extra'}${dim ? ' dim' : ''}${sel === id ? ' sel' : ''}${hits.has(id) ? ' hit' : ''}" data-id="${id}" tabindex="0" role="button" aria-label="${esc(w.title)}${dn ? ', 다 봤어요' : ''}${w.pick ? ', 관리자 강추' : ''}">
          <circle class="ring" cx="${p.x}" cy="${p.y}" r="${rad + 7}" fill="none" stroke="#E0565B" stroke-width="3"/>
          <circle class="disc" cx="${p.x}" cy="${p.y}" r="${rad}" fill="${base}"/>
          ${p.tree ? `<text class="ini" x="${p.x}" y="${p.y + rad * .36}" text-anchor="middle" font-size="${rad * 1.0}" fill="${lum(base) > .62 ? '#1F2128' : '#fff'}">${esc(w.title[0])}</text>` : ''}
          ${w.cover && p.tree ? `<image href="${esc(w.cover)}" x="${p.x - rad}" y="${p.y - rad}" width="${rad * 2}" height="${rad * 2}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${clip})" referrerpolicy="no-referrer"/>` : ''}
          <circle cx="${p.x}" cy="${p.y}" r="${rad}" fill="none" stroke="${ring}" stroke-width="${w.pick || dn ? 3 : 2}"/>
          ${dn ? `<circle cx="${p.x + rad * .75}" cy="${p.y + rad * .75}" r="5" fill="#E8B53A" stroke="#fff" stroke-width="1.5"/>` : ''}
          ${p.tree ? `<text class="lbl" x="${p.x}" y="${p.y + rad + 14}" text-anchor="middle">${esc(title)}</text>` : ''}
        </g>`;
      });
      document.getElementById('mp-defs').innerHTML = defs;
      world.innerHTML = s;
      drawMini();
    }

    // ---------- 확대 · 이동 ----------
    let v = { k: 1, x: 0, y: 0 };
    const apply = () => { world.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`); document.getElementById('mp-zv').textContent = Math.round(v.k * 100) + '%'; canvas.classList.toggle('small', v.k < .75); moveMini(); };
    const to = (t, anim) => {
      if (!anim || document.body.classList.contains('no-anim')) { v = t; apply(); return; }
      const a = { ...v }, t0 = performance.now();
      const step = (now) => { const e = Math.min(1, (now - t0) / 450), q = 1 - Math.pow(1 - e, 3); v = { k: a.k + (t.k - a.k) * q, x: a.x + (t.x - a.x) * q, y: a.y + (t.y - a.y) * q }; apply(); if (e < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    const fitAll = (anim) => { const cw = canvas.clientWidth, ch = canvas.clientHeight; if (!cw) return; const k = Math.min(cw / (WW + 60), ch / (WH + 60)); to({ k, x: (cw - MAXW * k) / 2, y: (ch - WH * k) / 2 }, anim); };
    const zoomAt = (f, cx, cy) => { const k = Math.max(.3, Math.min(3, v.k * f)); v = { k, x: cx - (cx - v.x) * (k / v.k), y: cy - (cy - v.y) * (k / v.k) }; apply(); };
    const focus = (id) => { const p = P[id], k = Math.max(v.k, 1.4); to({ k, x: canvas.clientWidth / 2 - p.x * k, y: canvas.clientHeight / 2 - p.y * k }, true); };
    const focusRegion = (gid) => { const r = regions.find((x) => x.g.id === gid); if (!r) return; const cw = canvas.clientWidth, ch = canvas.clientHeight, k = Math.min(2, cw / (r.w + 80), ch / (r.h + 80)); to({ k, x: cw / 2 - (r.x + r.w / 2) * k, y: ch / 2 - (r.y + r.h / 2) * k }, true); };
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); const b = canvas.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - b.left, e.clientY - b.top); }, { passive: false });
    // 끌기 (마우스 · 손가락 하나) / 두 손가락 핀치 확대
    const pts = new Map();
    let drag = null, pinch = null, moved = false;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.mp-mini')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y }; moved = false; }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: v.k }; drag = null; }
    });
    const onMove = (e) => {
      const tip = document.getElementById('mp-tip');
      if (pts.has(e.pointerId)) {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pts.size === 2) {
          const [a, b] = [...pts.values()], bb = canvas.getBoundingClientRect();
          zoomAt((pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d) / v.k, (a.x + b.x) / 2 - bb.left, (a.y + b.y) / 2 - bb.top);
          moved = true;
        } else if (drag) {
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; canvas.classList.add('drag'); }
          if (moved) { v.x = drag.vx + dx; v.y = drag.vy + dy; apply(); }
        }
      }
      const nd = e.target.closest && e.target.closest('.mp-nd');
      if (tip && nd && !drag && e.pointerType === 'mouse') { const p = P[nd.dataset.id]; tip.textContent = WT.toon(nd.dataset.id).title; tip.style.left = `${p.x * v.k + v.x}px`; tip.style.top = `${p.y * v.k + v.y - 10}px`; tip.classList.add('on'); } else if (tip) tip.classList.remove('on');
    };
    const onUp = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { drag = null; canvas.classList.remove('drag'); } };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    canvas.addEventListener('click', (e) => {
      if (moved) { moved = false; return; }
      const nd = e.target.closest('.mp-nd'); if (nd) { select(nd.dataset.id); return; }
      const rg = e.target.closest('.mp-region'); if (rg) focusRegion(rg.dataset.r);
    });
    canvas.addEventListener('keydown', (e) => { const nd = e.target.closest('.mp-nd'); if (nd && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(nd.dataset.id); } });
    document.getElementById('mp-zi').onclick = () => zoomAt(1.25, canvas.clientWidth / 2, canvas.clientHeight / 2);
    document.getElementById('mp-zo').onclick = () => zoomAt(1 / 1.25, canvas.clientWidth / 2, canvas.clientHeight / 2);
    document.getElementById('mp-zf').onclick = () => fitAll(true);

    // ---------- 미니 지도 ----------
    function drawMini() {
      const m = document.getElementById('mp-mini'), k = Math.min(170 / MAXW, 104 / WH), ox = (170 - MAXW * k) / 2, oy = (104 - WH * k) / 2;
      m.dataset.k = k; m.dataset.ox = ox; m.dataset.oy = oy;
      m.innerHTML = regions.map((r) => `<rect x="${ox + r.x * k}" y="${oy + r.y * k}" width="${r.w * k}" height="${r.h * k}" rx="3" fill="${r.g.color}" fill-opacity=".55"/>`).join('') + '<rect id="mp-mv" fill="none" stroke="currentColor" stroke-width="1.5" rx="2"/>';
      moveMini();
    }
    function moveMini() {
      const m = document.getElementById('mp-mini'), mv = document.getElementById('mp-mv'); if (!mv) return;
      const k = +m.dataset.k, ox = +m.dataset.ox, oy = +m.dataset.oy;
      mv.setAttribute('x', ox + (-v.x / v.k) * k); mv.setAttribute('y', oy + (-v.y / v.k) * k);
      mv.setAttribute('width', canvas.clientWidth / v.k * k); mv.setAttribute('height', canvas.clientHeight / v.k * k);
    }
    document.querySelector('.mp-mini').addEventListener('click', (e) => { const m = document.getElementById('mp-mini'), b = m.getBoundingClientRect(), k = +m.dataset.k; const wx = (e.clientX - b.left - +m.dataset.ox) / k, wy = (e.clientY - b.top - +m.dataset.oy) / k; to({ k: v.k, x: canvas.clientWidth / 2 - wx * v.k, y: canvas.clientHeight / 2 - wy * v.k }, true); });

    // ---------- 정보 · 거르기 · 검색 ----------
    function info() {
      const box = document.getElementById('mp-info');
      if (!sel) { box.innerHTML = '<p class="mp-empty"><b>원을 눌러 웹툰을 확인해요.</b><br>장르 구역을 누르면 그 트리로 다가가고, 아래 칩으로 한 장르만 볼 수 있어요. 금빛 테두리는 다 본 웹툰, 빨간 테두리는 관리자 강추예요.</p>'; return; }
      const w = WT.toon(sel), p = P[sel], base = hex6(w.color) || p.r.g.color, rec = WT.recStars(w);
      const st = w.status === 'completed' ? '<span>완결</span>' : w.status === 'hiatus' ? '<span class="pause">휴재</span>' : `<span class="on">연재 중${(w.days || []).length ? ' · ' + w.days.map((d) => DAYK[d] || d).join('·') : ''}</span>`;
      const href = p.tree ? `#/tree/${p.r.g.id}/${sel}` : `#/library/${p.r.g.id}/${sel}`;
      box.innerHTML = `<div class="lb-head"><span class="lb-av" style="background:linear-gradient(150deg, ${shade(base, 1.2)}, ${shade(base, .55)})">${esc(w.title[0])}</span>
          <span class="lb-who"><b>${esc(w.title)}</b><small>${esc(w.author || '작가 미상')} · ${esc(w.platform || '웹툰')}</small></span>
          <a class="lb-cta mp-go" href="${href}">${p.tree ? `${esc(p.r.g.name)} 트리로` : '도서관에서 보기'} →</a></div>
        <blockquote class="lb-quote mp-quote">${esc(w.desc || '줄거리를 준비하고 있어요.')}</blockquote>
        <div class="lb-metas">${w.pick ? '<span class="pick">관리자 강추</span>' : ''}${st}${rec ? `<span class="star">${'★'.repeat(rec)}</span>` : ''}${WT.eps(w) ? `<span>${WT.eps(w)}화</span>` : ''}<span>${esc(p.r.g.name)}</span>${p.tree ? '<span class="intree">트리 웹툰</span>' : ''}${done(sel) ? '<span class="done">✓ 다 봤어요</span>' : ''}</div>`;
    }
    function select(id) { sel = id; draw(); info(); focus(id); }
    const chips = document.getElementById('mp-chips');
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-only]'); if (!b) return;
      only = b.dataset.only;
      chips.querySelectorAll('[data-only]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      draw();
      if (only === 'all') fitAll(true); else focusRegion(only);
    });
    document.getElementById('mp-extra').addEventListener('change', (e) => { showExtra = e.target.checked; draw(); });
    const q = document.getElementById('mp-q'), res = document.getElementById('mp-results');
    let comp = false;
    const search = () => {
      const val = q.value.trim().toLowerCase();
      const list = val ? Object.keys(P).filter((id) => { const w = WT.toon(id); return (w.title + (w.author || '')).toLowerCase().includes(val); }).slice(0, 7) : [];
      hits = new Set(list); draw();
      res.innerHTML = list.map((id) => `<button type="button" data-pick="${id}"><i style="background:${P[id].r.g.color}"></i>${esc(WT.toon(id).title)}<small>${esc(P[id].r.g.name)}</small></button>`).join('') || (val ? '<p>찾는 웹툰이 없어요</p>' : '');
      res.classList.toggle('on', !!val);
    };
    q.addEventListener('compositionstart', () => { comp = true; });
    q.addEventListener('compositionend', () => { comp = false; search(); });
    q.addEventListener('input', () => { if (!comp) search(); });
    res.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; res.classList.remove('on'); select(b.dataset.pick); });
    const onKey = (e) => { if (e.key === 'Escape') { sel = null; hits = new Set(); res.classList.remove('on'); draw(); info(); } };
    document.addEventListener('keydown', onKey);
    // 테마를 바꾸면 장르 이름 색을 다시 맞춰요
    const onTheme = (e) => { if (e.target.closest && e.target.closest('[data-theme-toggle]')) setTimeout(draw, 30); };
    document.addEventListener('click', onTheme);
    const onResize = () => fitAll(false);
    window.addEventListener('resize', onResize);
    WT.leaveView = () => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey); document.removeEventListener('click', onTheme);
    };
    draw(); info();
    requestAnimationFrame(() => fitAll(false));
  }

  WT.views.map = view;
})();
