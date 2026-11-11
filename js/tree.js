/* 장르 트리 화면: 웹툰 노드, 캐릭터 이동, 상세 창(감상 진행 · 별점 · 댓글), 잠금 해제 */
(function () {
  const esc = WT.esc;
  const STAGE_W = 1000, STAGE_H = 560;   // 기본 판 크기 (웹툰이 많으면 판이 옆으로 넓어져요: WT.treeWidth)
  // 트리 화면은 관리자가 정한 위치를 세로 1.3배로 넓혀서 그려요 (원이 커져도 겹치지 않게)
  const KX = 1.0, KY = 1.3, BW = Math.round(STAGE_W * KX), BH = Math.round(STAGE_H * KY);
  const NODE = 108, NODE_START = 132;
  const scaleTree = (T0) => Object.assign({}, T0, { nodes: Object.fromEntries(Object.entries(T0.nodes || {}).map(([id, p]) => [id, [p[0] * KX, p[1] * KY]])) });

  /** 도서관에 들어가는 웹툰: 어느 장르 트리에도 넣지 않은 웹툰 */
  // 도서관에는 모든 웹툰이 꽂혀요 (트리에 있는 웹툰도 함께)
  const inTreeSet = () => new Set(Object.values(WT.data.trees || {}).flatMap((t) => Object.keys((t && t.nodes) || {})));
  WT.inTree = (id) => inTreeSet().has(id);
  function libraryBooks(gid) {
    return WT.data.webtoons
      .filter((w) => (gid === 'all' || (w.genres || []).includes(gid)))
      .sort((a, b) => (WT.recRank(b) - WT.recRank(a)));
  }
  WT.libraryBooks = libraryBooks;

  /**
   * 화면에 그릴 때만: 웹툰끼리(원 + 위 표시 + 아래 제목) 겹치면 살짝 떨어뜨려요.
   * 관리자가 정한 위치 데이터는 그대로예요. 위아래로 판을 넘치면 옆으로 비켜요.
   */
  function spread(T0) {
    const P = {};
    Object.keys(T0.nodes || {}).forEach((id) => { P[id] = T0.nodes[id].slice(); });
    const ids = Object.keys(P);
    const rOf = (id) => (id === T0.start ? NODE_START : NODE) / 2;
    const foot = (id) => { const [x, y] = P[id]; const r = rOf(id); return [x - 82, y - r - 18, x + 82, y + r + 62]; };
    const GAP = 10;
    const maxY = (id) => BH - rOf(id) - 64;   // 아래 제목이 판 밖으로 잘리지 않게
    const minY = (id) => rOf(id) + 40;              // 위 표시·캐릭터 자리
    ids.forEach((id) => { P[id][1] = Math.max(minY(id), Math.min(maxY(id), P[id][1])); });
    for (let it = 0; it < 200; it++) {
      let moved = false;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const A = foot(ids[i]), B = foot(ids[j]);
          const ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]) + GAP;
          const oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]) + GAP;
          if (ox <= 0 || oy <= 0) continue;
          moved = true;
          const pa = P[ids[i]], pb = P[ids[j]];
          const pinA = ids[i] === T0.start, pinB = ids[j] === T0.start;
          const fa = pinA ? 0 : pinB ? 1 : 0.5, fb = pinB ? 0 : pinA ? 1 : 0.5;
          // 덜 겹친 쪽으로 밀어요. 위아래가 판 밖으로 나가면 옆으로
          const lo = pb[1] >= pa[1] ? [ids[i], pa] : [ids[j], pb], hi = pb[1] >= pa[1] ? [ids[j], pb] : [ids[i], pa];
          const canY = lo[1][1] - oy * 0.5 >= minY(lo[0]) && hi[1][1] + oy * 0.5 <= maxY(hi[0]);
          if (oy < ox && canY) {
            const sgn = pb[1] >= pa[1] ? 1 : -1;
            pa[1] -= sgn * (oy * fa + 0.5); pb[1] += sgn * (oy * fb + 0.5);
          } else {
            const sgn = pb[0] >= pa[0] ? 1 : -1;
            pa[0] -= sgn * (ox * fa + 0.5); pb[0] += sgn * (ox * fb + 0.5);
          }
          [[ids[i], pa], [ids[j], pb]].forEach(([id, p]) => { p[0] = Math.max(80, p[0]); p[1] = Math.max(minY(id), Math.min(maxY(id), p[1])); });
        }
      }
      if (!moved) break;
    }
    ids.forEach((id) => { P[id] = [Math.round(P[id][0]), Math.round(P[id][1])]; });
    return Object.assign({}, T0, { nodes: P });
  }

  function view(params, lib) {
    const trees = WT.data.trees;
    const live = WT.liveGenres().map((x) => x.id);
    if (!live.length) { document.getElementById('app').innerHTML = '<div class="view" style="align-items:center; justify-content:center; padding:40px; text-align:center"><p>아직 트리가 준비되지 않았어요.</p><a class="btn press" href="#/">홈으로</a></div>'; return; }
    let gid, g, T;
    if (lib) {
      // 도서관: 장르별(또는 전체) 남은 웹툰을 책장에. 위치 대신 책 순서만 있어요
      gid = params[0] === 'all' || live.includes(params[0]) ? params[0] : 'all';
      g = gid === 'all' ? { id: 'all', name: '전체', color: '#E8C66A', desc: '', constellation: '' } : WT.genre(gid);
      T = { nodes: Object.fromEntries(libraryBooks(gid).map((w) => [w.id, [0, 0]])), links: [], start: null };
    } else {
      gid = live.includes(params[0]) ? params[0] : live[0];
      g = WT.genre(gid);
      T = spread(scaleTree(trees[gid]));
      WT.lastTree(gid);
    }
    const BASE = lib ? 'library' : 'tree';
    // 트리 끝 도서관 자리: 가장 오른쪽 웹툰보다 더 오른쪽
    const leaves = lib ? [] : Object.keys(T.nodes).filter((id) => WT.toon(id) && !T.links.some((l) => l.from === id && T.nodes[l.to]));
    const xs = Object.values(T.nodes).map((p) => p[0]);
    const LIB = lib ? null : (() => {
      const ly = leaves.length ? leaves.reduce((s, id) => s + T.nodes[id][1], 0) / leaves.length : BH / 2;
      return { x: (xs.length ? Math.max(...xs) : 100) + 175, y: Math.max(90, Math.min(BH - 110, ly)) };
    })();
    const SW = lib ? STAGE_W : Math.max(WT.treeWidth(T), BW, LIB.x + 100);   // 판 너비
    const ids = Object.keys(T.nodes).filter((id) => WT.toon(id));
    const S = WT.store.state;
    const rules = WT.settings().coins;
    const labels = WT.settings().labels || {};
    const hasChar = !!S.profile && !lib;
    // 세부 장르 마도서: 장르에 세부 장르가 있으면 도서관에 마도서로 꽂혀요 (세부 장르 없는 웹툰은 '그 밖의 이야기')
    const tomes = (() => {
      if (!lib || lib) return [];   // 새 도서관은 세부 장르를 칩으로 골라요 (마도서 없음)
      const list = g.subs.map((x) => ({ id: x.id, name: x.name, color: x.color, ids: ids.filter((id) => (WT.toon(id).subs || []).includes(x.id)) })).filter((x) => x.ids.length);
      const rest = ids.filter((id) => !g.subs.some((x) => (WT.toon(id).subs || []).includes(x.id)));
      if (rest.length) list.push({ id: '_rest', name: '그 밖의 이야기', color: '#9AA6C8', ids: rest });
      return list;
    })();

    let sel = null;
    const server = WT.api.on();
    const social = {};          // 웹툰ID → { avg, count, comments } (서버 모드)
    let charAt = T.start;
    let facing = 1;
    const sigs = {};

    // ---------- 상태 계산 ----------
    const total = (id) => WT.eps(WT.toon(id));
    const newEps = (id) => (S.rewarded[id + ':done'] && ep(id) < total(id) ? total(id) - ep(id) : 0);
    const ep = (id) => Math.min(total(id), S.progress[id] || 0);
    const isDone = (id) => ep(id) >= total(id);
    const cleared = (id) => isDone(id) || !!S.rewarded[id + ':done'];   // 한 번이라도 끝까지 본 적이 있으면
    const status = (id) => {
      if (cleared(id)) return 'done';
      if (ep(id) > 0) return 'reading';
      if (lib || id === T.start || S.unlocked[id]) return 'open';
      return T.links.some((l) => l.to === id && cleared(l.from)) ? 'open' : 'locked';
    };
    const pct = (id) => Math.round(ep(id) / total(id) * 100);
    const sizeOf = (id) => (id === T.start ? NODE_START : NODE);
    const statusText = { done: labels.done || '완독', reading: '보는 중', open: '안 봄', locked: '잠김' };

    // ---------- 그리기 ----------
    function fireHTML(f) {
      const embers = [[0.25, -0.2, 0], [0.6, -0.3, 0.6], [0.82, -0.1, 1], [0.05, -0.45, 0.3], [0.95, -0.5, 1.3]]
        .map(([x, y, d], i) => `<span class="ember" style="left:${f * x}px; top:${f * y}px; width:${6 - (i % 3)}px; height:${6 - (i % 3)}px; animation-delay:${d}s; animation-duration:${1.4 + (i % 3) * 0.25}s"></span>`).join('');
      return `<span class="fire" aria-hidden="true" style="left:0; top:0">
        <span class="glow" style="left:${-f * 0.55}px; top:${-f * 0.55}px; width:${f * 2.1}px; height:${f * 2.1}px"></span>
        <span class="outer" style="left:${-f * 0.6}px; top:${-f * 1.25}px; width:${f * 2.2}px; height:${f * 2.4}px"></span>
        <span class="inner" style="left:${-f * 0.1}px; top:${-f * 0.8}px; width:${f * 1.2}px; height:${f * 1.5}px"></span>
        ${embers}
      </span>`;
    }

    /** 관리자 추천 별: 원의 왼쪽 위 테두리를 따라 1~3개 */
    function recHTML(n, sz, hasNew) {
      if (!n) return '';
      const shift = hasNew ? 38 : 0;   // 왼쪽 위에 N이 있으면 별은 조금 아래로 비켜요
      const s = n === 1 ? 28 : n <= 3 ? 22 : 18;
      const r = sz / 2, R = r + (n <= 3 ? 3 : 7);
      const angles = [[135], [148, 122], [160, 135, 110], [178, 152, 126, 100], [190, 164, 138, 112, 86]][n - 1];
      return angles.map((a, i) => {
        const rad = (a + shift) * Math.PI / 180;
        const x = r + R * Math.cos(rad) - s / 2, y = r - R * Math.sin(rad) - s / 2;
        return `<span class="badge-rec" aria-hidden="true" style="left:${x.toFixed(1)}px; top:${y.toFixed(1)}px; width:${s}px; height:${s}px; animation-delay:${i * 0.3}s">${WT.icon.star}</span>`;
      }).join('');
    }

    // ---------- 트리 끝 도서관 ----------
    function libNodeHTML() {
      if (lib) return '';
      const n = libraryBooks(gid).length;
      // 끝 웹툰들 → 도서관 점선 화살표
      const lines = leaves.map((id, i) => {
        const a = T.nodes[id], b = [LIB.x, LIB.y];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        const ra = sizeOf(id) / 2 + 6, rb = 62;
        const sx = a[0] + ux * ra, sy = a[1] + uy * ra, ex = b[0] - ux * rb, ey = b[1] - uy * rb;
        return `<div class="link lib-link" data-liblink="${id}" aria-hidden="true" style="left:${sx}px; top:${sy - 1.5}px; width:${Math.max(0, len - ra - rb)}px; transform:rotate(${ang}deg)"></div>
          <div class="larrow lib-arrow" data-libarrow="${id}" aria-hidden="true" style="left:${ex - 16}px; top:${ey - 8}px; transform:rotate(${ang}deg)"></div>`;
      }).join('');
      return `${lines}<div class="lib-wrap" style="left:${LIB.x - 75}px; top:${LIB.y - 56}px">
          <button type="button" class="lib-node press" data-lib="1" id="lib-node" aria-label="${esc(g.name)} 도서관, 남은 웹툰 ${n}권"></button>
          <span class="node-label">도서관</span>
          <span class="node-sub" id="lib-sub"></span>
        </div>`;
    }
    function refreshLib() {
      const b = document.getElementById('lib-node');
      if (!b) return;
      const open = libOpen();
      b.classList.toggle('open', open);
      b.classList.toggle('locked', !open);
      b.innerHTML = `${WT.icon.library}${open ? '' : `<span class="lib-lock" aria-hidden="true">${WT.icon.lockIn}</span>`}`;
      b.setAttribute('aria-label', `${g.name} 도서관, ${open ? '열림' : '잠김'}, 남은 웹툰 ${libraryBooks(gid).length}권`);
      document.getElementById('lib-sub').textContent = `${open ? '' : '잠김 · '}웹툰 ${libraryBooks(gid).length}권`;
      leaves.forEach((id) => {
        const on = cleared(id);
        stage.querySelectorAll(`[data-liblink="${id}"], [data-libarrow="${id}"]`).forEach((el) => el.classList.toggle('lit', on));
      });
    }
    function enterLibrary(btn) {
      if (!libOpen()) {
        btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
        const names = leaves.map((id) => WT.toon(id).title).slice(0, 3).join(', ');
        WT.toast(`트리 끝 웹툰(${names}${leaves.length > 3 ? ' 등' : ''}) 중 하나를 ${labels.done || '완독'}하면 도서관이 열려요`);
        return;
      }
      // 문이 닫혔다가 도서관에서 열려요
      const d = document.createElement('div');
      d.className = 'lib-doors';
      d.setAttribute('aria-hidden', 'true');
      d.innerHTML = '<i class="l"></i><i class="r"></i><span>도서관</span>';
      document.body.appendChild(d);
      btn.classList.add('entering');
      if (document.body.classList.contains('no-anim')) { d.remove(); location.hash = `#/library/${gid}`; return; }
      setTimeout(() => { WT.libDoors = d; location.hash = `#/library/${gid}`; }, 520);
    }

    // ---------- 도서관 화면 ----------
    const hashN = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
    const LEATHER = ['#6B1F24', '#7A3B1A', '#1F3B5C', '#24452F', '#5A2E4F', '#8A6A1E', '#3C2A1A', '#2D4A55', '#7B2E2E', '#45391F'];
    function bookInner(id) {
      const w = WT.toon(id);
      const st = status(id);
      const h = hashN(id);
      const len = w.title.replace(/\s/g, '').length;
      const bh = Math.min(170, 132 + (h % 26) + Math.max(0, len - 7) * 6), bw = 34 + ((h >>> 5) % 10) + (len > 11 ? 8 : 0);
      const color = LEATHER[(h >>> 11) % LEATHER.length];
      const rec = w.pick ? 0 : WT.recStars(w);   // 관리자 강추면 별 대신 강추 표시
      const hot = WT.isHot(id);
      return `<button type="button" class="book st-${st}${sel === id ? ' is-sel' : ''}${hot ? ' is-hot' : ''}${w.pick ? ' is-pick' : ''}" data-node="${id}" style="--bh:${bh}px; --bw:${bw}px; --bc:${w.color || color}"
          aria-label="${esc(w.title)}${newEps(id) ? `, 새 화 ${newEps(id)}개` : ''}, ${esc(statusText[st])}${st === 'reading' ? ` ${ep(id)}화` : ''}${rec ? `, 추천 별 ${rec}개` : ''}${w.pick ? ', 관리자 강추' : ''}" title="${esc(w.title)}">
          <span class="spine-title">${esc(w.title)}</span>
          ${rec ? `<span class="spine-stars" aria-hidden="true">${'★'.repeat(rec)}</span>` : ''}
          ${st === 'reading' ? `<span class="ribbon" aria-hidden="true" style="--p:${pct(id)}"></span>` : ''}
          ${st === 'done' && !newEps(id) ? '<span class="done-mark" aria-hidden="true">✓</span>' : ''}
          ${newEps(id) ? '<span class="badge-new book-new" aria-hidden="true">N</span>' : ''}
          ${hot ? `<span class="spine-hot" aria-hidden="true">${WT.icon.flame}</span>` : ''}
          ${w.pick ? '<span class="pick-badge on-spine" aria-hidden="true">강추</span>' : ''}
        </button>`;
    }
    function libraryHTML() {
      const tabs = [{ id: 'all', name: '전체', color: '#E8C66A' }].concat(WT.liveGenres())
        .map((x) => ({ x, n: libraryBooks(x.id).length }))
        .filter(({ x, n }) => x.id === 'all' || n || x.id === gid)
        .map(({ x, n }) => `<a href="#/library/${x.id}" class="lib-tab press" style="--gc:${x.color}" ${x.id === gid ? 'aria-current="page"' : ''}>${esc(x.name)} <small>${n}</small></a>`).join('');
      return `<div class="library" id="wrap">
          <header class="lib-sign">
            <span class="lib-sign-quote">“트리의 끝에서, 이제부터는 내가 고르는 이야기”</span>
            <h2>${esc(g.name)} 도서관</h2>
            <span class="lib-sign-sub">트리에 없는 웹툰 ${ids.length}권 · ${tomes.length ? '마도서를 누르면 펼쳐져요' : '책등을 누르면 정보를 볼 수 있어요'}</span>
          </header>
          <nav class="lib-tabs" aria-label="도서관 장르">${tabs}</nav>
          <div class="shelves${tomes.length ? ' tome-shelves' : ''}" id="stage" role="list">
            ${!ids.length ? '<p class="lib-empty">아직 이 장르 도서관에 꽂힌 웹툰이 없어요. 관리자가 트리에 넣지 않은 웹툰을 올리면 여기에 꽂혀요.</p>'
              : tomes.length ? tomes.map((t, i) => tomeHTML(t, i)).join('')
              : ids.map((id) => `<div class="book-slot" role="listitem" data-wrap="${id}"></div>`).join('')}
          </div>
        </div>`;
    }
    // ---------- 새 도서관 화면: 책 표지를 가로로 넘겨 보는 서재 ----------
    const LB = { sub: 'all', sort: 'abc', q: '', idx: 0, list: [] };
    const DAYK = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
    const hex6 = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : null);
    const shadeC = (h, k) => { const n = parseInt(h.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0'); return '#' + c(n >> 16 & 255) + c(n >> 8 & 255) + c(n & 255); };
    const lumC = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };
    function lbTone(w) {
      let base = hex6(w.color) || hex6(WT.color && WT.color.cached(w.cover)) || (WT.genre((w.genres || [])[0]) || g).color || '#6A5ACD';
      if (lumC(base) > .86) base = shadeC(base, .78);
      if (lumC(base) < .06) base = '#22252E';
      return { c1: shadeC(base, 1.18), c2: shadeC(base, .55), ink: lumC(base) > .62 ? '#1F2128' : '#FFFFFF', base };
    }
    function lbBook(id) {
      const w = WT.toon(id), t = lbTone(w), st = status(id), nw = newEps(id);
      const tf = w.title.length <= 4 ? .2 : w.title.length <= 7 ? .15 : w.title.length <= 11 ? .12 : .1;
      return `<button type="button" class="lb-book" data-book="${id}" aria-label="${esc(w.title)}${nw ? `, 새 화 ${nw}개` : ''}${w.pick ? ', 관리자 강추' : ''}">
          <span class="lb-cover" style="--c1:${t.c1}; --c2:${t.c2}; --ci:${t.ink}; --tf:${tf}">
            <span class="lb-cv-in"><span class="lb-orn"></span><span class="lb-cv-top">WEBTOON TREE</span><span class="lb-cv-title">${esc(w.title)}</span><span class="lb-cv-rule"></span><span class="lb-cv-author">${esc(w.author || w.platform || '')}</span></span>
            ${w.cover ? `<img src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
            ${w.pick ? '<span class="lb-pick">관리자 강추</span>' : ''}
            ${nw ? '<span class="lb-new">N</span>' : ''}
            ${st === 'done' ? `<span class="lb-done">${WT.icon.check}</span>` : ''}
          </span>
          <span class="lb-t">${esc(w.title)}<i>${esc(w.platform || '')}</i></span>
        </button>`;
    }
    function lbHTML() {
      const st = WT.settings();
      const tabs = [{ id: 'all', name: '전체' }].concat(WT.liveGenres()).map((x) => ({ x, n: libraryBooks(x.id).length }))
        .filter(({ x, n }) => x.id === 'all' || n || x.id === gid)
        .map(({ x, n }) => `<a href="#/library/${x.id}" class="lb-tab" ${x.id === gid ? 'aria-current="page"' : ''}>${esc(x.name)} <small>${n}</small></a>`).join('');
      const subs = gid !== 'all' && (g.subs || []).length ? [{ id: 'all', name: '전체' }].concat(g.subs) : [];
      const ic = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${d}</svg>`;
      return `<div class="view lib-view lb-view">
        <main class="lb-shell">
          <section class="lb-main" id="lb-main">
            <div class="lb-top">
              <label class="lb-search">${WT.icon.search}<input id="lb-q" placeholder="웹툰 제목, 작가 검색" autocomplete="off" aria-label="도서관에서 검색"></label>
              <div class="lb-me">${WT.themeBtn()}${WT.userChip()}</div>
            </div>
            <div class="lb-hero">
              <div>
                <h1 class="lb-h1 one-line">모든 웹툰이 꽂힌 곳, 내가 고르는 이야기</h1>
                <p class="lb-lead">트리에 있는 웹툰도, 트리 밖 웹툰도 모두 여기 있어요. 장르와 세부 장르를 골라 마음에 드는 표지를 넘겨 보고, 끌리는 웹툰을 바로 시작해 보세요.</p>
                <div class="lb-ctas"><a class="lb-cta" id="lb-go" target="_blank" rel="noopener">1화 보러 가기 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg></a>
                  <button type="button" class="lb-cta ghost" id="lb-more">기록 · 별점 · 댓글</button></div>
              </div>
              <div class="lb-info" id="lb-info" aria-live="polite"></div>
            </div>
            <div class="lb-filters">
              <nav class="lb-tabs" aria-label="도서관 장르">${tabs}</nav>
              ${subs.length ? `<div class="lb-subs" role="group" aria-label="세부 장르">${subs.map((x) => `<button type="button" data-sub="${x.id}" aria-pressed="${x.id === 'all'}">${esc(x.name)}</button>`).join('')}</div>` : ''}
              <div class="lb-sort" role="group" aria-label="정렬"><button type="button" data-sort="abc" aria-pressed="true">ㄱㄴㄷ순</button><button type="button" data-sort="star" aria-pressed="false">추천순</button></div>
            </div>
            <div class="lb-shelf" id="wrap"><div class="lb-track" id="stage"></div></div>
            <div class="lb-foot">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>
              <span>이번 주에 사람들이 가장 많이 읽은 웹툰이 궁금하다면 <a href="#/top">이번 주 랭킹</a>을 확인해 보세요.</span>
              <span class="lb-count" id="lb-count"></span>
            </div>
          </section>
        </main>
        <div class="lb-dim" id="lb-dim" hidden></div>
        <div id="panel-slot" class="lb-drawer"></div>
      </div>`;
    }

    // ---------- 마도서 (세부 장르) ----------
    function tomeHTML(t, i) {
      const n = t.ids.length;
      const done = t.ids.filter(cleared).length;
      // 이름을 쉼표·띄어쓰기에서 줄을 나누고, 가장 긴 줄에 맞춰 책 너비와 글자 크기를 정해요
      // 쉼표마다 줄을 나누고, 긴 부분은 띄어쓰기에서 4~5글자씩 묶어요 (그 밖의 / 이야기)
      const lines = [];
      String(t.name).split(/\s*,\s*/).filter(Boolean).forEach((part) => {
        let cur = '';
        part.split(/\s+/).forEach((word) => {
          const next = cur ? cur + ' ' + word : word;
          if (cur && next.length > 5) { lines.push(cur); cur = word; } else cur = next;
        });
        if (cur) lines.push(cur);
      });
      const longest = Math.max(1, ...lines.map((x) => x.length));
      const th = 166 + (i % 3) * 4;
      const tw = Math.max(Math.min(118, longest * 15 + 30), Math.min(104, 66 + n * 3));
      const plateW = tw - 18, plateH = th - 106;
      const fs = Math.max(11, Math.min(17, (plateW - 12) / longest, (plateH - 16) / (lines.length * 1.32)));
      return `<div class="book-slot tome-slot" role="listitem"><button type="button" class="tome" data-tome="${esc(t.id)}" style="--tc:${esc(t.color)}; --tw:${tw}px; --th:${th}px; --fs:${fs.toFixed(1)}px; animation-delay:${i * 0.08}s"
          aria-label="${esc(t.name)} 마도서, 웹툰 ${n}개${done ? `, ${done}개 완독` : ''}. 펼치기">
          <span class="tome-band top" aria-hidden="true"></span>
          <span class="tome-sigil" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.6"/><polygon points="20,6 24,16 34,17 26,24 29,34 20,28 11,34 14,24 6,17 16,16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="20" cy="20" r="3" fill="currentColor"/></svg></span>
          <span class="tome-title">${lines.map((x) => `<span>${esc(x)}</span>`).join('')}</span>
          <span class="tome-count">${n}권</span>
          <span class="tome-band bottom" aria-hidden="true"></span>
          ${done ? `<span class="tome-done" aria-hidden="true">${done}</span>` : ''}
        </button></div>`;
    }
    let ratingAll = null;   // 웹툰ID → { avg, count }
    let ratingsFor = null;
    async function loadRatings(idsNeeded) {
      if (ratingAll && ratingsFor === 'all') return ratingAll;
      ratingAll = ratingAll || {};
      if (server) {
        try { const r = await WT.api.call('ratingSummary', {}); ratingAll = r.ratings || {}; ratingsFor = 'all'; }
        catch (e) {
          // 서버가 예전 버전이면: 이 마도서 웹툰들의 별점을 하나씩 (3개씩 나눠서) 받아요
          const need = (idsNeeded || []).filter((id) => !ratingAll[id]);
          for (let i = 0; i < need.length; i += 3) {
            await Promise.all(need.slice(i, i + 3).map(async (id) => {
              if (!social[id]) { try { const r = await WT.api.call('social', { webtoonId: id, token: S.token || '' }); social[id] = r.social; } catch (er) { social[id] = { avg: 0, count: 0, comments: [] }; } }
              ratingAll[id] = { avg: Number(social[id].avg) || 0, count: Number(social[id].count) || 0 };
            }));
          }
        }
      }
      // 이미 받아 둔 별점(상세 창)도 합쳐요
      Object.keys(social).forEach((id) => { if (social[id] && social[id].count) ratingAll[id] = { avg: Number(social[id].avg) || 0, count: Number(social[id].count) || 0 }; });
      // 서버에 없거나 혼자 모드면 내 별점이라도
      Object.keys(S.ratings || {}).forEach((id) => { if (!ratingAll[id]) ratingAll[id] = { avg: Number(S.ratings[id]) || 0, count: 1, mine: true }; });
      return ratingAll;
    }
    const byTitle = (a, b) => WT.toon(a).title.localeCompare(WT.toon(b).title, 'ko');
    const TOC_PER_PAGE = 12;
    function openTome(tid) {
      const t = tomes.find((x) => x.id === tid);
      if (!t) return;
      let sort = 'title';
      let order = t.ids.slice().sort(byTitle);
      let at = 0;   // 펼친 쪽 번호 (0 = 첫 목차 펼침)
      const bg = document.createElement('div');
      bg.className = 'grim-bg';
      // 책을 펴 둔 동안 뒤 화면은 스크롤되지 않아요
      const prevOverflow = [document.documentElement.style.overflow, document.body.style.overflow];
      document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
      bg.setAttribute('role', 'dialog');
      bg.setAttribute('aria-modal', 'true');
      bg.setAttribute('aria-label', `${t.name} 마도서`);
      document.body.appendChild(bg);
      const tocSpreads = () => Math.max(1, Math.ceil(order.length / (TOC_PER_PAGE * 2)));
      const total = () => tocSpreads() + order.length;
      const stars = (v) => { const r = Math.round(v * 2) / 2; return '★'.repeat(Math.floor(r)) + (r % 1 ? '☆' : '') ; };
      const rateText = (id) => {
        const r = ratingAll && ratingAll[id];
        if (!r || !r.count) return '<span class="g-norate">아직 별점이 없어요</span>';
        return `<span class="g-stars">${stars(r.avg)}</span> <b>${r.avg.toFixed(1)}</b> <span class="g-cnt">${r.mine ? '내 별점' : `(${r.count}명)`}</span>`;
      };
      const tocPage = (k) => {
        const from = k * TOC_PER_PAGE;
        const part = order.slice(from, from + TOC_PER_PAGE);
        if (!part.length) {
          // 목차가 한 쪽에 다 들어가면, 오른쪽은 마도서 문양과 읽는 법
          return `<div class="g-page-in g-ornament">
              <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" stroke-width="0.6"/><polygon points="20,6 24,16 34,17 26,24 29,34 20,28 11,34 14,24 6,17 16,16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="20" cy="20" r="2.5" fill="currentColor"/></svg>
              <b>${esc(t.name)}</b>
              <p>이 마도서에는 웹툰 ${order.length}편이 담겨 있어요.<br>목차에서 제목을 누르거나<br>다음 장(→ 키)으로 한 장씩 넘겨 보세요.</p>
            </div>`;
        }
        return `<div class="g-page-in">
            ${k % 2 === 0 ? `<h3 class="g-toc-h">${k === 0 ? '목차' : '목차 (이어서)'}</h3>` : '<h3 class="g-toc-h" aria-hidden="true">&nbsp;</h3>'}
            <ol class="g-toc" start="${from + 1}">${part.map((id, j) => {
              const w = WT.toon(id);
              const rr = ratingAll && ratingAll[id];
              const rateTag = sort === 'rate' ? `<span class="g-toc-r">${rr && rr.count ? `★ ${rr.avg.toFixed(1)}` : '별점 없음'}</span>` : '';
              return `<li><button type="button" data-go="${tocSpreads() + from + j}"><span class="g-toc-t">${esc(w.title)}</span>${rateTag}<span class="g-dots" aria-hidden="true"></span><span class="g-toc-p">${tocSpreads() + from + j + 1}장</span></button></li>`;
            }).join('')}</ol>
          </div>`;
      };
      const coverPage = (id) => {
        const w = WT.toon(id);
        const tone = w.color || WT.color.cached(w.cover);
        // 왼쪽 면도 오른쪽 상세 창과 같은 색 한 가지로 칠해요 (표지 액자만 빼고)
        return `<div class="g-page-in g-cover-page${tone ? ' toned' : ''}" data-cid="${esc(id)}" style="${tone ? WT.color.styleOf(tone) : ''}">
            <div class="g-frame">${w.cover ? `<img src="${esc(w.cover)}" alt="${esc(w.title)} 표지" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="g-cover-fallback">${esc(w.title)}</span></div>
            <span class="g-folio">${order.indexOf(id) + 1} / ${order.length}</span>
          </div>`;
      };
      const descPage = (id) => {
        const w = WT.toon(id);
        const st = status(id);
        return `<div class="g-page-in g-desc-page">
            <h3 class="g-title">${esc(w.title)}</h3>
            <p class="g-meta">${esc([w.author, w.platform].filter(Boolean).join(' · '))}</p>
            <p class="g-meta"><span class="node-tag tag-${WT.schedule.status(w)}">${esc(WT.schedule.label(w))}</span> ${!w.pick && WT.recStars(w) ? `<span class="g-rec" aria-label="추천 별 ${WT.recStars(w)}개">${'★'.repeat(WT.recStars(w))}</span>` : ''} ${w.pick ? '<span class="pick-badge">관리자 강추</span>' : ''}</p>
            <p class="g-rate">${rateText(id)}</p>
            <div class="g-desc">${w.desc ? esc(w.desc).replace(/\n/g, '<br>') : '<span class="g-norate">아직 설명이 없어요.</span>'}</div>
            ${(w.tags || []).length ? `<p class="g-tags">${w.tags.map((x) => `<span>#${esc(x)}</span>`).join('')}</p>` : ''}
            <p class="g-mine">${st === 'done' ? '✓ 완독했어요' : st === 'reading' ? `${ep(id)}화까지 봤어요 (${pct(id)}%)` : '아직 안 봤어요'}</p>
            <div class="g-actions">
              <button type="button" class="btn btn-gold btn-sm press" data-open="${id}">자세히 보기 · 기록하기</button>
              ${w.url ? `<a class="btn btn-sm press" href="${esc(w.url)}" target="_blank" rel="noopener">보러 가기</a>` : ''}
            </div>
          </div>`;
      };
      // 오른쪽 면에는 상세 창(진행·별점·댓글·버튼) 전체를 그대로 펼쳐요
      const home = slot.parentNode, homeNext = slot.nextSibling;
      const parkSlot = () => { if (slot.parentNode !== home) home.insertBefore(slot, homeNext); };
      const idAt = (k) => (k < tocSpreads() ? null : order[k - tocSpreads()]);
      const hostHTML = (id, inner) => `<div class="g-page-in g-host" data-host="${id}">${inner || ''}</div>`;
      const pages = (k, snapshot) => (k < tocSpreads() ? [tocPage(k * 2), tocPage(k * 2 + 1)] : [coverPage(idAt(k)), hostHTML(idAt(k), snapshot)]);
      const mountDetail = () => {
        const id = idAt(at);
        if (!id) { parkSlot(); if (sel) { sel = null; renderPanel(false); refreshNodes(); } return; }
        const host = bg.querySelector(`[data-host="${CSS.escape(id)}"]`);
        if (!host) return;
        host.innerHTML = '';
        host.appendChild(slot);
        if (sel !== id) select(id, { keepHash: true }); else renderPanel(false);
        // 색을 아직 몰랐으면 표지에서 뽑아 왼쪽 면에도 칠해요
        const w = WT.toon(id);
        const left = bg.querySelector(`.g-cover-page[data-cid="${CSS.escape(id)}"]`);
        if (left && !left.classList.contains('toned') && w.cover) {
          WT.color.extract(w.cover).then((c) => { if (c && left.isConnected) { left.setAttribute('style', WT.color.styleOf(c)); left.classList.add('toned'); } });
        }
      };
      let drawn = false;   // 책이 떠오르는 효과는 처음 펼칠 때만
      const draw = () => {
        parkSlot();
        const [L, Rr] = pages(at);
        bg.innerHTML = `<div class="grim${drawn ? ' no-in' : ''}" style="--tc:${esc(t.color)}">
            <div class="grim-top">
              <span class="grim-name">${esc(t.name)} <small>${order.length}권</small></span>
              <div class="seg grim-sort" role="tablist" aria-label="정렬">
                <button type="button" role="tab" aria-selected="${sort === 'title'}" data-sort="title">ㄱㄴㄷ순</button>
                <button type="button" role="tab" aria-selected="${sort === 'rate'}" data-sort="rate">별점순</button>
              </div>
              <button type="button" class="icon-btn press grim-x" data-x aria-label="마도서 닫기">✕</button>
            </div>
            <div class="grim-book" id="grim-book" style="--lt:${(8 + 18 * (total() > 1 ? at / (total() - 1) : 0)).toFixed(1)}px; --rt:${(8 + 18 * (total() > 1 ? 1 - at / (total() - 1) : 1)).toFixed(1)}px">
              <span class="g-stack l" aria-hidden="true"></span><span class="g-stack r" aria-hidden="true"></span><span class="g-stack b" aria-hidden="true"></span>
              <div class="g-page left">${L}</div>
              <div class="g-page right">${Rr}</div>
              <span class="g-spine" aria-hidden="true"></span>
            </div>
            <div class="grim-nav">
              <button type="button" class="btn btn-sm press" data-flip="-1" ${at === 0 ? 'disabled' : ''} aria-label="앞 장">◀ 앞 장</button>
              <span class="grim-at">${at < tocSpreads() ? '목차' : `${at - tocSpreads() + 1} / ${order.length}`}</span>
              <button type="button" class="btn btn-sm press" data-flip="1" ${at >= total() - 1 ? 'disabled' : ''} aria-label="다음 장">다음 장 ▶</button>
            </div>
          </div>`;
        mountDetail();
        drawn = true;
      };
      const flip = (to) => {
        to = Math.max(0, Math.min(total() - 1, to));
        if (to === at) return;
        const dir = to > at ? 1 : -1;
        const book = document.getElementById('grim-book');
        const reduce = document.body.classList.contains('no-anim') || window.innerWidth < 720;
        if (!book || reduce) { at = to; draw(); return; }
        // 넘어가는 동안에도 다음 장 오른쪽 면은 완성된 상세 창 모습 그대로 보여요
        const old = pages(at, slot.parentNode !== home ? slot.innerHTML : ''), nw = pages(to, idAt(to) ? panelHTML(idAt(to)) : '');
        parkSlot();
        at = to;
        // 새 펼침면을 아래에 깔고, 넘어가는 종이 한 장을 위에 올려요
        const leaf = document.createElement('div');
        leaf.className = `g-leaf ${dir > 0 ? 'fwd' : 'back'}`;
        leaf.innerHTML = dir > 0
          ? `<div class="g-face front g-page right">${old[1]}</div><div class="g-face back g-page left">${nw[0]}</div>`
          : `<div class="g-face front g-page left">${old[0]}</div><div class="g-face back g-page right">${nw[1]}</div>`;
        const under = dir > 0 ? [old[0], nw[1]] : [nw[0], old[1]];
        book.querySelector('.g-page.left').innerHTML = under[0];
        book.querySelector('.g-page.right').innerHTML = under[1];
        book.appendChild(leaf);
        leaf.addEventListener('animationend', () => { draw(); }, { once: true });
      };
      const onKeyG = (e) => {
        if (e.key !== 'Escape' && e.target && e.target.closest && e.target.closest('input, textarea, select')) return;   // 화수·댓글 입력 중엔 넘기지 않아요
        if (e.key === 'Escape') { e.preventDefault(); shut(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); flip(at + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); flip(at - 1); }
      };
      const shut = (then) => {
        document.removeEventListener('keydown', onKeyG, true);
        parkSlot();
        if (!then && sel) { sel = null; renderPanel(false); refreshNodes(); history.replaceState(null, '', `#/${BASE}/${gid}`); }
        document.documentElement.style.overflow = prevOverflow[0]; document.body.style.overflow = prevOverflow[1];
        bg.classList.add('closing');
        setTimeout(() => { bg.remove(); if (then) then(); else { const b = stage.querySelector(`[data-tome="${CSS.escape(tid)}"]`); if (b) b.focus(); } }, 280);
      };
      document.addEventListener('keydown', onKeyG, true);
      let sx = null;
      bg.addEventListener('pointerdown', (e) => { sx = e.clientX; });
      bg.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 60 && e.pointerType !== 'mouse') flip(at + (e.clientX < sx ? 1 : -1)); sx = null; });
      bg.addEventListener('click', (e) => {
        if (e.target === bg || e.target.closest('[data-x]')) { shut(); return; }
        const f = e.target.closest('[data-flip]'); if (f) { flip(at + Number(f.dataset.flip)); return; }
        const go = e.target.closest('[data-go]'); if (go) { flip(Number(go.dataset.go)); return; }
        const o = e.target.closest('[data-open]'); if (o) { const id = o.dataset.open; shut(() => select(id)); return; }
        if (e.target.closest('.g-host [data-act="close"]')) { e.stopPropagation(); shut(); return; }
        const s = e.target.closest('[data-sort]');
        if (s && s.dataset.sort !== sort) {
          sort = s.dataset.sort;
          if (sort === 'rate' && !ratingAll) { WT.toast('별점을 불러오는 중이에요'); }
          (sort === 'rate' ? loadRatings(t.ids) : Promise.resolve()).then(() => {
          if (!document.body.contains(bg)) return;
          if (sort === 'rate' && !t.ids.some((id) => ratingAll[id] && ratingAll[id].count)) WT.toast('아직 이 마도서에는 별점이 있는 웹툰이 없어요');
          order = t.ids.slice().sort(sort === 'rate'
            ? (a, b) => ((ratingAll[b] || {}).avg || 0) - ((ratingAll[a] || {}).avg || 0) || ((ratingAll[b] || {}).count || 0) - ((ratingAll[a] || {}).count || 0) || byTitle(a, b)
            : byTitle);
          at = 0;   // 목차부터 다시 (바뀐 순서를 목차에서 확인)
          draw();
          });
        }
      });
      draw();
      bg.querySelector('[data-x]').focus();
      loadRatings(t.ids).then(() => { if (document.body.contains(bg) && at < tocSpreads()) draw(); });
    }

    function nodeInner(id) {
      const w = WT.toon(id);
      const st = status(id);
      const sz = sizeOf(id);
      const hot = WT.isHot(id) && st !== 'locked';
      const nw = newEps(id);
      let sub = st === 'reading' ? `${ep(id)}화 · ${pct(id)}%` : statusText[st];
      if (hot) sub = `오늘 폭주 · ${sub}`;
      // 원 아래에는 제목만. 진행은 원 둘레 띠, 새 화는 N, 폭주는 불꽃, 잠김·완독은 원 모양으로 보여 줘요 (화면 읽기용 글은 aria-label 에)
      const showSub = false;
      const subCls = hot ? 'hot' : st === 'reading' ? 'reading' : st === 'done' ? 'done' : '';
      const cover = w.cover ? `<img class="cover" src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.nextElementSibling.hidden = false; this.remove()">` : '';
      const rec = w.pick ? 0 : WT.recStars(w);   // 관리자 강추면 별 대신 강추 표시
      const stName = WT.schedule.status(w);
      const days = (w.days || []).length >= 7 ? '매일' : WT.schedule.daysLabel(w);
      const tag = stName === 'ongoing' && days
        ? `<span class="node-tag tag-ongoing two" aria-hidden="true">연재 중<small>${esc(days)}</small></span>`
        : `<span class="node-tag tag-${stName}" aria-hidden="true">${esc(WT.schedule.STATUS_KO[stName])}</span>`;
      const isStart = id === T.start;
      const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5L2.6 9.4l6.5-.8z"/></svg>';
      const meta = rec ? `<span class="nm-stars" aria-hidden="true">${STAR.repeat(rec)}</span>` : '';
      // 자리 정하기: 위 가운데 = 관리자 강추(또는 입문작) · 오른쪽 = 연재 상태 · 오른쪽 아래 = 다 봄 체크 / 자물쇠 · 왼쪽 위 = 새 화 N · 아래 = 제목과 한 줄 정보
      return `<div class="node-box${st === 'locked' ? ' is-locked' : ''}${w.pick ? ' is-pick' : ''}" style="--sz:${sz}px">
          ${w.pick ? '<span class="pick-glow" aria-hidden="true"></span><span class="pick-orbit" aria-hidden="true"></span><span class="pick-ring" aria-hidden="true"></span>' : ''}
          ${st === 'open' ? '<span class="fx-ripple" aria-hidden="true"></span><span class="fx-ripple two" aria-hidden="true"></span>' : ''}
          ${hot ? fireHTML(sz) : ''}
          ${st === 'reading' ? `<span class="ring" style="--sz:${sz}px; --pct:${pct(id)}%"></span>` : ''}
          <button type="button" class="node st-${st}${hot ? ' is-hot' : ''}${sel === id ? ' is-sel' : ''}" style="--sz:${sz}px" data-node="${id}"
            aria-label="${esc(w.title)}${nw ? `, 새 화 ${nw}개` : ''}, ${esc(sub)}, ${esc(WT.schedule.label(w))}${rec ? `, 추천 별 ${rec}개` : ''}${w.pick ? ', 관리자 강추' : ''}">
            ${cover}<span class="letter" ${w.cover ? 'hidden' : ''}>${esc(w.title[0])}</span>
          </button>
          ${st === 'done' ? `<span class="badge-done" aria-hidden="true">${WT.icon.check}</span>` : ''}
          ${st === 'locked' ? `<span class="badge-lock" aria-hidden="true">${WT.icon.lockIn}</span>` : ''}
          ${nw ? '<span class="badge-new" aria-hidden="true">N</span>' : ''}
          ${w.pick ? '<span class="pick-badge on-node" aria-hidden="true">관리자 강추</span>' : isStart ? '<span class="start-flag" aria-hidden="true">입문작</span>' : ''}
          ${tag}
        </div>
        <span class="node-label${st === 'locked' ? ' dim' : ''}">${esc(w.title)}</span>
        ${meta ? `<span class="node-meta" aria-hidden="true">${meta}</span>` : ''}
        ${showSub ? `<span class="node-sub ${subCls}">${esc(sub)}</span>` : ''}`;
    }

    function linkHTML(l, i) {
      const a = T.nodes[l.from], b = T.nodes[l.to];
      if (!a || !b) return '';
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      const ra = sizeOf(l.from) / 2 + 6, rb = sizeOf(l.to) / 2 + 8;     // 원 가장자리에서 띄워서
      const sx = a[0] + ux * ra, sy = a[1] + uy * ra;
      const ex = b[0] - ux * rb, ey = b[1] - uy * rb;
      const w = Math.max(0, len - ra - rb);
      const mx = (sx + ex) / 2, my = (sy + ey) / 2;
      // 선 → 가운데 꺾쇠(>) → 끝 화살촉(▶): 어느 웹툰에서 어느 웹툰으로 이어지는지 보여요
      return `<div class="link" data-link="${i}" aria-hidden="true" style="left:${sx}px; top:${sy - 1.5}px; width:${w}px; transform:rotate(${ang}deg)"><i class="flow"></i></div>
        <div class="ldot" data-dot="${i}" aria-hidden="true" style="left:${mx - 7}px; top:${my - 7}px; transform:rotate(${ang}deg)"></div>
        <div class="larrow" data-arrow="${i}" aria-hidden="true" style="left:${ex - 16}px; top:${ey - 8}px; transform:rotate(${ang}deg)"></div>`;
    }

    const counts = () => {
      const d = ids.filter(cleared).length;
      const r = ids.filter((id) => status(id) === 'reading').length;
      return { d, r };
    };

    const c0 = counts();
    const libOpen = () => !lib && (leaves.some(cleared) || !!S.unlocked['lib:' + gid]);
    // 도서관에서 장르 탭을 바꿀 땐 화면이 깜박이지 않게 등장 효과를 꺼요
    const noEnter = lib && Date.now() - (WT.libLeftAt || 0) < 1500;
    document.getElementById('app').innerHTML = lib ? lbHTML() : `<div class="view${lib ? ' lib-view' : ' tree-view'}${noEnter ? ' no-enter' : ''}" style="--gc:${g.color}">
      <div class="topbar">
        <div class="left">
          <a href="${lib ? (gid === 'all' ? '#/' : `#/tree/${gid}`) : '#/'}" class="icon-btn press" aria-label="${lib ? '트리로 돌아가기' : '홈으로'}">${WT.icon.back}</a>
          <div class="title-block">
            <div style="display:flex; align-items:baseline; gap:10px; flex-wrap:wrap">
              <h1 style="color:${g.color}">${esc(g.name)}${lib ? ' 도서관' : ''}</h1>
              <span class="sub">${lib ? '트리 끝에서 만나는, 마음 가는 대로 골라 보는 웹툰' : esc(g.desc || '')}</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap">
              <div class="progress" role="progressbar" aria-label="장르 진행률" aria-valuemin="0" aria-valuemax="${ids.length}" aria-valuenow="${c0.d}"><div id="prog-bar" style="width:${c0.d / (ids.length || 1) * 100}%"></div></div>
              <span id="prog-text" style="font-size:13px; color:var(--gold); font-weight:700">${c0.d} / ${ids.length} ${esc(labels.done || '완독')} · 보는 중 ${c0.r}</span>
              <span class="legend"><span>${WT.icon.starSmall}추천</span><span><span class="pick-badge sm">강추</span></span><span>${WT.icon.flame}오늘 폭주</span><span class="kbd-hint"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> 키로 이동</span></span>
            </div>
          </div>
        </div>
        ${WT.topRight()}
      </div>
      <main class="tree-main${lib ? '' : ' reserve'}">
        ${lib ? libraryHTML() : `<div class="stage-wrap stage-anim" id="wrap">
          <div class="stage-sizer" id="sizer">
          <div class="stage" id="stage" style="width:${SW}px; height:${BH}px">
            ${T.links.map(linkHTML).join('')}
            ${ids.map((id) => {
              const [x, y] = T.nodes[id];
              return `<div class="node-wrap" data-wrap="${id}" style="left:${x - 85}px; top:${y - sizeOf(id) / 2}px"></div>`;
            }).join('')}
            ${libNodeHTML()}
            ${hasChar ? `<div class="char" id="char" aria-hidden="true"><div class="hop" id="hop"><div class="flip" id="flip"><div class="bob">${WT.charSVG(WT.currentLook(), 56)}</div></div></div><span class="bubble" id="bubble">어디로 갈까?</span></div>` : ''}
          </div>
          </div>
          <div class="more-hint-row" aria-hidden="true"><span class="more-hint">옆으로 밀어서 더 보기 →</span></div>
        </div>`}
        <div id="panel-slot"></div>
      </main>
      ${WT.band(lib ? null : gid)}
    </div>`;

    const stage = document.getElementById('stage');
    const wrap = document.getElementById('wrap');
    const slot = document.getElementById('panel-slot');

    // ---------- 새 도서관: 고르기 · 거르기 · 넘기기 ----------
    function lbBuild() {
      const q = LB.q;
      LB.list = ids.filter((id) => { const w = WT.toon(id); return (LB.sub === 'all' || (w.subs || []).includes(LB.sub)) && (!q || (w.title + (w.author || '')).toLowerCase().includes(q)); });
      LB.list.sort(LB.sort === 'star' ? (a, b) => (WT.recRank(WT.toon(b)) - WT.recRank(WT.toon(a))) || WT.toon(a).title.localeCompare(WT.toon(b).title, 'ko') : (a, b) => WT.toon(a).title.localeCompare(WT.toon(b).title, 'ko'));
      LB.idx = Math.min(LB.idx, Math.max(0, LB.list.length - 1));
      stage.innerHTML = LB.list.length ? LB.list.map((id) => `<div class="lb-slot" data-wrap="${id}"></div>`).join('')
        : `<p class="lb-empty">${ids.length ? '조건에 맞는 웹툰이 없어요.' : '아직 이 장르 도서관에 꽂힌 웹툰이 없어요.'}</p>`;
      Object.keys(sigs).forEach((k) => delete sigs[k]);
      refreshNodes(true);
      lbShow();
    }
    function lbShow() {
      const main = document.getElementById('lb-main');
      if (!main) return;
      // 선반 높이 = 본문에서 위·아래 줄을 뺀 나머지 → 책 크기를 화면 높이에 맞춰요 (고른 책은 1.3배)
      const cs = getComputedStyle(main);
      const used = [...main.children].filter((c) => c !== wrap).reduce((a, c) => a + c.offsetHeight, 0) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + 14;
      const h = Math.max(250, main.clientHeight - used);
      const wide = window.innerWidth > 860;
      wrap.style.height = wide ? `${h}px` : '';
      const bw = wide ? Math.max(90, Math.min(190, (h - 96) / 1.417 / 1.3)) : 120;
      // 크기는 칸(.lb-slot)에 걸어 둬요 → 책을 다시 그려도(진행 기록 등) 크기가 유지돼요
      [...stage.querySelectorAll('.lb-slot')].forEach((el, i) => { el.style.setProperty('--bw', `${Math.round(i === LB.idx ? bw * 1.3 : bw)}px`); el.classList.toggle('on', i === LB.idx); });
      const gap = wide ? 44 : 22;
      const shift = Math.max(0, LB.idx * (bw + gap) - (wide ? bw + gap : 0));
      stage.style.transform = `translateX(${-shift}px)`;
      document.getElementById('lb-count').innerHTML = LB.list.length ? `<b>${String(LB.idx + 1).padStart(2, '0')}</b> / ${LB.list.length}권` : '0권';
      lbInfo();
    }
    function lbInfo() {
      const box = document.getElementById('lb-info'), go = document.getElementById('lb-go'), more = document.getElementById('lb-more');
      const id = LB.list[LB.idx];
      if (!id) { box.innerHTML = ''; go.hidden = true; more.hidden = true; return; }
      const w = WT.toon(id), t = lbTone(w), st = status(id), rec = w.pick ? 0 : WT.recStars(w);
      const gs = (w.genres || []).map((x) => WT.genre(x)).filter(Boolean);
      const state = w.status === 'completed' ? '<span>완결</span>' : w.status === 'hiatus' ? '<span class="pause">휴재</span>' : `<span class="on">연재 중${(w.days || []).length ? ' · ' + w.days.map((d) => DAYK[d] || d).join('·') : ''}</span>`;
      box.innerHTML = `<div class="lb-head"><span class="lb-av" style="background:linear-gradient(150deg, ${t.c1}, ${t.c2})">${esc((w.author || w.title)[0])}</span>
          <span class="lb-who"><b>${esc(w.author || '작가 미상')}</b><small>작가 · ${esc(w.platform || '웹툰')}</small></span>
          <span class="lb-arrows"><button type="button" data-step="-1" aria-label="이전 책">←</button><button type="button" data-step="1" aria-label="다음 책">→</button></span></div>
        <blockquote class="lb-quote">“<b>${esc(w.title)}</b>” ${esc(w.desc || '줄거리를 준비하고 있어요.')}</blockquote>
        <div class="lb-metas">${w.pick ? '<span class="pick">관리자 강추</span>' : ''}${state}${rec ? `<span class="star">${'★'.repeat(rec)}</span>` : ''}${total(id) ? `<span>${total(id)}화</span>` : ''}${st === 'done' ? '<span class="done">✓ 다 봤어요</span>' : st === 'reading' ? `<span class="done">${ep(id)}화까지 봤어요</span>` : ''}${gs.map((x) => `<span>${esc(x.name)}</span>`).join('')}${WT.inTree(id) ? '<span class="intree">트리 웹툰</span>' : ''}</div>`;
      const e = ep(id), done = st === 'done';
      go.hidden = !w.url; if (w.url) go.href = w.url;
      go.firstChild.textContent = done ? '다시 보러 가기 ' : e > 0 ? `${e + 1}화 이어 보기 ` : '1화 보러 가기 ';
      more.hidden = false;
    }
    function lbRefresh() { if (lib && document.getElementById('lb-info')) lbInfo(); }
    function lbStep(d) { if (!LB.list.length) return; LB.idx = Math.max(0, Math.min(LB.list.length - 1, LB.idx + d)); lbShow(); }
    function lbOpen(id) { select(id); document.getElementById('lb-dim').hidden = false; }
    if (lib) {
      const main = document.getElementById('lb-main');
      main.addEventListener('click', (e) => {
        const st = e.target.closest('[data-step]'); if (st) { lbStep(+st.dataset.step); return; }
        const sb = e.target.closest('[data-sub]');
        if (sb) { LB.sub = sb.dataset.sub; LB.idx = 0; main.querySelectorAll('[data-sub]').forEach((x) => x.setAttribute('aria-pressed', x === sb)); lbBuild(); return; }
        const so = e.target.closest('[data-sort]');
        if (so) { LB.sort = so.dataset.sort; LB.idx = 0; main.querySelectorAll('[data-sort]').forEach((x) => x.setAttribute('aria-pressed', x === so)); lbBuild(); return; }
        const bk = e.target.closest('[data-book]');
        if (bk) { const i = LB.list.indexOf(bk.dataset.book); if (i === LB.idx) lbOpen(bk.dataset.book); else { LB.idx = i; lbShow(); } return; }
        if (e.target.closest('#lb-more')) { const id = LB.list[LB.idx]; if (id) lbOpen(id); }
      });
      let comp = false;
      const qi = document.getElementById('lb-q');
      qi.addEventListener('compositionstart', () => { comp = true; });
      qi.addEventListener('compositionend', () => { comp = false; LB.q = qi.value.trim().toLowerCase(); LB.idx = 0; lbBuild(); });
      qi.addEventListener('input', () => { if (comp) return; LB.q = qi.value.trim().toLowerCase(); LB.idx = 0; lbBuild(); });
      // 밀기 · 터치패드 좌우 스크롤로 넘기기
      let sx = null, acc = 0, lockW = false, tW;
      wrap.addEventListener('pointerdown', (e) => { sx = e.clientX; });
      wrap.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1); });
      wrap.addEventListener('wheel', (e) => {
        const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
        if (!dx) return;
        e.preventDefault(); clearTimeout(tW); tW = setTimeout(() => { acc = 0; lockW = false; }, 160);
        if (lockW) return; acc += dx; if (Math.abs(acc) > 50) { lbStep(acc > 0 ? 1 : -1); acc = 0; lockW = true; }
      }, { passive: false });
      document.getElementById('lb-dim').addEventListener('click', () => close());
      lbBuild();
    }

    function refreshNodes(force) {
      ids.forEach((id) => {
        const sig = [status(id), ep(id), sel === id, WT.isHot(id)].join('|');
        if (!force && sigs[id] === sig) return;
        sigs[id] = sig;
        const slotEl = stage.querySelector(`[data-wrap="${id}"]`);
        if (slotEl) slotEl.innerHTML = lib ? lbBook(id) : nodeInner(id);
      });
      if (!lib) refreshLib();
      T.links.forEach((l, i) => {
        const both = cleared(l.from) && cleared(l.to);
        const one = cleared(l.from) || cleared(l.to);
        const cls = both ? 'lit' : one ? 'half' : '';
        const ln = stage.querySelector(`[data-link="${i}"]`);
        const dt = stage.querySelector(`[data-dot="${i}"]`);
        const ar = stage.querySelector(`[data-arrow="${i}"]`);
        [ln, dt, ar].forEach((el) => { if (!el) return; el.classList.remove('lit', 'half', 'near'); if (cls) el.classList.add(cls); });
        // 고른 웹툰에서 나가는 선은 흐름이 보이게
        if (sel && l.from === sel) [ln, dt, ar].forEach((el) => el && el.classList.add('near'));
      });
      const c = counts();
      if (!document.getElementById('prog-bar')) { if (lib) lbRefresh(); return; }
      document.getElementById('prog-bar').style.width = `${c.d / (ids.length || 1) * 100}%`;
      document.getElementById('prog-text').textContent = `${c.d} / ${ids.length} ${labels.done || '완독'} · 보는 중 ${c.r}`;
    }

    // 판 크기: 기본 너비(1000)를 화면에 맞추고, 웹툰이 많아 판이 넓으면 옆으로 밀어서 봐요
    const sizer = document.getElementById('sizer');
    function fit() {
      if (lib) return;
      const w = wrap.clientWidth || BW;
      const band = document.querySelector('.band');
      const availH = window.innerHeight - wrap.getBoundingClientRect().top - (band ? band.offsetHeight : 0) - 24 + window.scrollY;
      const sc = Math.max(0.6, Math.min(1, w / SW, availH > 300 ? availH / BH : 1));
      stage.style.transform = `scale(${sc})`;
      sizer.style.width = `${SW * sc}px`;
      sizer.style.height = `${BH * sc}px`;
      wrap.classList.toggle('scrolls', SW * sc > w + 2);
      edges();
    }
    function edges() {
      if (lib) return;
      const max = wrap.scrollWidth - wrap.clientWidth;
      wrap.classList.toggle('at-start', wrap.scrollLeft <= 2);
      wrap.classList.toggle('at-end', wrap.scrollLeft >= max - 2);
    }
    /** 고른 웹툰이 화면 밖이면 그쪽으로 부드럽게 이동 */
    function reveal(id, smooth) {
      if (lib || !wrap.classList.contains('scrolls') || !T.nodes[id]) return;
      const sc = sizer.clientWidth / SW;
      const x = T.nodes[id][0] * sc;
      const left = wrap.scrollLeft, w = wrap.clientWidth;
      if (x > left + 90 && x < left + w - 90) return;
      wrap.scrollTo({ left: Math.max(0, x - w / 2), behavior: smooth ? 'smooth' : 'auto' });
    }
    if (!lib) wrap.addEventListener('scroll', () => { edges(); wrap.classList.add('scrolled'); }, { passive: true });
    // 마우스로 빈 곳을 끌어도 옆으로 이동 (터치는 손가락으로 그냥 밀면 돼요)
    let pan = null, panned = false;
    wrap.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !wrap.classList.contains('scrolls') || e.target.closest('[data-node], button, a')) return;
      pan = { x: e.clientX, left: wrap.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!pan) return;
      const dx = e.clientX - pan.x;
      if (Math.abs(dx) > 5) { pan.moved = true; wrap.classList.add('panning'); }
      if (pan.moved) wrap.scrollLeft = pan.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!pan) return;
      panned = pan.moved; pan = null; wrap.classList.remove('panning');
      setTimeout(() => { panned = false; }, 0);
    });
    stage.addEventListener('click', (e) => { if (panned) { e.stopPropagation(); e.preventDefault(); } }, true);

    function animateNode(id, extra) {
      const btn = stage.querySelector(`[data-node="${id}"]`);
      if (!btn) return;
      if (lib) { btn.classList.remove('pick'); void btn.offsetWidth; btn.classList.add('pick'); return; }
      btn.classList.remove('pop', 'gold', 'burst');
      void btn.offsetWidth;
      btn.classList.add('pop');
      if (extra) btn.classList.add(extra);
      const box = btn.parentElement;
      const rp = document.createElement('span');
      rp.className = 'ripple';
      rp.style.cssText = `width:${sizeOf(id)}px; height:${sizeOf(id)}px; inset:auto; left:0; top:0; border-color:${extra === 'gold' ? '#FFE29A' : g.color}`;
      box.insertBefore(rp, btn);
      setTimeout(() => rp.remove(), 750);
    }

    function flashLinks(id) {
      T.links.forEach((l, i) => {
        if (l.from !== id && l.to !== id) return;
        const ln = stage.querySelector(`[data-link="${i}"]`);
        if (!ln) return;
        ln.classList.remove('flash'); void ln.offsetWidth;
        ln.style.animationDelay = l.from === id ? '.25s' : '0s';
        ln.classList.add('flash');
      });
    }

    function bubbleText(id) {
      if (!id) return '어디로 갈까?';
      const st = status(id);
      return st === 'locked' ? '잠겨 있어!' : st === 'done' ? '다 봤다!' : st === 'reading' ? '이어서 보자!' : '이거 볼래?';
    }

    function moveChar(id, jump) {
      if (!hasChar) return;
      const el = document.getElementById('char');
      const [x, y] = T.nodes[id] || T.nodes[T.start];
      const prev = T.nodes[charAt] || T.nodes[T.start];
      if (x !== prev[0]) facing = x < prev[0] ? -1 : 1;
      charAt = id;
      // 원 바로 위 가운데에 서요 (오른쪽 위 연재 표시, 왼쪽 위 N·추천 별을 가리지 않게)
      el.style.left = `${x - 28}px`;
      el.style.top = `${y - sizeOf(id) / 2 - 88}px`;   // 위 가운데 강추·입문작 표시보다 더 위
      document.getElementById('flip').style.transform = `scaleX(${facing})`;
      const hop = document.getElementById('hop');
      if (jump) { hop.classList.remove('go'); void hop.offsetWidth; hop.classList.add('go'); }
      const b = document.getElementById('bubble');
      b.textContent = bubbleText(sel);
      b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    }

    // ---------- 상세 창 ----------
    function panelHTML(id) {
      const w = WT.toon(id);
      const st = status(id);
      const e = ep(id), t = total(id), p = pct(id);
      const done = isDone(id);
      const my = S.ratings[id] || 0;
      const list = S.comments[id] || [];
      const nexts = T.links.filter((l) => l.from === id && WT.toon(l.to));
      const genreNames = (w.genres || []).map((x) => (WT.genre(x) || {}).name).filter(Boolean).join(' · ');
      const goLabel = done ? '다시 보러 가기' : e > 0 ? `${e + 1}화 이어 보기` : '1화 보러 가기';
      const tone = w.color || WT.color.cached(w.cover);
      return `<aside class="panel rpg anim${tone ? ' toned' : ''}" style="${tone ? WT.color.styleOf(tone) : ''}" aria-label="${esc(w.title)} 정보"><span class="tone" aria-hidden="true"></span><span class="bloom" aria-hidden="true"></span><span class="corner-b" aria-hidden="true"></span>
        <div class="cover-rect${w.cover ? '' : ' empty'}${w.pick ? ' is-pick' : ''}">
          ${w.cover ? `<img src="${esc(w.cover)}" alt="${esc(w.title)} 표지" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('empty', 'broken'); this.remove()">` : ''}
          <span class="cover-letter${w.cover ? ' fallback' : ''}" aria-hidden="true">${esc(w.title[0] || '?')}</span>
          <button type="button" class="icon-btn press cover-close" data-act="close" aria-label="창 닫기">${WT.icon.close}</button>
        </div>
        <div class="panel-head">
          <div style="display:flex; flex-direction:column; gap:6px; min-width:0">
            <div class="chips">
              ${w.pick ? '<span class="pick-badge">관리자 강추</span>' : ''}
              ${!w.pick && WT.recStars(w) ? `<span class="chip chip-rec" aria-label="추천 별 ${WT.recStars(w)}개">${'★'.repeat(WT.recStars(w))}</span>` : ''}
              ${WT.isHot(id) ? '<span class="chip chip-hot">오늘 폭주 중</span>' : ''}
              <span class="chip chip-${st}">${statusText[st]}</span>
              ${newEps(id) ? `<span class="chip chip-new">새 화 ${newEps(id)}개</span>` : ''}
              ${WT.schedule.status(w) === 'hiatus' ? '<span class="chip chip-hiatus">휴재 중</span>' : ''}
            </div>
            <h2>${esc(w.title)}</h2>
            <span style="font-size:13px; color:var(--soft)">${server ? (social[id] ? (social[id].count ? `평균 별점 ★ ${social[id].avg} · ${social[id].count}명` : '아직 별점이 없어요') : '별점 불러오는 중…') : (my ? `내 별점 ${my}점` : '아직 별점을 주지 않았어요')}</span>
          </div>
        </div>
        <div class="divider"></div>
        <dl class="meta">
          <dt>작가</dt><dd>${esc(w.author)}</dd>
          <dt>플랫폼</dt><dd>${esc(w.platform)}</dd>
          <dt>연재</dt><dd><span class="node-tag tag-${WT.schedule.status(w)}" style="font-size:13px">${esc(WT.schedule.label(w))}</span></dd>
          <dt>장르</dt><dd>${esc(genreNames)}</dd>
          ${(w.tags || []).length ? `<dt>태그</dt><dd style="color:${g.color}">${w.tags.map((x) => '#' + esc(x)).join(' ')}</dd>` : ''}
        </dl>
        <p class="desc">${esc(w.desc)}</p>
        ${st === 'locked' ? `<div class="box box-warn">
          <p class="warn">이어진 이전 웹툰을 먼저 보면 더 재미있게 볼 수 있어요. 건너뛰고 싶다면 잠금을 풀 수 있어요.</p>
          <button type="button" class="btn btn-soft press" data-act="unlock">잠금 해제하기</button>
        </div>` : ''}
        <section class="box" aria-label="감상 진행">
          <div style="display:flex; justify-content:space-between; align-items:baseline">
            <span class="box-title">감상 진행</span>
            <span style="font-size:13px"><b style="font-size:18px">${e}</b>화 / ${t}화 · ${p}%</span>
          </div>
          <div class="bar" role="progressbar" aria-label="감상 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><div style="width:${p}%"></div></div>
          <div class="stepper">
            <button type="button" class="press" data-act="minus" aria-label="한 화 빼기">−</button>
            <label for="ep-in" class="sr">본 화수</label>
            <input id="ep-in" class="fld" type="number" inputmode="numeric" min="0" max="${t}" value="${e}">
            <button type="button" class="press" data-act="plus" aria-label="한 화 더하기">+</button>
          </div>
          ${WT.canEarn() ? `<span class="hint">1화 기록할 때마다 코인 +${rules.perEpisode} (하루 ${rules.dailyEpisodeCap}개까지) · ${esc(labels.done || '완독')}하면 +${rules.completeBonus}</span>` : '<span class="hint">닉네임으로 시작하면 기록할 때마다 코인을 받아요</span>'}
          <div class="row2">
            <a class="btn btn-line press" href="${esc(w.url)}" target="_blank" rel="noopener">${goLabel}</a>
            <button type="button" class="btn ${done ? 'btn-soft' : 'btn-gold'} press" data-act="done">${done ? `${esc(labels.done || '완독')} · 취소` : esc(labels.doneButton || '다 봤어요')}</button>
          </div>
          ${server && WT.schedule.status(w) !== 'completed' ? '<button type="button" class="btn press" data-act="report" style="min-height:40px; font-size:13px; font-weight:500">플랫폼에 새 화가 나왔는데 여기 화수가 적어요</button>' : ''}
        </section>
        <div class="box box-gold">
          <span class="box-title">내 별점</span>
          ${S.profile ? `<div class="stars" role="radiogroup" aria-label="별점 주기">
            ${[1, 2, 3, 4, 5].map((v) => `<button type="button" role="radio" aria-checked="${v <= my}" aria-label="${v}점" class="${v <= my ? 'on' : ''}" data-rate="${v}">★</button>`).join('')}
            <span style="margin-left:8px; font-size:13px; color:var(--soft)">${my ? `${my}점을 줬어요` : '별을 눌러 평가해요'}</span>
          </div>
          ${server ? '' : '<span class="hint">평균 별점은 회원 기능이 열리면 함께 보여요</span>'}` : `<a href="#/login" class="btn press">${server ? '로그인하고 별점 남기기' : '닉네임으로 시작하고 별점 남기기'}</a>`}
        </div>
        ${nexts.length ? `<div style="display:flex; flex-direction:column; gap:8px">
          <span style="font-size:13px; color:var(--muted); font-weight:700">${esc(labels.nextList || '다음으로 이어지는 웹툰')}</span>
          ${nexts.map((l) => `<button type="button" class="next-btn" data-next="${l.to}"><b>${esc(WT.toon(l.to).title)}</b><span>${esc(l.why || '')}</span></button>`).join('')}
        </div>` : ''}
        <div class="comments">
          ${(() => {
            const sc = server ? social[id] : null;
            const items = server ? (sc ? sc.comments : null) : list.map((c) => ({ nickname: S.profile ? S.profile.nick : '', text: c.text, createdAt: c.at, mine: true, local: true }));
            const count = items ? items.length : 0;
            const form = S.profile ? `<form style="display:flex; gap:8px" data-form="comment">
              <label for="cmt" class="sr">댓글 쓰기</label>
              <input id="cmt" class="fld" maxlength="200" placeholder="한 줄 감상을 남겨 보세요">
              <button type="submit" class="btn press" style="background:${g.color}; color:#07122E; border:none; flex:0 0 auto">등록</button>
            </form>${server ? '' : '<span class="hint">지금은 이 기기에만 저장돼요. 회원 기능이 열리면 다른 사람과 함께 보여요.</span>'}`
              : `<a href="#/login" class="btn press">${server ? '로그인하고 댓글 쓰기' : '닉네임으로 시작하고 댓글 쓰기'}</a>`;
            const when = (t) => { const m = String(t).match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${Number(m[1])}월 ${Number(m[2])}일` : esc(t); };
            const rows = items === null ? '<span class="hint">댓글 불러오는 중…</span>'
              : count ? items.map((c) => `<div class="cm"><span class="avatar" style="width:28px; height:28px; font-size:12px" aria-hidden="true">${esc((c.nickname || '?')[0])}</span>
                <div style="flex:1 1 auto; min-width:0"><div class="who"><b>${esc(c.nickname)}</b> · ${c.local ? esc(c.createdAt) : when(c.createdAt)}</div><div class="txt">${esc(c.text)}</div></div>
                ${c.mine && !c.local ? `<button type="button" class="icon-btn" data-delc="${esc(c.commentId)}" aria-label="내 댓글 지우기" style="width:36px; height:36px; background:transparent; flex:0 0 auto">${WT.icon.close}</button>` : ''}</div>`).join('')
              : (S.profile ? '<span style="font-size:13px; color:#7F8BB0">아직 댓글이 없어요. 첫 감상을 남겨 주세요.</span>' : '<span style="font-size:13px; color:#7F8BB0">아직 댓글이 없어요.</span>');
            return `<span style="font-size:13px; color:var(--muted); font-weight:700">댓글 ${items === null ? '' : count}</span>${form}${rows}`;
          })()}
        </div>
      </aside>`;
    }

    // 표지 색이 상세 창에 번져요: 저장된 색(관리자 화면에서 자동으로 뽑힘)이 없으면 여기서 뽑아요
    function bloom(panel) {
      panel.classList.remove('blooming');
      void panel.offsetWidth;
      panel.classList.add('blooming');
    }
    function emptyPanelHTML() {
      const dot = (inner, style) => `<span class="key-dot" style="${style || ''}">${inner}</span>`;
      return `<aside class="panel rpg panel-empty" aria-label="트리 보는 법"><span class="corner-b" aria-hidden="true"></span>
        <h2>웹툰을 눌러 보세요</h2>
        <p class="hint" style="font-size:14px; margin:0">원을 누르면 이 자리에 줄거리와 감상 기록이 떠요.</p>
        <div class="key-list">
          ${dot('<span class="pick-badge on-node" style="animation:none">강추</span>')}<span><b>관리자 강추</b>원 위 가운데 빨간 표시와 빛나는 고리</span>
          ${dot(`<span class="badge-done">${WT.icon.check}</span>`, 'border-color:var(--gold)')}<span><b>다 본 웹툰</b>금색 테두리 + 오른쪽 아래 금색 체크</span>
          ${dot('<span class="node-tag tag-ongoing">연재</span>')}<span><b>연재 상태</b>원 오른쪽 · 연재 중은 파랑(요일 함께), 휴재 주황, 완결 남색</span>
          ${dot(`<span class="badge-lock">${WT.icon.lockIn}</span>`, 'border-style:dashed; opacity:.55')}<span><b>아직 못 여는 웹툰</b>흐린 점선 테두리 + 오른쪽 아래 자물쇠</span>
        </div>
        <p class="hint" style="margin:0">보는 중이면 원 둘레에 노란 진행 고리가, 새 화가 나오면 원 왼쪽에 N이 붙어요. 추천 별은 제목 아래에 있어요.</p>
      </aside>`;
    }

    let panelFor = null;
    function renderPanel(animate) {
      if (!sel) { panelFor = null; slot.innerHTML = lib ? '' : emptyPanelHTML(); fit(); return; }
      // 같은 웹툰 창을 다시 그릴 땐(별점·화수·댓글 등을 바꿨을 때) 보던 스크롤 위치를 그대로 지켜요
      const old = slot.querySelector('.panel');
      const keep = !animate && panelFor === sel && old ? { top: old.scrollTop, win: window.scrollY } : null;
      panelFor = sel;
      slot.innerHTML = panelHTML(sel);
      const panel = slot.querySelector('.panel');
      if (keep) { panel.scrollTop = keep.top; if (window.scrollY !== keep.win) window.scrollTo(0, keep.win); }
      if (!animate) panel.classList.remove('anim');
      else if (panel.classList.contains('toned')) bloom(panel);
      const w = WT.toon(sel);
      if (!panel.classList.contains('toned') && w.cover) {
        const id = sel;
        WT.color.extract(w.cover).then((c) => {
          const p = slot.querySelector('.panel');
          if (!c || sel !== id || !p || p.classList.contains('toned')) return;
          p.setAttribute('style', WT.color.styleOf(c));
          p.classList.add('toned');
          bloom(p);
        });
      }
      fit();
      if (animate) reveal(sel, true);   // 상세 창이 열려 판이 좁아져도 고른 웹툰이 보이게
    }

    function select(id, opts) {
      const o = opts || {};
      if (!WT.toon(id) || !T.nodes[id]) return;
      sel = id;
      refreshNodes();
      reveal(id, !o.keepHash);
      animateNode(id);
      WT.api.fire('view', { webtoonId: id, viewerId: WT.api.viewerId() });
      if (server) loadSocial(id);
      moveChar(id, true);
      renderPanel(true);
      if (!o.keepHash) history.replaceState(null, '', `#/${BASE}/${gid}/${id}`);
      if (window.innerWidth <= 900) {
        const p = slot.querySelector('.panel');
        if (p) p.scrollTop = 0;
      }
    }

    function close() {
      sel = null;
      const dim = document.getElementById('lb-dim'); if (dim) dim.hidden = true;
      refreshNodes();
      renderPanel(false);
      moveChar(charAt, false);
      history.replaceState(null, '', `#/${BASE}/${gid}`);
    }

    async function loadSocial(id) {
      try {
        const r = await WT.api.call('social', { webtoonId: id, token: S.token || '' });
        social[id] = r.social;
      } catch (e) { social[id] = { avg: 0, count: 0, comments: [] }; }
      if (sel === id) renderPanel(false);
    }

    function setEp(id, value) {
      const useServer = server && !!S.token;
      const r = WT.store.recordEpisodes(id, value, total(id), rules, WT.canEarn() && !useServer);
      if (useServer) {
        WT.api.authed('progress', { webtoonId: id, value: S.progress[id] }).then((x) => {
          WT.api.applyMe(x.me);
          if (x.label) WT.popCoin(x.label); else WT.popCoin('');
          if (sel === id) renderPanel(false);
        }).catch((e) => { if (!e.auth) WT.toast(e.message); });
      }
      refreshNodes();
      renderPanel(false);
      if (r.label) WT.popCoin(r.label);
      if (r.completed) {
        animateNode(id, 'gold');
        flashLinks(id);
        if (!WT.canEarn()) WT.toast(`${WT.toon(id).title} ${labels.done || '완독'}!`);
      }
      moveChar(charAt, false);
    }

    function openUnlock(id) {
      const price = rules.unlockPrice;
      const canPay = WT.canEarn() && S.coins >= price;
      const coinLabel = !WT.canEarn() ? '닉네임으로 시작하면 코인을 쓸 수 있어요' : canPay ? `코인 ${price}개로 잠금 해제 (보유 ${S.coins})` : `코인이 부족해요 (${price}개 필요 · 보유 ${S.coins})`;
      WT.modal(`<div class="modal rpg" role="dialog" aria-modal="true" aria-labelledby="ul-title"><span class="corner-b" aria-hidden="true"></span>
        <div style="display:flex; align-items:center; gap:12px">
          <span style="width:48px; height:48px; border-radius:50%; background:#2A3456; display:flex; align-items:center; justify-content:center">${WT.icon.lockBig}</span>
          <div style="display:flex; flex-direction:column; gap:2px"><h3 id="ul-title">잠금 해제</h3><span class="hint">${esc(WT.toon(id).title)}의 잠금을 풉니다</span></div>
        </div>
        <button type="button" class="btn ${canPay ? 'btn-coin' : ''} press" data-m="coin" ${canPay ? '' : 'disabled'} style="min-height:52px"><span class="coin" aria-hidden="true" style="width:26px; height:26px">C</span>${coinLabel}</button>
        <div class="or">또는 관리자</div>
        <div class="field">
          ${server && S.role === 'admin' && S.token ? `<input id="admin-pw" type="hidden" value=""><button type="button" class="btn btn-gold press" data-m="admin">관리자 권한으로 해제</button>
          <p class="err" id="admin-err" role="alert" hidden></p>` : server ? `<label for="admin-pw">관리자 비밀번호</label><div style="display:flex; gap:8px"><input id="admin-pw" class="fld" type="password" autocomplete="off"><button type="button" class="btn btn-gold press" data-m="admin" style="flex:0 0 auto">해제</button></div>
          <p class="err" id="admin-err" role="alert" hidden></p>` : `<label for="admin-pw">관리자 비밀번호</label><input id="admin-pw" class="fld" type="password" disabled placeholder="서버 연결 후 사용할 수 있어요">
          <span class="hint">비밀번호 확인은 보안을 위해 Apps Script(서버)에서 해요. 연결하면 열립니다.</span>`}
        </div>
        <button type="button" class="btn press" data-m="cancel">닫기</button>
      </div>`, (bg, closeModal) => {
        bg.querySelector('[data-m="cancel"]').addEventListener('click', closeModal);
        const cb = bg.querySelector('[data-m="coin"]');
        const done = (label) => {
          closeModal();
          refreshNodes();
          renderPanel(false);
          if (label) WT.popCoin(label);
          animateNode(id, 'burst');
          moveChar(charAt, false);
        };
        const ab = bg.querySelector('[data-m="admin"]');
        if (ab) {
          const go = async () => {
            const err = bg.querySelector('#admin-err');
            ab.disabled = true;
            try {
              const r = await WT.api.call('unlockAdmin', { adminPassword: bg.querySelector('#admin-pw').value, webtoonId: id, token: S.token || '' });
              if (r.me) WT.api.applyMe(r.me); else { S.unlocked[id] = true; WT.store.save(); }
              done('');
            } catch (x) {
              err.hidden = false; err.textContent = x.message; ab.disabled = false;
              const m = bg.querySelector('.modal'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
            }
          };
          ab.addEventListener('click', go);
          bg.querySelector('#admin-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        }
        if (cb) cb.addEventListener('click', async () => {
          if (!(WT.canEarn() && S.coins >= price)) return;
          if (server && S.token) {
            cb.disabled = true;
            try { const r = await WT.api.authed('unlockCoin', { webtoonId: id }); WT.api.applyMe(r.me); done(`-${price} 코인 · 잠금 해제`); }
            catch (x) { cb.disabled = false; if (!x.auth) WT.toast(x.message); }
            return;
          }
          S.coins -= price;
          S.unlocked[id] = true;
          WT.store.save();
          closeModal();
          refreshNodes();
          renderPanel(false);
          WT.popCoin(`-${price} 코인 · 잠금 해제`);
          animateNode(id, 'burst');
          moveChar(charAt, false);
        });
      });
    }

    // ---------- 이벤트 ----------
    stage.addEventListener('click', (e) => {
      const lb = e.target.closest('[data-lib]');
      if (lb) { enterLibrary(lb); return; }
      const tb = e.target.closest('[data-tome]');
      if (tb) { tb.classList.add('opening'); setTimeout(() => tb.classList.remove('opening'), 600); openTome(tb.dataset.tome); return; }
      const b = e.target.closest('[data-node]');
      if (b) select(b.dataset.node);
    });
    if (lib) {
      if (WT.libDoors) { const d = WT.libDoors; WT.libDoors = null; requestAnimationFrame(() => { d.classList.add('opening'); setTimeout(() => d.remove(), 1100); }); }
    }
    slot.addEventListener('click', (e) => {
      const dc = e.target.closest('[data-delc]');
      if (dc && sel) {
        const id = sel;
        WT.api.authed('deleteComment', { commentId: dc.dataset.delc }).then((x) => { social[id] = x.social; if (sel === id) renderPanel(false); }).catch((er) => { if (!er.auth) WT.toast(er.message); });
        return;
      }
      const t = e.target.closest('[data-act], [data-rate], [data-next]');
      if (!t || !sel) return;
      if (t.dataset.next) return select(t.dataset.next);
      if (t.dataset.rate) {
        const v = Number(t.dataset.rate);
        S.ratings[sel] = v; WT.store.save(); renderPanel(false);
        if (server && S.token) {
          const id = sel;
          WT.api.authed('rate', { webtoonId: id, score: v }).then((x) => { WT.api.applyMe(x.me); social[id] = x.social; if (sel === id) renderPanel(false); }).catch((e) => { if (!e.auth) WT.toast(e.message); });
        }
        return;
      }
      const a = t.dataset.act;
      if (a === 'close') close();
      else if (a === 'minus') setEp(sel, ep(sel) - 1);
      else if (a === 'plus') setEp(sel, ep(sel) + 1);
      else if (a === 'done') setEp(sel, isDone(sel) ? 0 : total(sel));
      else if (a === 'unlock') openUnlock(sel);
      else if (a === 'report') {
        t.disabled = true;
        WT.api.call('report', { webtoonId: sel, viewerId: WT.api.viewerId() })
          .then((x) => { WT.toast(x.already ? '이미 알려 줬어요. 고마워요!' : '관리자에게 알렸어요. 고마워요!'); })
          .catch((e) => { WT.toast(e.message); t.disabled = false; });
      }
    });
    slot.addEventListener('change', (e) => {
      if (e.target.id === 'ep-in' && sel) setEp(sel, e.target.value);
    });
    slot.addEventListener('submit', (e) => {
      if (e.target.dataset.form !== 'comment' || !sel) return;
      e.preventDefault();
      const input = e.target.querySelector('#cmt');
      const text = input.value.trim().slice(0, 200);
      if (!text) return;
      if (server && S.token) {
        const id = sel;
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        WT.api.authed('comment', { webtoonId: id, text }).then((x) => { social[id] = x.social; if (sel === id) renderPanel(false); })
          .catch((er) => { btn.disabled = false; if (!er.auth) WT.toast(er.message); });
        return;
      }
      const d = new Date(Date.now() + 9 * 3600 * 1000);
      const at = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
      S.comments[sel] = [{ text, at }].concat(S.comments[sel] || []);
      WT.store.save();
      renderPanel(false);
    });

    // ---------- 키보드 화살표로 웹툰 사이 이동 ----------
    const DIRS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    /** 지금 웹툰에서 그 방향에 있는 웹툰 고르기 (이어진 웹툰을 먼저) */
    function pickToward(from, dir) {
      if (lib) ids.forEach((id) => { const el = stage.querySelector(`[data-node="${id}"]`); if (el) { const r = el.getBoundingClientRect(); T.nodes[id] = [r.left + r.width / 2, r.top + r.height / 2]; } });
      const c = T.nodes[from];
      const linked = new Set(T.links.filter((l) => l.from === from || l.to === from).map((l) => (l.from === from ? l.to : l.from)));
      let best = null, bestScore = Infinity;
      ids.forEach((id) => {
        if (id === from) return;
        const p = T.nodes[id];
        const vx = p[0] - c[0], vy = p[1] - c[1];
        const along = vx * dir[0] + vy * dir[1];
        if (along < 30) return;
        const side = Math.abs(vx * dir[1] - vy * dir[0]);
        if (side > along * 2.2) return;                  // 너무 옆쪽은 빼요
        let score = along + side * 1.8;
        if (linked.has(id)) score *= 0.55;
        if (score < bestScore) { bestScore = score; best = id; }
      });
      return best;
    }
    /** 별똥: 지금 웹툰에서 다음 웹툰으로 빛이 날아가요 */
    function comet(a, b) {
      if (document.body.classList.contains('no-anim')) return;
      const A = T.nodes[a], B = T.nodes[b];
      if (!A || !B) return;
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI;
      const el = document.createElement('div');
      el.className = 'comet';
      el.setAttribute('aria-hidden', 'true');
      el.style.left = `${A[0]}px`; el.style.top = `${A[1]}px`;
      el.innerHTML = `<i style="transform:rotate(${ang}deg)"></i>`;
      stage.appendChild(el);
      void el.offsetWidth;
      el.style.left = `${B[0]}px`; el.style.top = `${B[1]}px`;
      setTimeout(() => { el.classList.add('hit'); }, 380);
      setTimeout(() => el.remove(), 900);
    }
    let lastKey = 0;
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.closest('.modal-bg'))) return;
      if (document.querySelector('.grim-bg')) return;
      if (lib) {
        if (e.key === 'Escape' && sel) { e.preventDefault(); close(); return; }
        if (sel) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); lbStep(e.key === 'ArrowRight' ? 1 : -1); }
        else if (e.key === 'Enter' && !(t && t.closest('a, button'))) { const id = LB.list[LB.idx]; if (id) lbOpen(id); }
        return;
      }
      if (e.key === 'Escape' && sel) { e.preventDefault(); close(); return; }
      if (e.key === 'Home') { e.preventDefault(); if (T.start && T.start !== sel) { if (sel) comet(sel, T.start); select(T.start); } return; }
      const dir = DIRS[e.key];
      if (!dir || (lib && tomes.length)) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastKey < 160) return;   // 너무 빨리 누르면 한 칸씩만
      lastKey = now;
      if (!sel) { select(T.start && T.nodes[T.start] ? T.start : ids[0]); return; }
      const next = pickToward(sel, dir);
      if (!next && !lib && dir[0] === 1 && leaves.includes(sel)) {
        const lb = stage.querySelector('[data-lib]');
        if (lb) { lb.focus({ preventScroll: true }); lb.classList.remove('nudge'); void lb.offsetWidth; lb.classList.add('nudge'); }
        return;
      }
      if (!next) {
        const b = stage.querySelector(`[data-node="${sel}"]`);
        if (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); b.style.setProperty('--bx', `${dir[0] * 7}px`); b.style.setProperty('--by', `${dir[1] * 7}px`); }
        return;
      }
      if (!lib) comet(sel, next);
      select(next);
      const nb = stage.querySelector(`[data-node="${next}"]`);
      if (nb) nb.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKey);

    const onResize = () => { fit(); if (lib) lbShow(); };
    window.addEventListener('resize', onResize);
    WT.leaveView = () => {
      if (lib) WT.libLeftAt = Date.now();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      WT.onHashChange = null;
    };
    WT.onHashChange = () => {
      const parts = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
      if (parts[0] === BASE && parts[1] === gid) {
        if (parts[2] && parts[2] !== sel) select(parts[2], { keepHash: true });
        else if (!parts[2] && sel) close();
        return true;
      }
      return false;
    };

    refreshNodes(true);
    fit();
    if (hasChar) {
      const el = document.getElementById('char');
      el.style.transition = 'none';
      moveChar(charAt, false);
      void el.offsetWidth;
      el.style.transition = '';
    }
    if (lib && params[1] && LB.list.includes(params[1])) { LB.idx = LB.list.indexOf(params[1]); lbShow(); }
    if (params[1] && T.nodes[params[1]]) { select(params[1], { keepHash: true }); if (lib) document.getElementById('lb-dim').hidden = false; }
    else if (!lib) renderPanel(false);
  }

  WT.views.tree = view;
  WT.views.library = (params) => view(params, true);
})();
