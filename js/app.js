/* 웹툰트리 기본 뼈대: 데이터 불러오기, 주소(#/...) 이동, 공통 부품, 홈, 로그인 */
(function () {
  window.WT = window.WT || {};
  const app = () => document.getElementById('app');

  // ---------- 작은 도구 ----------
  WT.esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
  const esc = WT.esc;

  WT.icon = {
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
    map: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',
    trophy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1405" stroke-width="3.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
    lock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8C3E3" stroke-width="2.5" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    library: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 22 32 8l24 14z" fill="#E8C66A" stroke="#FFF1C4" stroke-width="1.5" stroke-linejoin="round"/><rect x="10" y="22" width="44" height="4" rx="1" fill="#C99A3A"/><g fill="#F3E2B0"><rect x="13" y="28" width="5" height="20" rx="1"/><rect x="46" y="28" width="5" height="20" rx="1"/></g><g><rect x="21" y="30" width="4" height="18" rx="1" fill="#8E2F2F"/><rect x="26" y="33" width="4" height="15" rx="1" fill="#2F5B8E"/><rect x="31" y="29" width="4" height="19" rx="1" fill="#3E7A4A"/><rect x="36" y="32" width="4" height="16" rx="1" fill="#B07A2A"/><rect x="41" y="34" width="3" height="14" rx="1" fill="#6A3F7A"/></g><rect x="8" y="48" width="48" height="5" rx="1.5" fill="#C99A3A"/><rect x="5" y="53" width="54" height="4" rx="1.5" fill="#E8C66A"/></svg>',
    lockIn: '<svg viewBox="0 0 24 24" fill="none" stroke="#E8C66A" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/><rect x="4.5" y="11" width="15" height="10" rx="2.4" fill="#1B2347"/><circle cx="12" cy="15.4" r="1.4" fill="#E8C66A" stroke="none"/><path d="M12 16.4v2"/></svg>',
    lockBig: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8C66A" stroke-width="2.2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,1.5 15,8.6 22.6,9.2 16.8,14.2 18.6,21.7 12,17.7 5.4,21.7 7.2,14.2 1.4,9.2 9,8.6" fill="#FFD34D" stroke="#FFF4C2" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    starSmall: '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,1.5 15,8.6 22.6,9.2 16.8,14.2 18.6,21.7 12,17.7 5.4,21.7 7.2,14.2 1.4,9.2 9,8.6" fill="#FFD34D"/></svg>',
    flame: '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" fill="#FF7A2E"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA6C8" stroke-width="2.5" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>'
  };

  WT.genre = (id) => WT.data.genres.find((g) => g.id === id);
  WT.toon = (id) => WT.data.webtoons.find((w) => w.id === id);
  /** 오늘 기준 총 화수 (연재 요일 자동 계산 포함) */
  WT.eps = (w) => WT.schedule.episodes(w);
  WT.isHot = (id) => (WT.data.hotToday || []).includes(id);
  /** 홈·장르 띠에 보여줄 장르: 트리에 웹툰이 하나 이상 있는 장르 */
  WT.liveGenres = () => WT.data.genres.filter((g) => WT.data.trees[g.id] && Object.keys(WT.data.trees[g.id].nodes || {}).length && WT.data.trees[g.id].start);
  WT.canEarn = () => !!WT.store.state.profile;
  WT.settings = () => WT.data.settings;

  /** 웹툰을 보여줄 트리 장르: 그 웹툰이 들어 있는 첫 트리 */
  WT.treeGenreOf = function (wid) {
    const w = WT.toon(wid);
    const list = (w && w.genres) || [];
    const hit = list.find((g) => WT.data.trees[g] && WT.data.trees[g].nodes[wid]);
    return hit || Object.keys(WT.data.trees).find((g) => WT.data.trees[g].nodes[wid]) || list[0] || WT.data.genres[0].id;
  };

  WT.toast = function (msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  };

  /** 코인 표시 + 떠오르는 숫자 */
  WT.coinPill = function () {
    if (!WT.store.state.profile) return '';
    return `<a href="#/shop" class="pill pill-coin press" id="coin-pill" aria-label="내 코인 ${WT.store.state.coins}개, 상점으로"><span class="coin" aria-hidden="true">C</span><span id="coin-num">${WT.store.state.coins}</span></a>`;
  };
  WT.popCoin = function (label) {
    const num = document.getElementById('coin-num');
    if (num) num.textContent = WT.store.state.coins;
    const pill = document.getElementById('coin-pill');
    if (!pill || !label) return;
    const p = document.createElement('span');
    p.className = 'coin-pop';
    p.setAttribute('aria-live', 'polite');
    p.textContent = label;
    pill.appendChild(p);
    setTimeout(() => p.remove(), 1700);
  };

  WT.userChip = function () {
    const s = WT.store.state;
    const nick = s.profile ? s.profile.nick : '둘러보기 중';
    return `<a href="#/login" class="pill press" aria-label="내 정보"><span class="avatar" aria-hidden="true">${esc((s.profile ? s.profile.nick : '?')[0])}</span>${esc(nick)}</a>`;
  };

  WT.topRight = function (opts) {
    const o = opts || {};
    return `<div class="right">
      ${o.map === false ? '' : `<a href="#/map" class="pill pill-gold press">${WT.icon.map}전체 지도</a>`}
      ${WT.coinPill()}
      <a href="#/ranking" class="pill press">${WT.icon.trophy}랭킹</a>
      ${WT.userChip()}
    </div>`;
  };

  WT.band = function (current) {
    const items = WT.liveGenres().map((g) =>
      `<a href="#/tree/${g.id}" style="--gc:${g.color}" ${current === g.id ? 'aria-current="page"' : ''} class="press"><span class="dot" aria-hidden="true"></span>${esc(g.name)}</a>`).join('');
    return `<nav class="band" aria-label="장르 선택"><a href="#/map" style="--gc:#E8C66A" ${current === 'map' ? 'aria-current="page"' : ''} class="press">전체</a>${items}</nav>`;
  };

  WT.modal = function (html, onBind) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = html;
    document.body.appendChild(bg);
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    const first = bg.querySelector('input, button');
    if (first) setTimeout(() => first.focus(), 50);
    if (onBind) onBind(bg, close);
    return close;
  };

  // ---------- 홈: 장르 카드를 좌우로 넘기는 회전목마 (끝없이 돌고, 고른 카드가 가운데) ----------
  const lum = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 0;
    const n = parseInt(m[1], 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const shade = (hex, k) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
  };
  const HOME_ART = {
    lib: `<span class="hc-art hc-lib" aria-hidden="true"><svg width="210" height="236" viewBox="0 0 210 236">
<path d="M20 70 L105 18 L190 70 Z" fill="#E8C66A" stroke="#FFF1C4" stroke-width="3" stroke-linejoin="round"/><circle cx="105" cy="52" r="9" fill="#7A4A22"/>
<rect x="24" y="70" width="162" height="12" rx="3" fill="#C99A3A"/><rect x="30" y="82" width="150" height="132" fill="#3A200C"/>
<rect x="30" y="82" width="14" height="132" fill="#F3E2B0"/><rect x="166" y="82" width="14" height="132" fill="#F3E2B0"/>
<rect x="44" y="124" width="122" height="6" fill="#8A5A28"/><rect x="44" y="170" width="122" height="6" fill="#8A5A28"/>
<rect x="50" y="94" width="11" height="30" rx="2" fill="#C8323A"/><rect x="63" y="99" width="9" height="25" rx="2" fill="#2F5B8E"/><rect x="74" y="92" width="12" height="32" rx="2" fill="#3E7A4A"/><rect x="88" y="98" width="9" height="26" rx="2" fill="#B07A2A"/><rect x="99" y="95" width="11" height="29" rx="2" fill="#6A3F7A"/><rect x="112" y="100" width="9" height="24" rx="2" fill="#5BB8FF"/><rect x="123" y="93" width="12" height="31" rx="2" fill="#FF7EB6"/><rect x="137" y="99" width="9" height="25" rx="2" fill="#E8C66A"/><rect x="148" y="96" width="12" height="28" rx="2" fill="#C8323A"/>
<rect x="50" y="142" width="10" height="28" rx="2" fill="#E8C66A"/><rect x="62" y="137" width="12" height="33" rx="2" fill="#6A3F7A"/><rect x="76" y="144" width="9" height="26" rx="2" fill="#C8323A"/><rect x="87" y="139" width="11" height="31" rx="2" fill="#3E7A4A"/><rect x="100" y="141" width="12" height="29" rx="2" fill="#2F5B8E"/><rect x="114" y="146" width="9" height="24" rx="2" fill="#FF9A4D"/><rect x="125" y="138" width="11" height="32" rx="2" fill="#5BB8FF"/><rect x="138" y="143" width="10" height="27" rx="2" fill="#B07A2A"/><rect x="150" y="140" width="10" height="30" rx="2" fill="#6BE3A4"/>
<rect x="50" y="186" width="12" height="28" rx="2" fill="#2F5B8E"/><rect x="64" y="190" width="9" height="24" rx="2" fill="#E8C66A"/><rect x="75" y="184" width="11" height="30" rx="2" fill="#C8323A"/><rect x="88" y="189" width="10" height="25" rx="2" fill="#A97BFF"/><rect x="100" y="185" width="12" height="29" rx="2" fill="#3E7A4A"/><rect x="114" y="188" width="9" height="26" rx="2" fill="#FF7EB6"/><rect x="125" y="183" width="11" height="31" rx="2" fill="#B07A2A"/><rect x="138" y="187" width="12" height="27" rx="2" fill="#5BB8FF"/><rect x="152" y="190" width="8" height="24" rx="2" fill="#E8C66A"/>
<rect x="18" y="214" width="174" height="10" rx="3" fill="#C99A3A"/><rect x="10" y="224" width="190" height="10" rx="3" fill="#E8C66A"/></svg></span>`,
    rank: `<span class="hc-art hc-rank" aria-hidden="true"><svg width="200" height="236" viewBox="0 0 200 236">
<path d="M58 28 H142 V78 C142 108 124 128 100 128 C76 128 58 108 58 78 Z" fill="#FFD34D" stroke="#FFF1C4" stroke-width="3"/>
<path d="M58 40 H34 C34 72 48 86 62 88" fill="none" stroke="#FFD34D" stroke-width="9" stroke-linecap="round"/><path d="M142 40 H166 C166 72 152 86 138 88" fill="none" stroke="#FFD34D" stroke-width="9" stroke-linecap="round"/>
<path d="M100 48 L106 62 L121 63 L109 72 L113 87 L100 79 L87 87 L91 72 L79 63 L94 62 Z" fill="#B8872A"/>
<rect x="90" y="128" width="20" height="22" fill="#E8C66A"/><rect x="72" y="150" width="56" height="12" rx="3" fill="#C99A3A"/>
<rect x="70" y="170" width="60" height="62" rx="4" fill="#E8C66A"/><rect x="10" y="190" width="58" height="42" rx="4" fill="#B8C3E3"/><rect x="132" y="202" width="58" height="30" rx="4" fill="#C98A4A"/>
<text x="100" y="212" text-anchor="middle" font-family="Black Han Sans, sans-serif" font-size="30" fill="#3A2A06">1</text><text x="39" y="220" text-anchor="middle" font-family="Black Han Sans, sans-serif" font-size="24" fill="#2A3150">2</text><text x="161" y="225" text-anchor="middle" font-family="Black Han Sans, sans-serif" font-size="20" fill="#3A1E06">3</text></svg></span>`
  };
  let homeIndex = 0;   // 다른 화면에 다녀와도 보던 카드에서 다시 시작

  function viewHome() {
    const st = WT.settings();
    const genres = WT.liveGenres();
    const libN = WT.libraryBooks ? WT.libraryBooks('all').length : 0;
    const items = genres.map((g) => {
      const T = WT.data.trees[g.id];
      const w = WT.toon(T.start);
      return { kind: 'genre', href: `#/tree/${g.id}`, name: g.name, sub: w ? w.title : '', tag: '입문작', foot: `웹툰 ${Object.keys(T.nodes).length}편`,
        color: g.color, w, label: `${g.name} 트리로 가기${w ? `, 입문작 ${w.title}` : ''}` };
    }).concat(genres.length ? [
      { kind: 'lib', href: '#/library/all', name: '도서관', sub: '마음대로 골라 보기', tag: `${libN}권`, foot: '트리 밖 웹툰', color: '#7A4A22', label: `도서관으로 가기, 트리 밖 웹툰 ${libN}권` },
      { kind: 'rank', href: '#/top', name: '이번 주 랭킹', sub: '많이 읽은 웹툰', tag: 'TOP 10', foot: '이번 주 조회수 기준', color: '#E8C66A', label: '이번 주 많이 읽은 웹툰 랭킹 보기' }
    ] : []);
    const N = items.length, COPIES = 5;
    const cardHTML = (it, k, real) => {
      let art = HOME_ART[it.kind] || '';
      if (it.kind === 'genre') {
        const tone = (it.w && (it.w.color || (WT.color && WT.color.cached(it.w.cover)))) || shade(it.color, 0.5);
        const base = typeof tone === 'string' ? tone : (tone && tone.hex) || shade(it.color, 0.5);
        art = `<span class="hc-art hc-cover" aria-hidden="true" style="background:linear-gradient(160deg, ${shade(base, 1.25)}, ${shade(base, 0.45)})">
          ${it.w && it.w.cover ? `<img src="${esc(it.w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
          <b>${esc(it.sub)}</b></span>`;
      }
      return `<a href="${it.href}" class="hcard" data-k="${k}" style="--hc:${it.color}; --ink:${lum(it.color) > 0.42 ? '#10162B' : '#FFFFFF'}"
        ${real ? `aria-label="${esc(it.label)}"` : 'aria-hidden="true" tabindex="-1"'}>${art}
        <span class="hc-text"><span class="hc-name">${esc(it.name)}</span>
          <span class="hc-sub"><span>${esc(it.sub)}</span><span class="hc-tag">${esc(it.tag)}</span></span>
          <span class="hc-foot">${esc(it.foot)}</span></span></a>`;
    };
    app().innerHTML = `<div class="view home">
      <div class="home-panel">
        <div class="home-top">
          <span class="home-logo"><svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="9" cy="30" r="4" fill="#E8C66A"/><circle cx="20" cy="12" r="5" fill="#FFE29A"/><circle cx="31" cy="26" r="4" fill="#E8C66A"/><path d="M9 30 L20 12 L31 26" fill="none" stroke="#E8C66A" stroke-width="1.6" opacity=".7"/></svg><h1>${esc(st.siteName)}</h1></span>
          ${WT.topRight({ map: false })}
        </div>
        ${st.notice ? `<p class="notice">${esc(st.notice)}</p>` : ''}
        ${N ? `<div class="home-vp" id="home-vp"><div class="home-track" id="home-track">${
          Array.from({ length: COPIES }, (_, c) => items.map((it, k) => cardHTML(it, k, c === 2)).join('')).join('')}</div></div>`
        : `<section class="rpg" style="max-width:520px; margin:40px auto; padding:28px; text-align:center; display:flex; flex-direction:column; gap:10px"><span class="corner-b" aria-hidden="true"></span>
          <h2 style="margin:0; font-family:var(--display); font-weight:400; font-size:24px">웹툰 별자리를 준비하고 있어요</h2>
          <p class="hint" style="font-size:14px; margin:0">곧 장르별 웹툰 트리가 열려요. 조금만 기다려 주세요!</p></section>`}
        <div class="home-foot">
          <a href="#/map" class="pill pill-gold press">${WT.icon.map}전체 지도</a>
          ${N ? `<span class="home-nav"><span id="home-pos" aria-live="polite"></span>
            <button type="button" class="home-btn press" id="home-prev" aria-label="이전 카드"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>이전</button>
            <button type="button" class="home-btn press" id="home-next" aria-label="다음 카드">다음<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></span>` : ''}
        </div>
      </div>
    </div>`;
    if (!N) return;

    const vp = document.getElementById('home-vp'), track = document.getElementById('home-track');
    const cards = [...track.children], pos = document.getElementById('home-pos');
    const mod = (a) => ((a % N) + N) % N;
    let v = 2 * N + mod(homeIndex);
    const place = (anim) => {
      const c = cards[v];
      const tx = vp.clientWidth / 2 - (c.offsetLeft + c.offsetWidth / 2);
      track.style.transition = anim ? '' : 'none';
      track.style.transform = `translateX(${tx}px)`;
      if (!anim) { void track.offsetWidth; track.style.transition = ''; }
    };
    const go = (k, anim = true) => {
      v = k; homeIndex = mod(v);
      place(anim);
      cards.forEach((c, n) => c.classList.toggle('is-active', n === v));
      pos.textContent = `${homeIndex + 1} / ${N}`;
    };
    // 움직임이 끝나면 가운데 줄의 같은 카드로 몰래 옮겨 둬서 계속 돌 수 있게
    track.addEventListener('transitionend', (e) => {
      if (e.target !== track || (v >= N && v < 4 * N)) return;
      const nv = 2 * N + mod(v);
      cards[v].classList.remove('is-active');
      cards[nv].classList.add('is-active', 'no-pop');
      v = nv; place(false);
      setTimeout(() => cards[nv].classList.remove('no-pop'), 50);
    });
    // 가운데가 아닌 카드를 누르면 먼저 가운데로, 가운데 카드를 누르면 들어가기
    let dragged = false;
    cards.forEach((c, n) => c.addEventListener('click', (e) => {
      if (dragged || n !== v) { e.preventDefault(); if (!dragged) go(n); }
    }));
    document.getElementById('home-prev').addEventListener('click', () => go(v - 1));
    document.getElementById('home-next').addEventListener('click', () => go(v + 1));
    const onKey = (e) => {
      if (e.target.closest && e.target.closest('input, textarea, select, .modal-bg')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(v - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(v + 1); }
      else if (e.key === 'Enter' && !(e.target.closest && e.target.closest('a, button'))) location.hash = items[homeIndex].href;
    };
    // 손가락·마우스로 밀기
    let sx = null;
    vp.addEventListener('pointerdown', (e) => { sx = e.clientX; dragged = false; });
    const onUp = (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { dragged = true; go(v + (dx < 0 ? 1 : -1)); setTimeout(() => { dragged = false; }, 0); }
    };
    // 크롬북·노트북 터치패드 좌우 스크롤 (작은 값을 모아서 한 칸씩), Shift+휠도
    let acc = 0, lock = false, idle;
    const onWheel = (e) => {
      const dx = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!dx) return;
      e.preventDefault();
      clearTimeout(idle); idle = setTimeout(() => { acc = 0; lock = false; }, 160);
      if (lock) return;
      acc += e.deltaMode === 1 ? dx * 16 : dx;
      if (Math.abs(acc) >= 50) { go(v + (acc > 0 ? 1 : -1)); acc = 0; lock = true; }
    };
    const onResize = () => place(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);
    WT.leaveView = () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
    go(v, false);
    // 글꼴이 늦게 들어오면 카드 위치가 바뀔 수 있어 한 번 더 맞춰요
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (track.isConnected) place(false); });
  }

  // ---------- 이번 주 많이 읽은 웹툰 (도서관에서 따로 뺀 랭킹) ----------
  function whereIs(id) {
    const trees = WT.data.trees || {};
    const live = WT.liveGenres().map((g) => g.id);
    const g = live.find((gid) => trees[gid] && trees[gid].nodes && trees[gid].nodes[id]);
    if (g) return `#/tree/${g}/${id}`;
    const w = WT.toon(id);
    const lg = ((w && w.genres) || []).find((x) => live.includes(x)) || 'all';
    return `#/library/${lg}/${id}`;
  }
  function viewTop() {
    const S = WT.store.state;
    app().innerHTML = `<div class="view">
      <div class="topbar">
        <div class="left">
          <a href="#/" class="icon-btn press" aria-label="홈으로">${WT.icon.back}</a>
          <div class="title-block"><h1 style="color:var(--coin)">이번 주 랭킹</h1><span class="sub">이번 주에 많이 읽은 웹툰 TOP 10</span></div>
        </div>
        ${WT.topRight()}
      </div>
      <div class="top-wrap"><section class="lib-rank-wrap" aria-labelledby="top-h">
        <h3 id="top-h">이번 주 많이 읽은 웹툰</h3>
        <div class="lib-rank" id="top-list"><p class="hint">불러오는 중…</p></div>
      </section></div>
    </div>`;
    (async () => {
      let list = [], note = '';
      if (WT.api.on()) {
        try {
          const r = await WT.api.call('topWebtoons', {});
          list = (r.top || []).filter((x) => WT.toon(x.id)).map((x) => ({ id: x.id, label: x.eps ? `${x.eps}화 읽음` : `${x.viewers}명이 봤어요` }));
        } catch (e) { list = []; }
      } else {
        const p = S.progress || {};
        list = Object.keys(p).filter((id) => WT.toon(id) && p[id] > 0).sort((a, b) => p[b] - p[a]).map((id) => ({ id, label: `${p[id]}화 읽음` }));
        note = '<p class="hint">이 기기에서 읽은 기록이에요.</p>';
      }
      const box = document.getElementById('top-list');
      if (!box) return;
      list = list.slice(0, 10);
      if (!list.length) { box.innerHTML = '<p class="hint">이번 주에는 아직 기록이 없어요. 첫 독자가 되어 보세요!</p>'; return; }
      box.innerHTML = `<ol class="rank-shelf">${list.map((x, i) => {
        const w = WT.toon(x.id);
        const g = WT.genre((w.genres || [])[0]);
        return `<li><a href="${whereIs(x.id)}" class="face press" style="--bc:${w.color || (g && g.color) || '#6A3F1A'}; animation-delay:${i * 0.05}s">
            <span class="rank-no${i < 3 ? ' top' : ''}">${i + 1}</span>
            <span class="face-cover">${w.cover ? `<img src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<b>${esc(w.title)}</b></span>
            <span class="face-title">${esc(w.title)}</span>
            <span class="face-sub">${esc(x.label)}</span>
          </a></li>`;
      }).join('')}</ol>${note}`;
    })();
  }

  // ---------- 로그인 · 회원가입 ----------
  function viewLogin() {
    const s = WT.store.state;
    if (WT.api.on()) return s.profile && s.token ? viewAccountMe() : viewAccount();
    if (s.profile) return viewMe();
    let tab = 'start';
    let enter = true;   // 처음 그릴 때만 등장 애니메이션 (탭을 바꿀 땐 안 해요)
    const draw = () => {
      app().innerHTML = `<div class="view"><div class="login${enter ? ' login-enter' : ''}">${enter ? '<span class="shoot" aria-hidden="true"></span>' : ''}
        <section class="intro">
          <svg viewBox="0 0 300 150" width="300" height="150" aria-hidden="true" style="max-width:100%">
            <polyline points="20,120 70,70 120,95 170,40 220,60 280,20" fill="none" stroke="#E8C66A" stroke-width="2"/>
            <circle cx="20" cy="120" r="9" fill="#5BB8FF"/><circle class="tw" cx="70" cy="70" r="8" fill="#FF7EB6"/>
            <circle cx="120" cy="95" r="8" fill="#FF9A4D"/><circle class="tw" cx="170" cy="40" r="8" fill="#A97BFF"/>
            <circle cx="220" cy="60" r="8" fill="#6BE3A4"/><circle class="tw" cx="280" cy="20" r="6" fill="#2A3A6A" stroke="#9AA6C8" stroke-width="2"/>
          </svg>
          <h1>${esc(WT.settings().siteName)}</h1>
          <p>나만의 닉네임으로 웹툰 별자리를 하나씩 밝히고,<br>본 웹툰에 별점과 한 줄 감상을 남겨 보세요.</p>
        </section>
        <section class="card rpg" aria-label="시작하기"><span class="corner-b" aria-hidden="true"></span>
          <div class="tabs2" role="tablist" aria-label="시작 방법">
            <button type="button" role="tab" aria-selected="${tab === 'start'}" data-tab="start">닉네임으로 시작</button>
            <button type="button" role="tab" aria-selected="${tab === 'account'}" data-tab="account">로그인 · 회원가입</button>
          </div>
          ${tab === 'start' ? `<form class="pane" id="start-form" novalidate>
            <div class="field">
              <label for="nick" style="color:var(--gold); font-weight:700">닉네임</label>
              <input id="nick" class="fld" maxlength="10" placeholder="별점·댓글에 표시될 이름" aria-describedby="nick-help">
              <span id="nick-help" class="hint">2~10자 · 한글, 영어, 숫자. 지금은 이 기기에만 저장돼요.</span>
              <p class="err" id="nick-err" role="alert" hidden></p>
            </div>
            <button type="submit" class="btn btn-gold press" style="min-height:52px; font-size:17px">시작하기</button>
          </form>` : `<div class="pane">
            <div class="soon"><p class="warn">아이디·비밀번호 회원 기능은 준비 중이에요. 열리면 다른 기기에서도 기록을 이어 볼 수 있어요. 그 전까지는 "닉네임으로 시작"을 써 주세요.</p></div>
            <div class="field"><label for="lid">아이디</label><input id="lid" class="fld" disabled></div>
            <div class="field"><label for="lpw">비밀번호</label><input id="lpw" class="fld" type="password" disabled></div>
            <button type="button" class="btn press" disabled>로그인 (준비 중)</button>
          </div>`}
          <div class="or">또는</div>
          <button type="button" class="btn press" id="guest-btn">로그인 없이 둘러보기</button>
          <span class="hint" style="text-align:center">둘러보기 중에는 캐릭터·코인·별점·댓글을 쓸 수 없어요</span>
        </section>
      </div></div>`;
      enter = false;
      app().querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; draw(); }));
      const form = document.getElementById('start-form');
      if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = document.getElementById('nick').value.trim();
        const err = document.getElementById('nick-err');
        if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(v)) {
          err.hidden = false;
          err.textContent = '닉네임은 2~10자의 한글, 영어, 숫자로 정해 주세요.';
          return;
        }
        s.profile = { nick: v };
        s.guest = false;
        if (!s.coins) s.coins = WT.settings().coins.startCoins || 0;
        WT.store.save();
        WT.toast(`${v} 님, 환영해요!`);
        location.hash = '#/';
      });
      document.getElementById('guest-btn').addEventListener('click', () => {
        s.guest = true; markGuest();
        WT.store.save();
        location.hash = '#/';
      });
    };
    draw();
  }

  function viewMe() {
    const s = WT.store.state;
    app().innerHTML = `<div class="view"><div class="login">
      <section class="card rpg" aria-label="내 정보"><span class="corner-b" aria-hidden="true"></span>
        <div style="display:flex; align-items:center; gap:16px">
          <div>${WT.charSVG(WT.currentLook(), 72)}</div>
          <div class="title-block"><h1 style="font-size:26px">${esc(s.profile.nick)} 님</h1><span class="sub">코인 ${s.coins}개 · 완독 ${WT.store.stats().done}개</span></div>
        </div>
        <form class="pane" id="nick-form" novalidate>
          <div class="field"><label for="nick2">닉네임 바꾸기</label><input id="nick2" class="fld" maxlength="10" value="${esc(s.profile.nick)}"><p class="err" id="nick2-err" role="alert" hidden></p></div>
          <button type="submit" class="btn btn-gold press">저장</button>
        </form>
        <p class="hint">지금은 이 기기(브라우저)에만 기록이 저장돼요. 회원 기능이 열리면 계정으로 옮길 수 있어요.</p>
        <div class="or">기록 관리</div>
        <button type="button" class="btn press" id="reset-btn" style="border-color:#7A3045; color:#FF9BB0">이 기기의 기록 모두 지우기</button>
        <a href="#/" class="btn press">홈으로</a>
      </section>
    </div></div>`;
    document.getElementById('nick-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = document.getElementById('nick2').value.trim();
      const err = document.getElementById('nick2-err');
      if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(v)) { err.hidden = false; err.textContent = '닉네임은 2~10자의 한글, 영어, 숫자로 정해 주세요.'; return; }
      s.profile.nick = v; WT.store.save(); WT.toast('닉네임을 바꿨어요'); viewMe();
    });
    let armed = false;
    const rb = document.getElementById('reset-btn');
    rb.addEventListener('click', () => {
      if (!armed) { armed = true; rb.textContent = '한 번 더 누르면 정말 지워져요'; return; }
      WT.store.reset(); WT.toast('기록을 모두 지웠어요'); location.hash = '#/login';
      viewLogin();
    });
  }


  // ---------- 서버 모드: 아이디·비밀번호 로그인 / 회원가입 ----------
  function viewAccount() {
    const s = WT.store.state;
    let tab = 'login';
    let enter = true;
    const draw = () => {
      app().innerHTML = `<div class="view"><div class="login${enter ? ' login-enter' : ''}">${enter ? '<span class="shoot" aria-hidden="true"></span>' : ''}
        <section class="intro">
          <svg viewBox="0 0 300 150" width="300" height="150" aria-hidden="true" style="max-width:100%">
            <polyline points="20,120 70,70 120,95 170,40 220,60 280,20" fill="none" stroke="#E8C66A" stroke-width="2"/>
            <circle cx="20" cy="120" r="9" fill="#5BB8FF"/><circle class="tw" cx="70" cy="70" r="8" fill="#FF7EB6"/>
            <circle cx="120" cy="95" r="8" fill="#FF9A4D"/><circle class="tw" cx="170" cy="40" r="8" fill="#A97BFF"/>
            <circle cx="220" cy="60" r="8" fill="#6BE3A4"/><circle class="tw" cx="280" cy="20" r="6" fill="#2A3A6A" stroke="#9AA6C8" stroke-width="2"/>
          </svg>
          <h1>${esc(WT.settings().siteName)}</h1>
          <p>나만의 닉네임으로 웹툰 별자리를 하나씩 밝히고,<br>본 웹툰에 별점과 한 줄 감상을 남겨 보세요.</p>
        </section>
        <section class="card rpg" aria-label="계정"><span class="corner-b" aria-hidden="true"></span>
          <div class="tabs2" role="tablist" aria-label="로그인 또는 회원가입">
            <button type="button" role="tab" aria-selected="${tab === 'login'}" data-tab="login">로그인</button>
            <button type="button" role="tab" aria-selected="${tab === 'signup'}" data-tab="signup">회원가입</button>
          </div>
          ${tab === 'login' ? `<form class="pane" id="acc-form" novalidate>
            <div class="field"><label for="l-id">아이디</label><input id="l-id" class="fld" autocomplete="username" autocapitalize="off"></div>
            <div class="field"><label for="l-pw">비밀번호</label><input id="l-pw" class="fld" type="password" autocomplete="current-password"></div>
            <p class="err" id="acc-err" role="alert" hidden></p>
            <button type="submit" class="btn btn-gold press" style="min-height:52px; font-size:17px">로그인</button>
          </form>` : `<form class="pane" id="acc-form" novalidate>
            <div class="field"><label for="s-nick" style="color:var(--gold); font-weight:700">닉네임</label><input id="s-nick" class="fld" maxlength="10" placeholder="별점·댓글에 표시될 이름"><span class="hint">2~10자 · 한글, 영어, 숫자 · 다른 사람과 겹칠 수 없어요</span></div>
            <div class="field"><label for="s-id">아이디</label><input id="s-id" class="fld" maxlength="16" autocomplete="username" autocapitalize="off"><span class="hint">영어 소문자·숫자 4~16자 · 가입 후 바꿀 수 없어요</span></div>
            <div style="display:flex; gap:10px; flex-wrap:wrap">
              <div class="field" style="flex:1 1 150px"><label for="s-pw">비밀번호</label><input id="s-pw" class="fld" type="password" autocomplete="new-password"></div>
              <div class="field" style="flex:1 1 150px"><label for="s-pw2">비밀번호 확인</label><input id="s-pw2" class="fld" type="password" autocomplete="new-password"></div>
            </div>
            <p class="warn" style="font-size:12px">8자 이상 · 다른 사이트에서 쓰는 비밀번호는 사용하지 마세요.</p>
            <div class="soon" style="border-style:solid; border-color:rgba(255,255,255,0.15); background:rgba(0,0,0,0.25)">
              <p class="hint" style="margin:0; font-size:12px; line-height:1.7; color:var(--soft)"><b style="color:var(--text)">[필수] 개인정보 수집·이용 동의</b><br>
              · 모으는 것: 아이디, 닉네임, 비밀번호(암호화해서 저장)<br>
              · 쓰는 곳: 로그인, 별점·댓글 표시, 감상 진행·코인 저장<br>
              · 보관 기간: 탈퇴할 때까지 (탈퇴하면 바로 삭제)<br>
              · 댓글은 다른 사용자에게 닉네임과 함께 공개돼요.</p>
            </div>
            <label style="display:flex; align-items:center; gap:8px; font-size:14px; min-height:36px"><input type="checkbox" id="s-agree" style="width:18px; height:18px; accent-color:var(--gold)"> 위 내용을 읽고 동의합니다</label>
            <p class="err" id="acc-err" role="alert" hidden></p>
            <button type="submit" class="btn btn-gold press" style="min-height:52px; font-size:17px">가입하고 시작하기</button>
          </form>`}
          <div class="or">또는</div>
          <button type="button" class="btn press" id="guest-btn">로그인 없이 둘러보기</button>
          <span class="hint" style="text-align:center">둘러보기 중에는 캐릭터·코인·별점·댓글을 쓸 수 없어요</span>
        </section>
      </div></div>`;
      enter = false;
      app().querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; draw(); }));
      document.getElementById('guest-btn').addEventListener('click', () => { s.guest = true; markGuest(); WT.store.save(); location.hash = '#/'; });
      const form = document.getElementById('acc-form');
      const err = document.getElementById('acc-err');
      const showErr = (m) => { err.hidden = false; err.textContent = m; };
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type=submit]');
        let payload;
        if (tab === 'login') {
          payload = { userId: document.getElementById('l-id').value.trim().toLowerCase(), password: document.getElementById('l-pw').value };
          if (!payload.userId || !payload.password) return showErr('아이디와 비밀번호를 적어 주세요.');
        } else {
          const nick = document.getElementById('s-nick').value.trim();
          const id = document.getElementById('s-id').value.trim().toLowerCase();
          const pw = document.getElementById('s-pw').value;
          if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(nick)) return showErr('닉네임은 2~10자의 한글, 영어, 숫자로 정해 주세요.');
          if (!/^[a-z0-9]{4,16}$/.test(id)) return showErr('아이디는 영어 소문자·숫자 4~16자로 정해 주세요.');
          if (pw.length < 8) return showErr('비밀번호는 8자 이상으로 정해 주세요.');
          if (pw !== document.getElementById('s-pw2').value) return showErr('비밀번호 확인이 맞지 않아요.');
          if (!document.getElementById('s-agree').checked) return showErr('개인정보 수집·이용에 동의해 주세요.');
          payload = { userId: id, password: pw, nickname: nick, agree: true };
        }
        btn.disabled = true; btn.textContent = '잠시만요…';
        try {
          const r = await WT.api.call(tab === 'login' ? 'login' : 'signup', payload);
          if (r.admin) {
            // 관리자 로그인: 비밀번호는 이 탭에서만 기억하고, 관리자 화면의 [회원 · 댓글 · 제보]로 바로 가요
            try { sessionStorage.setItem('webtoontree.adminpw', payload.password); } catch (x) { /* 무시 */ }
            location.href = 'admin.html#server';
            return;
          }
          s.token = r.token; s.guest = false;
          WT.api.applyMe(r.me);
          WT.toast(r.me.role === 'admin' ? `${r.me.nickname} 님, 환영해요! 관리자 화면은 [내 정보]에서 열 수 있어요` : `${r.me.nickname} 님, 환영해요!`);
          location.hash = '#/';
        } catch (x) {
          showErr(x.message);
          btn.disabled = false; btn.textContent = tab === 'login' ? '로그인' : '가입하고 시작하기';
        }
      });
    };
    draw();
  }

  function viewAccountMe() {
    const s = WT.store.state;
    app().innerHTML = `<div class="view"><div class="login">
      <section class="card rpg" aria-label="내 정보"><span class="corner-b" aria-hidden="true"></span>
        <div style="display:flex; align-items:center; gap:16px">
          <div>${WT.charSVG(WT.currentLook(), 72)}</div>
          <div class="title-block"><h1 style="font-size:26px">${esc(s.profile.nick)} 님</h1><span class="sub">아이디 ${esc(s.profile.userId || '')} · 코인 ${s.coins}개</span></div>
        </div>
        <form class="pane" id="nick-form" novalidate>
          <div class="field"><label for="nick2">닉네임 바꾸기</label><input id="nick2" class="fld" maxlength="10" value="${esc(s.profile.nick)}"><p class="err" id="nick2-err" role="alert" hidden></p></div>
          <button type="submit" class="btn btn-gold press">저장</button>
        </form>
        <div class="row2"><a href="#/" class="btn press">홈으로</a><button type="button" class="btn press" id="logout-btn">로그아웃</button></div>
        ${s.role === 'admin' ? '<a href="admin.html#server" class="btn btn-gold press">관리자 화면 열기</a><span class="hint" style="text-align:center">최종 관리자에게 관리자 권한을 받은 계정이에요</span>' : ''}
        <details style="border-top:1px dashed rgba(255,255,255,0.16); padding-top:12px">
          <summary style="cursor:pointer; font-size:14px; color:var(--muted)">회원 탈퇴</summary>
          <form class="pane" id="del-form" style="margin-top:12px" novalidate>
            <p class="warn">탈퇴하면 계정, 감상 기록, 코인, 별점이 바로 지워져요. 댓글은 "탈퇴한 사용자"로 남아요.</p>
            <div class="field"><label for="del-pw">비밀번호 확인</label><input id="del-pw" class="fld" type="password" autocomplete="current-password"></div>
            <p class="err" id="del-err" role="alert" hidden></p>
            <button type="submit" class="btn btn-danger press" style="border:1px solid #7A3045; color:#FF9BB0; background:transparent">탈퇴하기</button>
          </form>
        </details>
      </section>
    </div></div>`;
    document.getElementById('nick-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = document.getElementById('nick2').value.trim();
      const err = document.getElementById('nick2-err');
      try { const r = await WT.api.authed('nick', { nickname: v }); WT.api.applyMe(r.me); WT.toast('닉네임을 바꿨어요'); viewAccountMe(); }
      catch (x) { err.hidden = false; err.textContent = x.message; }
    });
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try { await WT.api.call('logout', { token: s.token }); } catch (x) { /* 이미 풀렸어도 괜찮아요 */ }
      WT.store.reset();
      WT.toast('로그아웃했어요');
      location.hash = '#/login';
      viewAccount();
    });
    document.getElementById('del-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('del-err');
      try {
        await WT.api.authed('deleteAccount', { password: document.getElementById('del-pw').value });
        WT.store.reset();
        WT.toast('탈퇴했어요. 그동안 고마웠어요');
        location.hash = '#/login';
        viewAccount();
      } catch (x) { err.hidden = false; err.textContent = x.message; }
    });
  }

  // ---------- 주소 이동 ----------
  WT.views = { home: viewHome, login: viewLogin, top: viewTop };

  /** 둘러보기는 이번 방문(탭)에서만: 사이트를 새로 열면 다시 로그인 화면부터 */
  const GUEST_KEY = 'webtoontree.guestVisit';
  function markGuest() { try { sessionStorage.setItem(GUEST_KEY, '1'); } catch (e) { /* 무시 */ } }

  /** 배경 별똥별: 2~5초마다 하나씩 작게 떨어져요. 탭을 안 보고 있거나 애니메이션을 끄면 쉬어요 */
  function startMeteors() {
    if (document.querySelector('.sky')) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sky = document.createElement('div');
    sky.className = 'sky';
    sky.setAttribute('aria-hidden', 'true');
    document.body.prepend(sky);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const spawn = () => {
      if (!document.hidden && !document.body.classList.contains('no-anim') && sky.childElementCount < 4) {
        const m = document.createElement('i');
        m.className = 'meteor';
        const len = rnd(50, 110), dur = rnd(0.9, 1.5);
        m.style.cssText = `left:${rnd(20, 98)}vw; top:${rnd(2, 55)}vh; width:${len}px; --ang:${rnd(140, 160)}deg; --dist:${rnd(180, 380)}px; --dur:${dur}s; --op:${rnd(0.7, 1)}`;
        sky.appendChild(m);
        setTimeout(() => m.remove(), dur * 1000 + 100);
      }
      setTimeout(spawn, rnd(1800, 5000));
    };
    setTimeout(spawn, 1200);
  }

  /** 제작진 소개: 검은 화면에 흰 글씨. 누르거나 키를 누르면 건너뛰어요 */
  const CREDITS_KEY = 'webtoontree.creditsSeen';
  const CREDITS = ['김형호', '신효제', '이유섭'];
  function playCredits(done) {
    try { sessionStorage.setItem(CREDITS_KEY, '1'); } catch (e) { /* 무시 */ }
    const el = document.createElement('div');
    el.className = 'credits';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '제작: ' + CREDITS.join(', '));
    el.innerHTML = `<div class="credits-in">
        <p class="cr-role">제작</p>
        ${CREDITS.map((n, i) => `<p class="cr-name" style="animation-delay:${0.9 + i * 0.45}s">${esc(n)}</p>`).join('')}
      </div>
      <p class="cr-skip">화면을 누르면 건너뛰어요</p>`;
    document.body.appendChild(el);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      el.classList.add('out');
      document.removeEventListener('keydown', finish);
      setTimeout(() => { el.remove(); }, 700);
      setTimeout(done, 250);   // 로그인 화면은 검은 화면이 걷히면서 바로 등장해요
    };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(finish, reduce ? 1800 : 4600);
    el.addEventListener('click', finish);
    document.addEventListener('keydown', finish);
  }

  function route() {
    const parts = (location.hash || '#/').replace(/^#\/?/, '').split('/').filter(Boolean);
    const name = parts[0] || 'home';
    const s = WT.store.state;
    if (!s.profile && !s.guest && name !== 'login') { location.replace('#/login'); return; }
    const view = WT.views[name] || viewHome;
    if (WT.leaveView) { WT.leaveView(); WT.leaveView = null; }
    window.scrollTo(0, 0);
    view(parts.slice(1));
    document.title = `${WT.settings().siteName}`;
  }

  WT.applySettings = function () {
    const c = WT.settings().colors || {};
    const r = document.documentElement.style;
    if (c.bg) r.setProperty('--bg', c.bg);
    if (c.panel) r.setProperty('--panel', c.panel);
    if (c.gold) r.setProperty('--gold', c.gold);
    if (c.text) r.setProperty('--text', c.text);
    if (c.muted) r.setProperty('--muted', c.muted);
    document.body.classList.toggle('no-anim', WT.settings().animations === false);
  };

  async function init() {
    try {
      const res = await fetch('data/data.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      WT.data = await res.json();
    } catch (e) {
      app().innerHTML = '<div class="view" style="align-items:center; justify-content:center; padding:40px; text-align:center"><p>웹툰 데이터를 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.</p></div>';
      return;
    }
    // 관리자 미리보기: index.html?preview=1 이면 관리자 화면에서 고치던 초안을 보여 줘요
    if (new URLSearchParams(location.search).get('preview') === '1') {
      try {
        const draft = JSON.parse(localStorage.getItem('webtoontree.admin.draft') || 'null');
        if (draft && Array.isArray(draft.webtoons)) {
          WT.data = draft;
          const bar = document.createElement('div');
          bar.setAttribute('role', 'status');
          bar.style.cssText = 'position:fixed; left:50%; top:8px; transform:translateX(-50%); z-index:70; padding:6px 14px; border-radius:999px; background:#FFB27A; color:#2A1405; font-size:13px; font-weight:700; box-shadow:0 4px 14px rgba(0,0,0,.4)';
          bar.textContent = '관리자 미리보기 · 아직 사이트에 올리지 않은 데이터예요';
          document.body.appendChild(bar);
        }
      } catch (e) { /* 초안이 없으면 원래 데이터 */ }
    }
    WT.applySettings();
    // 서버 모드: 로그인 상태 확인 + 오늘 폭주 목록 (늦어도 4초만 기다려요)
    if (WT.api.on()) {
      const S = WT.store.state;
      const tasks = [
        WT.api.call('hot').then((r) => { WT.data.hotToday = r.hot || []; }).catch(() => {})
      ];
      if (S.token) {
        tasks.push(WT.api.call('me', { token: S.token }).then((r) => WT.api.applyMe(r.me)).catch((e) => {
          if (e.auth) { S.token = null; S.profile = null; WT.store.save(); }
        }));
      } else if (S.profile) {
        S.profile = null; WT.store.save();   // 혼자 모드 닉네임은 서버 계정이 아니에요
      }
      await Promise.race([Promise.all(tasks), new Promise((r) => setTimeout(r, 4000))]);
    }
    startMeteors();
    // 사이트를 새로 열었을 때: 로그인하지 않았으면 (예전에 둘러보기를 했어도) 로그인 화면부터 보여 줘요
    {
      const S2 = WT.store.state;
      let visiting = false;
      try { visiting = sessionStorage.getItem(GUEST_KEY) === '1'; } catch (e) { visiting = false; }
      if (S2.guest && !visiting) { S2.guest = false; WT.store.save(); }
    }
    window.addEventListener('hashchange', () => {
      if (WT.onHashChange && WT.onHashChange()) return;
      route();
    });
    // 로그인 화면으로 가는 첫 방문이면, 게임처럼 제작진 소개를 먼저 보여 줘요 (탭마다 한 번)
    const S3 = WT.store.state;
    const loggedIn = WT.api.on() ? !!(S3.profile && S3.token) : !!S3.profile;
    let seen = false;
    try { seen = sessionStorage.getItem(CREDITS_KEY) === '1'; } catch (e) { seen = false; }
    if (!loggedIn && !S3.guest && !seen && !new URLSearchParams(location.search).has('preview')) playCredits(route);
    else route();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
