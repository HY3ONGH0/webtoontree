/* 전체 지도: 마우스 드래그·휠, 손가락 드래그·핀치로 이동하고 확대해요 */
(function () {
  const esc = WT.esc;

  function view(params) {
    const M = WT.data.map;
    const L = WT.layoutMap(WT.data);   // 장르 무리를 겹치지 않게 자동 배치 (+ 관리자가 고정한 위치)
    const W = L.width, H = L.height;
    const S = WT.store.state;
    let ox = 0, oy = 0, s = 0.5;
    let pick = null;

    const regions = L.regions.map((r) => `<div class="region" aria-hidden="true" style="left:${r.cx - r.w / 2 - 90}px; top:${r.cy - r.h / 2 - 70}px; width:${r.w + 180}px; height:${r.h + 140}px; background:radial-gradient(ellipse at center, ${r.color}40 0%, ${r.color}18 45%, transparent 70%)"></div>
        <span class="region-label" aria-hidden="true" style="left:${r.cx - 200}px; top:${r.labelY}px; color:${r.color}; text-shadow:0 0 20px ${r.color}">${esc(r.name)}</span>`).join('');

    const links = L.links.map(([a, b]) => {
      const pa = L.nodes[a], pb = L.nodes[b];
      if (!pa || !pb) return '';
      const dx = pb[0] - pa[0], dy = pb[1] - pa[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      const ga = (WT.toon(a) || {}).genres || [], gb = (WT.toon(b) || {}).genres || [];
      const cross = !ga.some((x) => gb.includes(x));
      return `<div class="mlink${cross ? ' cross' : ''}" aria-hidden="true" style="left:${pa[0]}px; top:${pa[1] - 1.5}px; width:${len}px; transform:rotate(${ang}deg)"></div>`;
    }).join('');

    const colorOf = (w) => {
      const c1 = (WT.genre(w.genres[0]) || {}).color || '#5BB8FF';
      const c2 = (WT.genre(w.genres[1] || w.genres[0]) || {}).color || c1;
      return [c1, c2];
    };

    const nodes = Object.keys(L.nodes).filter((id) => WT.toon(id)).map((id) => {
      const w = WT.toon(id);
      const [x, y] = L.nodes[id];
      const [c1, c2] = colorOf(w);
      const done = (S.progress[id] || 0) >= WT.eps(w);
      const cp = L.compact && L.compact[id];   // 트리에 없는 웹툰: 작게, 원을 겹쳐 줄지어 (이름은 올리면 보여요)
      return `<div class="mnode-wrap${cp ? ' compact' : ''}" style="left:${x - 90}px; top:${y - (cp ? 26 : 34)}px; ${cp ? `z-index:${10 + Math.round(x / 40)}` : ''}">
        <button type="button" class="mnode" data-id="${id}" style="--c1:${c1}; --c2:${c2}" aria-label="${esc(w.title)}${done ? ', 완독' : ''}">${w.cover ? `<img class="mcover" src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false" onerror="this.nextElementSibling.hidden = false; this.remove()">` : ''}<span ${w.cover ? 'hidden' : ''}>${esc(w.title[0])}</span></button>
        <span>${esc(w.title)}${done ? ' ✓' : ''}</span>
      </div>`;
    }).join('');

    document.getElementById('app').innerHTML = `<div class="view">
      <div class="topbar">
        <div class="left">
          <a href="#/" class="icon-btn press" aria-label="홈으로">${WT.icon.back}</a>
          <div class="title-block"><h1 style="color:var(--gold)">전체 웹툰 지도</h1><span class="sub">끌어서 이동 · 휠이나 두 손가락으로 확대 · 별을 눌러 정보 보기</span></div>
        </div>
        <div class="search">
          <label for="map-search" class="sr">웹툰 검색</label>
          <input id="map-search" class="fld" type="search" placeholder="웹툰 제목, 작가 검색" autocomplete="off">
          ${WT.icon.search}
          <div class="search-results" id="search-results" hidden></div>
        </div>
        ${WT.topRight({ map: false })}
      </div>
      <div class="map-view" id="mapv">
        <div class="world" id="world" style="width:${W}px; height:${H}px">${regions}${links}${nodes}</div>
        <div class="map-ctl">
          <button type="button" class="press" data-z="in" aria-label="확대">+</button>
          <button type="button" class="press" data-z="out" aria-label="축소">−</button>
          <button type="button" class="press" data-z="fit" aria-label="전체 보기"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="4 9 4 4 9 4"/><polyline points="20 9 20 4 15 4"/><polyline points="4 15 4 20 9 20"/><polyline points="20 15 20 20 15 20"/></svg></button>
          <span id="zoom-pct">50%</span>
        </div>
        <div class="minimap" aria-hidden="true">
          ${L.regions.map((r) => `<div class="mr" style="left:${r.cx / W * 200 - 18}px; top:${r.cy / H * 117 - 14}px; background:${r.color}"></div>`).join('')}
          <div class="mv" id="mini-view"></div>
        </div>
        <div id="map-card-slot"></div>
      </div>
      ${WT.band('map')}
    </div>`;

    const mapv = document.getElementById('mapv');
    const world = document.getElementById('world');
    const cardSlot = document.getElementById('map-card-slot');

    function apply(smooth) {
      world.classList.toggle('smooth', !!smooth);
      world.style.transform = `translate(${ox}px, ${oy}px) scale(${s})`;
      document.getElementById('zoom-pct').textContent = `${Math.round(s * 100)}%`;
      const vw = mapv.clientWidth, vh = mapv.clientHeight;
      const mv = document.getElementById('mini-view');
      mv.style.left = `${-ox / s / W * 200}px`;
      mv.style.top = `${-oy / s / H * 117}px`;
      mv.style.width = `${vw / s / W * 200}px`;
      mv.style.height = `${vh / s / H * 117}px`;
    }
    function fitAll(smooth) {
      const vw = mapv.clientWidth, vh = mapv.clientHeight;
      // 웹툰과 장르 이름이 있는 범위만큼 화면에 꽉 차게 보여 줘요
      const pts = Object.values(L.nodes).concat(L.regions.map((r) => [r.cx, r.labelY]));
      let x0 = 0, y0 = 0, x1 = W, y1 = H;
      if (pts.length) {
        x0 = Math.min(...pts.map((p) => p[0])) - 140; x1 = Math.max(...pts.map((p) => p[0])) + 140;
        y0 = Math.min(...pts.map((p) => p[1])) - 90; y1 = Math.max(...pts.map((p) => p[1])) + 110;
      }
      s = Math.min(1.1, Math.min(vw / (x1 - x0), vh / (y1 - y0)));
      ox = (vw - (x1 - x0) * s) / 2 - x0 * s;
      oy = (vh - (y1 - y0) * s) / 2 - y0 * s;
      apply(smooth);
    }
    function zoomAt(f, cx, cy, smooth) {
      const ns = Math.min(1.8, Math.max(0.2, s * f));
      ox = cx - (cx - ox) * (ns / s);
      oy = cy - (cy - oy) * (ns / s);
      s = ns;
      apply(smooth);
    }
    function centerOn(id) {
      const p = L.nodes[id];
      if (!p) return;
      const vw = mapv.clientWidth, vh = mapv.clientHeight;
      s = Math.max(s, 0.8);
      ox = vw / 2 - p[0] * s;
      oy = vh / 2 - p[1] * s;
      apply(true);
    }

    function showCard(id) {
      pick = id;
      world.querySelectorAll('.mnode').forEach((b) => b.classList.toggle('is-sel', b.dataset.id === id));
      const w = WT.toon(id);
      const [c1, c2] = colorOf(w);
      const gnames = w.genres.map((x) => (WT.genre(x) || {}).name).filter(Boolean);
      const e = Math.min(WT.eps(w), S.progress[id] || 0);
      cardSlot.innerHTML = `<div class="map-card rpg"><span class="corner-b" aria-hidden="true"></span>
        <div class="mnode" style="--c1:${c1}; --c2:${c2}; width:52px; height:52px; font-size:24px; flex:0 0 auto; display:flex; align-items:center; justify-content:center; ${w.cover ? `background-image:url('${esc(w.cover)}')` : ''}" aria-hidden="true">${w.cover ? '' : esc(w.title[0])}</div>
        <div style="display:flex; flex-direction:column; gap:4px; min-width:0">
          <span style="font-family:var(--display); font-size:20px">${esc(w.title)}</span>
          <span class="hint" style="font-size:13px">${esc(gnames.join(' + '))}${gnames.length > 1 ? ' · 여러 장르에 걸친 작품' : ''} · ${esc(WT.schedule.label(w))} · ${e}화 / ${WT.eps(w)}화</span>
        </div>
        <a href="#/tree/${WT.treeGenreOf(id)}/${id}" class="btn btn-soft press" style="margin-left:auto; flex:0 0 auto; min-height:44px">트리에서 보기</a>
      </div>`;
    }

    // ---------- 포인터(마우스·터치·펜) ----------
    const pts = new Map();
    let start = null;
    let moved = 0;
    let pinch = null;

    mapv.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.map-ctl, .map-card')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      mapv.setPointerCapture(e.pointerId);
      if (pts.size === 1) {
        start = { x: e.clientX, y: e.clientY, ox, oy, target: e.target.closest('.mnode') };
        moved = 0;
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s, ox, oy, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        start = null;
      }
    });
    mapv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const rect = mapv.getBoundingClientRect();
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const ns = Math.min(1.8, Math.max(0.2, pinch.s * d / pinch.d));
        const cx = (a.x + b.x) / 2 - rect.left, cy = (a.y + b.y) / 2 - rect.top;
        const pcx = pinch.cx - rect.left, pcy = pinch.cy - rect.top;
        ox = cx - (pcx - pinch.ox) * (ns / pinch.s);
        oy = cy - (pcy - pinch.oy) * (ns / pinch.s);
        s = ns;
        apply(false);
        return;
      }
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      moved = Math.max(moved, Math.hypot(dx, dy));
      if (moved > 6) {
        mapv.classList.add('dragging');
        ox = start.ox + dx;
        oy = start.oy + dy;
        apply(false);
      }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (start && pts.size === 0) {
        if (moved <= 6 && start.target) showCard(start.target.dataset.id);
        start = null;
      }
      mapv.classList.remove('dragging');
    };
    mapv.addEventListener('pointerup', end);
    mapv.addEventListener('pointercancel', end);
    mapv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = mapv.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - rect.left, e.clientY - rect.top, false);
    }, { passive: false });
    // 키보드: 노드는 버튼이라 Tab과 Enter로도 고를 수 있어요
    world.addEventListener('keydown', (e) => {
      const b = e.target.closest('.mnode');
      if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showCard(b.dataset.id); centerOn(b.dataset.id); }
    });
    mapv.querySelector('.map-ctl').addEventListener('click', (e) => {
      const z = e.target.closest('[data-z]');
      if (!z) return;
      const cx = mapv.clientWidth / 2, cy = mapv.clientHeight / 2;
      if (z.dataset.z === 'in') zoomAt(1.25, cx, cy, true);
      else if (z.dataset.z === 'out') zoomAt(0.8, cx, cy, true);
      else fitAll(true);
    });

    // ---------- 검색 ----------
    const input = document.getElementById('map-search');
    const results = document.getElementById('search-results');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { results.hidden = true; return; }
      const hits = WT.data.webtoons.filter((w) => L.nodes[w.id] && (w.title.toLowerCase().includes(q) || (w.author || '').toLowerCase().includes(q))).slice(0, 6);
      results.innerHTML = hits.length ? hits.map((w) => `<button type="button" data-id="${w.id}">${esc(w.title)} <span class="hint">· ${esc(w.author)}</span></button>`).join('') : '<button type="button" disabled>찾는 웹툰이 없어요</button>';
      results.hidden = false;
    });
    results.addEventListener('click', (e) => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      results.hidden = true;
      input.value = WT.toon(b.dataset.id).title;
      centerOn(b.dataset.id);
      showCard(b.dataset.id);
    });

    const onResize = () => apply(false);
    window.addEventListener('resize', onResize);
    WT.leaveView = () => window.removeEventListener('resize', onResize);

    fitAll(false);
    if (params[0] && L.nodes[params[0]]) { centerOn(params[0]); showCard(params[0]); }
  }

  WT.views.map = view;
})();
