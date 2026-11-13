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

  // ---------- 관심 웹툰 ----------
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>';
  WT.fav = {
    has: (id) => !!((WT.store.state.favs || {})[id]),
    list: () => Object.keys(WT.store.state.favs || {}).filter((id) => WT.toon(id)),
    /** 관심 단추. text 를 주면 글자도 함께 보여 줘요 */
    btn: (id, cls, text) => `<button type="button" class="fav-btn${cls ? ' ' + cls : ''}" data-fav="${WT.esc(id)}" aria-pressed="${WT.fav.has(id)}" aria-label="관심 웹툰" title="관심 웹툰">${HEART}${text ? '<span>관심</span>' : ''}</button>`,
    mark: (id) => (WT.fav.has(id) ? `<span class="fav-mark" role="img" aria-label="관심 웹툰">${HEART}</span>` : ''),
    toggle(id) {
      const S = WT.store.state;
      S.favs = S.favs || {};
      const on = !S.favs[id];
      if (on) S.favs[id] = 1; else delete S.favs[id];
      WT.store.save();
      document.querySelectorAll('[data-fav]').forEach((b) => { if (b.dataset.fav === id) b.setAttribute('aria-pressed', String(on)); });
      WT.toast(on ? '관심 웹툰에 담았어요' : '관심 웹툰에서 뺐어요');
      // 로그인했으면 계정에도 저장해요 (서버 코드가 예전 버전이면 이 기기에만 남아요)
      if (S.profile && S.profile.userId && WT.api && WT.api.on()) WT.api.authed('fav', { webtoonId: id, on }).then((r) => { if (r && r.me) WT.api.applyMe(r.me); }, () => {});
      document.dispatchEvent(new CustomEvent('wt:fav', { detail: { id, on } }));
      return on;
    }
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-fav]');
    if (!b || !WT.toon(b.dataset.fav)) return;
    e.preventDefault(); e.stopPropagation();
    WT.fav.toggle(b.dataset.fav);
  }, true);

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
    return `<a href="#/me" class="pill pill-coin press" id="coin-pill" aria-label="내 코인 ${WT.store.state.coins}개, 캐릭터 꾸미기로"><span class="coin" aria-hidden="true">C</span><span id="coin-num">${WT.store.state.coins}</span></a>`;
  };
  WT.popCoin = function (label) {
    document.querySelectorAll('[id="coin-num"]').forEach((n) => { n.textContent = WT.store.state.coins; });
    const pill = Array.from(document.querySelectorAll('[id="coin-pill"]')).find((x) => x.offsetParent) || null;   // 보이는 코인 칸에 띄워요
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
    return `<a href="${s.profile ? '#/me' : '#/login'}" class="pill press" aria-label="프로필"><span class="avatar" aria-hidden="true">${esc((s.profile ? s.profile.nick : '?')[0])}</span>${esc(nick)}</a>`;
  };

  // ---------- 블랙 모드 · 화이트 모드 ----------
  const THEME_KEY = 'webtoontree.theme';
  WT.theme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  WT.setTheme = function (t) {
    if (t === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* 저장 못 해도 이번엔 바뀌어요 */ }
    document.querySelectorAll('.theme-btn').forEach((b) => {
      b.setAttribute('aria-label', t === 'light' ? '블랙 모드로 바꾸기' : '화이트 모드로 바꾸기');
      b.title = t === 'light' ? '블랙 모드' : '화이트 모드';
    });
  };
  WT.themeBtn = function () {
    const light = WT.theme() === 'light';
    return `<button type="button" class="pill press theme-btn" data-theme-toggle aria-label="${light ? '블랙 모드로 바꾸기' : '화이트 모드로 바꾸기'}" title="${light ? '블랙 모드' : '화이트 모드'}">
      <svg class="moon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>
      <svg class="sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>
    </button>`;
  };
  // 바꿀 때 화면이 부드럽게 넘어가도록 (움직임 줄이기 설정이면 바로 바꿔요)
  WT.switchTheme = function () {
    const next = WT.theme() === 'light' ? 'dark' : 'light';
    const calm = document.body.classList.contains('no-anim') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (calm) { WT.setTheme(next); return; }
    if (document.startViewTransition) { document.startViewTransition(() => WT.setTheme(next)); return; }
    const html = document.documentElement;
    html.classList.add('theme-fade');
    WT.setTheme(next);
    clearTimeout(WT._fadeT);
    WT._fadeT = setTimeout(() => html.classList.remove('theme-fade'), 800);
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (b) WT.switchTheme();
  });

  // ---------- 모든 화면 공통 왼쪽 메뉴: 홈 · 트리 · 도서관 · 랭킹 · 프로필 ----------
  const RAIL_IC = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${d}</svg>`;
  WT.lastTree = function (gid) {
    try { if (gid) localStorage.setItem('webtoontree.lastTree', gid); return localStorage.getItem('webtoontree.lastTree'); } catch (e) { return gid || null; }
  };
  WT.renderRail = function (name) {
    let el = document.getElementById('app-rail');
    if (!el) { el = document.createElement('nav'); el.id = 'app-rail'; el.className = 'app-rail'; el.setAttribute('aria-label', '메뉴'); document.body.insertBefore(el, document.getElementById('app')); }
    const live = WT.liveGenres().map((g) => g.id);
    const last = WT.lastTree();
    const treeId = live.includes(last) ? last : live[0];
    const s = WT.store.state;
    const on = { home: 'home', tree: 'tree', map: 'tree', worlds: 'tree', library: 'library', books: 'library', author: 'library', week: 'week', top: 'rank', ranking: 'rank', me: 'me', shop: 'me', login: 'me' }[name] || 'home';
    const items = [
      ['home', '#/', '홈', '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'],
      ['tree', treeId ? `#/tree/${treeId}` : (WT.liveGenres()[0] ? `#/tree/${WT.liveGenres()[0].id}` : '#/worlds'), '트리', '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.6 7.9l3.2 7.8M16.4 7.9l-3.2 7.8"/>'],
      ['library', '#/library/all', '도서관', '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18"/>'],
      ['week', '#/week', '요일', '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2"/>'],
      ['rank', '#/top', '랭킹', '<path d="M7 4h10v5a5 5 0 0 1-10 0z M7 6H4a3 3 0 0 0 3 4 M17 6h3a3 3 0 0 1-3 4 M12 14v4 M8 21h8"/>'],
      ['me', s.profile ? '#/me' : '#/login', '프로필', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>']
    ];
    items.splice(5, 0, ['map', '#/worlds', '전체 지도', '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14"/>']);
    const onD = (name === 'map' || name === 'worlds') ? 'map' : on;   // 위쪽 메뉴에서는 전체 지도가 따로 있어요
    const nick = s.profile ? s.profile.nick : '둘러보기 중';
    el.innerHTML = `<a href="#/" class="rail-mark" aria-label="${esc(WT.settings().siteName)} 홈"><span class="au-mark" aria-hidden="true"><i></i><i></i><i></i></span><b>${esc(WT.settings().siteName)}</b></a>
      <div class="rail-items">${items.map(([k, href, label, d]) => `<a href="${href}" class="rail-item k-${k}${on === k ? ' on' : ''}${onD === k ? ' on-d' : ''}" ${on === k ? 'aria-current="page"' : ''} title="${label}">${RAIL_IC(d)}<span class="lb">${label}</span>${k === 'me' ? `<i class="rail-av" aria-hidden="true">${esc((s.profile ? s.profile.nick : '?')[0])}</i><span class="nk">${esc(nick)}</span>` : ''}</a>`).join('')}</div>
      <div class="rail-tools">${WT.coinPill ? WT.coinPill() : ''}${WT.themeBtn()}</div>`;
  };

  WT.topRight = function (opts) {
    const o = opts || {};
    return `<div class="right">
      ${o.map === false ? '' : `<a href="#/worlds" class="pill pill-gold press">${WT.icon.map}전체 지도</a>`}
      ${WT.coinPill()}
      ${WT.themeBtn()}
      ${WT.userChip()}
    </div>`;
  };

  WT.band = function (current) {
    const items = WT.liveGenres().map((g) =>
      `<a href="#/tree/${g.id}" style="--gc:${g.color}" ${current === g.id ? 'aria-current="page"' : ''} class="press"><span class="dot" aria-hidden="true"></span>${esc(g.name)}</a>`).join('');
    return `<nav class="band" aria-label="장르 선택"><a href="#/worlds" style="--gc:#E8C66A" class="press">전체</a>${items}</nav>`;
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
<text x="100" y="212" text-anchor="middle" font-family="Noto Sans KR, sans-serif" font-weight="900" font-size="30" fill="#3A2A06">1</text><text x="39" y="220" text-anchor="middle" font-family="Noto Sans KR, sans-serif" font-weight="900" font-size="24" fill="#2A3150">2</text><text x="161" y="225" text-anchor="middle" font-family="Noto Sans KR, sans-serif" font-weight="900" font-size="20" fill="#3A1E06">3</text></svg></span>`
  };
  /** 전체화면인지: 전체화면 버튼(Fullscreen API) 또는 F11 (브라우저 창이 화면을 꽉 채움) */
  WT.checkFullscreen = function () {
    const f = !!document.fullscreenElement
      || (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches)
      || (window.innerHeight >= screen.height - 2 && window.innerWidth >= screen.width - 2);
    document.body.classList.toggle('is-fs', f);
    return f;
  };
  let homeIndex = 0;   // 다른 화면에 다녀와도 보던 카드에서 다시 시작

  // ---------- 홈: 슬로건 하나와 시작 버튼 ----------
  // 슬로건 한 줄: *별표*로 감싼 글자는 강조색
  const heroLine = (t, def) => esc((t || '').trim() || def).replace(/\*([^*]+)\*/g, '<b>$1</b>');
  function viewHomeHero() {
    const st = WT.settings();
    const hero = st.hero || {};
    const s = WT.store.state;
    const live = WT.liveGenres().map((g) => g.id);
    const last = WT.lastTree();
    const gid = live.includes(last) ? last : live[0];
    const href = gid ? `#/tree/${gid}` : '#/library/all';
    // 이어 볼 웹툰: 가장 최근에 화수를 기록한 웹툰 중 아직 다 안 본 것 (없으면 아직 다 안 본 아무 웹툰)
    const P = s.progress || {};
    const epOf = (id) => Math.min(WT.eps(WT.toon(id)), P[id] || 0);
    const unfinished = (id) => WT.toon(id) && epOf(id) > 0 && epOf(id) < WT.eps(WT.toon(id));
    let cur = null;
    for (let i = (s.log || []).length - 1; i >= 0 && !cur; i--) { const e = s.log[i]; if (e.t === 'ep' && unfinished(e.w)) cur = e.w; }
    if (!cur) cur = Object.keys(P).find(unfinished) || null;
    const began = Object.keys(P).some((id) => P[id] > 0);
    let cont = '';
    if (cur) {
      const w = WT.toon(cur);
      const tg = live.find((g) => WT.data.trees[g] && WT.data.trees[g].nodes && WT.data.trees[g].nodes[cur]);
      const tot = WT.eps(w), e = epOf(cur);
      let where = '도서관', link = `#/library/${((w.genres || []).find((x) => live.includes(x))) || 'all'}/${cur}`;
      if (tg) {
        const ids = Object.keys(WT.data.trees[tg].nodes);
        const done = ids.filter((id) => WT.toon(id) && (epOf(id) >= WT.eps(WT.toon(id)) || (s.rewarded || {})[id + ':done'])).length;
        where = `${esc((WT.genre(tg) || {}).name || '')} 트리 ${done} / ${ids.length} 완독`;
        link = `#/tree/${tg}/${cur}`;
      }
      cont = `<a href="${link}" class="hm-cont" aria-label="${esc(w.title)} ${e + 1}화부터 이어 보기">
          <span class="ci"><span class="ct"><em>이어 보기</em>${esc(w.title)}</span>
          <span class="cb">${where}<span class="bar" style="--p:${Math.round(e / tot * 100)}%"><b></b></span>${e} / ${tot}화</span></span>
          <span class="cgo" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
        </a>`;
    }
    app().innerHTML = `<div class="view hm-view">
        <span class="hm-glow" aria-hidden="true"></span><span class="hm-glow b" aria-hidden="true"></span>
        <div class="topbar hm-top"><div class="left"><b class="hm-name">${esc(st.siteName)}</b></div>${WT.topRight()}</div>
        <section class="hm-hero">
          ${st.notice ? `<p class="hm-notice">${esc(st.notice)}</p>` : ''}
          <h1 class="hm-h1"><span>${heroLine(hero.line1, '볼 건 많고, 시간은 없고?')}</span><span>${heroLine(hero.line2, '*트리*가 골라 줄게요.')}</span></h1>
          <p class="hm-sub">${esc((hero.sub || '').trim() || '수많은 웹툰 중에 진짜 볼 만한 것만. 순서대로 따라가기만 하면 돼요.')}</p>
          ${cont || `<a href="${href}" class="hm-cta">${began ? '다음 웹툰 고르기' : '첫 웹툰 고르기'}<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`}
        </section>
      </div>`;
  }

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
      { kind: 'lib', href: '#/library/all', name: '도서관', sub: '마음대로 골라 보기', tag: `${libN}권`, foot: '모든 웹툰', color: '#7A4A22', label: `도서관으로 가기, 웹툰 ${libN}권` },
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
          <span class="home-logo"><span class="au-mark" aria-hidden="true"><i></i><i></i><i></i></span><h1>${esc(st.siteName)}</h1></span>
          ${WT.topRight({ map: false })}
        </div>
        ${st.notice ? `<p class="notice">${esc(st.notice)}</p>` : ''}
        ${N ? `<div class="home-vp" id="home-vp"><div class="home-track" id="home-track">${
          Array.from({ length: COPIES }, (_, c) => items.map((it, k) => cardHTML(it, k, c === 2)).join('')).join('')}</div></div>`
        : `<section class="rpg" style="max-width:520px; margin:40px auto; padding:28px; text-align:center; display:flex; flex-direction:column; gap:10px"><span class="corner-b" aria-hidden="true"></span>
          <h2 style="margin:0; font-family:var(--display); font-weight:800; font-size:24px">장르별 웹툰 트리를 준비하고 있어요</h2>
          <p class="hint" style="font-size:14px; margin:0">곧 장르별 웹툰 트리가 열려요. 조금만 기다려 주세요!</p></section>`}
        <div class="home-foot">
          <a href="#/" class="pill pill-gold press"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/></svg>홈</a>
          ${document.fullscreenEnabled ? `<button type="button" class="home-fs press" id="home-fs" aria-label="전체화면" title="전체화면">
            <svg class="en" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
            <svg class="ex" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg></button>` : ''}
          ${N ? `<span class="home-nav"><span id="home-pos" aria-live="polite"></span>
            <button type="button" class="home-btn press" id="home-prev" aria-label="이전 카드"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>이전</button>
            <button type="button" class="home-btn press" id="home-next" aria-label="다음 카드">다음<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></span>` : ''}
        </div>
      </div>
    </div>`;
    const fsBtn = document.getElementById('home-fs');
    if (fsBtn) fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen().catch(() => {});
    });
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
      // 빠르게 계속 눌러도 끝이 없게: 가운데 줄에서 너무 멀어지면 같은 카드(가운데 줄)로 먼저 몰래 옮겨요
      if (k < N || k >= 4 * N) {
        const base = 2 * N + mod(v);
        k = base + (k - v);
        cards[v].classList.remove('is-active');
        v = base; place(false);
        cards[v].classList.add('is-active', 'no-pop');
        setTimeout(() => cards[base].classList.remove('no-pop'), 50);
      }
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
    // 남은 높이·너비에 맞춰 카드 크기(--s)를 정해요 (튀어나온 표지 + 카드 + 아래 점까지 들어가게)
    const panel = app().querySelector('.home-panel');
    const fit = () => {
      WT.checkFullscreen();
      const h = vp.clientHeight, w = vp.clientWidth;
      // 높이: 튀어나온 표지~아래 점까지 약 600 · 너비: 넓은 화면에선 카드가 4장쯤 보이게
      const byH = h / 600, byW = Math.min((w - 40) / 300, w / (308 * 4.2));
      const sc = Math.max(0.42, Math.min(1.4, byH, Math.max(byW, Math.min(1, (w - 40) / 300))));
      panel.style.setProperty('--s', sc.toFixed(3));
      track.classList.add('fit');
      place(false);
      requestAnimationFrame(() => track.classList.remove('fit'));
    };
    const onResize = () => fit();
    document.addEventListener('keydown', onKey);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onResize);
    document.body.classList.add('home-lock');   // 홈은 위아래로 스크롤하지 않아요 (판이 화면 높이에 맞춰져요)
    WT.leaveView = () => {
      document.body.classList.remove('home-lock');
      document.removeEventListener('fullscreenchange', onResize);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
    fit();
    go(v, false);
    // 글꼴이 늦게 들어오면 카드 위치가 바뀔 수 있어 한 번 더 맞춰요
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (track.isConnected) fit(); });
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
          <nav class="rank-switch" aria-label="랭킹 종류"><a href="#/top" aria-current="page">웹툰 랭킹</a><a href="#/ranking">독자 랭킹</a></nav>
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

  // ---------- 로그인 화면 틀: 왼쪽 입력 · 오른쪽 입문작 표지가 일정한 간격으로 넘어가요 ----------
  const AU_EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const auField = (id, label, o = {}) => `<div class="au-field"><label for="${id}">${label}</label><div class="au-input"><input id="${id}" type="${o.pw ? 'password' : 'text'}"${o.max ? ` maxlength="${o.max}"` : ''}${o.ac ? ` autocomplete="${o.ac}"` : ''} autocapitalize="off" spellcheck="false" placeholder="${o.ph || ''}"${o.desc ? ` aria-describedby="${id}-h"` : ''}>${o.pw ? `<button type="button" class="au-eye" data-eye="${id}" aria-label="비밀번호 보기">${AU_EYE}</button>` : ''}</div>${o.hint ? `<span class="au-hint" id="${id}-h">${o.hint}</span>` : ''}</div>`;
  function authShell(paneHTML) {
    const st = WT.settings();
    const covers = WT.liveGenres().map((g) => {
      const w = WT.toon(WT.data.trees[g.id].start);
      return w ? { title: w.title, cover: w.cover || '', tone: w.color || (WT.color && WT.color.cached(w.cover)) || shade(g.color, 0.5), glow: g.color } : null;
    }).filter(Boolean);
    app().innerHTML = `<div class="view au-view"><main class="au-shell">
      <section class="au-form-side">
        <div class="au-top"><span class="au-brand"><span class="au-mark" aria-hidden="true"><i></i><i></i><i></i></span><b>${esc(st.siteName)}</b></span>${WT.themeBtn()}</div>
        <div class="au-form-wrap" id="au-pane">${paneHTML}</div>
        <div class="au-foot">© ${esc(st.siteName)} · 제작 김형호, 신효제, 이유섭</div>
      </section>
      ${covers.length ? `<section class="au-art" aria-label="장르별 입문작 표지" id="au-art">
        <div class="au-vp" id="au-vp"><div class="au-track" id="au-track">${Array.from({ length: 5 }, (_, c) => covers.map((x, i) => {
          const base = /^#[0-9a-f]{6}$/i.test(x.tone) ? x.tone : '#5A4A8A';
          return `<div class="au-cv" style="--a:${shade(base, 1.25)}; --b:${shade(base, 0.45)}; --r:${i % 2 ? 3 : -3}deg"${c === 2 ? ` title="${esc(x.title)}"` : ' aria-hidden="true"'}>${x.cover ? `<img src="${esc(x.cover)}" alt="${c === 2 ? esc(x.title) + ' 표지' : ''}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<b>${esc(x.title)}</b></div>`;
        }).join('')).join('')}</div></div>
        <div class="au-dots" id="au-dots" aria-hidden="true">${covers.map(() => '<i></i>').join('')}</div>
        <div class="au-cap"><h2>처음 보기 좋은 웹툰부터</h2><p>장르마다 고른 입문작으로 가볍게 시작해 보세요.</p></div>
      </section>` : ''}
    </main></div>`;
    if (!covers.length) return;
    // 표지: 3초마다 한 장씩 끝없이 (마우스를 올리면 멈춰요)
    const N = covers.length, vp = document.getElementById('au-vp'), track = document.getElementById('au-track'), art = document.getElementById('au-art');
    const cards = [...track.children], dots = [...document.getElementById('au-dots').children];
    const mod = (x) => ((x % N) + N) % N;
    let v = 2 * N;
    const place = (anim) => {
      const c = cards[v];
      track.classList.toggle('fit', !anim);
      track.style.transform = `translateX(${vp.clientWidth / 2 - (c.offsetLeft + c.offsetWidth / 2)}px)`;
      if (!anim) { void track.offsetWidth; track.classList.remove('fit'); }
    };
    const go = (k) => {
      if (k < N || k >= 4 * N) { const base = 2 * N + mod(v); k = base + (k - v); cards[v].classList.remove('on'); v = base; place(false); cards[v].classList.add('on'); }
      v = k; place(true);
      cards.forEach((c, n) => c.classList.toggle('on', n === v));
      dots.forEach((d, n) => d.classList.toggle('on', n === mod(v)));
      art.style.setProperty('--glow', covers[mod(v)].glow);
    };
    const fit = () => { if (!vp.clientWidth) return; track.style.setProperty('--w', Math.max(150, Math.min(250, vp.clientWidth * 0.36)).toFixed(0) + 'px'); place(false); };
    let timer = null;
    const calm = document.body.classList.contains('no-anim') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const restart = () => { clearInterval(timer); if (!calm) timer = setInterval(() => go(v + 1), 3000); };
    cards.forEach((c, n) => c.addEventListener('click', () => { go(n); restart(); }));
    vp.addEventListener('mouseenter', () => clearInterval(timer));
    vp.addEventListener('mouseleave', restart);
    window.addEventListener('resize', fit);
    WT.leaveView = () => { clearInterval(timer); window.removeEventListener('resize', fit); };
    fit(); go(v); restart();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (track.isConnected) place(false); });
  }
  // 비밀번호 보기 (한 번만 걸어 둬요)
  document.addEventListener('click', (e) => {
    const ey = e.target.closest && e.target.closest('[data-eye]');
    if (!ey) return;
    const i = document.getElementById(ey.dataset.eye);
    if (!i) return;
    i.type = i.type === 'password' ? 'text' : 'password';
    ey.setAttribute('aria-label', i.type === 'password' ? '비밀번호 보기' : '비밀번호 숨기기');
  });
  const auSwap = (html) => { const el = document.getElementById('au-pane'); if (el) el.innerHTML = html; };

  // ---------- 로그인 · 회원가입 ----------
  function viewLogin() {
    const s = WT.store.state;
    if (WT.api.on()) return s.profile && s.token ? viewAccountMe() : viewAccount();
    if (s.profile) return viewMe();
    // 서버 없이 쓰는 모드: 닉네임만 정하면 이 기기에 기록돼요
    authShell(`<form class="au-pane" id="start-form" novalidate>
        <h1>반가워요!</h1>
        <p class="au-lead">닉네임을 정하면 바로 시작할 수 있어요.</p>
        ${auField('nick', '닉네임', { max: 10, ph: '별점·댓글에 표시될 이름', hint: '2~10자 · 한글, 영어, 숫자. 지금은 이 기기에만 저장돼요.', desc: true })}
        <p class="au-err" id="nick-err" role="alert" hidden></p>
        <button type="submit" class="au-btn au-main">시작하기</button>
        <button type="button" class="au-btn au-sub" id="guest-btn">로그인 없이 둘러보기</button>
        <p class="au-note">둘러보기 중에는 캐릭터·코인·별점·댓글을 쓸 수 없어요</p>
      </form>`);
    document.getElementById('start-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = document.getElementById('nick').value.trim();
      const err = document.getElementById('nick-err');
      if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(v)) { err.hidden = false; err.textContent = '닉네임은 2~10자의 한글, 영어, 숫자로 정해 주세요.'; return; }
      s.profile = { nick: v };
      s.guest = false;
      if (!s.coins) s.coins = WT.settings().coins.startCoins || 0;
      WT.store.save();
      WT.toast(`${v} 님, 환영해요!`);
      location.hash = '#/';
    });
    document.getElementById('guest-btn').addEventListener('click', () => { s.guest = true; markGuest(); WT.store.save(); location.hash = '#/'; });
  }

  function viewMe() { history.replaceState(null, '', '#/me'); WT.views.me(); }
  /** 프로필 화면 위쪽 카드: 이름·기록, 닉네임 바꾸기, 계정 관리 (아래에는 캐릭터 꾸미기가 이어져요) */
  WT.profileCard = function () {
    const s = WT.store.state;
    const server = WT.api.on() && !!s.token;
    const st = WT.store.stats();
    return `<section class="card rpg profile-card" aria-label="내 프로필"><span class="corner-b" aria-hidden="true"></span>
        <div class="pf-who">
          <span class="pf-av" aria-hidden="true">${WT.charSVG(WT.currentLook(), 64)}</span>
          <div class="title-block"><h1>${esc(s.profile.nick)} 님</h1>
            <span class="sub">${server ? `아이디 ${esc(s.profile.userId || '')} · ` : ''}코인 ${s.coins}개 · 완독 ${st.done}개</span></div>
        </div>
        <form class="pf-nick" id="nick-form" novalidate>
          <label for="nick2">닉네임</label>
          <input id="nick2" class="fld" maxlength="10" value="${esc(s.profile.nick)}">
          <button type="submit" class="btn btn-gold press">바꾸기</button>
          <p class="err" id="nick2-err" role="alert" hidden></p>
        </form>
        <div class="pf-acts">
          ${server ? '<button type="button" class="btn press" id="logout-btn">로그아웃</button>' : '<button type="button" class="btn press pf-danger" id="reset-btn">이 기기의 기록 모두 지우기</button>'}
          ${server && s.role === 'admin' ? '<a href="admin.html#server" class="btn btn-gold press">관리자 화면 열기</a>' : ''}
        </div>
        ${server ? `<details class="pf-del"><summary>회원 탈퇴</summary>
          <form class="pane" id="del-form" style="margin-top:12px" novalidate>
            <p class="warn">탈퇴하면 계정, 감상 기록, 코인, 별점이 바로 지워져요. 댓글은 "탈퇴한 사용자"로 남아요.</p>
            <div class="field"><label for="del-pw">비밀번호 확인</label><input id="del-pw" class="fld" type="password" autocomplete="current-password"></div>
            <p class="err" id="del-err" role="alert" hidden></p>
            <button type="submit" class="btn press pf-danger">탈퇴하기</button>
          </form></details>` : '<p class="hint" style="margin:0">지금은 이 기기(브라우저)에만 기록이 저장돼요.</p>'}
      </section>`;
  };
  WT.bindProfileCard = function (redraw) {
    const s = WT.store.state;
    const server = WT.api.on() && !!s.token;
    document.getElementById('nick-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = document.getElementById('nick2').value.trim();
      const err = document.getElementById('nick2-err');
      if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(v)) { err.hidden = false; err.textContent = '닉네임은 2~10자의 한글, 영어, 숫자로 정해 주세요.'; return; }
      if (server) {
        try { const r = await WT.api.authed('nick', { nickname: v }); WT.api.applyMe(r.me); } catch (x) { err.hidden = false; err.textContent = x.message; return; }
      } else { s.profile.nick = v; WT.store.save(); }
      WT.toast('닉네임을 바꿨어요'); redraw();
    });
    const rb = document.getElementById('reset-btn');
    if (rb) {
      let armed = false;
      rb.addEventListener('click', () => {
        if (!armed) { armed = true; rb.textContent = '한 번 더 누르면 정말 지워져요'; return; }
        WT.store.reset(); WT.toast('기록을 모두 지웠어요'); location.hash = '#/login';
      });
    }
    const lo = document.getElementById('logout-btn');
    if (lo) lo.addEventListener('click', async () => {
      try { await WT.api.call('logout', { token: s.token }); } catch (x) { /* 이미 풀렸어도 괜찮아요 */ }
      WT.store.reset(); WT.toast('로그아웃했어요'); location.hash = '#/login';
    });
    const df = document.getElementById('del-form');
    if (df) df.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('del-err');
      try {
        await WT.api.authed('deleteAccount', { password: document.getElementById('del-pw').value });
        WT.store.reset(); WT.toast('탈퇴했어요. 그동안 고마웠어요'); location.hash = '#/login';
      } catch (x) { err.hidden = false; err.textContent = x.message; }
    });
  };

  // ---------- 서버 모드: 아이디·비밀번호 로그인 / 회원가입 ----------
  function viewAccount() {
    const s = WT.store.state;
    const PANES = {
      login: `<form class="au-pane" id="acc-form" novalidate>
          <h1>다시 오신 걸 환영해요</h1>
          <p class="au-lead">아이디와 비밀번호를 입력해 주세요.</p>
          ${auField('l-id', '아이디', { ac: 'username', ph: '아이디를 입력해 주세요' })}
          ${auField('l-pw', '비밀번호', { pw: true, ac: 'current-password', ph: '••••••••' })}
          <p class="au-err" id="acc-err" role="alert" hidden></p>
          <button type="submit" class="au-btn au-main">로그인</button>
          <button type="button" class="au-btn au-sub" id="guest-btn">로그인 없이 둘러보기</button>
          <p class="au-switch">아직 계정이 없나요? <button type="button" data-tab="signup">회원가입</button></p>
        </form>`,
      signup: `<form class="au-pane" id="acc-form" novalidate>
          <h1>${esc(WT.settings().siteName)} 시작하기</h1>
          <p class="au-lead">계정을 만들면 어느 기기에서든 이어 볼 수 있어요.</p>
          ${auField('s-nick', '닉네임', { max: 10, ph: '별점·댓글에 표시될 이름', hint: '2~10자 · 한글, 영어, 숫자 · 다른 사람과 겹칠 수 없어요', desc: true })}
          ${auField('s-id', '아이디', { max: 16, ac: 'username', ph: '영어 소문자·숫자 4~16자', hint: '가입 후 바꿀 수 없어요', desc: true })}
          <div class="au-row2">${auField('s-pw', '비밀번호', { pw: true, ac: 'new-password', ph: '8자 이상' })}${auField('s-pw2', '비밀번호 확인', { pw: true, ac: 'new-password', ph: '한 번 더' })}</div>
          <p class="au-hint" style="margin:-6px 0 12px">다른 사이트에서 쓰는 비밀번호는 사용하지 마세요.</p>
          <details class="au-terms"><summary>[필수] 개인정보 수집·이용 안내 보기</summary>
            <p>· 모으는 것: 아이디, 닉네임, 비밀번호(암호화해서 저장)<br>· 쓰는 곳: 로그인, 별점·댓글 표시, 감상 진행·코인 저장<br>· 보관 기간: 탈퇴할 때까지 (탈퇴하면 바로 삭제)<br>· 댓글은 다른 사용자에게 닉네임과 함께 공개돼요.</p></details>
          <label class="au-check"><input type="checkbox" id="s-agree"> 개인정보 수집·이용 안내를 읽고 동의합니다</label>
          <p class="au-err" id="acc-err" role="alert" hidden></p>
          <button type="submit" class="au-btn au-main">가입하고 시작하기</button>
          <p class="au-switch">이미 계정이 있나요? <button type="button" data-tab="login">로그인</button></p>
        </form>`
    };
    let tab = 'login';
    authShell(PANES.login);
    const bind = () => {
      const guest = document.getElementById('guest-btn');
      if (guest) guest.addEventListener('click', () => { s.guest = true; markGuest(); WT.store.save(); location.hash = '#/'; });
      document.querySelectorAll('#au-pane [data-tab]').forEach((b) => b.addEventListener('click', () => {
        tab = b.dataset.tab; auSwap(PANES[tab]); bind();
        const first = document.querySelector('#au-pane input'); if (first) first.focus();
      }));
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
    bind();
  }

  function viewAccountMe() { history.replaceState(null, '', '#/me'); WT.views.me(); }


  // ---------- 주소 이동 ----------
  WT.views = { home: viewHomeHero, login: viewLogin, top: viewTop, worlds: viewHome };

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

  // 화면이 바뀔 때: 앞 화면은 살짝 물러나고 새 화면이 아래에서 떠올라요 (같은 종류 화면끼리는 가볍게 겹쳐 바뀌어요)
  let lastRoute = null, routeVT = null;
  function route() {
    const name = (location.hash || '#/').replace(/^#\/?/, '').split('/').filter(Boolean)[0] || 'home';
    const calm = document.body.classList.contains('no-anim') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const first = lastRoute === null;
    const same = lastRoute === name;
    lastRoute = name;
    if (first || calm || !document.startViewTransition || document.hidden) { routeNow(); return; }
    const html = document.documentElement;
    if (routeVT) { try { routeVT.skipTransition(); } catch (e) { /* 이미 끝남 */ } }
    html.classList.remove('vt-page', 'vt-same');
    html.classList.add(same ? 'vt-same' : 'vt-page');
    let vt;
    // 새 화면 자체의 나타나기 효과는 끄고(전환이 대신해요), 전환이 끝난 뒤에 다시 켜지며 깜빡이지 않게 화면에 직접 꺼 둬요
    const run = () => { routeNow(); const v = document.querySelector('#app > .view'); if (v) v.style.animation = 'none'; };
    try { vt = document.startViewTransition(run); } catch (e) { html.classList.remove('vt-page', 'vt-same'); routeNow(); return; }
    routeVT = vt;
    vt.ready.catch(() => {}); vt.updateCallbackDone.catch(() => {});   // 빠르게 넘기면 건너뛴 전환은 조용히 끝내요
    const done = () => { if (routeVT === vt) { routeVT = null; html.classList.remove('vt-page', 'vt-same'); } };
    vt.finished.then(done, done);
  }
  function routeNow() {
    const parts = (location.hash || '#/').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'map') { location.replace('#/worlds'); return; }   // 장르 구역 지도는 없앴어요
    const name = parts[0] || 'home';
    const s = WT.store.state;
    if (!s.profile && !s.guest && name !== 'login') { location.replace('#/login'); return; }
    const view = WT.views[name] || viewHomeHero;
    if (WT.leaveView) { WT.leaveView(); WT.leaveView = null; }
    window.scrollTo(0, 0);
    view(parts.slice(1));
    const showRail = !document.querySelector('#app .au-view');
    document.body.classList.toggle('has-rail', showRail);
    if (showRail) WT.renderRail(name);
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
