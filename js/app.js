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

  function constellationSVG(g) {
    const lines = g.shape.lines.map((pts) => `<polyline class="cl" points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${g.color}" stroke-width="1.6" stroke-linejoin="round"/>`).join('');
    const stars = g.shape.stars.map((s, i) => `<circle class="st${i % 3 === 0 ? ' tw' : ''}" cx="${s[0]}" cy="${s[1]}" r="${s[2]}" fill="${i % 2 ? '#FFFFFF' : g.color}"/>`).join('');
    return `<svg viewBox="0 0 100 72" width="120" height="86" aria-hidden="true">${lines}${stars}</svg>`;
  }

  // ---------- 홈 ----------
  function viewHome() {
    const st = WT.settings();
    const cards = WT.liveGenres().map((g, i) => {
      const start = WT.toon(WT.data.trees[g.id].start);
      return `<a class="gcard" href="#/tree/${g.id}" style="--gc:${g.color}; animation-delay:${i * 0.06}s">
        ${constellationSVG(g)}
        <span class="gname">${esc(g.name)}<small>${esc(g.constellation || '')}</small></span>
        <span class="gdesc">${esc(g.desc)}</span>
        ${start ? `<span class="gstart">입문작 · ${esc(start.title)}</span>` : ''}
      </a>`;
    }).join('');
    app().innerHTML = `<div class="view home">
      <div class="topbar" style="align-self:stretch; justify-content:flex-end">${WT.topRight({ map: false })}</div>
      ${st.notice ? `<p class="notice">${esc(st.notice)}</p>` : ''}
      <header>
        <h1>${esc(st.siteName)}</h1>
        <p>${esc(st.tagline)}</p>
      </header>
      <section class="genre-grid" aria-label="장르 선택">${cards}</section>
      <div style="display:flex; flex-wrap:wrap; gap:16px; justify-content:center; align-items:center; padding:0 20px">
        <a href="#/map" class="pill pill-gold press" style="min-height:52px; padding:0 28px; font-size:17px; border-width:2px">${WT.icon.map}전체 지도 보기</a>
        <span class="hint" style="font-size:14px">장르가 애매한 웹툰은 전체 지도에서 만날 수 있어요</span>
      </div>
    </div>`;
  }

  // ---------- 로그인 · 회원가입 ----------
  function viewLogin() {
    const s = WT.store.state;
    if (s.profile) return viewMe();
    let tab = 'start';
    const draw = () => {
      app().innerHTML = `<div class="view"><div class="login">
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
        s.guest = true;
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

  // ---------- 주소 이동 ----------
  WT.views = { home: viewHome, login: viewLogin };

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
    window.addEventListener('hashchange', () => {
      if (WT.onHashChange && WT.onHashChange()) return;
      route();
    });
    route();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
