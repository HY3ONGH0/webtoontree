/* 웹툰트리 관리자
   - 고친 내용은 이 브라우저에 "초안"으로 자동 저장돼요.
   - 사이트에 반영하려면 [데이터] 탭에서 data.json을 내보내 GitHub의 data 폴더에 올려요.
   - 이 화면은 서버에 아무것도 바꾸지 않아요. 실제 수정 권한은 GitHub 저장소가 가져요. */
(function () {
  const DRAFT = 'webtoontree.admin.draft';
  const NEED_SERVER = 13;   // 이 화면이 필요로 하는 서버 코드 판 번호 (apps-script/Code.gs 의 SERVER_VERSION)
  const root = () => document.getElementById('admin');
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const TREE_W = 1000, TREE_H = 560;

  const SHAPES = {
    crown: { name: '왕관', shape: { lines: [[[15, 60], [15, 24], [32, 42], [50, 12], [68, 42], [85, 24], [85, 60], [15, 60]]], stars: [[15, 60, 3.2], [15, 24, 3.6], [32, 42, 2.8], [50, 12, 4.6], [68, 42, 2.8], [85, 24, 3.6], [85, 60, 3.2]] } },
    heart: { name: '하트', shape: { lines: [[[50, 64], [18, 36], [18, 18], [34, 9], [50, 22], [66, 9], [82, 18], [82, 36], [50, 64]]], stars: [[50, 64, 4.4], [18, 36, 3], [18, 18, 2.8], [34, 9, 3.6], [50, 22, 3.2], [66, 9, 3.6], [82, 18, 2.8], [82, 36, 3]] } },
    sword: { name: '검', shape: { lines: [[[50, 4], [50, 48]], [[30, 48], [70, 48]], [[50, 48], [50, 68]]], stars: [[50, 4, 4.2], [50, 26, 2.6], [30, 48, 3.4], [50, 48, 3], [70, 48, 3.4], [50, 68, 3.6]] } },
    eye: { name: '눈', shape: { lines: [[[6, 36], [28, 18], [50, 13], [72, 18], [94, 36], [72, 54], [50, 59], [28, 54], [6, 36]]], stars: [[6, 36, 3.2], [28, 18, 2.6], [50, 13, 3], [72, 18, 2.6], [94, 36, 3.2], [72, 54, 2.6], [50, 59, 3], [28, 54, 2.6], [50, 36, 5]] } },
    cup: { name: '찻잔', shape: { lines: [[[20, 28], [72, 28], [66, 62], [26, 62], [20, 28]], [[72, 34], [86, 40], [70, 52]]], stars: [[20, 28, 3.2], [72, 28, 3.2], [66, 62, 3], [26, 62, 3], [86, 40, 3], [40, 6, 2.6], [56, 6, 2.6]] } },
    star: { name: '별', shape: { lines: [[[50, 4], [62, 30], [92, 30], [68, 48], [78, 70], [50, 56], [22, 70], [32, 48], [8, 30], [38, 30], [50, 4]]], stars: [[50, 4, 4], [92, 30, 3], [78, 70, 3], [22, 70, 3], [8, 30, 3], [50, 40, 4.6]] } },
    arrow: { name: '화살', shape: { lines: [[[10, 62], [80, 12]], [[60, 10], [80, 12], [78, 32]]], stars: [[10, 62, 3.6], [45, 37, 2.8], [80, 12, 4.4], [60, 10, 3], [78, 32, 3]] } }
  };
  const ACCS = { none: '없음(기본)', crown: '왕관', wizard: '마법사 모자', satgat: '삿갓', cat: '고양이 귀', phones: '헤드폰' };
  const PLATFORMS = ['네이버웹툰', '카카오웹툰', '카카오페이지', '레진코믹스', '리디', '기타'];

  let D = null;          // 편집 중인 데이터
  let siteJSON = '';     // 사이트에 올라가 있는 data.json
  const BASE = 'webtoontree.admin.base';   // 초안을 고치기 시작할 때의 사이트 데이터 지문 (다른 관리자 저장 감지용)
  const srv = { pw: '', token: '', ok: false, owner: false, name: '', github: false, users: null, comments: null, reports: null, busy: false, msg: '', conflict: false };
  try { srv.pw = sessionStorage.getItem('webtoontree.adminpw') || ''; } catch (e) { srv.pw = ''; }
  // 관리자 권한을 받은 회원: 사용자 사이트에 로그인해 둔 토큰으로 들어와요
  let userRole = '';
  try { const st = JSON.parse(localStorage.getItem('webtoontree.v1') || '{}') || {}; srv.token = st.token || ''; userRole = st.role || ''; } catch (e) { srv.token = ''; }
  let base = '';
  let siteHash = '';
  /** 서버(Code.gs의 hash_)와 같은 계산 */
  function fp(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8) + ':' + str.length;
  }
  function setBase(h) { base = h; try { localStorage.setItem(BASE, h); } catch (e) { /* 무시 */ } }
  // 입문작 여러 개 (사이트의 app.js와 같은 규칙)
  WT.starts = WT.starts || ((T) => (T ? [T.start].concat(T.starts || []).filter((id, i, a) => id && a.indexOf(id) === i && (T.nodes || {})[id]) : []));
  WT.isStart = WT.isStart || ((T, id) => WT.starts(T).includes(id));
  const DAYK = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
  const ui = {
    tab: 'webtoons', w: null, q: '', fg: 'all', confirm: null, wview: (() => { try { return localStorage.getItem('webtoontree.adminWView') || 'grid'; } catch (e) { return 'grid'; } })(),
    g: null, newGenre: false,
    tg: null, tsel: null, mode: 'select', from: null, branchFor: null, bq: '',
    msel: null, mmode: 'select', mfrom: null, mq: ''
  };

  // ---------- 저장 ----------
  function saveDraft() {
    try { localStorage.setItem(DRAFT, JSON.stringify(D)); } catch (e) { /* 저장 공간 없음 */ }
    setState();
    if (live.on) livePushSoon();
  }
  function srvSaveReady() { return !!((D.settings.apiUrl || '').trim() && srv.ok && srv.github); }
  function isDirty() { return JSON.stringify(D) !== siteJSON; }
  function setState() {
    const el = document.getElementById('ad-state');
    if (!el) return;
    const d = isDirty();
    el.textContent = live.on
      ? (d ? '함께 편집 중 · 아직 사이트에 저장 안 된 변경이 있어요' : '함께 편집 중 · 사이트와 같아요')
      : (d ? (srvSaveReady() ? '아직 사이트에 저장 안 된 변경이 있어요 → 오른쪽 [사이트에 바로 저장]' : '아직 사이트에 올리지 않은 변경이 있어요 → [저장 · 백업] 탭') : '사이트와 같아요');
    el.classList.toggle('dirty', d);
  }
  function toast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // ---------- 데이터 도구 ----------
  const toon = (id) => D.webtoons.find((w) => w.id === id);
  const genre = (id) => D.genres.find((g) => g.id === id);
  const gColor = (w) => ((w && w.genres && genre(w.genres[0])) || {}).color || '#5BB8FF';
  function ensure() {
    D.meta = D.meta || {};
    const max = D.webtoons.reduce((m, w) => Math.max(m, parseInt(String(w.id).replace(/\D/g, ''), 10) || 0), 0);
    D.meta.lastWebtoonId = Math.max(D.meta.lastWebtoonId || 0, max);
    D.trees = D.trees || {};
    D.map = D.map || { width: 2400, height: 1400, regions: [], links: [] };
    D.map.regions = D.map.regions || []; D.map.links = D.map.links || [];
    D.map.pins = D.map.pins || {};      // 관리자가 직접 고정한 웹툰 위치 (나머지는 자동 배치)
    delete D.map.nodes;                  // 예전 방식의 고정 위치는 쓰지 않아요 (모두 자동 배치로)
    D.shop = D.shop || [];
    D.hotToday = D.hotToday || [];
    D.genres.forEach((g) => { if (!D.trees[g.id]) D.trees[g.id] = { start: null, nodes: {}, links: [] }; });
    // 세부 장르 (도서관 마도서): 장르마다 subs, 웹툰마다 subs
    const allSubs = new Set();
    D.genres.forEach((g) => { (g.subs || []).forEach((x) => allSubs.add(x.id)); });
    D.webtoons.forEach((w) => { if (w.subs) { w.subs = w.subs.filter((x) => allSubs.has(x)); if (!w.subs.length) delete w.subs; } });
  }
  const subsOf = (gid) => ((genre(gid) || {}).subs || []);
  function newSubId(g) {
    let n = (g.subs || []).length + 1;
    while ((g.subs || []).some((x) => x.id === `${g.id}-${n}`)) n++;
    return `${g.id}-${n}`;
  }
  function newWebtoonId() {
    D.meta.lastWebtoonId += 1;          // 지운 번호는 다시 쓰지 않아요
    let id = 'w' + String(D.meta.lastWebtoonId).padStart(3, '0');
    // 함께 편집 중이면 다른 관리자와 같은 번호가 되지 않게 꼬리표를 붙여요
    if (live.on) id += Math.random().toString(36).slice(2, 4);
    while (D.webtoons.some((w) => w.id === id)) id += Math.random().toString(36).slice(2, 3);
    return id;
  }
  function blankWebtoon(title, gid) {
    return { id: newWebtoonId(), title: title || '새 웹툰', author: '', platform: '네이버웹툰', url: '', cover: '', genres: gid ? [gid] : [], recommended: 0, color: '', episodes: 1, status: 'ongoing', days: [], autoCount: true, baseDate: WT.schedule.today(), tags: [], desc: '' };
  }
  function treesOf(id) { return Object.keys(D.trees).filter((g) => D.trees[g].nodes[id]); }
  function removeFromTree(gid, id) {
    const T = D.trees[gid];
    delete T.nodes[id];
    T.links = T.links.filter((l) => l.from !== id && l.to !== id);
    T.starts = (T.starts || []).filter((x) => x !== id);
    if (T.start === id) { T.start = T.starts.shift() || Object.keys(T.nodes)[0] || null; }
  }
  function deleteWebtoon(id) {
    Object.keys(D.trees).forEach((g) => removeFromTree(g, id));
    delete D.map.pins[id];
    D.map.links = D.map.links.filter(([a, b]) => a !== id && b !== id);
    D.hotToday = D.hotToday.filter((x) => x !== id);
    D.webtoons = D.webtoons.filter((w) => w.id !== id);
  }
  function issues() {
    const out = [];
    const ids = new Set();
    D.webtoons.forEach((w) => {
      if (ids.has(w.id)) out.push(`웹툰 ID가 겹쳐요: ${w.id}`);
      ids.add(w.id);
      if (!w.title.trim()) out.push(`${w.id}: 제목이 비어 있어요`);
      if (!(w.episodes >= 1)) out.push(`${w.title}: 총 화수를 1 이상으로 적어 주세요`);
      if (WT.schedule.status(w) === 'ongoing' && w.autoCount && !(w.days || []).length) out.push(`${w.title}: 화수 자동 계산을 켰는데 연재 요일이 없어요`);
      if (!w.genres.length) out.push(`${w.title}: 장르를 하나 이상 골라 주세요`);
      if (w.url && !/^https?:\/\//.test(w.url)) out.push(`${w.title}: 링크는 https:// 로 시작해야 해요`);
    });
    D.genres.forEach((g) => {
      const T = D.trees[g.id];
      const n = Object.keys(T.nodes).length;
      if (!n) out.push(`${g.name}: 트리에 웹툰이 없어요 (홈에 카드가 나오지 않아요)`);
      else if (!T.start || !T.nodes[T.start]) out.push(`${g.name}: 시작 웹툰(입문작)을 정해 주세요`);
    });

    return out;
  }

  // ---------- 틀 ----------
  const TABS = [['webtoons', '웹툰 목록'], ['genres', '장르 관리'], ['tree', '트리 편집'], ['map', '전체 지도 편집'], ['settings', '디자인 · 코인 설정'], ['shop', '상점 아이템'], ['server', '회원 · 댓글 · 제보'], ['data', '저장 · 백업']];
  let lastTab = null;
  let lastW = null;
  function render() {
    const scrollY = window.scrollY;
    // 스크롤이 칸마다 따로라서, 다시 그려도 각 칸의 스크롤 위치를 지켜요 (탭을 바꾸면 처음부터)
    const keep = { tab: lastTab, main: 0, nav: 0, lists: [], forms: [], w: lastW };
    const q = (sel) => root().querySelector(sel);
    if (q('.ad-main')) { keep.main = q('.ad-main').scrollTop; keep.nav = q('.ad-nav').scrollTop; keep.lists = Array.from(root().querySelectorAll('.items-box, .ad-list')).map((x) => x.scrollTop); keep.forms = Array.from(root().querySelectorAll('.ad-form, .ad-side')).map((x) => x.scrollTop); }
    const html = `<header class="ad-head">
        <div class="brand">${WT.logo.mark()}${WT.logo.word((D.settings || {}).siteName || '웹툰트리')}<span class="ad-tag">관리자</span></div>
        <span id="ad-state" class="ad-state" aria-live="polite"></span>
        <span id="ad-live" class="ad-live"></span>
        ${srv.ok && srv.old ? `<div class="ad-old" role="alert"><b>서버 코드가 예전 버전이에요.</b> 함께 편집 같은 새 기능이 안 될 수 있어요.
          <a href="server-code.html" target="_blank" rel="noopener">새 서버 코드 복사하기 ↗</a>
          <span>복사한 코드를 Apps Script의 Code.gs에 전부 바꿔 붙이고 저장 → <b>배포 → 배포 관리 → 연필 → 버전: 새 버전 → 배포</b> ("새 배포"가 아니에요)</span></div>` : ''}
        <div class="ad-actions">
          <a class="btn btn-sm press" href="index.html?preview=1" target="_blank" rel="noopener">사이트 미리보기</a>
          ${srvSaveReady() ? '<button type="button" class="btn btn-gold btn-sm press" data-a="srv-save">사이트에 바로 저장</button>' : '<button type="button" class="btn btn-gold btn-sm press" data-a="export">data.json 내보내기</button>'}
        </div>
      </header>
      <div class="ad-body">
        <nav class="ad-nav" aria-label="관리 메뉴">
          ${TABS.map(([id, name]) => `<button type="button" data-a="tab" data-id="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}>${name}</button>`).join('')}
          <a href="index.html" target="_blank" rel="noopener">실제 사이트 열기</a>
          ${srv.ok ? '<button type="button" data-a="srv-logout" style="margin-top:4px">관리자 나가기</button>' : ''}
        </nav>
        <main class="ad-main" id="ad-main">${({ webtoons: tabWebtoons, genres: tabGenres, tree: tabTree, map: tabMap, settings: tabSettings, shop: tabShop, server: tabServer, data: tabData })[ui.tab]()}</main>
      </div>`;
    if (!keepTyping(html)) root().innerHTML = html;
    setState();
    liveBadge();
    const head = q('.ad-head');
    if (head) document.documentElement.style.setProperty('--adh', `${head.offsetHeight}px`);
    q('.ad-nav').scrollTop = keep.nav;
    if (keep.tab === ui.tab) {
      q('.ad-main').scrollTop = keep.main;
      root().querySelectorAll('.items-box, .ad-list').forEach((x, i) => { if (keep.lists[i]) x.scrollTop = keep.lists[i]; });
      // 오른쪽 편집 칸: 같은 웹툰을 고치는 중이면 그 자리 그대로 (다른 웹툰을 고르면 맨 위부터)
      if (keep.w === ui.w) root().querySelectorAll('.ad-form, .ad-side').forEach((x, i) => { if (keep.forms[i]) x.scrollTop = keep.forms[i]; });
    }
    lastW = ui.w;
    lastTab = ui.tab;
    if (ui.tab === 'tree') mountTree();
    if (ui.tab === 'map') mountMap();
    window.scrollTo(0, scrollY);
  }

  // 글자를 치고 있는 칸을 다시 그리면(새 칸으로 바꾸면) 한글 조합이 끊겨 자모가 따로 찍혀요 (특히 패드 · 휴대폰 자판).
  // 그래서 지금 쓰는 칸과 그 바깥 틀은 그대로 두고, 나머지만 새 내용으로 바꿔요.
  const typingSel = (a) => (a.id ? '#' + CSS.escape(a.id) : ['data-wf', 'data-gf', 'data-subf', 'data-sid', 'data-sf', 'data-why', 'data-shop', 'data-k', 'data-ai', 'data-id'].filter((x) => a.hasAttribute(x)).map((x) => `[${x}="${CSS.escape(a.getAttribute(x))}"]`).join(''));
  function keepTyping(html) {
    const a = document.activeElement;
    const R = root();
    if (!a || !R.contains(a) || !/^(INPUT|TEXTAREA)$/.test(a.tagName) || /^(checkbox|radio|color|range|file|button|submit)$/.test(a.type || '')) return false;
    const sel = typingSel(a);
    if (!sel) return false;
    const T = document.createElement('div');
    T.innerHTML = html;
    let b;
    try { const all = T.querySelectorAll(a.tagName.toLowerCase() + sel); if (all.length !== 1) return false; b = all[0]; } catch (e) { return false; }
    const path = (el, top) => { const out = []; for (let x = el; x && x !== top; x = x.parentNode) out.unshift(x); return out; };
    const pa = path(a, R), pb = path(b, T);
    if (pa.length !== pb.length || pa.some((x, i) => x.tagName !== pb[i].tagName)) return false;
    const syncAttrs = (o, n, skip) => {
      Array.from(o.attributes).forEach((at) => { if (!n.hasAttribute(at.name) && !skip.includes(at.name)) o.removeAttribute(at.name); });
      Array.from(n.attributes).forEach((at) => { if (!skip.includes(at.name) && o.getAttribute(at.name) !== at.value) o.setAttribute(at.name, at.value); });
    };
    for (let i = 0; i < pa.length; i++) {
      const po = i ? pa[i - 1] : R, pn = i ? pb[i - 1] : T, co = pa[i], cn = pb[i];
      Array.from(po.childNodes).forEach((x) => { if (x !== co) po.removeChild(x); });
      let before = true;
      Array.from(pn.childNodes).forEach((x) => { if (x === cn) { before = false; return; } if (before) po.insertBefore(x, co); else po.appendChild(x); });
      if (i < pa.length - 1) syncAttrs(co, cn, ['open']);   // 펼쳐 둔 칸(details)은 그대로
    }
    syncAttrs(a, b, ['value']);   // 쓰고 있는 글자와 커서는 건드리지 않아요
    return true;
  }

  // ---------- 웹툰 목록 ----------
  function tabWebtoons() {
    const q = ui.q.trim().toLowerCase();
    const list = D.webtoons.filter((w) => (ui.fg === 'all' || (ui.fg === 'none' ? !w.genres.length : ui.fg === 'nolink' ? !w.source : w.genres.includes(ui.fg))) &&
      (!q || w.title.toLowerCase().includes(q) || (w.author || '').toLowerCase().includes(q)));
    const w = ui.w && toon(ui.w);
    return `<h2>웹툰 목록 <span class="ad-help" style="display:inline">${D.webtoons.length}개</span></h2>
      <p class="ad-help">웹툰을 추가하고 고쳐요. 웹툰 ID(w001 같은 값)는 자동으로 정해지고 바뀌지 않아요. 감상 기록이 ID로 연결돼 있어요.</p>
      <div class="ad-split">
        <section class="ad-list${ui.wview === 'rows' ? '' : ' wide'}" aria-label="웹툰 목록">
          <button type="button" class="btn btn-gold press" data-a="new-w">+ 새 웹툰</button>
          <label class="sr" for="w-q">웹툰 검색</label>
          <input id="w-q" class="fld" type="search" placeholder="제목, 작가 검색" value="${esc(ui.q)}">
          ${srvReady() ? `<button type="button" class="btn btn-sm press" data-a="lk-all" ${ui.refreshing ? 'disabled' : ''}>${ui.refreshing ? `자동 정보 가져오는 중… ${ui.refreshing}` : `연결된 웹툰 ${D.webtoons.filter((x) => x.source).length}개 지금 다시 가져오기`}</button>` : ''}
          ${notOfficial().length ? `<button type="button" class="btn btn-sm press" data-a="lk-official-all" title="연결된 작품의 보러 가기 링크를 네이버 웹툰 공식 작품 페이지로 바꿔요">${ui.confirm === 'official-all' ? '한 번 더 누르면 바꿔요' : `보러 가기 링크 ${notOfficial().length}개를 공식 페이지로`}</button>` : ''}
          <button type="button" class="btn btn-sm press" data-a="recolor-all" title="표지에서 가장 넓게 차지하는 색으로 모든 웹툰의 상세 창 색을 다시 정해요">${ui.recolor ? `표지 색 뽑는 중… ${ui.recolor}` : '표지 색 모두 다시 뽑기'}</button>
          <label class="sr" for="w-fg">장르로 거르기</label>
          <select id="w-fg" class="fld">
            <option value="all">모든 장르</option>
            ${D.genres.map((g) => `<option value="${g.id}" ${ui.fg === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}
            <option value="none" ${ui.fg === 'none' ? 'selected' : ''}>장르 없음</option>
            <option value="nolink" ${ui.fg === 'nolink' ? 'selected' : ''}>작품 연결 안 된 웹툰 (${D.webtoons.filter((x) => !x.source).length})</option>
          </select>
          <div class="ad-lbar"><span>${list.length}개 보는 중</span>
            <div class="ad-seg" role="group" aria-label="보기 방식"><button type="button" data-a="wview" data-id="grid" aria-pressed="${ui.wview !== 'rows'}">표지</button><button type="button" data-a="wview" data-id="rows" aria-pressed="${ui.wview === 'rows'}">목록</button></div></div>
          ${ui.wview === 'rows' ? `<div class="items-box">
            ${list.map((x) => `<button type="button" class="ad-row${ui.w === x.id ? ' sel' : ''}" data-a="pick-w" data-id="${x.id}">
              <span class="dotc" style="background:${gColor(x)}">${esc(x.title[0] || '?')}</span>
              <span class="t"><b>${!x.pick && WT.recStars(x) ? '★'.repeat(WT.recStars(x)) + ' ' : ''}${esc(x.title)}${x.pick ? ' <span class="pick-badge sm">강추</span>' : ''}</b>${liveOn(x.id)}<span>${x.id} · ${esc(x.genres.map((g) => (genre(g) || {}).name).join(', ') || '장르 없음')} · ${WT.schedule.episodes(x)}화 · ${esc(WT.schedule.label(x))}</span></span>
            </button>`).join('') || '<p class="ad-help">찾는 웹툰이 없어요</p>'}
          </div>` : `<div class="items-box ad-grid">
            ${list.map((x) => {
              const rs = !x.pick && WT.recStars(x);
              const on = x.status === 'ongoing' && (x.days || []).length ? x.days.map((d) => DAYK[d] || '').join('') : '';
              return `<button type="button" class="ad-tile${ui.w === x.id ? ' sel' : ''}" data-a="pick-w" data-id="${x.id}" title="${esc(x.title)}&#10;${x.id}">
                <span class="ad-cv" style="--c:${esc(x.color || gColor(x))}">
                  <span class="ad-ini"><i>WEBTOON</i><em>${esc(x.title)}</em><small>${esc(x.author || '')}</small></span>
                  ${x.cover ? `<img src="${esc(x.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
                  ${x.pick ? '<span class="ad-pick">강추</span>' : ''}${x.source ? '' : '<span class="ad-nolink" title="작품 연결 안 됨">연결 전</span>'}${rs ? `<span class="ad-st">${'★'.repeat(rs)}</span>` : ''}${on ? `<span class="ad-on">${on}</span>` : ''}
                  <span class="ad-live">${liveOn(x.id)}</span>
                </span>
                <span class="ad-tt">${esc(x.title)}</span>
                <span class="ad-mt">${esc(x.genres.map((g) => (genre(g) || {}).name).join(', ') || '장르 없음')} · ${WT.schedule.episodes(x)}화 · ${x.status === 'ongoing' ? '연재 중' : '완결'}</span>
              </button>`;
            }).join('') || '<p class="ad-help">찾는 웹툰이 없어요</p>'}
          </div>`}
        </section>
        ${w ? webtoonForm(w) : '<section class="ad-form"><div class="ad-empty">왼쪽에서 웹툰을 고르거나 [+ 새 웹툰]을 눌러 주세요</div></section>'}
      </div>`;
  }
  function webtoonForm(w) {
    const inTrees = treesOf(w.id).map((g) => (genre(g) || {}).name);
    const confirming = ui.confirm === 'w:' + w.id;
    return `<section class="ad-form" aria-label="웹툰 정보 수정">
      <div style="display:flex; align-items:center; gap:12px">
        <span class="dotc" style="width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family: var(--display); font-weight: 800; font-size:24px; color:#fff; background:${w.cover ? `url('${esc(w.cover)}') center/cover` : gColor(w)}">${w.cover ? '' : esc(w.title[0] || '?')}</span>
        <div><b style="font-size:17px">${esc(w.title)}</b><div class="ad-help">${w.id} · 트리: ${esc(inTrees.join(', ') || '없음 (도서관에 꽂혀요)')} · 전체 지도: ${D.map.pins[w.id] ? '직접 고정' : '자동 배치'}</div></div>
      </div>
      ${linkBox(w)}
      <div class="field"><label for="f-url">보러 가기 링크</label><input id="f-url" class="fld" type="url" data-wf="url" value="${esc(w.url)}" placeholder="https://"></div>
      <div class="field"><label for="f-cover">표지 이미지 주소</label><input id="f-cover" class="fld" type="url" data-wf="cover" value="${esc(w.cover)}" placeholder="비워 두면 공식 표지를 써요"><span class="hint">직접 만들었거나 써도 되는 이미지만 넣어 주세요.</span></div>
      ${w.coverAuto && w.cover ? '<span class="hint">지금은 공식 표지를 쓰고 있어요. 다른 표지를 쓰려면 주소를 바꿔 넣으세요.</span>' : ''}
      <div class="field"><span style="font-size:14px; color:var(--soft)">상세 창 색 (표지에서 자동으로 뽑아요)</span>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap">
          <label class="sr" for="f-color">상세 창 색 직접 고르기</label>
          <input id="f-color" class="swatch" type="color" data-wf="color" value="${esc(w.color || '#2A3456')}">
          <span style="width:120px; height:44px; border-radius:6px; border:1px solid ${w.color ? (WT.color.palette(w.color) || {})['--p-border'] : '#2C3763'}; background:${w.color ? `linear-gradient(180deg, ${WT.color.palette(w.color)['--p-bg1']}, ${WT.color.palette(w.color)['--p-bg2']})` : '#121935'}; display:inline-flex; align-items:center; justify-content:center; font-size:12px; color:#fff" aria-hidden="true">${w.color ? '미리보기' : '색 없음'}</span>
          <button type="button" class="btn btn-sm press" data-a="w-color" data-id="${w.id}" ${w.cover ? '' : 'disabled'}>${ui.colorBusy === w.id ? '뽑는 중…' : '표지에서 다시 뽑기'}</button>
        </div>
        <span class="hint">${w.color ? '마음에 안 들면 왼쪽 색 칸을 눌러 직접 고를 수 있어요.' : w.cover ? '표지에서 색을 뽑지 못했어요. 직접 골라 주세요.' : '표지 주소를 넣으면 자동으로 채워져요.'}</span>
      </div>
      <fieldset style="border:none; margin:0; padding:0"><legend class="hint" style="margin-bottom:6px; font-size:14px; color:var(--soft)">장르 (여러 개 가능)</legend>
        <div class="checks">${D.genres.map((g) => `<label><input type="checkbox" data-wg="${g.id}" ${w.genres.includes(g.id) ? 'checked' : ''}> ${esc(g.name)}</label>`).join('')}</div>
      </fieldset>
      ${w.genres.filter((gid) => subsOf(gid).length).map((gid) => `<fieldset style="border:none; margin:0; padding:0"><legend class="hint" style="margin-bottom:6px; font-size:14px; color:var(--soft)">${esc(genre(gid).name)} 세부 장르 (도서관 마도서)</legend>
        <div class="checks">${subsOf(gid).map((x) => `<label><input type="checkbox" data-ws="${x.id}" ${(w.subs || []).includes(x.id) ? 'checked' : ''}> <span style="color:${esc(x.color)}">◆</span> ${esc(x.name)}</label>`).join('')}</div>
      </fieldset>`).join('')}
      <div class="checks">
        <div class="field"><label for="f-rec" style="color:var(--coin); font-weight:700">관리자 추천 (원 옆에 별)</label>
          <select id="f-rec" class="fld" data-wf="recommended" style="max-width:220px" ${w.pick ? 'disabled title="관리자 강추를 켜면 별 대신 강추 표시가 나와요"' : ''}>${[0, 1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${WT.recStars(w) === n ? 'selected' : ''}>${n ? '★'.repeat(n) + ` 별 ${n}개` : '추천 안 함'}</option>`).join('')}</select></div>
        <label class="ad-check" style="align-self:flex-end"><input type="checkbox" data-wf="pick" ${w.pick ? 'checked' : ''}> <span class="pick-badge">관리자 강추</span> 표시 달기</label>
        ${w.pick ? '<span class="hint" style="align-self:flex-end">강추를 켜면 사이트에서는 별 대신 강추 표시와 테두리 효과가 나와요</span>' : ''}
      </div>
      <details class="ad-more fx-manual" ${w.source ? '' : 'open'}><summary>${w.source ? '자동 정보 직접 고치기 (가져온 정보가 틀렸을 때만)' : '작품 정보 직접 입력 (작품을 연결하지 않을 때만)'}</summary>
      <div class="field"><label for="f-title">제목</label><input id="f-title" class="fld" data-wf="title" value="${esc(w.title)}"></div>
      ${authorEditor(w)}
      <div class="grid2">
        <div class="field"><label for="f-plat">플랫폼</label><input id="f-plat" class="fld" data-wf="platform" list="plat-list" value="${esc(w.platform)}"><datalist id="plat-list">${PLATFORMS.map((p) => `<option value="${p}">`).join('')}</datalist></div>
        <div class="field"><label for="f-ep">총 화수 (오늘 기준)</label><input id="f-ep" class="fld" type="number" min="1" data-wf="episodes" value="${WT.schedule.episodes(w)}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label for="f-status">연재 상태</label><select id="f-status" class="fld" data-wf="status">
          ${Object.keys(WT.schedule.STATUS_KO).map((k) => `<option value="${k}" ${WT.schedule.status(w) === k ? 'selected' : ''}>${WT.schedule.STATUS_KO[k]}</option>`).join('')}
        </select></div>
        <div class="field"><span style="font-size:14px; color:var(--soft)">사이트에 보이는 표시</span><span class="node-tag tag-${WT.schedule.status(w)}" style="align-self:flex-start; font-size:13px; margin-top:8px">${esc(WT.schedule.label(w))}</span></div>
      </div>
      <fieldset style="border:none; margin:0; padding:0"><legend class="hint" style="margin-bottom:6px; font-size:14px; color:var(--soft)">올라오는 요일</legend>
        <div class="checks">${WT.schedule.DAYS.map((d) => `<label><input type="checkbox" data-wd="${d}" ${(w.days || []).includes(d) ? 'checked' : ''}> ${WT.schedule.DAY_KO[d]}</label>`).join('')}</div>
      </fieldset>
      ${WT.schedule.status(w) === 'ongoing' ? `<label class="ad-check"><input type="checkbox" data-wf="autoCount" ${w.autoCount ? 'checked' : ''}> 연재 요일마다 총 화수 자동으로 +1</label>
      <span class="hint">${w.autoCount ? ((w.days || []).length ? `${esc(w.baseDate || '')}에 ${w.episodes}화로 적었고, 그 뒤 연재 요일마다 1화씩 늘어나요. 휴재 등으로 어긋나면 총 화수를 다시 적어 주세요.` : '올라오는 요일을 골라 주세요.') : '끄면 총 화수를 직접 고쳐야 해요.'}</span>` : `<span class="hint">${WT.schedule.status(w) === 'hiatus' ? '휴재 중에는 화수가 늘어나지 않아요. 다시 연재되면 "연재 중"으로 바꿔 주세요.' : '완결된 웹툰은 화수가 늘어나지 않아요.'}</span>`}
      <div class="field"><label for="f-tags">태그 (쉼표로 구분)</label><input id="f-tags" class="fld" data-wf="tags" value="${esc((w.tags || []).join(', '))}" placeholder="예: 회귀, 성장"></div>
      <div class="field"><label for="f-desc">설명</label><textarea id="f-desc" class="fld" data-wf="desc" maxlength="300">${esc(w.desc)}</textarea></div>
      ${w.source ? '<span class="hint">여기서 고쳐도 다음 자동 갱신 때 공식 정보로 다시 바뀌어요.</span>' : ''}
      </details>
      <div class="ad-actions">
        ${treesOf(w.id).length ? '' : (w.genres.length ? `<button type="button" class="btn btn-sm press" data-a="w-to-tree" data-id="${w.id}">${esc((genre(w.genres[0]) || {}).name)} 트리에 넣기</button>` : '')}
        <button type="button" class="btn btn-sm btn-danger press" data-a="del-w" data-id="${w.id}">${confirming ? '한 번 더 누르면 삭제돼요 (트리·지도에서도 빠져요)' : '웹툰 삭제'}</button>
      </div>
    </section>`;
  }

  // ---------- 작가: 한 명씩 칩으로 (역할: 글 · 그림 · 원작) ----------
  const AROLE = { writer: '글', painter: '그림', original: '원작' };
  function authorEditor(w) {
    const list = WT.authorsOf(w);
    return `<div class="field"><span style="font-size:14px; color:var(--soft)">작가 (한 명씩 넣어요 · 이름을 누르면 사이트에서 그 작가의 웹툰을 모아 봐요)</span>
      <div class="au-ed">${list.map((a, i) => `<span class="au-chip"><b>${esc(a.name)}</b>
          ${Object.keys(AROLE).map((r) => `<button type="button" class="au-r${(a.roles || []).includes(r) ? ' on' : ''}" data-a="au-role" data-id="${w.id}" data-i="${i}" data-r="${r}" aria-pressed="${(a.roles || []).includes(r)}">${AROLE[r]}</button>`).join('')}
          <button type="button" class="au-x" data-a="au-del" data-id="${w.id}" data-i="${i}" aria-label="${esc(a.name)} 빼기">×</button></span>`).join('')}
        <input id="f-au-new" class="fld au-in" placeholder="작가 이름 넣고 Enter" maxlength="40"></div>
      ${list.length ? `<details class="ad-more au-info"><summary>작가 프로필 고치기 (소개 · 사진 · 작가 페이지)</summary>
        ${list.map((a) => { const k = a.name.trim().toLowerCase().replace(/\s+/g, ' '); const I = (D.authorInfo || {})[k] || {}; return `<div class="au-info-row">
          <b>${esc(a.name)}</b>${(I.works || []).length ? `<span class="hint">네이버 웹툰의 다른 작품 ${I.works.length}개를 가져왔어요</span>` : ''}
          <textarea class="fld" rows="2" maxlength="300" data-ai="${esc(k)}|bio" data-name="${esc(a.name)}" placeholder="작가 소개 (작품 연결 때 네이버 작가 페이지에서 가져와요)">${esc(I.bio || '')}</textarea>
          <div class="grid2"><input class="fld" type="url" data-ai="${esc(k)}|img" data-name="${esc(a.name)}" value="${esc(I.img || '')}" placeholder="프로필 사진 주소">
          <input class="fld" type="url" data-ai="${esc(k)}|url" data-name="${esc(a.name)}" value="${esc(I.url || '')}" placeholder="작가 페이지 · SNS 링크"></div></div>`; }).join('')}
      </details>` : ''}</div>`;
  }
  function setAuthors(w, list) {
    w.authors = list.filter((a) => a.name).slice(0, 8);
    w.author = w.authors.map((a) => a.name).join(', ');
    saveDraft(); render();
  }

  // ---------- 작품 연결: 제목이나 공식 링크로 찾아 연결하면 작가 · 화수 · 연재 · 설명 · 태그를 자동으로 채우고, 매일 새벽 서버가 다시 가져와요 ----------
  const srvReady = () => !!(D.settings.apiUrl || '').trim() && srv.ok;
  const srcName = (u) => (/comic\.naver\.com/.test(u) ? '네이버웹툰' : /webtoon\.kakao\.com/.test(u) ? '카카오웹툰' : ((String(u || '').match(/^https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || '작품 페이지'));
  // 화수 · 연재 요일 · 상태까지 가져오는 곳은 네이버 웹툰뿐이에요. 다른 플랫폼은 제목 · 작가 · 설명 · 표지만
  const fullSource = (u) => /comic\.naver\.com/.test(u || '');
  // 가져온 정보를 웹툰에 넣어요 (서버의 applyInfo_와 같은 규칙: 보러 가기 링크 · 장르 · 추천은 그대로)
  function applyInfo(w, I) {
    const day = WT.schedule.today();
    ['title', 'author', 'platform', 'desc'].forEach((k) => { if (k === 'platform' && I.partial && /카카오\s*페이지/.test(w.platform || '')) return; if (I[k]) w[k] = String(I[k]).slice(0, k === 'desc' ? 300 : 200); });
    if ((I.tags || []).length) w.tags = I.tags.slice(0, 8);
    if ((I.authors || []).length) { w.authors = I.authors.slice(0, 8); w.author = w.authors.map((a) => a.name).join(', '); }
    // 작가 정보(프로필 사진 · 소개 · 다른 작품)는 사이트 데이터의 authorInfo에 모아 둬요
    (I.artists || []).forEach((x) => {
      const k = String(x.name).trim().toLowerCase().replace(/\s+/g, ' ');
      const cur = (D.authorInfo || {})[k] || {};
      D.authorInfo = D.authorInfo || {};
      D.authorInfo[k] = { name: x.name, img: x.img || cur.img || '', bio: x.bio || cur.bio || '', url: x.url || cur.url || '', works: (x.works && x.works.length ? x.works : cur.works) || [] };
    });
    if (I.status) { if (w.status !== I.status) { w.episodes = WT.schedule.episodes(w); w.baseDate = day; } w.status = I.status; delete w.ongoing; }
    if ((I.days || []).length) w.days = I.days.slice();
    if (I.episodes && Number(I.episodes) !== WT.schedule.episodes(w)) { w.episodes = Math.max(1, Number(I.episodes)); w.baseDate = day; }
    let coverNew = false;
    if (I.cover && (!w.cover || w.coverAuto)) { coverNew = w.cover !== I.cover; w.cover = I.cover; w.coverAuto = true; }
    w.autoCount = WT.schedule.status(w) === 'ongoing' && (w.days || []).length > 0;
    if (I.source) w.source = I.source;
    w.autoAt = day;
    return coverNew;
  }
  // 보러 가기 링크가 공식 작품 페이지인지 (연결한 작품과 같은 번호의 네이버 웹툰 주소)
  const titleIdOf = (u) => (/(^|[/.])comic\.naver\.com\//.test(u || '') ? ((u || '').match(/[?&]titleId=(\d+)/) || [])[1] || '' : '');
  const sameWork = (a, b) => !!a && !!b && (titleIdOf(a) || titleIdOf(b) ? titleIdOf(a) === titleIdOf(b) : String(a).replace(/[?#].*$/, '').replace(/\/$/, '') === String(b).replace(/[?#].*$/, '').replace(/\/$/, ''));
  const isOfficial = (w) => sameWork(w.url, w.source);
  // 연결할 플랫폼: 네이버 웹툰(제목 검색) · 카카오웹툰(링크) · 그 밖(링크)
  const LINK_PF = [['naver', '네이버웹툰'], ['kakaow', '카카오웹툰'], ['etc', '그 밖의 플랫폼']];
  const linkPf = (w) => (ui.linkPf && ui.linkPf.id === w.id ? ui.linkPf.pf : /카카오/.test(w.platform || '') ? 'kakaow' : !w.platform || /네이버/.test(w.platform) || w.title === '새 웹툰' ? 'naver' : 'etc');
  const notOfficial = () => D.webtoons.filter((x) => x.source && !isOfficial(x));
  function linkBox(w) {
    const L = ui.link && ui.link.id === w.id ? ui.link : null;
    if (!srvReady()) {
      return `<div class="fx-box"><b class="fx-h">작품 연결</b><span class="hint">서버(Apps Script)에 관리자로 연결하면, 네이버 웹툰 제목만 넣어도 작가 · 화수 · 연재 요일 · 설명 · 태그 · 표지를 자동으로 채워요. [회원 · 댓글 · 제보] 탭에서 연결해 주세요.</span></div>`;
    }
    if (w.source && !(L && L.relink)) {
      const st = WT.schedule.status(w);
      const busy = L && L.busy;
      return `<div class="fx-box linked">
        <div class="fx-top"><b class="fx-h">${WT.platform.icon(srcName(w.source), 'pf-in')}${esc(srcName(w.source))}에 연결됨</b>
          <div class="ad-actions"><button type="button" class="btn btn-sm btn-gold press" data-a="lk-refresh" data-id="${w.id}" ${busy ? 'disabled' : ''}>${busy ? '가져오는 중…' : '지금 다시 가져오기'}</button><button type="button" class="btn btn-sm press" data-a="lk-change" data-id="${w.id}">다른 작품으로</button><button type="button" class="btn btn-sm press" data-a="lk-unlink" data-id="${w.id}">${ui.confirm === 'unlink:' + w.id ? '한 번 더 누르면 끊어요' : '연결 끊기'}</button></div></div>
        <div class="fx-linked">
          <span class="fx-cv big">${w.cover ? `<img src="${esc(w.cover)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
          <div class="fx-lbody">
            <b class="fx-lt">${esc(w.title)}</b>
            <div class="fx-sum">
              <span class="fx-au"><b>작가</b>${WT.authorsOf(w).map((a) => `${esc(a.name)}${(a.roles || []).length ? `<i>${a.roles.map((r) => AROLE[r]).join('·')}</i>` : ''}`).join(', ') || '-'}</span><span><b>화수</b>${WT.schedule.episodes(w)}화</span>
              <span><b>연재</b>${esc(WT.schedule.STATUS_KO[st] || st)}${(w.days || []).length ? ' · ' + w.days.map((d) => WT.schedule.DAY_KO[d]).join('·') : ''}</span>
              <span><b>태그</b>${esc((w.tags || []).join(', ') || '-')}</span>
            </div>
            <p class="fx-desc">${esc((w.desc || '').slice(0, 120))}${(w.desc || '').length > 120 ? '…' : ''}</p>
          </div>
        </div>
        ${isOfficial(w) ? '' : `<div class="fx-warn"><span>${w.url ? '보러 가기 링크가 공식 작품 페이지가 아니에요.' : '보러 가기 링크가 비어 있어요.'}</span><button type="button" class="btn btn-sm press" data-a="lk-official" data-id="${w.id}">공식 페이지로 ${w.url ? '바꾸기' : '채우기'}</button></div>`}
        <span class="hint">${fullSource(w.source) ? '매일 새벽 서버가 화수 · 연재 상태 · 요일 · 설명 · 작가 정보를 다시 가져와 사이트에 반영해요' : (/webtoon\.kakao\.com/.test(w.source) ? '매일 새벽 서버가 연재 상태 · 요일 · 설명 · 작가를 다시 가져와요. <b>화수는 가져오지 못해요</b>: 아래 [자동 정보 직접 고치기]에 지금 화수를 한 번 적어 두면 연재 요일마다 자동으로 늘어요' : '이 플랫폼은 제목 · 설명 · 표지만 가져와요 (매일 새벽 다시 맞춰요). <b>작가 · 화수 · 연재 요일 · 상태는 아래 [자동 정보 직접 고치기]에서 적어 주세요</b>')}${w.autoAt ? ` · 마지막 갱신 ${esc(w.autoAt)}` : ''}. <a href="${esc(w.source)}" target="_blank" rel="noopener">공식 페이지 열기 ↗</a></span>
        ${L && L.error ? `<p class="warn" role="alert">${esc(L.error)}</p>` : ''}
      </div>`;
    }
    let body = '';
    if (L && L.busy) body = '<p class="ad-help">네이버 웹툰에서 찾는 중…</p>';
    else if (L && L.error) body = `<p class="warn" role="alert">${esc(L.error)}</p>`;
    else if (L && L.items) {
      body = L.items.length ? `<div class="fx-cands">${L.items.map((x, i) => {
          const dup = D.webtoons.find((o) => o.id !== w.id && o.source && sameWork(o.source, x.source));
          const state = x.finished ? '완결' : x.rest ? '휴재' : '연재 중';
          return `<button type="button" class="fx-cand press${dup ? ' dup' : ''}" data-a="lk-pick" data-id="${w.id}" data-i="${i}" ${dup ? 'disabled' : ''}>
          <span class="fx-cv">${x.cover ? `<img src="${esc(x.cover)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
          <span class="fx-ct"><b>${esc(x.title)}</b><span>${esc(x.author || '')}</span>
            <i>${/네이버/.test(x.platform || '') ? `<em class="fx-st ${x.finished ? 'completed' : x.rest ? 'hiatus' : 'ongoing'}">${state}</em>` : WT.platform.icon(x.platform, 'pf-in')}${esc(x.when || '')}${x.episodes && !/\d화/.test(x.when || '') ? ` · ${x.episodes}화` : ''}${x.adult ? ' · 성인' : ''}</i></span>
          <span class="fx-go">${dup ? `이미 등록됨<small>${esc(dup.title)}</small>` : '연결'}</span></button>`; }).join('')}</div>`
        : '<p class="ad-help">찾는 작품이 없어요. 제목을 조금 바꾸거나, 작품 페이지 링크를 붙여 넣어 주세요.</p>';
    }
    const pf = linkPf(w);
    const qv = (L && L.q) || (pf !== 'etc' && w.title !== '새 웹툰' ? w.title : '');
    const t = w.title && w.title !== '새 웹툰' ? w.title : '';
    const how = {
      naver: '제목이나 작가 이름으로 찾아요. 제목 · 작가 · 화수 · 연재 요일 · 상태 · 설명 · 태그 · 표지를 채우고, 그 뒤로는 매일 자동으로 맞춰요.',
      kakaow: '제목으로 찾아요 (작품 페이지 주소를 붙여 넣어도 돼요). 제목 · 작가 · 연재 요일 · 상태 · 설명 · 태그 · 표지를 채우고 매일 자동으로 맞춰요. <b>화수만은 가져오지 못해요</b>: 아래 [자동 정보 직접 고치기]에 지금 화수를 한 번 적어 두면 연재 요일마다 자동으로 1화씩 늘어요. <b>카카오페이지 작품</b>도 카카오웹툰에 같은 작품이 있으면 여기서 연결할 수 있어요 (플랫폼 이름은 적어 둔 그대로 둬요).',
      etc: '작품 페이지 주소를 붙여 넣으면, 그 페이지가 공개해 둔 제목 · 설명 · 표지를 채워요. 작가 · 화수 · 연재 요일 · 상태는 직접 적어 주세요. 카카오페이지 작품 페이지는 공개 정보가 없어서 연결할 수 없어요.'
    }[pf];
    return `<div class="fx-box">
      <span class="fx-h">작품 연결 <span>어느 플랫폼에서 연재하나요?</span></span>
      <div class="fx-pf" role="group" aria-label="연재 플랫폼">${LINK_PF.map(([k, n]) => `<button type="button" data-a="lk-pf" data-id="${w.id}" data-pf="${k}" aria-pressed="${pf === k}">${k === 'etc' ? '' : WT.platform.icon(n, 'pf-in')}${n}</button>`).join('')}</div>
      <div class="fx-in"><label class="sr" for="fx-q">${pf === 'etc' ? '작품 페이지 주소' : '제목 또는 작품 링크'}</label><input id="fx-q" class="fld" placeholder="${pf === 'naver' ? '예: 화산귀환' : pf === 'kakaow' ? '예: 나 혼자만 레벨업' : 'https://…'}" value="${esc(qv)}" autocomplete="off" ${pf === 'etc' ? 'inputmode="url"' : ''}>
        <button type="button" class="btn btn-gold btn-sm press" data-a="lk-find" data-id="${w.id}" ${L && L.busy ? 'disabled' : ''}>${pf === 'etc' ? '연결' : '찾기'}</button>
        ${L && L.relink ? `<button type="button" class="btn btn-sm press" data-a="lk-cancel">취소</button>` : ''}</div>
      ${body}
      <span class="hint">${how} 보러 가기 링크가 비어 있으면 공식 페이지로 넣어요.</span>
    </div>`;
  }
  const apiErr = (e) => (/알 수 없는 요청/.test(e.message) ? '서버 코드가 예전 버전이에요. 새 Code.gs를 붙여 넣고 새 버전으로 다시 배포해 주세요.' : e.message);
  async function linkFind(w) {
    const q = ((document.getElementById('fx-q') || {}).value || '').trim();
    if (!q) { toast('제목이나 링크를 넣어 주세요'); return; }
    const relink = !!(ui.link && ui.link.relink);
    ui.link = { id: w.id, q, busy: true, relink };
    render();
    try {
      if (/^https?:\/\//i.test(q) || /^\d{3,9}$/.test(q)) {
        const r = await api('adminFetchInfo', { url: q });
        if (!ui.link || ui.link.id !== w.id) return;
        linkApply(w, r.info || {});
        return;
      }
      if (linkPf(w) === 'etc') throw new Error('이 플랫폼은 제목으로 찾을 수 없어요. 작품 페이지를 열어 주소(https://…)를 복사해 붙여 넣어 주세요.');
      const r = await api('adminSearch', { q, platform: linkPf(w) });
      if (!ui.link || ui.link.id !== w.id) return;
      ui.link = { id: w.id, q, items: r.items || [], relink };
    } catch (e) {
      if (!ui.link || ui.link.id !== w.id) return;
      ui.link = { id: w.id, q, error: apiErr(e), relink };
    }
    render();
  }
  async function linkPick(w, i) {
    const x = ui.link && ui.link.items && ui.link.items[i];
    if (!x) return;
    ui.link = Object.assign({}, ui.link, { busy: true, items: null });
    render();
    try {
      const r = await api('adminFetchInfo', { url: x.source });
      linkApply(w, Object.assign({ cover: x.cover }, r.info || {}, { source: (r.info && r.info.source) || x.source }));
    } catch (e) { ui.link = { id: w.id, q: (ui.link || {}).q, error: apiErr(e), relink: !!(ui.link && ui.link.relink) }; render(); }
  }
  function linkApply(w, I) {
    if (!I.title) { ui.link = { id: w.id, error: '작품 정보를 가져오지 못했어요.' }; render(); return; }
    const dup = D.webtoons.find((o) => o.id !== w.id && o.source && I.source && sameWork(o.source, I.source));
    if (dup) { ui.link = { id: w.id, q: (ui.link || {}).q, error: `이미 "${dup.title}"에 연결된 작품이에요.`, relink: !!(ui.link && ui.link.relink) }; render(); return; }
    const coverNew = applyInfo(w, I);
    const filled = !w.url && !!(I.url || I.source);
    if (filled) w.url = I.url || I.source;
    ui.link = null;
    saveDraft();
    if (coverNew || !w.color) { w.color = ''; autoColor(w, false); }
    render();
    toast(`${w.title}에 연결했어요.${filled ? ' 보러 가기 링크도 공식 페이지로 넣었어요.' : ''} 확인한 뒤 저장해 주세요`);
  }
  async function linkRefresh(w) {
    ui.link = { id: w.id, busy: true };
    render();
    try {
      const r = await api('adminRefreshInfo', { items: [{ id: w.id, source: w.source }] });
      const I = r.infos && r.infos[w.id];
      if (!I || I.error) throw new Error((I && I.error) || '가져오지 못했어요');
      const coverNew = applyInfo(w, I.info || {});
      ui.link = null; saveDraft();
      if (coverNew) { w.color = ''; autoColor(w, false); }
      render(); toast('최신 정보로 맞췄어요');
    } catch (e) { ui.link = { id: w.id, error: apiErr(e) }; render(); }
  }
  // 연결된 웹툰 모두 지금 다시 가져오기 (25개씩)
  async function linkRefreshAll() {
    const list = D.webtoons.filter((w) => w.source);
    if (!list.length) { toast('연결된 웹툰이 아직 없어요'); return; }
    ui.refreshing = `0 / ${list.length}`; render();
    let n = 0, changed = 0, fail = 0;
    for (let i = 0; i < list.length; i += 25) {
      const part = list.slice(i, i + 25);
      try {
        const r = await api('adminRefreshInfo', { items: part.map((w) => ({ id: w.id, source: w.source })) });
        part.forEach((w) => {
          const I = r.infos && r.infos[w.id];
          if (!I || I.error) { fail++; return; }
          const before = JSON.stringify(w);
          const coverNew = applyInfo(w, I.info || {});
          if (coverNew) { w.color = ''; autoColor(w, false); }
          if (JSON.stringify(Object.assign({}, w, { autoAt: '' })) !== JSON.stringify(Object.assign(JSON.parse(before), { autoAt: '' }))) changed++;
        });
      } catch (e) { fail += part.length; toast(apiErr(e)); break; }
      n += part.length; ui.refreshing = `${n} / ${list.length}`; render();
    }
    ui.refreshing = null; saveDraft(); render();
    toast(`${changed}개가 바뀌었어요 · 작가 정보 ${Object.keys(D.authorInfo || {}).length}명${fail ? ` · ${fail}개는 가져오지 못했어요` : ''}. 확인한 뒤 저장해 주세요`);
  }

  // ---------- 장르 ----------
  function tabGenres() {
    const g = ui.g && genre(ui.g);
    return `<h2>장르 관리</h2>
      <p class="ad-help">홈 카드와 하단 장르 띠에 나오는 순서대로 정렬돼요. 장르 ID는 주소(#/tree/ID)에 쓰여서 만든 뒤에는 바꿀 수 없어요.</p>
      <div class="ad-split">
        <section class="ad-list" aria-label="장르 목록">
          <button type="button" class="btn btn-gold press" data-a="new-g">+ 새 장르</button>
          <div class="items-box">
            ${D.genres.map((x, i) => `<div style="display:flex; gap:4px; align-items:center">
              <button type="button" class="ad-row${ui.g === x.id ? ' sel' : ''}" data-a="pick-g" data-id="${x.id}">
                <span class="dotc" style="background:${x.color}">${esc(x.name[0])}</span>
                <span class="t"><b>${esc(x.name)}</b><span>${x.id} · 트리 ${Object.keys(D.trees[x.id].nodes).length}개</span></span>
              </button>
              <button type="button" class="icon-btn" data-a="g-up" data-i="${i}" aria-label="${esc(x.name)} 위로" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="icon-btn" data-a="g-down" data-i="${i}" aria-label="${esc(x.name)} 아래로" ${i === D.genres.length - 1 ? 'disabled' : ''}>↓</button>
            </div>`).join('')}
          </div>
        </section>
        ${ui.newGenre ? newGenreForm() : g ? genreForm(g) : '<section class="ad-form"><div class="ad-empty">왼쪽에서 장르를 고르거나 [+ 새 장르]를 눌러 주세요</div></section>'}
      </div>`;
  }
  function newGenreForm() {
    return `<section class="ad-form" aria-label="새 장르 만들기">
      <h3 style="margin:0">새 장르 만들기</h3>
      <div class="field"><label for="ng-id">장르 ID (영어 소문자·숫자, 바꿀 수 없음)</label><input id="ng-id" class="fld" placeholder="예: sports" maxlength="20"></div>
      <div class="field"><label for="ng-name">장르 이름</label><input id="ng-name" class="fld" placeholder="예: 스포츠" maxlength="12"></div>
      <p class="err" id="ng-err" role="alert" hidden></p>
      <div class="ad-actions"><button type="button" class="btn btn-gold press" data-a="create-g">만들기</button><button type="button" class="btn press" data-a="cancel-g">취소</button></div>
    </section>`;
  }
  function genreForm(g) {
    const T = D.trees[g.id];
    const confirming = ui.confirm === 'g:' + g.id;
    return `<section class="ad-form" aria-label="장르 수정">
      <div style="display:flex; align-items:center; gap:14px"><span aria-hidden="true" style="width:56px; height:62px; border-radius:12px; background:${g.color}; box-shadow:inset 0 -14px 20px rgba(0,0,0,.15)"></span><div><b style="font-size:18px; color:${g.color}">${esc(g.name)}</b><div class="ad-help">ID: ${g.id}</div></div></div>
      <div class="grid2">
        <div class="field"><label for="g-name">이름</label><input id="g-name" class="fld" data-gf="name" value="${esc(g.name)}" maxlength="12"></div>
        <div class="field"><label for="g-color">대표 색 (홈 카드 색)</label><input id="g-color" class="swatch" type="color" data-gf="color" value="${esc(g.color)}"></div>
      </div>
      <div class="field"><label for="g-desc">한 줄 설명</label><input id="g-desc" class="fld" data-gf="desc" value="${esc(g.desc)}"></div>
      <div class="field"><label for="g-start">입문작 (트리의 시작 웹툰)</label><select id="g-start" class="fld" data-a-change="g-start">
        <option value="">정하지 않음</option>
        ${Object.keys(T.nodes).map((id) => `<option value="${id}" ${T.start === id ? 'selected' : ''}>${esc((toon(id) || {}).title)}</option>`).join('')}
      </select><span class="hint">트리에 넣은 웹툰 중에서 고를 수 있어요. 트리는 [트리 편집]에서 만들어요.</span></div>
      <fieldset class="ad-subs"><legend>세부 장르 (도서관의 마도서)</legend>
        <p class="ad-help">세부 장르를 만들면 이 장르 도서관에 세부 장르별 두꺼운 마도서가 꽂혀요. 마도서를 펴면 그 세부 장르 웹툰을 볼 수 있어요. 웹툰마다 세부 장르는 [웹툰 목록]에서 골라요. (트리에 없는 웹툰만 도서관에 들어가요)</p>
        ${(g.subs || []).map((x, i) => `<div class="ad-sub-row">
            <input class="swatch" type="color" data-subf="color" data-sid="${x.id}" value="${esc(x.color)}" aria-label="${esc(x.name)} 색">
            <input class="fld" data-subf="name" data-sid="${x.id}" value="${esc(x.name)}" maxlength="14" aria-label="세부 장르 이름">
            <span class="hint" style="white-space:nowrap">웹툰 ${D.webtoons.filter((w) => (w.subs || []).includes(x.id)).length}개</span>
            <button type="button" class="icon-btn" data-a="sub-up" data-id="${x.id}" aria-label="위로" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="icon-btn" data-a="sub-down" data-id="${x.id}" aria-label="아래로" ${i === g.subs.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="btn btn-sm btn-danger press" data-a="sub-del" data-id="${x.id}">${ui.confirm === 'sub:' + x.id ? '정말 삭제' : '삭제'}</button>
          </div>`).join('') || '<p class="hint">아직 세부 장르가 없어요. 없으면 도서관에 웹툰이 한 권씩 꽂혀요.</p>'}
        <div class="ad-actions"><button type="button" class="btn btn-sm btn-gold press" data-a="sub-add">+ 세부 장르 추가</button>
          ${g.id === 'fantasy' && !(g.subs || []).length ? '<button type="button" class="btn btn-sm press" data-a="sub-preset">판타지 기본 세트 넣기 (회귀·헌터·이세계·아카데미·게임·로판)</button>' : ''}</div>
      </fieldset>
      <div class="ad-actions">
        <button type="button" class="btn btn-sm press" data-a="go-tree" data-id="${g.id}">이 장르 트리 편집하기</button>
        <button type="button" class="btn btn-sm btn-danger press" data-a="del-g" data-id="${g.id}">${confirming ? '한 번 더 누르면 삭제돼요 (웹툰은 남아요)' : '장르 삭제'}</button>
      </div>
    </section>`;
  }

  // ---------- 트리 편집 ----------
  function tabTree() {
    if (!D.genres.length) return '<div class="ad-empty">먼저 장르를 만들어 주세요</div>';
    if (!ui.tg || !genre(ui.tg)) ui.tg = D.genres[0].id;
    const g = genre(ui.tg);
    const T = D.trees[g.id];
    const n = Object.keys(T.nodes).length;
    const modeBtn = (m, label) => `<button type="button" class="btn btn-sm tool press" data-a="mode" data-id="${m}" aria-pressed="${ui.mode === m}">${label}</button>`;
    return `<h2>트리 편집</h2>
      <p class="ad-help">노드를 끌어서 옮기고, [가지 내리기]로 다음 웹툰을 이어요. [연결하기]는 웹툰 A를 누른 뒤 B를 누르면 A → B 연결선이 생겨요 (다른 장르 웹툰도 넣을 수 있어요).</p>
      <div class="ad-toolbar">
        <label for="t-genre" class="sr">편집할 장르</label>
        <select id="t-genre" class="fld" style="width:auto; min-width:150px" data-a-change="t-genre">${D.genres.map((x) => `<option value="${x.id}" ${x.id === g.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        ${modeBtn('select', '선택 · 이동')}${modeBtn('branch', '＋ 가지 내리기')}${modeBtn('link', '연결하기 (A → B)')}
        <button type="button" class="btn btn-sm btn-gold press" data-a="natural" ${n > 1 ? '' : 'disabled'} title="지금 모양은 살리고 연결선 길이와 간격만 고르게 펴요">간격 자연스럽게</button>
        <label class="ad-check" title="가지를 이을 때마다 간격을 자동으로 펴요"><input type="checkbox" data-a="natural-auto" ${D.settings.treeAutoSpacing !== false ? 'checked' : ''}> 이을 때 자동으로</label>
        <button type="button" class="btn btn-sm press" data-a="auto" ${n ? '' : 'disabled'}>자동 정렬 (처음부터)</button>
        <span class="ad-help">${n}개 · 연결 ${T.links.length}개</span>
      </div>
      <div class="ad-split">
        <div style="flex:999 1 560px; min-width:0">
          <div class="ad-canvas-wrap ad-scroll" id="t-wrap"><div class="ad-sizer" id="t-sizer"><div class="ad-canvas" id="t-canvas" style="width:${treeEditW(D.trees[g.id])}px; height:${TREE_H}px"></div></div></div>
          <p class="ad-help">웹툰이 많아지면 오른쪽 끝으로 끌어 놓으세요. 판이 옆으로 늘어나고, 사이트에서도 옆으로 밀어서 이어 볼 수 있어요.</p>
          ${ui.mode === 'link' ? `<p class="ad-help" style="margin-top:8px">${ui.from ? `<b>${esc((toon(ui.from) || {}).title)}</b>에서 이을 웹툰을 눌러 주세요` : '먼저 출발할 웹툰을 눌러 주세요'}</p>` : ''}
          ${ui.mode === 'branch' && !ui.branchFor ? '<p class="ad-help" style="margin-top:8px">가지를 내릴 웹툰(부모)을 눌러 주세요</p>' : ''}
        </div>
        <aside class="ad-side" aria-label="선택한 노드">${treeSide(g, T)}</aside>
      </div>`;
  }
  function chooser(gid, exclude, act) {
    const q = ui.bq.trim().toLowerCase();
    const pool = D.webtoons.filter((w) => !exclude[w.id] && (!q || w.title.toLowerCase().includes(q)))
      .sort((a, b) => (b.genres.includes(gid) - a.genres.includes(gid)) || a.title.localeCompare(b.title, 'ko'));
    return `<label for="b-q" class="sr">웹툰 검색</label>
      <input id="b-q" class="fld" type="search" placeholder="등록된 웹툰 검색" value="${esc(ui.bq)}">
      <div class="pop-list">${pool.slice(0, 30).map((w) => `<button type="button" data-a="${act}" data-id="${w.id}">${esc(w.title)} <span class="hint">· ${esc(w.genres.map((x) => (genre(x) || {}).name).join(', ') || '장르 없음')}</span></button>`).join('') || '<span class="hint">넣을 수 있는 웹툰이 없어요</span>'}</div>
      <div class="field"><label for="b-new">새 웹툰으로 만들기</label><div style="display:flex; gap:6px"><input id="b-new" class="fld" placeholder="새 웹툰 제목"><button type="button" class="btn btn-sm btn-gold press" data-a="${act}-new">추가</button></div><span class="hint">자세한 정보는 나중에 [웹툰 목록]에서 채워요.</span></div>`;
  }
  function treeSide(g, T) {
    const n = Object.keys(T.nodes).length;
    if (!n) return `<h3>첫 웹툰 넣기</h3><p class="ad-help">이 장르의 입문작(시작점)이 될 웹툰을 골라 주세요.</p>${chooser(g.id, {}, 'first')}`;
    if (ui.branchFor && T.nodes[ui.branchFor]) {
      return `<h3>${esc(toon(ui.branchFor).title)}에서 가지 내리기</h3>${chooser(g.id, T.nodes, 'branch')}<button type="button" class="btn btn-sm press" data-a="branch-cancel">취소</button>`;
    }
    const id = ui.tsel;
    if (!id || !T.nodes[id]) {
      return `<h3>${esc(g.name)} 트리</h3><p class="ad-help">노드를 누르면 연결 이유를 적거나, 시작점으로 정하거나, 트리에서 뺄 수 있어요.</p>
        <p class="ad-help">입문작 ${WT.starts(T).length}개: <b>${esc(WT.starts(T).map((x) => (toon(x) || {}).title).join(', ') || '정하지 않음')}</b> · 노드를 골라 [입문작에 넣기]로 여러 개 정할 수 있어요. 첫 번째 입문작이 트리의 시작점이에요.</p>`;
    }
    const w = toon(id);
    const outs = T.links.map((l, i) => [l, i]).filter(([l]) => l.from === id);
    const ins = T.links.filter((l) => l.to === id);
    const confirming = ui.confirm === 'tn:' + id;
    return `<h3>${esc(w.title)}</h3>
      <p class="ad-help">${T.start === id ? '★ 이 트리의 첫 번째 입문작(시작점)이에요' : WT.isStart(T, id) ? '★ 이 트리의 입문작이에요' : ''}${ins.length ? ` 이전 웹툰: ${ins.map((l) => esc((toon(l.from) || {}).title)).join(', ')}` : ''}</p>
      <div class="ad-actions">
        ${WT.isStart(T, id)
          ? `${T.start === id ? '' : `<button type="button" class="btn btn-sm press" data-a="start-first" data-id="${id}">첫 번째 입문작으로</button>`}${WT.starts(T).length > 1 ? `<button type="button" class="btn btn-sm press" data-a="start-del" data-id="${id}">입문작에서 빼기</button>` : ''}`
          : `<button type="button" class="btn btn-sm press" data-a="start-add" data-id="${id}">입문작에 넣기</button>`}
        <button type="button" class="btn btn-sm press" data-a="branch-from" data-id="${id}">＋ 여기서 가지 내리기</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px">
        <span class="box-title">다음으로 이어지는 웹툰 · 연결 이유</span>
        ${outs.length ? outs.map(([l, i]) => `<div class="link-row"><span class="who">→ ${esc((toon(l.to) || {}).title)}</span>
          <label class="sr" for="why-${i}">${esc((toon(l.to) || {}).title)} 연결 이유</label>
          <input id="why-${i}" class="fld" data-why="${i}" value="${esc(l.why || '')}" placeholder="왜 다음 작품인지 한 줄" maxlength="40">
          <button type="button" class="icon-btn" data-a="del-link" data-i="${i}" aria-label="연결 지우기">✕</button></div>`).join('') : '<span class="hint">아직 없어요. [＋ 여기서 가지 내리기]를 눌러 보세요.</span>'}
      </div>
      <div class="ad-actions">
        <button type="button" class="btn btn-sm press" data-a="edit-w" data-id="${id}">웹툰 정보 수정</button>
        <button type="button" class="btn btn-sm btn-danger press" data-a="del-node" data-id="${id}">${confirming ? '한 번 더 누르면 빠져요' : '트리에서 빼기'}</button>
      </div>
      <span class="hint">트리에서 빼도 웹툰 자체는 남아요.</span>`;
  }

  function placeLink(el, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    el.style.left = `${a[0]}px`;
    el.style.top = `${a[1] - 1.5}px`;
    el.style.width = `${Math.sqrt(dx * dx + dy * dy)}px`;
    el.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
  }

  /** 편집 판 너비: 사이트 판 너비 + 오른쪽에 끌어다 놓을 여유 */
  function treeEditW(T) { return WT.treeWidth(T) + 260; }

  // 편집 화면의 원: 사이트처럼 표지를 넣고, 표지가 없거나 안 열리면 첫 글자
  const nodeFace = (w) => `<i class="ini">${esc((w.title || '?')[0])}</i>${w.cover ? `<img src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false" onerror="this.remove()">` : ''}`;
  function mountTree() {
    const g = genre(ui.tg);
    const T = D.trees[g.id];
    const wrap = document.getElementById('t-wrap');
    const cv = document.getElementById('t-canvas');
    const sizer = document.getElementById('t-sizer');
    let EW = treeEditW(T);
    const scale = () => Math.min(1, wrap.clientWidth / TREE_W);
    const fit = () => { const s = scale(); cv.style.width = `${EW}px`; cv.style.transform = `scale(${s})`; sizer.style.width = `${EW * s}px`; sizer.style.height = `${TREE_H * s}px`; wrap.style.height = ''; };
    cv.innerHTML = T.links.map((l, i) => `<div class="ad-link${ui.tsel && (l.from === ui.tsel || l.to === ui.tsel) ? ' sel' : ''}" data-l="${i}"></div>`).join('') +
      Object.keys(T.nodes).map((id) => {
        const w = toon(id) || { title: '?' };
        const [x, y] = T.nodes[id];
        const cls = [WT.isStart(T, id) ? 'start' : '', ui.tsel === id ? 'sel' : '', ui.from === id ? 'from' : ''].join(' ');
        return `<div class="ad-node ${cls}" data-n="${id}" style="--gc:${gColor(w)}; left:${x}px; top:${y - (WT.isStart(T, id) ? 45 : 36)}px" role="button" tabindex="0" aria-label="${esc(w.title)}">
          <div class="c">${nodeFace(w)}${ui.tsel === id && ui.mode === 'select' ? '<span class="plus" data-plus="1" aria-hidden="true">+</span>' : ''}</div>
          <span>${WT.recStars(w) ? '★'.repeat(WT.recStars(w)) + ' ' : ''}${esc(w.title)}</span>${WT.isStart(T, id) ? `<span class="start-tag">입문작${T.start === id && WT.starts(T).length > 1 ? ' 1' : ''}</span>` : ''}
        </div>`;
      }).join('');
    const drawLinks = () => T.links.forEach((l, i) => {
      const el = cv.querySelector(`[data-l="${i}"]`);
      if (el && T.nodes[l.from] && T.nodes[l.to]) placeLink(el, T.nodes[l.from], T.nodes[l.to]);
    });
    drawLinks();
    fit();
    window.onresize = fit;

    let drag = null;
    cv.addEventListener('pointerdown', (e) => {
      const nEl = e.target.closest('[data-n]');
      if (!nEl) return;
      const id = nEl.dataset.n;
      drag = { id, el: nEl, sx: e.clientX, sy: e.clientY, x: T.nodes[id][0], y: T.nodes[id][1], moved: 0, plus: !!e.target.closest('[data-plus]') };
      nEl.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag || ui.mode !== 'select') return;
      const s = scale();
      const dx = (e.clientX - drag.sx) / s, dy = (e.clientY - drag.sy) / s;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved < 5) return;
      const nx = Math.round(Math.min(EW - 60, Math.max(60, drag.x + dx)) / 10) * 10;
      const ny = Math.round(Math.min(TREE_H - 60, Math.max(50, drag.y + dy)) / 10) * 10;
      T.nodes[drag.id] = [nx, ny];
      drag.el.style.left = `${nx}px`;
      drag.el.style.top = `${ny - (WT.isStart(T, drag.id) ? 45 : 36)}px`;
      drawLinks();
    });
    cv.addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (d.moved >= 5) {
        saveDraft();
        // 오른쪽 끝 근처에 놓으면 판을 넓혀요
        const nw = treeEditW(T);
        if (nw !== EW) { const keep = wrap.scrollLeft; EW = nw; fit(); wrap.scrollLeft = keep; }
        return;
      }
      nodeTap(d.id, d.plus);
    });
    cv.addEventListener('keydown', (e) => {
      const nEl = e.target.closest('[data-n]');
      if (nEl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nodeTap(nEl.dataset.n, false); }
    });
  }
  function nodeTap(id, plus) {
    const T = D.trees[ui.tg];
    // [웹툰 목록]의 "트리에 넣기"로 왔을 때: 부모를 누르면 바로 이어 줘요
    if (ui.pendingChild && ui.mode === 'branch') {
      const child = ui.pendingChild;
      ui.pendingChild = null;
      if (!T.nodes[child]) { addBranch(id, child); return; }
    }
    if (ui.mode === 'branch' || plus) { ui.branchFor = id; ui.bq = ''; ui.tsel = id; render(); return; }
    if (ui.mode === 'link') {
      if (!ui.from) { ui.from = id; render(); return; }
      if (ui.from === id) { ui.from = null; render(); return; }
      if (!T.links.some((l) => l.from === ui.from && l.to === id)) {
        T.links.push({ from: ui.from, to: id, why: '' });
        saveDraft();
        toast('연결했어요. 오른쪽에서 연결 이유를 적어 주세요');
      }
      ui.tsel = ui.from; ui.from = null; ui.mode = 'select';
      render();
      return;
    }
    ui.tsel = ui.tsel === id ? null : id;
    ui.confirm = null;
    render();
  }
  function addBranch(parentId, childId) {
    const T = D.trees[ui.tg];
    const p = T.nodes[parentId];
    // 부모 오른쪽부터 차례로 살펴서, 다른 노드와 겹치지 않는 첫 자리에 놓아요
    const tries = [[230, 0], [230, -130], [230, 130], [0, 150], [0, -150], [150, 200], [150, -200], [-230, 0], [-230, 140], [-230, -140], [120, 260], [-120, 260]];
    const taken = Object.values(T.nodes);
    const free = ([x, y]) => x >= 70 && y >= 60 && y <= TREE_H - 60 && taken.every(([a, b]) => Math.hypot(a - x, b - y) > 120);
    // 근처에 빈자리가 없으면 오른쪽으로 계속 넓혀 가며 찾아요 (판이 옆으로 늘어나요)
    let spot = tries.map(([dx, dy]) => [p[0] + dx, p[1] + dy]).find(free);
    for (let x = p[0] + 230; !spot && x < p[0] + 230 * 40; x += 230) spot = [p[1], 280, 140, 420, 90, 470].map((y) => [x, y]).find(free);
    T.nodes[childId] = [Math.round(spot[0]), Math.round(spot[1])];
    T.links.push({ from: parentId, to: childId, why: '' });
    if (D.settings.treeAutoSpacing !== false) naturalSpacing(T);
    ui.tsel = childId; ui.branchFor = null; ui.mode = 'select';
    saveDraft();
    toast(`${toon(childId).title}을(를) 이었어요`);
    render();
  }
  /**
   * 간격 자연스럽게: 지금 배치를 출발점으로
   * - 이어진 웹툰 사이 선 길이를 LINK 정도로 맞추고 (너무 짧으면 늘리고, 너무 길면 줄이고)
   * - 이어지지 않은 웹툰끼리는 겹치지 않게 밀어내고
   * - 앞 웹툰 → 다음 웹툰은 왼쪽 → 오른쪽 흐름을 지켜요
   * 입문작(시작점)은 제자리에 둬요.
   */
  function naturalSpacing(T) {
    const ids = Object.keys(T.nodes);
    if (ids.length < 2) return;
    const LINK = 250, GAP_X = 175, GAP_Y = 135, FLOW = 190;
    const P = {}; ids.forEach((id) => { P[id] = T.nodes[id].slice(); });
    const pin = T.start && P[T.start] ? T.start : null;
    const links = T.links.filter((l) => P[l.from] && P[l.to] && l.from !== l.to);
    for (let it = 0; it < 500; it++) {
      const k = 1 - it / 600;   // 점점 차분하게
      const F = {}; ids.forEach((id) => { F[id] = [0, 0]; });
      links.forEach((l) => {
        const a = P[l.from], b = P[l.to];
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        const f = (d - LINK) * 0.12;
        F[l.from][0] += dx / d * f; F[l.from][1] += dy / d * f;
        F[l.to][0] -= dx / d * f; F[l.to][1] -= dy / d * f;
        const lack = a[0] + FLOW - b[0];          // 흐름: 다음 웹툰은 오른쪽에
        if (lack > 0) { F[l.to][0] += lack * 0.25; F[l.from][0] -= lack * 0.1; }
      });
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = P[ids[i]], b = P[ids[j]];
          let nx = (b[0] - a[0]) / GAP_X, ny = (b[1] - a[1]) / GAP_Y;
          let d = Math.hypot(nx, ny);
          if (d >= 1.15) continue;
          if (d < 1e-3) { nx = 0.3; ny = 1; d = Math.hypot(nx, ny); }
          const push = (1.15 - d) * 0.5;
          F[ids[i]][0] -= nx / d * push * GAP_X; F[ids[i]][1] -= ny / d * push * GAP_Y;
          F[ids[j]][0] += nx / d * push * GAP_X; F[ids[j]][1] += ny / d * push * GAP_Y;
        }
      }
      ids.forEach((id) => {
        if (id === pin) return;
        const p = P[id];
        p[0] += Math.max(-40, Math.min(40, F[id][0] * k));
        p[1] += Math.max(-40, Math.min(40, F[id][1] * k));
        p[0] = Math.max(90, p[0]);
        p[1] = Math.max(80, Math.min(TREE_H - 80, p[1]));
      });
    }
    // 판 왼쪽 여백을 맞추고 10 단위로
    const minX = Math.min(...ids.map((id) => P[id][0]));
    const sx = pin ? 0 : 110 - minX;
    ids.forEach((id) => { T.nodes[id] = [Math.round((P[id][0] + sx) / 10) * 10, Math.round(P[id][1] / 10) * 10]; });
  }

  function autoLayout() {
    const T = D.trees[ui.tg];
    const ids = Object.keys(T.nodes);
    const start = T.start && T.nodes[T.start] ? T.start : ids[0];
    const level = { [start]: 0 };
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift();
      T.links.filter((l) => l.from === cur && T.nodes[l.to]).forEach((l) => {
        if (level[l.to] === undefined) { level[l.to] = level[cur] + 1; queue.push(l.to); }
      });
    }
    let maxL = Math.max(0, ...Object.values(level));
    ids.forEach((id) => { if (level[id] === undefined) level[id] = maxL + 1; });
    maxL = Math.max(...Object.values(level));
    // 한 줄에 너무 많으면 옆으로 나눠서 (판이 옆으로 늘어나요)
    const MAXROW = 4;
    let col = 0;
    for (let L = 0; L <= maxL; L++) {
      const row = ids.filter((id) => level[id] === L);
      for (let c = 0; c < row.length; c += MAXROW) {
        const part = row.slice(c, c + MAXROW);
        part.forEach((id, k) => {
          const y = part.length === 1 ? TREE_H / 2 : 90 + k * ((TREE_H - 180) / (part.length - 1));
          T.nodes[id] = [Math.round(110 + col * 200), Math.round(y)];
        });
        col++;
      }
    }
    saveDraft();
    render();
  }

  // ---------- 전체 지도 편집 ----------
  function tabMap() {
    const M = D.map;
    const off = D.webtoons.filter((w) => !M.pins[w.id]);
    const id = ui.msel && toon(ui.msel) ? ui.msel : null;
    const links = M.links.map((l, i) => [l, i]).filter(([l]) => id && (l[0] === id || l[1] === id));
    const modeBtn = (m, label) => `<button type="button" class="btn btn-sm tool press" data-a="mmode" data-id="${m}" aria-pressed="${ui.mmode === m}">${label}</button>`;
    return `<h2>전체 지도 편집</h2>
      <p class="ad-help">웹툰은 장르별 무리로 자동 배치돼요. 장르 트리 모양을 따르고, 트리에 없는 웹툰은 무리 아래에 줄지어 놓여요. 웹툰을 추가하면 무리가 커지고, 다른 장르 무리는 겹치지 않게 알아서 비켜요.</p>
      <p class="ad-help"><b>장르 위치 옮기기:</b> 색 영역(장르 무리)의 빈 곳을 끌면 그 장르 웹툰이 통째로 따라와요. 놓으면 다른 무리가 겹치지 않게 다시 정리돼요. <b>웹툰 하나만 옮기기:</b> 별을 끌면 그 자리에 고정돼요(자동 배치에서 빠짐). 장르가 애매한 웹툰을 두 무리 사이에 둘 때 쓰면 좋아요.</p>
      <div class="ad-toolbar">
        ${modeBtn('select', '선택 · 이동')}${modeBtn('link', '연결하기 (A ↔ B)')}
        <span class="ad-help">고정 ${Object.keys(M.pins).length}개 · 직접 그은 연결 ${M.links.length}개 (장르 트리 연결선은 자동으로 보여요)</span>
      </div>
      <div class="ad-split">
        <div style="flex:999 1 560px; min-width:0">
          <div class="ad-canvas-wrap" id="m-wrap"><div class="ad-canvas" id="m-canvas" style="width:${M.width}px; height:${M.height}px"></div></div>
          ${ui.mmode === 'link' ? `<p class="ad-help" style="margin-top:8px">${ui.mfrom ? `<b>${esc((toon(ui.mfrom) || {}).title)}</b>와 이을 웹툰을 눌러 주세요` : '먼저 웹툰 하나를 눌러 주세요'}</p>` : ''}
        </div>
        <aside class="ad-side">
          ${id ? `<h3>${esc(toon(id).title)}</h3>
            <span class="box-title">이어진 웹툰</span>
            ${links.length ? links.map(([l, i]) => `<div class="link-row"><span class="who" style="max-width:none; flex:1 1 auto">↔ ${esc((toon(l[0] === id ? l[1] : l[0]) || {}).title)}</span><button type="button" class="icon-btn" data-a="mdel-link" data-i="${i}" aria-label="연결 지우기">✕</button></div>`).join('') : '<span class="hint">이어진 웹툰이 없어요</span>'}
            ${M.pins[id] ? `<div class="ad-actions"><button type="button" class="btn btn-sm press" data-a="map-remove" data-id="${id}">고정 풀기 (자동 자리로)</button></div>` : '<span class="hint">자동 배치 중이에요</span>'}` : '<h3>자동 배치된 웹툰</h3>'}
          ${!id ? `<p class="ad-help">${off.length}개는 자동 배치 중, ${Object.keys(M.pins).length}개는 직접 고정했어요.</p>${Object.keys(M.pins).length ? `<button type="button" class="btn btn-sm press" data-a="map-unpin-all">${ui.confirm === 'unpin' ? '한 번 더 누르면 모두 자동 배치로 돌아가요' : '고정 모두 풀기'}</button>` : ''}` : ''}
        </aside>
      </div>`;
  }
  function mountMap() {
    const M = D.map;
    const L = WT.layoutMap(D);   // 사이트와 똑같은 자동 배치
    const [sx, sy] = L.shift;
    const wrap = document.getElementById('m-wrap');
    const cv = document.getElementById('m-canvas');
    cv.style.width = `${L.width}px`; cv.style.height = `${L.height}px`;
    const scale = () => wrap.clientWidth / L.width;
    const fit = () => { const s = scale(); cv.style.transform = `scale(${s})`; wrap.style.height = `${L.height * s}px`; };
    cv.innerHTML = L.regions.map((r, i) => `<div class="ad-region" data-r="${i}" style="left:${r.cx - r.w / 2}px; top:${r.cy - r.h / 2}px; width:${r.w}px; height:${r.h}px; margin:0; border-radius:48px; align-items:flex-start; padding-top:8px; box-sizing:border-box; background:radial-gradient(ellipse at center, ${r.color}40 0%, ${r.color}14 60%, transparent 100%); border:2px dashed ${r.color}66" title="끌어서 장르 위치 옮기기"><b style="color:${r.color}; font-size:30px">${esc(r.name)}</b></div>`).join('') +
      L.links.map((l, i) => `<div class="ad-link${ui.msel && l.includes(ui.msel) ? ' sel' : ''}" data-l="${i}"></div>`).join('') +
      Object.keys(L.nodes).filter((id) => toon(id)).map((id) => {
        const w = toon(id);
        const [x, y] = L.nodes[id];
        return `<div class="ad-node${ui.msel === id ? ' sel' : ''}${ui.mfrom === id ? ' from' : ''}" data-n="${id}" style="--gc:${gColor(w)}; left:${x}px; top:${y - 36}px; ${L.auto[id] ? 'opacity:.8' : ''}" role="button" tabindex="0" aria-label="${esc(w.title)}${L.auto[id] ? ' (자동 배치)' : ' (고정)'}"><div class="c">${nodeFace(w)}</div><span>${L.auto[id] ? '' : '📌 '}${esc(w.title)}</span></div>`;
      }).join('');
    const drawLinks = () => L.links.forEach(([a, b], i) => {
      const el = cv.querySelector(`[data-l="${i}"]`);
      if (el && L.nodes[a] && L.nodes[b]) placeLink(el, L.nodes[a], L.nodes[b]);
    });
    drawLinks();
    fit();
    window.onresize = fit;
    let drag = null;
    cv.addEventListener('pointerdown', (e) => {
      const nEl = e.target.closest('[data-n]');
      const rEl = !nEl && e.target.closest('[data-r]');
      if (!nEl && !rEl) return;
      if (nEl) {
        const key = nEl.dataset.n;
        drag = { isNode: true, key, el: nEl, sx: e.clientX, sy: e.clientY, x: L.nodes[key][0], y: L.nodes[key][1], moved: 0 };
      } else {
        const r = L.regions[Number(rEl.dataset.r)];
        const members = Object.keys(L.nodes).filter((id) => L.auto[id] && L.groupOf[id] === r.genre).map((id) => ({ id, el: cv.querySelector(`[data-n="${id}"]`), x: L.nodes[id][0], y: L.nodes[id][1] }));
        drag = { isNode: false, r, el: rEl, sx: e.clientX, sy: e.clientY, left: parseFloat(rEl.style.left), top: parseFloat(rEl.style.top), members, moved: 0 };
      }
      drag.el.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag || ui.mmode !== 'select') return;
      const s = scale();
      const dx = (e.clientX - drag.sx) / s, dy = (e.clientY - drag.sy) / s;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved < 8) return;
      drag.dx = dx; drag.dy = dy;
      if (drag.isNode) {
        const nx = Math.round(drag.x + dx), ny = Math.round(drag.y + dy);
        L.nodes[drag.key] = [nx, ny]; drag.el.style.left = `${nx}px`; drag.el.style.top = `${ny - 36}px`; drag.el.style.opacity = '1';
      } else {
        drag.el.style.left = `${drag.left + dx}px`; drag.el.style.top = `${drag.top + dy}px`;
        drag.members.forEach((m) => { L.nodes[m.id] = [m.x + dx, m.y + dy]; if (m.el) { m.el.style.left = `${m.x + dx}px`; m.el.style.top = `${m.y + dy - 36}px`; } });
      }
      drawLinks();
    });
    cv.addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (d.moved >= 8) {
        if (d.isNode) {
          const [nx, ny] = L.nodes[d.key];
          M.pins[d.key] = [Math.round(nx - sx), Math.round(ny - sy)];
        } else {
          const nx = Math.round(d.r.x + d.dx - sx), ny = Math.round(d.r.y + d.dy - sy);
          const saved = M.regions.find((x) => x.genre === d.r.genre);
          if (saved) { saved.x = nx; saved.y = ny; } else M.regions.push({ genre: d.r.genre, x: nx, y: ny });
        }
        saveDraft();
        render();   // 다른 장르 무리가 겹치지 않게 다시 정리
        return;
      }
      if (d.isNode) mapTap(d.key);
    });
    cv.addEventListener('keydown', (e) => {
      const nEl = e.target.closest('[data-n]');
      if (nEl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mapTap(nEl.dataset.n); }
    });
  }
  function mapTap(id) {
    const M = D.map;
    if (ui.mmode === 'link') {
      if (!ui.mfrom) { ui.mfrom = id; render(); return; }
      if (ui.mfrom !== id && !M.links.some(([a, b]) => (a === ui.mfrom && b === id) || (a === id && b === ui.mfrom))) {
        M.links.push([ui.mfrom, id]);
        saveDraft();
        toast('연결했어요');
      }
      ui.msel = ui.mfrom; ui.mfrom = null; ui.mmode = 'select';
      render();
      return;
    }
    ui.msel = ui.msel === id ? null : id;
    render();
  }
  function placeOnMap(id) {
    const L = WT.layoutMap(D);
    const auto = L.nodes[id];
    if (auto) { D.map.pins[id] = [auto[0] - L.shift[0], auto[1] - L.shift[1]]; return; }
    const w = toon(id);
    const r = D.map.regions.find((x) => w.genres.includes(x.genre)) || { x: D.map.width / 2, y: D.map.height / 2 };
    const k = Object.keys(D.map.pins).length;
    D.map.pins[id] = [Math.round(r.x + Math.cos(k * 2.4) * 160), Math.round(r.y + 40 + Math.sin(k * 2.4) * 120)];
  }

  // ---------- 설정 ----------
  function tabSettings() {
    const S = D.settings;
    const f = (path, label, type, extra) => {
      const val = path.split('.').reduce((o, k) => (o || {})[k], S);
      const id = 's-' + path.replace(/\./g, '-');
      if (type === 'color') return `<div class="field"><label for="${id}">${label}</label><input id="${id}" class="swatch" type="color" data-sf="${path}" value="${esc(val)}"></div>`;
      return `<div class="field"><label for="${id}">${label}</label><input id="${id}" class="fld" ${type === 'number' ? 'type="number" min="0"' : ''} data-sf="${path}" data-num="${type === 'number' ? 1 : ''}" value="${esc(val)}" ${extra || ''}></div>`;
    };
    return `<h2>디자인 · 코인 설정</h2>
      <p class="ad-help">바꾼 내용은 [사이트 미리보기]로 바로 확인할 수 있어요.</p>
      <section class="ad-card"><h3>서버 (Apps Script)</h3>
        ${f('apiUrl', 'Apps Script 웹앱 주소 (비우면 혼자 모드)', 'text', 'placeholder="https://script.google.com/macros/s/…/exec"')}
        <span class="hint">주소를 넣고 data.json을 올리면 회원가입·로그인, 함께 보는 별점·댓글, 랭킹, 오늘 폭주가 켜져요. 설치 방법은 저장소의 apps-script/설치방법.md에 있어요.</span>
      </section>
      <section class="ad-card"><h3>문구</h3>
        ${f('siteName', '사이트 이름', 'text', 'maxlength="20"')}
        ${f('hero.line1', '홈 슬로건 첫 줄', 'text', 'maxlength="30" placeholder="볼 건 많고, 시간은 없고?"')}
        ${f('hero.line2', '홈 슬로건 둘째 줄', 'text', 'maxlength="30" placeholder="*트리*가 골라 줄게요."')}
        <span class="hint">*별표*로 감싼 글자는 강조색으로 보여요. 예: *트리*가 골라 줄게요.</span>
        ${f('hero.sub', '슬로건 아래 설명', 'text', 'maxlength="80" placeholder="수많은 웹툰 중에 진짜 볼 만한 것만. 순서대로 따라가기만 하면 돼요."')}
        ${f('notice', '홈 공지 띠 (비우면 안 보여요)', 'text', 'placeholder="예: 새 웹툰 3개 추가!"')}
        <div class="ad-form" style="padding:0; border:none; background:none"><div class="grid2">
          ${f('labels.done', '"완독" 대신 쓸 말', 'text')}
          ${f('labels.doneButton', '"다 봤어요" 버튼', 'text')}
        </div></div>
        ${f('labels.nextList', '"다음으로 이어지는 웹툰" 제목', 'text')}
      </section>
      <section class="ad-card"><h3>색</h3>
        <div style="display:flex; flex-wrap:wrap; gap:16px">
          ${f('colors.bg', '배경', 'color')}${f('colors.panel', '패널', 'color')}${f('colors.gold', '강조(금색)', 'color')}${f('colors.text', '글자', 'color')}${f('colors.muted', '흐린 글자', 'color')}
        </div>
        <span class="hint">장르별 색은 [장르 관리]에서 바꿔요.</span>
      </section>
      <section class="ad-card"><h3>애니메이션</h3>
        <label class="ad-check"><input type="checkbox" data-sf="animations" ${S.animations !== false ? 'checked' : ''}> 애니메이션 켜기</label>
      </section>
      <section class="ad-card"><h3>코인 규칙</h3>
        <div class="ad-form" style="padding:0; border:none; background:none"><div class="grid2">
          ${f('coins.perEpisode', '1화 기록할 때 코인', 'number')}
          ${f('coins.dailyEpisodeCap', '하루 화수 코인 상한', 'number')}
          ${f('coins.completeBonus', '완독 보너스', 'number')}
          ${f('coins.unlockPrice', '잠금 해제 가격', 'number')}
          ${f('coins.startCoins', '처음 시작할 때 주는 코인', 'number')}
        </div></div>
      </section>
      <section class="ad-card"><h3>오늘 폭주 기준 (서버 연결 후 사용)</h3>
        <div class="ad-form" style="padding:0; border:none; background:none"><div class="grid2">
          ${f('hot.topN', '그날 상위 몇 개', 'number')}
          ${f('hot.minViewers', '최소 본 사람 수', 'number')}
        </div></div>
      </section>`;
  }

  // ---------- 상점 ----------
  function tabShop() {
    return `<h2>상점 아이템</h2>
      <p class="ad-help">가격과 이름을 바꾸거나 아이템을 추가해요. 장식 모양은 지금 있는 그림 중에서 고를 수 있어요. 직접 그린 캐릭터로 바꾸면 장식도 새로 넣을 수 있어요.</p>
      <div class="table-box"><table class="ad-table">
        <thead><tr><th>미리보기</th><th>이름</th><th>종류</th><th>모양 · 색</th><th>가격</th><th>NEW</th><th>설명</th><th></th></tr></thead>
        <tbody>${D.shop.map((it, i) => `<tr>
          <td>${window.WT && WT.charSVG ? WT.charSVG({ acc: it.acc, body: it.body, feet: it.feet }, 44) : ''}</td>
          <td><label class="sr" for="si-n-${i}">이름</label><input id="si-n-${i}" class="fld" data-shop="${i}" data-k="name" value="${esc(it.name)}" style="min-width:120px"></td>
          <td>${it.kind === 'color' ? '몸 색' : '장식'}</td>
          <td>${it.kind === 'color'
            ? `<input class="swatch" type="color" data-shop="${i}" data-k="body" value="${esc(it.body)}" aria-label="몸 색"> <input class="swatch" type="color" data-shop="${i}" data-k="feet" value="${esc(it.feet)}" aria-label="발 색">`
            : `<label class="sr" for="si-a-${i}">장식</label><select id="si-a-${i}" class="fld" data-shop="${i}" data-k="acc" ${it.id === 'basic' ? 'disabled' : ''}>${Object.keys(ACCS).map((k) => `<option value="${k}" ${it.acc === k ? 'selected' : ''}>${ACCS[k]}</option>`).join('')}</select>`}</td>
          <td><label class="sr" for="si-p-${i}">가격</label><input id="si-p-${i}" class="fld" type="number" min="0" data-shop="${i}" data-k="price" value="${it.price}" style="width:90px" ${it.id === 'basic' ? 'disabled' : ''}></td>
          <td><input type="checkbox" data-shop="${i}" data-k="isNew" ${it.isNew ? 'checked' : ''} aria-label="NEW 표시"></td>
          <td><label class="sr" for="si-d-${i}">설명</label><input id="si-d-${i}" class="fld" data-shop="${i}" data-k="desc" value="${esc(it.desc)}" style="min-width:160px"></td>
          <td>${it.id === 'basic' ? '' : `<button type="button" class="btn btn-sm btn-danger press" data-a="del-item" data-i="${i}">${ui.confirm === 'si:' + i ? '정말 삭제' : '삭제'}</button>`}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="ad-actions">
        <button type="button" class="btn btn-gold btn-sm press" data-a="add-item" data-id="acc">+ 장식 아이템</button>
        <button type="button" class="btn btn-gold btn-sm press" data-a="add-item" data-id="color">+ 몸 색 아이템</button>
      </div>
      <p class="ad-help">이미 산 사람이 있는 아이템을 지우면 그 사람의 착용이 기본으로 돌아가요.</p>`;
  }


  // ---------- 서버: 회원 · 댓글 · 제보 ----------
  async function api(action, payload) {
    const url = (D.settings.apiUrl || '').trim();
    if (!url) throw new Error('먼저 [디자인 · 코인 설정]에 Apps Script 주소를 넣어 주세요.');
    const who = srv.pw ? { adminPassword: srv.pw } : { token: srv.token };
    let res, j;
    try { res = await fetch(url, { method: 'POST', body: JSON.stringify(Object.assign({ action }, who, payload || {})) }); }
    catch (e) { throw new Error('서버에 닿지 못했어요. 인터넷 연결을 확인해 주세요.'); }
    try { j = await res.json(); }
    catch (e) { throw new Error(`서버가 잠시 응답하지 못했어요 (응답 ${res.status}). 조금 뒤에 다시 돼요.`); }
    if (!j.ok) throw new Error((j.error || '서버에서 문제가 생겼어요.') + (j.detail ? ` (${j.detail})` : ''));
    return j;
  }
  async function srvLoad() {
    srv.busy = true; srv.msg = ''; render();
    try {
      const c = await api('adminCheck');
      srv.ok = true; srv.github = c.github; srv.owner = !!c.owner; srv.name = c.adminName || '';
      srv.old = (Number(c.serverVersion) || 0) < NEED_SERVER;   // 서버(Apps Script) 코드가 이 화면보다 예전 버전인지
      if (srv.pw) { try { sessionStorage.setItem('webtoontree.adminpw', srv.pw); } catch (e) { /* 무시 */ } }
      srv.uid = c.adminUserId || '';
      if (!live.on && c.github) liveJoin();
      const [u, cm, rp] = await Promise.all([api('adminUsers'), api('adminComments'), api('adminReports')]);
      srv.users = u.users; srv.comments = cm.comments; srv.reports = rp.reports;
    } catch (e) {
      srv.ok = false; srv.msg = e.message;
    }
    srv.busy = false; render();
  }
  async function srvDo(action, payload, okMsg) {
    try { await api(action, payload); if (okMsg) toast(okMsg); await srvLoad(); }
    catch (e) { toast(e.message); }
  }
  function tabServer() {
    const url = (D.settings.apiUrl || '').trim();
    if (!url) return `<h2>회원 · 댓글 · 제보</h2><div class="ad-empty">서버(Apps Script)가 아직 연결되지 않았어요.<br>[디자인 · 코인 설정]의 "Apps Script 웹앱 주소"를 먼저 넣어 주세요.</div>`;
    const login = srv.ok ? `<section class="ad-card"><h3>${srv.owner ? '최종 관리자로 연결됨' : `관리자 ${esc(srv.name)} 님으로 연결됨`}</h3>
        <p class="ad-help">${srv.owner ? '회원 목록에서 다른 회원에게 관리자 권한을 주거나 뺄 수 있어요.' : '웹툰·트리 편집, 바로 저장, 댓글·제보 관리를 할 수 있어요. 관리자 지정과 비밀번호 초기화는 최종 관리자만 할 수 있어요.'}</p>
        <div class="ad-actions"><button type="button" class="btn btn-sm press" data-a="srv-connect" ${srv.busy ? 'disabled' : ''}>${srv.busy ? '불러오는 중…' : '새로고침'}</button></div>
      </section>` : `<section class="ad-card"><h3>관리자 연결</h3>
        <p class="ad-help">관리자 권한을 받은 회원은 사이트에서 로그인한 뒤 [내 정보 → 관리자 화면 열기]로 들어오면 돼요. 아래 칸은 최종 관리자용이에요.</p>
        <form id="srv-form" style="display:flex; gap:8px; flex-wrap:wrap" onsubmit="return false">
          <label for="srv-pw" class="sr">관리자 비밀번호</label>
          <input id="srv-pw" class="fld" type="password" style="flex:1 1 220px" value="${esc(srv.pw)}" autocomplete="off" placeholder="최종 관리자 비밀번호">
          <button type="button" class="btn btn-gold press" data-a="srv-connect" ${srv.busy ? 'disabled' : ''}>${srv.busy ? '불러오는 중…' : '연결'}</button>
        </form>
        ${srv.msg ? `<p class="err">${esc(srv.msg)}</p>` : ''}
        <span class="hint">비밀번호는 이 탭을 닫으면 잊어요.</span>
      </section>`;
    if (!srv.ok) return `<h2>회원 · 댓글 · 제보</h2>${login}`;
    const reports = srv.reports || [];
    const grouped = {};
    reports.forEach((r) => { (grouped[r.webtoonId] = grouped[r.webtoonId] || { title: r.title, n: 0, notes: [] }).n++; if (r.note) grouped[r.webtoonId].notes.push(r.note); });
    return `<h2>회원 · 댓글 · 제보</h2>${login}
      <section class="ad-card"><h3>새 화 제보 ${reports.length ? `(${reports.length})` : ''}</h3>
        ${Object.keys(grouped).length ? Object.keys(grouped).map((id) => `<div class="link-row" style="flex-wrap:wrap">
          <span style="flex:1 1 auto; font-size:14px"><b>${esc(grouped[id].title)}</b> · 제보 ${grouped[id].n}건${grouped[id].notes.length ? ` · ${esc(grouped[id].notes.slice(0, 2).join(' / '))}` : ''}</span>
          <button type="button" class="btn btn-sm press" data-a="edit-w" data-id="${id}">화수 고치러 가기</button>
          <button type="button" class="btn btn-sm press" data-a="srv-report-done" data-id="${id}">처리 완료</button></div>`).join('') : '<p class="ad-help">새 제보가 없어요.</p>'}
        <span class="hint">화수를 고친 뒤에는 data.json을 다시 올리거나 [데이터] 탭에서 바로 저장해 주세요.</span>
      </section>
      <section class="ad-card"><h3>최근 댓글 ${srv.comments ? `(${srv.comments.length})` : ''}</h3>
        <div class="table-box" style="max-height:420px; overflow:auto"><table class="ad-table">
          <thead><tr><th>웹툰</th><th>닉네임</th><th>내용</th><th>날짜</th><th></th></tr></thead>
          <tbody>${(srv.comments || []).map((c) => `<tr style="${c.hidden ? 'opacity:.5' : ''}">
            <td>${esc(c.title)}</td><td>${esc(c.nickname)}</td><td style="max-width:340px">${esc(c.text)}</td><td style="white-space:nowrap">${esc(String(c.createdAt).slice(0, 10))}</td>
            <td><button type="button" class="btn btn-sm ${c.hidden ? '' : 'btn-danger'} press" data-a="srv-hide" data-id="${esc(c.commentId)}" data-i="${c.hidden ? 0 : 1}">${c.hidden ? '다시 보이기' : '숨기기'}</button></td></tr>`).join('') || '<tr><td colspan="5" class="ad-help">댓글이 없어요</td></tr>'}</tbody>
        </table></div>
      </section>
      <section class="ad-card"><h3>회원 ${srv.users ? `(${srv.users.length}명)` : ''}</h3>
        <div class="table-box" style="max-height:420px; overflow:auto"><table class="ad-table">
          <thead><tr><th>아이디</th><th>닉네임</th><th>가입일</th><th>코인</th><th>상태</th><th>권한</th><th></th></tr></thead>
          <tbody>${(srv.users || []).map((u) => {
            const isAdmin = u.role === 'admin';
            const canTouch = srv.owner || !isAdmin;
            return `<tr>
            <td>${esc(u.userId)}</td><td>${esc(u.nickname)}</td><td>${esc(String(u.createdAt).slice(0, 10))}</td><td>${u.coins}</td>
            <td>${u.status === 'banned' ? '<span class="chip chip-hiatus">정지</span>' : '정상'}</td>
            <td>${isAdmin ? '<span class="chip chip-admin">관리자</span>' : '회원'}</td>
            <td style="white-space:nowrap">
              ${srv.owner ? `<button type="button" class="btn btn-sm ${isAdmin ? '' : 'btn-gold'} press" data-a="srv-role" data-id="${esc(u.userId)}" data-i="${isAdmin ? 0 : 1}" ${!isAdmin && u.status === 'banned' ? 'disabled' : ''}>${ui.confirm === 'role:' + u.userId ? (isAdmin ? '정말 해제' : '정말 지정') : (isAdmin ? '관리자 해제' : '관리자로 지정')}</button>` : ''}
              ${canTouch ? `<button type="button" class="btn btn-sm press" data-a="srv-nick" data-id="${esc(u.userId)}">닉네임 변경</button>` : ''}
              ${srv.owner ? `<button type="button" class="btn btn-sm press" data-a="srv-pw" data-id="${esc(u.userId)}">비밀번호 초기화</button>` : ''}
              ${canTouch ? `<button type="button" class="btn btn-sm ${u.status === 'banned' ? '' : 'btn-danger'} press" data-a="srv-ban" data-id="${esc(u.userId)}" data-i="${u.status === 'banned' ? 0 : 1}">${u.status === 'banned' ? '정지 풀기' : '이용 정지'}</button>` : ''}
            </td></tr>`;
          }).join('') || '<tr><td colspan="7" class="ad-help">아직 회원이 없어요</td></tr>'}</tbody>
        </table></div>
        <div id="srv-edit"></div>
        <span class="hint">관리자도 회원의 비밀번호는 볼 수 없어요. 잊어버린 회원은 ${srv.owner ? '새 비밀번호로 초기화해 주세요' : '최종 관리자에게 초기화를 부탁해 주세요'}.</span>
        ${srv.owner ? '<span class="hint">관리자로 지정한 회원은 자기 아이디로 사이트에 로그인한 뒤 [내 정보 → 관리자 화면 열기]로 들어와요. 관리자 비밀번호를 알려 줄 필요가 없어요. 이용 정지하면 관리자 권한도 같이 멈춰요.</span>' : ''}
      </section>`;
  }

  // ---------- 데이터 ----------
  function tabData() {
    const list = issues();
    const hasApi = !!(D.settings.apiUrl || '').trim();
    const fileWay = `<ol>
          <li>[data.json 내보내기]를 눌러 파일을 받아요.</li>
          <li>GitHub의 <a href="https://github.com/hy3ongh0/webtoontree/tree/main/data" target="_blank" rel="noopener">webtoontree 저장소 → data 폴더</a>로 가요.</li>
          <li>오른쪽 위 Add file → Upload files를 누르고 받은 data.json을 끌어다 놓아요.</li>
          <li>아래쪽 Commit changes를 누르면 1~2분 뒤 사이트에 반영돼요.</li>
        </ol>
        <div class="ad-actions">
          <button type="button" class="btn ${hasApi ? '' : 'btn-gold '}press" data-a="export">data.json 내보내기</button>
          <a class="btn press" href="index.html?preview=1" target="_blank" rel="noopener">올리기 전에 미리보기</a>
        </div>`;
    return `<h2>저장 · 백업</h2>
      <p class="ad-help">${isDirty() ? '<b>아직 사이트에 저장하지 않은 변경이 있어요.</b> ' : '지금 내용은 사이트와 같아요. '}고친 내용은 이 브라우저에 초안으로 자동으로 남아 있어요.</p>
      ${hasApi ? `<section class="ad-card"><h3>사이트에 바로 저장</h3>
        <p class="ad-help">버튼 하나로 사이트에 반영돼요(1~2분). 맨 위 오른쪽 [사이트에 바로 저장] 버튼과 같아요.</p>
        ${live.on ? '<p class="ad-help"><b>함께 편집 중이에요.</b> 관리자들이 고친 내용은 몇 초 안에 서로의 화면에 반영되고, 저장하면 모두가 함께 고친 내용이 올라가요.</p>'
          : '<p class="ad-help">다른 관리자가 그사이 먼저 저장했으면, 덮어쓰기 전에 알려 줘요. 시작하기 전에 [최신 내용 불러오기]를 누르면 더 안전해요.</p>'}
        ${srv.conflict ? `<div class="box-warn-ad" role="alert"><b>다른 관리자가 그사이 사이트에 먼저 저장했어요.</b><br>지금 내 내용으로 저장하면 그 사람이 고친 내용이 사라져요.
          <div class="ad-actions">
            <button type="button" class="btn btn-sm press" data-a="export">내 작업 파일로 백업</button>
            <button type="button" class="btn btn-gold btn-sm press" data-a="srv-latest">최신 내용 불러오기 (내 변경은 버려요)</button>
            <button type="button" class="btn btn-danger btn-sm press" data-a="srv-force">${ui.confirm === 'srv-force' ? '한 번 더 누르면 덮어써요' : '그래도 내 내용으로 덮어쓰기'}</button>
          </div></div>` : ''}
        <div class="ad-actions"><button type="button" class="btn btn-gold press" data-a="srv-save" ${srv.ok ? '' : 'disabled'}>${srv.ok ? '지금 내용으로 사이트에 바로 저장' : '먼저 [회원 · 댓글 · 제보]에서 관리자로 연결해 주세요'}</button>
          ${srv.ok && !live.on ? `<button type="button" class="btn press" data-a="srv-latest">${ui.confirm === 'srv-latest' ? '한 번 더 누르면 내 변경을 버리고 불러와요' : '최신 내용 불러오기'}</button>` : ''}</div>
        ${srv.ok && !srv.github ? '<p class="warn">서버에 GitHub 토큰(GITHUB_TOKEN)이 없어서 바로 저장은 아직 안 돼요. 설치방법.md의 6단계를 봐 주세요. 그전까지는 아래 파일로 올리는 방법을 써 주세요.</p>' : ''}
      </section>
      <section class="ad-card"><details class="ad-more"><summary>서버 없이 파일로 올리는 방법 (바로 저장이 안 될 때)</summary>${fileWay}</details></section>`
      : `<section class="ad-card"><h3>사이트에 반영하는 방법</h3>${fileWay}
        <p class="ad-help">[디자인 · 코인 설정]에 Apps Script 주소를 넣고 관리자로 연결하면, 파일을 올리지 않고 버튼 하나로 바로 저장할 수 있어요.</p></section>`}
      <section class="ad-card"><h3>확인할 것 ${list.length ? `(${list.length})` : ''}</h3>
        ${list.length ? `<ul class="ad-issues">${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="ad-help">문제없어요.</p>'}
      </section>
      <section class="ad-card"><h3>불러오기 · 되돌리기</h3>
        <div class="field"><label for="import-file">data.json 불러오기 (백업 복원)</label><input id="import-file" type="file" accept="application/json,.json"></div>
        <button type="button" class="btn btn-danger press" data-a="revert">${ui.confirm === 'revert' ? (live.on ? '한 번 더 누르면 함께 고친 내용이 모두에게서 사라져요' : '한 번 더 누르면 지금 작업이 사라지고 사이트 데이터로 돌아가요') : (live.on ? '함께 고친 내용 모두 되돌리기 (사이트 데이터로)' : '사이트에 올라가 있는 데이터로 되돌리기')}</button>
        <p class="ad-help">고친 내용은 이 브라우저에 초안으로 자동 저장돼요. 다른 컴퓨터에서 이어서 하려면 내보낸 파일을 불러오면 돼요.</p>
      </section>`;
  }

  function exportJSON() {
    const list = issues().filter((x) => !x.startsWith('전체 지도'));
    if (list.length) toast(`확인할 것이 ${list.length}개 있어요. [데이터] 탭을 봐 주세요`);
    const blob = new Blob([JSON.stringify(D, null, 2) + '\n'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- 이벤트 ----------
  function onClick(e) {
    const t = e.target.closest('[data-a]');
    if (!t) return;
    const a = t.dataset.a, id = t.dataset.id, i = Number(t.dataset.i);
    const confirmOnce = (key) => { if (ui.confirm === key) { ui.confirm = null; return true; } ui.confirm = key; render(); return false; };
    switch (a) {
      case 'tab': ui.tab = id; ui.confirm = null; ui.branchFor = null; ui.from = null; ui.mfrom = null; render(); break;
      case 'export': exportJSON(); break;
      case 'pick-w': ui.w = id; ui.confirm = null; render(); break;
      case 'wview': ui.wview = id; try { localStorage.setItem('webtoontree.adminWView', id); } catch (er) { /* 없음 */ } render(); break;
      case 'new-w': {
        const gid = ui.fg !== 'all' && ui.fg !== 'none' ? ui.fg : null;
        const w = blankWebtoon('새 웹툰', gid);
        D.webtoons.unshift(w);
        ui.w = w.id; ui.q = '';
        saveDraft(); render();
        setTimeout(() => { const el = document.getElementById('f-title'); if (el) { el.focus(); el.select(); } }, 30);
        break;
      }
      case 'del-w': if (confirmOnce('w:' + id)) { const t2 = toon(id).title; deleteWebtoon(id); ui.w = null; saveDraft(); toast(`${t2}을(를) 삭제했어요`); render(); } break;
      case 'w-to-tree': {
        const w = toon(id); const gid = w.genres[0]; const T = D.trees[gid];
        if (!Object.keys(T.nodes).length) { T.nodes[id] = [130, 280]; T.start = id; saveDraft(); ui.tab = 'tree'; ui.tg = gid; ui.tsel = id; render(); break; }
        ui.tab = 'tree'; ui.tg = gid; ui.mode = 'branch'; ui.branchFor = null; ui.pendingChild = id;
        toast('어느 웹툰 뒤에 이을지 트리에서 눌러 주세요');
        render(); break;
      }
      case 'w-to-map': placeOnMap(id); saveDraft(); toast('전체 지도에 넣었어요'); render(); break;
      case 'edit-w': ui.tab = 'webtoons'; ui.w = id; ui.q = ''; ui.fg = 'all'; render(); break;
      case 'pick-g': ui.g = id; ui.newGenre = false; ui.confirm = null; render(); break;
      case 'new-g': ui.newGenre = true; ui.g = null; render(); setTimeout(() => document.getElementById('ng-id').focus(), 30); break;
      case 'cancel-g': ui.newGenre = false; render(); break;
      case 'create-g': {
        const gid = document.getElementById('ng-id').value.trim();
        const name = document.getElementById('ng-name').value.trim();
        const err = document.getElementById('ng-err');
        const fail = (m) => { err.hidden = false; err.textContent = m; };
        if (!/^[a-z][a-z0-9]{1,19}$/.test(gid)) return fail('ID는 영어 소문자로 시작하고 영어 소문자·숫자 2~20자로 적어 주세요.');
        if (genre(gid) || gid === 'map') return fail('이미 있는 ID예요.');
        if (!name) return fail('장르 이름을 적어 주세요.');
        D.genres.push({ id: gid, name, constellation: '', color: '#E8C66A', desc: '', shape: clone(SHAPES.star.shape) });
        D.trees[gid] = { start: null, nodes: {}, links: [] };
        D.map.regions.push({ genre: gid, x: Math.round(D.map.width / 2), y: Math.round(D.map.height / 2) });
        ui.newGenre = false; ui.g = gid;
        saveDraft(); toast(`${name} 장르를 만들었어요`); render(); break;
      }
      case 'g-up': case 'g-down': {
        const j = a === 'g-up' ? i - 1 : i + 1;
        if (j < 0 || j >= D.genres.length) break;
        [D.genres[i], D.genres[j]] = [D.genres[j], D.genres[i]];
        saveDraft(); render(); break;
      }
      case 'del-g': if (confirmOnce('g:' + id)) {
        D.genres = D.genres.filter((g) => g.id !== id);
        delete D.trees[id];
        D.map.regions = D.map.regions.filter((r) => r.genre !== id);
        D.webtoons.forEach((w) => { w.genres = w.genres.filter((x) => x !== id); });
        ui.g = null; saveDraft(); toast('장르를 삭제했어요'); render();
      } break;
      case 'go-tree': ui.tab = 'tree'; ui.tg = id; ui.tsel = null; render(); break;
      case 'sub-add': {
        const g = genre(ui.g); g.subs = g.subs || [];
        const palette = ['#9B7BFF', '#5BB8FF', '#4FD1A5', '#FFB347', '#FF7EB6', '#E8C66A', '#FF6B6B', '#7FD3FF'];
        g.subs.push({ id: newSubId(g), name: `세부 장르 ${g.subs.length + 1}`, color: palette[g.subs.length % palette.length] });
        saveDraft(); render(); break;
      }
      case 'sub-preset': {
        const g = genre(ui.g); g.subs = g.subs || [];
        [['회귀·환생', '#9B7BFF'], ['헌터·게이트', '#FF6B6B'], ['이세계', '#4FD1A5'], ['아카데미', '#5BB8FF'], ['게임 판타지', '#FFB347'], ['로맨스 판타지', '#FF7EB6']]
          .forEach(([name, color]) => g.subs.push({ id: newSubId(g), name, color }));
        saveDraft(); toast('판타지 세부 장르 6개를 넣었어요. 이름과 색은 바꿀 수 있어요'); render(); break;
      }
      case 'sub-up': case 'sub-down': {
        const arr = genre(ui.g).subs; const i = arr.findIndex((x) => x.id === id); const j = a === 'sub-up' ? i - 1 : i + 1;
        if (i >= 0 && j >= 0 && j < arr.length) { [arr[i], arr[j]] = [arr[j], arr[i]]; saveDraft(); render(); }
        break;
      }
      case 'sub-del': if (confirmOnce('sub:' + id)) {
        const g = genre(ui.g); g.subs = g.subs.filter((x) => x.id !== id);
        D.webtoons.forEach((w) => { if (w.subs) { w.subs = w.subs.filter((x) => x !== id); if (!w.subs.length) delete w.subs; } });
        saveDraft(); toast('세부 장르를 지웠어요 (웹툰은 그대로예요)'); render();
      } break;
      case 'mode': ui.mode = id; ui.from = null; ui.branchFor = null; if (id !== 'branch') ui.pendingChild = null; render(); break;
      case 'auto': autoLayout(); toast('자동으로 정렬했어요'); break;
      case 'natural': { const T = D.trees[ui.tg]; naturalSpacing(T); saveDraft(); toast('연결선 길이와 간격을 자연스럽게 폈어요'); render(); break; }
      case 'first': case 'first-new': {
        const T = D.trees[ui.tg];
        let cid = id;
        if (a === 'first-new') { const title = document.getElementById('b-new').value.trim(); if (!title) return; const w = blankWebtoon(title, ui.tg); D.webtoons.unshift(w); cid = w.id; }
        T.nodes[cid] = [130, 280]; T.start = cid; ui.tsel = cid; ui.bq = '';
        saveDraft(); render(); break;
      }
      case 'branch': addBranch(ui.branchFor, id); break;
      case 'branch-new': {
        const title = document.getElementById('b-new').value.trim();
        if (!title) return;
        const w = blankWebtoon(title, ui.tg);
        D.webtoons.unshift(w);
        addBranch(ui.branchFor, w.id);
        break;
      }
      case 'branch-from': ui.branchFor = id; ui.bq = ''; render(); break;
      case 'branch-cancel': ui.branchFor = null; ui.mode = 'select'; render(); break;
      case 'set-start': case 'start-first': { const T = D.trees[ui.tg]; const all = WT.starts(T).filter((x) => x !== id); T.start = id; T.starts = all; saveDraft(); render(); break; }
      case 'start-add': { const T = D.trees[ui.tg]; if (!T.start) T.start = id; else { T.starts = (T.starts || []).filter((x) => x !== id); T.starts.push(id); } saveDraft(); render(); break; }
      case 'start-del': { const T = D.trees[ui.tg]; const all = WT.starts(T).filter((x) => x !== id); T.start = all.shift() || null; T.starts = all; saveDraft(); render(); break; }
      case 'del-link': D.trees[ui.tg].links.splice(i, 1); saveDraft(); render(); break;
      case 'del-node': if (confirmOnce('tn:' + id)) { removeFromTree(ui.tg, id); ui.tsel = null; saveDraft(); render(); } break;
      case 'mmode': ui.mmode = id; ui.mfrom = null; render(); break;
      case 'map-add': placeOnMap(id); ui.msel = id; saveDraft(); render(); break;
      case 'map-add-all': D.webtoons.filter((w) => !D.map.pins[w.id]).forEach((w) => placeOnMap(w.id)); saveDraft(); toast('지도에 모두 넣었어요'); render(); break;
      case 'map-unpin-all': if (confirmOnce('unpin')) { D.map.pins = {}; saveDraft(); toast('모두 자동 배치로 돌렸어요'); render(); } break;
      case 'map-remove': delete D.map.pins[id]; saveDraft(); toast('자동 자리로 돌렸어요'); render(); break;
      case 'mdel-link': D.map.links.splice(i, 1); saveDraft(); render(); break;
      case 'map-import': {
        let added = 0;
        Object.values(D.trees).forEach((T) => T.links.forEach((l) => {
          if (!D.map.pins[l.from] || !D.map.pins[l.to]) return;
          if (D.map.links.some(([x, y]) => (x === l.from && y === l.to) || (x === l.to && y === l.from))) return;
          D.map.links.push([l.from, l.to]); added++;
        }));
        saveDraft(); toast(added ? `연결 ${added}개를 가져왔어요` : '새로 가져올 연결이 없어요'); render(); break;
      }
      case 'add-item': {
        const n = D.shop.length + 1;
        const base = { id: 'item' + Date.now().toString(36), kind: id, name: id === 'color' ? '새 몸 색' : '새 장식', desc: '', price: 100, body: '#CDEBFF', feet: '#7FB8F0', acc: id === 'color' ? 'none' : 'crown', isNew: true };
        if (id === 'color') { base.body = '#FFE29A'; base.feet = '#E8B730'; }
        D.shop.push(base); saveDraft(); toast(`아이템 ${n}번째를 추가했어요`); render(); break;
      }
      case 'del-item': if (confirmOnce('si:' + i)) { D.shop.splice(i, 1); saveDraft(); render(); } break;
      case 'revert': if (confirmOnce('revert')) {
        D = JSON.parse(siteJSON); ensure(); setBase(siteHash); srv.conflict = false;
        try { localStorage.removeItem(DRAFT); } catch (err) { /* 무시 */ }
        ui.w = null; ui.g = null; ui.tsel = null; ui.msel = null;
        toast('사이트 데이터로 되돌렸어요'); render();
      } break;
      case 'recolor-all': {
        if (ui.recolor) break;
        const list = D.webtoons.filter((x) => x.cover);
        let done = 0, fail = 0;
        ui.recolor = `0/${list.length}`; render();
        (async () => {
          for (const x of list) {
            const c = await WT.color.extract(x.cover);
            if (c) x.color = c; else fail++;
            done++; ui.recolor = `${done}/${list.length}`;
            const b = root().querySelector('[data-a="recolor-all"]'); if (b) b.textContent = `표지 색 뽑는 중… ${ui.recolor}`;
          }
          ui.recolor = null; saveDraft(); render();
          toast(fail ? `${list.length - fail}개 색을 다시 뽑았어요. ${fail}개는 표지를 읽지 못했어요` : `${list.length}개 웹툰 색을 다시 뽑았어요. 바로 저장하면 사이트에 반영돼요`);
        })();
        break;
      }
      case 'au-del': { const w = toon(id); const l = WT.authorsOf(w).map((x) => Object.assign({}, x)); l.splice(i, 1); setAuthors(w, l); break; }
      case 'au-role': { const w = toon(id); const l = WT.authorsOf(w).map((x) => Object.assign({ roles: [] }, x, { roles: (x.roles || []).slice() })); const r = t.dataset.r; const rs = l[i].roles; const k = rs.indexOf(r); if (k >= 0) rs.splice(k, 1); else rs.push(r); setAuthors(w, l); break; }
      case 'lk-find': linkFind(toon(id)); break;
      case 'lk-pick': linkPick(toon(id), i); break;
      case 'lk-refresh': linkRefresh(toon(id)); break;
      case 'lk-change': ui.link = { id, relink: true, q: toon(id).title }; render(); break;
      case 'lk-cancel': ui.link = null; render(); break;
      case 'lk-pf': ui.linkPf = { id, pf: t.dataset.pf }; if (ui.link && ui.link.id === id) ui.link = { id, relink: !!ui.link.relink }; render(); break;
      case 'live-retry': live.tries = 0; live.joining = false; clearTimeout(live.retry); liveJoin(); break;
      case 'lk-unlink': if (confirmOnce('unlink:' + id)) { const w = toon(id); delete w.source; delete w.autoAt; w.autoCount = false; ui.link = null; saveDraft(); toast('연결을 끊었어요. 이제 자동으로 바뀌지 않아요'); render(); } break;
      case 'lk-official': { const w = toon(id); w.url = w.source; saveDraft(); toast('보러 가기 링크를 공식 페이지로 바꿨어요'); render(); break; }
      case 'lk-official-all': if (confirmOnce('official-all')) { const l = notOfficial(); l.forEach((w) => { w.url = w.source; }); saveDraft(); toast(`${l.length}개 웹툰의 보러 가기 링크를 공식 페이지로 바꿨어요. 확인한 뒤 저장해 주세요`); render(); } break;
      case 'lk-all': if (!ui.refreshing) linkRefreshAll(); break;
      case 'w-color': { const w = toon(id); w.color = ''; autoColor(w, true); break; }
      case 'srv-logout': srv.pw = ''; srv.token = ''; srv.ok = false; srv.owner = false; srv.users = srv.comments = srv.reports = null; try { sessionStorage.removeItem('webtoontree.adminpw'); } catch (e) { /* 무시 */ } toast('관리자에서 나왔어요'); render(); break;
      case 'srv-connect': { const f = document.getElementById('srv-pw'); if (f) srv.pw = f.value; srvLoad(); break; }
      case 'srv-role': {
        if (!confirmOnce('role:' + id)) break;
        srvDo('adminSetRole', { userId: id, role: i === 1 ? 'admin' : '' }, i === 1 ? `${id} 님을 관리자로 지정했어요` : `${id} 님의 관리자 권한을 뺐어요`);
        break;
      }
      case 'srv-latest': {
        if (isDirty() && !srv.conflict && !confirmOnce('srv-latest')) { toast('아직 안 올린 변경이 있어요. 한 번 더 누르면 버리고 최신 내용을 불러와요'); break; }
        t.disabled = true;
        api('adminLatest').then((r) => {
          D = r.data; ensure(); siteJSON = JSON.stringify(D); setBase(r.hash); srv.conflict = false; ui.confirm = null;
          try { localStorage.removeItem(DRAFT); } catch (e) { /* 무시 */ }
          ui.w = null; ui.g = null; ui.tsel = null; ui.msel = null;
          toast('최신 내용을 불러왔어요'); render();
        }).catch((e) => { toast(e.message); render(); });
        break;
      }
      case 'srv-force': if (confirmOnce('srv-force')) saveToServer(true); break;
      case 'srv-report-done': srvDo('adminReportDone', { webtoonId: id }, '처리했어요'); break;
      case 'srv-hide': srvDo('adminHideComment', { commentId: id, hidden: i === 1 }, i === 1 ? '댓글을 숨겼어요' : '댓글을 다시 보이게 했어요'); break;
      case 'srv-ban': srvDo('adminSetStatus', { userId: id, status: i === 1 ? 'banned' : 'active' }, i === 1 ? '이용을 정지했어요' : '정지를 풀었어요'); break;
      case 'srv-nick': case 'srv-pw': {
        const box = document.getElementById('srv-edit');
        const isNick = a === 'srv-nick';
        box.innerHTML = `<div class="ad-card" style="margin-top:12px"><h3>${esc(id)} ${isNick ? '닉네임 변경' : '비밀번호 초기화'}</h3>
          <div style="display:flex; gap:8px; flex-wrap:wrap"><label for="srv-val" class="sr">${isNick ? '새 닉네임' : '새 비밀번호'}</label>
          <input id="srv-val" class="fld" style="flex:1 1 200px" ${isNick ? 'maxlength="10" placeholder="새 닉네임"' : 'placeholder="새 비밀번호 (8자 이상)"'}>
          <button type="button" class="btn btn-gold press" data-a="${isNick ? 'srv-nick-save' : 'srv-pw-save'}" data-id="${esc(id)}">저장</button></div>
          ${isNick ? '' : '<span class="hint">회원에게 새 비밀번호를 알려 주고, 로그인한 뒤 바꾸도록 안내해 주세요.</span>'}</div>`;
        document.getElementById('srv-val').focus();
        break;
      }
      case 'srv-nick-save': srvDo('adminSetNick', { userId: id, nickname: document.getElementById('srv-val').value.trim() }, '닉네임을 바꿨어요'); break;
      case 'srv-pw-save': srvDo('adminResetPassword', { userId: id, newPassword: document.getElementById('srv-val').value }, '비밀번호를 초기화했어요'); break;
      case 'srv-save': {
        const list = issues().filter((x) => !x.startsWith('전체 지도'));
        if (list.length && ui.confirm !== 'srv-save') { ui.confirm = 'srv-save'; toast(`확인할 것이 ${list.length}개 있어요. 그래도 저장하려면 한 번 더 눌러 주세요`); break; }
        ui.confirm = null;
        t.disabled = true; t.textContent = '저장하는 중…';
        saveToServer(false);
        break;
      }
      default: break;
    }
  }

  // =================== 함께 편집 (실시간) ===================
  // 데이터를 작은 조각(웹툰 하나, 트리 위치 하나, 설정 하나…)으로 나눠 바뀐 조각만 주고받아요.
  // 같은 조각을 동시에 고치면 나중에 고친 사람 것이 남아요.
  let composing = false;   // 한국어 입력 조합 중
  const live = { on: false, ver: 0, base: 0, shadow: null, busy: false, timer: null, soon: null, who: [], err: '', queued: [], drag: false, lastNote: 0 };
  function units(d) {
    const u = {};
    const put = (k, v) => { u[k] = JSON.stringify(v === undefined ? null : v); };
    (d.webtoons || []).forEach((w) => put('w:' + w.id, w));
    put('o:w', (d.webtoons || []).map((w) => w.id));
    (d.genres || []).forEach((g) => put('g:' + g.id, g));
    put('o:g', (d.genres || []).map((g) => g.id));
    Object.keys(d.trees || {}).forEach((gid) => {
      const T = d.trees[gid];
      put('ts:' + gid, T.start || null);
      put('tss:' + gid, T.starts || []);
      put('tl:' + gid, T.links || []);
      Object.keys(T.nodes || {}).forEach((id) => put('tn:' + gid + ':' + id, T.nodes[id]));
    });
    const M = d.map || {};
    put('m:size', [M.width || 2400, M.height || 1400]);
    put('m:regions', M.regions || []);
    put('m:links', M.links || []);
    Object.keys(M.pins || {}).forEach((id) => put('mp:' + id, M.pins[id]));
    Object.keys(d.settings || {}).forEach((k) => put('s:' + k, d.settings[k]));
    Object.keys(d.authorInfo || {}).forEach((k) => put('ai:' + k, d.authorInfo[k]));   // 작가 정보는 한 명씩 (한 덩어리면 너무 커서 서버가 못 받아요)
    Object.keys(d).forEach((k) => { if (!['webtoons', 'genres', 'trees', 'map', 'settings', 'meta', 'authorInfo'].includes(k)) put('x:' + k, d[k]); });
    return u;
  }
  function fromUnits(u, meta) {
    const get = (k) => JSON.parse(u[k]);
    const keyed = (prefix, orderKey) => {
      const items = {};
      Object.keys(u).forEach((k) => { if (k.startsWith(prefix)) items[k.slice(prefix.length)] = get(k); });
      const order = u[orderKey] ? get(orderKey) : [];
      const out = order.filter((id) => items[id]).map((id) => items[id]);
      Object.keys(items).sort().forEach((id) => { if (!order.includes(id)) out.push(items[id]); });
      return out;
    };
    const d = { webtoons: keyed('w:', 'o:w'), genres: keyed('g:', 'o:g'), trees: {}, map: {}, settings: {}, meta: meta || {}, authorInfo: {} };
    Object.keys(u).forEach((k) => {
      if (k.startsWith('ts:')) { const gid = k.slice(3); d.trees[gid] = d.trees[gid] || { start: null, nodes: {}, links: [] }; d.trees[gid].start = get(k); }
      if (k.startsWith('tss:')) { const gid = k.slice(4); d.trees[gid] = d.trees[gid] || { start: null, nodes: {}, links: [] }; d.trees[gid].starts = get(k) || []; }
    });
    Object.keys(u).forEach((k) => {
      if (k.startsWith('tl:')) { const gid = k.slice(3); d.trees[gid] = d.trees[gid] || { start: null, nodes: {}, links: [] }; d.trees[gid].links = get(k); }
      else if (k.startsWith('tn:')) { const rest = k.slice(3); const i = rest.indexOf(':'); const gid = rest.slice(0, i); d.trees[gid] = d.trees[gid] || { start: null, nodes: {}, links: [] }; d.trees[gid].nodes[rest.slice(i + 1)] = get(k); }
      else if (k.startsWith('mp:')) { d.map.pins = d.map.pins || {}; d.map.pins[k.slice(3)] = get(k); }
      else if (k.startsWith('s:')) d.settings[k.slice(2)] = get(k);
      else if (k.startsWith('ai:')) d.authorInfo[k.slice(3)] = get(k);
      else if (k.startsWith('x:') && k !== 'x:authorInfo') d[k.slice(2)] = get(k);
    });
    const size = u['m:size'] ? get('m:size') : [2400, 1400];
    d.map.width = size[0]; d.map.height = size[1];
    d.map.regions = u['m:regions'] ? get('m:regions') : [];
    d.map.links = u['m:links'] ? get('m:links') : [];
    d.map.pins = d.map.pins || {};
    return d;
  }
  function diffUnits(a, b) {
    const ops = [];
    Object.keys(b).forEach((k) => { if (a[k] !== b[k]) ops.push({ k, v: b[k] }); });
    Object.keys(a).forEach((k) => { if (!(k in b)) ops.push({ k, v: null }); });
    return ops;
  }
  function applyUnits(u, ops) { ops.forEach((o) => { if (o.v === null) delete u[o.k]; else u[o.k] = o.v; }); return u; }
  // 예전 방식(작가 정보 한 덩어리)으로 올라온 변경은 작가 한 명씩으로 풀어서 받아요
  function modernOps(ops) {
    const out = [];
    (ops || []).forEach((o) => {
      if (o.k !== 'x:authorInfo') { out.push(o); return; }
      let all = null;
      try { all = o.v ? JSON.parse(o.v) : null; } catch (e) { all = null; }
      Object.keys(all || {}).forEach((k) => out.push({ k: 'ai:' + k, v: JSON.stringify(all[k]) }));
    });
    return out;
  }
  const modernBatches = (bts) => (bts || []).map((bt) => Object.assign({}, bt, { ops: modernOps(bt.ops) }));
  // 한 번에 보낼 만큼만 잘라요 (서버의 시트 한 칸에 들어가는 크기까지)
  const SEND_MAX = 38000;
  function sendable(ops) {
    const out = [];
    let size = 2;
    for (let i = 0; i < ops.length; i++) {
      const n = JSON.stringify(ops[i]).length + 1;
      if (out.length && size + n > SEND_MAX) break;
      out.push(ops[i]); size += n;
    }
    return out;
  }

  /** 함께 편집 시작: 마지막으로 올린 데이터 + 그 뒤 모두가 고친 내용, 그 위에 이 기기에서 하던 작업 */
  // 연결에 실패하면 저절로 다시 시도해요 (3초 → 6초 → … 최대 30초 간격). 전에는 한 번 실패하면 새로고침할 때까지 끊긴 채였어요
  function liveRetryLater(msg) {
    live.joining = false; live.err = msg; live.tries = (live.tries || 0) + 1;
    liveBadge();
    clearTimeout(live.retry);
    live.retry = setTimeout(() => liveJoin(), Math.min(30000, 3000 * Math.pow(2, live.tries - 1)));
  }
  async function liveJoin() {
    if (live.on || live.joining || !srv.ok) return;
    live.joining = true; clearTimeout(live.retry);
    let r;
    try { r = await api('liveJoin', { here: liveHere(), proto: 2 }); } catch (e) { liveRetryLater(e.message); return; }
    if (!r || !r.base || !Array.isArray(r.base.webtoons)) { liveRetryLater('서버에서 사이트 데이터를 받지 못했어요.'); return; }
    const first = !live.joined;
    const before = JSON.parse(siteJSON);               // 이 화면을 열 때 받은 사이트 데이터
    let savedBase = '';
    try { savedBase = localStorage.getItem(BASE) || ''; } catch (e) { savedBase = ''; }
    const mineOk = !savedBase || savedBase === siteHash; // 예전 사이트 기준으로 만든 초안은 섞지 않아요
    const mine = mineOk ? diffUnits(units(before), units(D)) : [];
    if (!mineOk && isDirty()) {
      try { localStorage.setItem('webtoontree.admin.oldDraft', JSON.stringify(D)); } catch (e) { /* 무시 */ }
      toast('이 기기에 예전 초안이 있었는데 사이트가 그 뒤로 바뀌어서 함께 편집에 섞지 않았어요');
    }
    const meta = D.meta;
    D = r.base; ensure();
    siteJSON = JSON.stringify(D);
    setBase(r.baseHash);
    let u = units(D);
    modernBatches(r.batches).forEach((bt) => applyUnits(u, bt.ops));
    if (r.lost) toast('저장 전 변경 기록 일부를 읽지 못해서, 마지막으로 저장된 내용부터 다시 시작해요');
    live.shadow = Object.assign({}, u);
    applyUnits(u, mine);
    D = fromUnits(u, meta); ensure();
    const again = live.tries > 0;
    live.on = true; live.joining = false; live.joined = true; live.tries = 0; live.ver = r.version; live.base = r.baseVersion; live.who = r.who || []; live.err = '';
    try { localStorage.setItem(DRAFT, JSON.stringify(D)); } catch (e) { /* 무시 */ }
    if (mine.length) toast(`함께 편집에 연결됐어요. 이 기기에서 하던 변경 ${mine.length}곳을 같이 올려요`);
    else if (first || again) toast(again ? '함께 편집에 다시 연결됐어요' : '함께 편집에 연결됐어요. 다른 관리자가 고친 내용이 몇 초 안에 보여요');
    liveRender();
    liveLoop();
  }
  window.addEventListener('online', () => { if (!live.on && live.err) { live.tries = 0; clearTimeout(live.retry); liveJoin(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !live.on && live.err) { clearTimeout(live.retry); liveJoin(); } });
  function liveHere() { return { tab: ui.tab, w: ui.tab === 'webtoons' ? (ui.w || '') : '', g: ui.tab === 'tree' ? (ui.tg || '') : ui.tab === 'genres' ? (ui.g || '') : '' }; }
  function liveLoop() {
    clearTimeout(live.timer);
    live.timer = setTimeout(async () => { await liveTick(); liveLoop(); }, document.hidden ? 8000 : 2000);
  }
  function livePushSoon() { clearTimeout(live.soon); live.soon = setTimeout(() => liveTick(), 500); }
  async function liveFlush() { for (let i = 0; i < 3; i++) { await liveTick(); if (!diffUnits(live.shadow, units(D)).length) break; } }
  async function liveTick() {
    if (!live.on) return;
    if (live.busy) { await new Promise((ok) => setTimeout(ok, 300)); if (live.busy) return; }
    live.busy = true;
    try {
      const all = diffUnits(live.shadow, units(D));
      const ops = sendable(all);   // 많이 고쳤으면 나눠서 올려요
      const r = await api('liveSync', { since: live.ver, ops: ops.length ? ops : undefined, here: liveHere(), proto: 2 });
      if (r.rejoin) { live.on = false; live.busy = false; await liveJoin(); return; }
      if (ops.length) applyUnits(live.shadow, ops);
      const remote = modernBatches((r.batches || []).filter((bt) => bt.ver !== r.myVer));
      if (remote.length) liveReceive(remote);
      live.ver = r.version;
      live.who = r.who || [];
      if (r.base && r.base.version !== live.base) {
        // 다른 관리자가 사이트에 올렸어요
        live.base = r.base.version;
        if (r.base.hash) setBase(r.base.hash);
        if (live.base === live.ver && !diffUnits(live.shadow, units(D)).length) siteJSON = JSON.stringify(D);
        setState();
      }
      live.err = '';
      if (all.length > ops.length) setTimeout(() => liveTick(), 150);   // 남은 조각 이어서 올리기
    } catch (e) {
      live.err = e.message;
    }
    live.busy = false;
    liveBadge();
  }
  /** 다른 관리자 변경 받기: 내가 아직 안 보낸 조각은 내 것을 지켜요 */
  function liveReceive(batches) {
    const mineNow = units(D);
    const pending = new Set(diffUnits(live.shadow, mineNow).map((o) => o.k));
    let changed = 0;
    const names = new Set();
    batches.forEach((bt) => {
      applyUnits(live.shadow, bt.ops);
      bt.ops.forEach((o) => { if (!pending.has(o.k)) { if (o.v === null) delete mineNow[o.k]; else mineNow[o.k] = o.v; changed++; } });
      names.add(bt.name);
    });
    if (!changed) return;
    D = fromUnits(mineNow, D.meta); ensure();
    try { localStorage.setItem(DRAFT, JSON.stringify(D)); } catch (e) { /* 무시 */ }
    if (ui.w && !toon(ui.w)) ui.w = null;
    if (ui.g && !genre(ui.g)) ui.g = null;
    if (Date.now() - live.lastNote > 6000) { live.lastNote = Date.now(); toast(`${Array.from(names).join(', ')}님이 고친 내용이 반영됐어요`); }
    liveRender();
  }
  /** 화면 다시 그리기: 쓰던 칸과 커서, 끌던 것은 지켜요 */
  function liveRender() {
    if (live.drag) { live.queued.push(1); return; }
    const a = document.activeElement;
    let sel = null, start = null, end = null;
    if (a && a !== document.body && root().contains(a)) {
      sel = a.id ? '#' + CSS.escape(a.id) : ['data-wf', 'data-gf', 'data-subf', 'data-sid', 'data-sf', 'data-why', 'data-shop', 'data-k', 'data-wg', 'data-ws', 'data-a', 'data-id'].filter((x) => a.hasAttribute(x)).map((x) => `[${x}="${CSS.escape(a.getAttribute(x))}"]`).join('');
      try { start = a.selectionStart; end = a.selectionEnd; } catch (e) { start = null; }
    }
    render();
    if (sel) {
      const n = root().querySelector(sel);
      if (n && n !== document.activeElement) { n.focus({ preventScroll: true }); try { if (start !== null) n.setSelectionRange(start, end); } catch (e) { /* 무시 */ } }
    }
  }
  function liveBadge() {
    const el = document.getElementById('ad-live');
    if (!el) return;
    if (!live.on) {
      // 왜 끊겼는지 글로 보여 주고(패드에서는 마우스를 올릴 수 없어요), 저절로 다시 연결해요
      el.innerHTML = live.err ? `<span class="live-dot off"></span>함께 편집 다시 연결하는 중… <button type="button" class="live-retry" data-a="live-retry">지금 다시 연결</button><small class="live-why">${esc(live.err)}</small>` : '';
      el.title = live.err || ''; return;
    }
    const others = live.who.filter((x) => x.userId !== srv.uid);
    const tabName = (t) => (TABS.find((x) => x[0] === t) || [])[1] || '';
    el.title = live.err ? `연결이 잠시 끊겼어요: ${live.err}` : '다른 관리자가 고친 내용이 몇 초 안에 보여요';
    // 웹툰 목록의 '보는 중' 표시도 바로 고쳐요
    root().querySelectorAll('[data-a="pick-w"]').forEach((row) => {
      row.querySelectorAll('.live-tag').forEach((t) => t.remove());
      const t = row.querySelector('.ad-live') || row.querySelector('b');
      if (t) t.insertAdjacentHTML('beforeend', liveOn(row.dataset.id));
    });
    el.innerHTML = `<span class="live-dot${live.err ? ' off' : ''}"></span>함께 편집 ${others.length ? '' : '· 나 혼자'}
      ${others.map((x) => `<span class="live-who" title="${esc(tabName(x.tab))}${x.w && toon(x.w) ? ` · ${esc(toon(x.w).title)}` : ''}">${esc(x.name)}${x.w && toon(x.w) ? ` · ${esc(toon(x.w).title)}` : x.tab ? ` · ${esc(tabName(x.tab))}` : ''}</span>`).join('')}`;
  }
  function liveOn(id) {
    if (!live.on) return '';
    const xs = live.who.filter((x) => x.userId !== srv.uid && x.w === id);
    return xs.map((x) => `<span class="live-tag">${esc(x.name)} 보는 중</span>`).join('');
  }
  // 트리·지도에서 끄는 동안은 화면을 다시 그리지 않아요
  document.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('#t-canvas, #m-canvas')) live.drag = true; }, true);
  document.addEventListener('pointerup', () => { if (!live.drag) return; live.drag = false; if (live.queued.length) { live.queued = []; setTimeout(liveRender, 50); } }, true);
  document.addEventListener('visibilitychange', () => { if (live.on && !document.hidden) { liveTick(); liveLoop(); } });

  /** 바로 저장: 다른 관리자가 먼저 저장했으면 멈추고 물어봐요 (force = 그래도 덮어쓰기) */
  async function saveToServer(force, retried) {
    if (live.on) { await liveFlush(); }
    api('adminSaveData', { data: D, baseHash: base, force: !!force, liveVersion: live.on ? live.ver : undefined, resetLive: !live.on && !!live.err }).then(async (r) => {
      ui.confirm = null;
      if (r.behind && !retried) { await liveFlush(); saveToServer(force, true); return; }
      if (r.behind) { toast('다른 관리자의 변경을 받는 중이에요. 잠시 뒤 다시 눌러 주세요'); render(); return; }
      if (r.conflict) {
        srv.conflict = true; ui.tab = 'data';
        toast('다른 관리자가 먼저 저장했어요. [데이터] 탭에서 어떻게 할지 골라 주세요');
        render();
        return;
      }
      siteJSON = JSON.stringify(D); srv.conflict = false;
      if (!live.on && live.err) { live.tries = 0; live.joining = false; clearTimeout(live.retry); liveJoin(); }   // 저장으로 기록을 정리했으니 다시 연결해 봐요
      if (r.hash) setBase(r.hash);
      if (live.on) live.base = live.ver;
      try { localStorage.removeItem(DRAFT); } catch (e) { /* 무시 */ }
      toast('사이트에 저장했어요. 1~2분 뒤 반영돼요');
      render();
    }).catch((e) => { toast(e.message); render(); });
  }

  /** 표지 색 자동으로 뽑기 (웹툰을 올릴 때마다) */
  async function autoColor(w, announce) {
    if (!w || !w.cover) return null;
    ui.colorBusy = w.id;
    const c = await WT.color.extract(w.cover);
    ui.colorBusy = null;
    if (c) { w.color = c; saveDraft(); }
    if (ui.tab === 'webtoons' && ui.w === w.id) render();
    if (announce) toast(c ? '표지에서 상세 창 색을 뽑았어요' : '표지에서 색을 뽑지 못했어요. 직접 골라 주세요');
    return c;
  }
  async function fillMissingColors() {
    const todo = D.webtoons.filter((w) => w.cover && !w.color);
    let n = 0;
    for (const w of todo) { if (await autoColor(w, false)) n++; }
    if (n) toast(`표지 색 ${n}개를 자동으로 채웠어요. 저장하면 사이트에 반영돼요`);
  }

  function setPath(obj, path, val) {
    const keys = path.split('.');
    let o = obj;
    keys.slice(0, -1).forEach((k) => { o[k] = o[k] || {}; o = o[k]; });
    o[keys[keys.length - 1]] = val;
  }

  function onInput(e) {
    const el = e.target;
    // 한국어처럼 글자를 조합하는 중에는 화면을 다시 그리지 않아요 (그리면 조합이 끊겨요). 조합이 끝나면(compositionend) 반영해요
    if (el.id === 'w-q') { ui.q = el.value; render(); return; }
    if (el.id === 'b-q') { ui.bq = el.value; render(); return; }
    if (el.dataset.ai) {   // 작가 정보 직접 고치기 (다시 그리지 않고 저장만)
      const [k, f] = el.dataset.ai.split('|');
      D.authorInfo = D.authorInfo || {};
      const cur = D.authorInfo[k] || { name: el.dataset.name || k, img: '', bio: '', url: '', works: [] };
      cur[f] = el.value.slice(0, f === 'bio' ? 300 : 300);
      D.authorInfo[k] = cur;
      saveDraft();
      return;
    }
    if (el.dataset.wf && el.type !== 'checkbox') {
      const w = toon(ui.w);
      const k = el.dataset.wf;
      if (k === 'episodes') { w.episodes = Math.max(1, parseInt(el.value, 10) || 1); w.baseDate = WT.schedule.today(); }
      else if (k === 'status') { w.episodes = WT.schedule.episodes(w); w.baseDate = WT.schedule.today(); w.status = el.value; delete w.ongoing; }
      else if (k === 'tags') w.tags = el.value.split(',').map((x) => x.trim()).filter(Boolean);
      else if (k === 'recommended') w.recommended = Math.max(0, Math.min(5, parseInt(el.value, 10) || 0));
      else { w[k] = el.value; if (k === 'cover') delete w.coverAuto; }
      saveDraft();
      return;
    }
    if (el.dataset.gf) { genre(ui.g)[el.dataset.gf] = el.value; saveDraft(); return; }
    if (el.dataset.subf) { const x = subsOf(ui.g).find((s) => s.id === el.dataset.sid); if (x) { x[el.dataset.subf] = el.dataset.subf === 'name' ? el.value.slice(0, 14) : el.value; saveDraft(); } return; }
    if (el.dataset.why !== undefined) { D.trees[ui.tg].links[Number(el.dataset.why)].why = el.value; saveDraft(); return; }
    if (el.dataset.sf && el.type !== 'checkbox') { setPath(D.settings, el.dataset.sf, el.dataset.num ? Math.max(0, parseInt(el.value, 10) || 0) : el.value); saveDraft(); return; }
    if (el.dataset.shop !== undefined && el.type !== 'checkbox' && el.tagName !== 'SELECT') {
      const it = D.shop[Number(el.dataset.shop)];
      it[el.dataset.k] = el.dataset.k === 'price' ? Math.max(0, parseInt(el.value, 10) || 0) : el.value;
      saveDraft();
    }
  }

  function onChange(e) {
    const el = e.target;
    if (el.id === 'w-fg') { ui.fg = el.value; render(); return; }
    if (el.id === 'import-file') { importFile(el.files[0]); return; }
    if (el.dataset.a === 'natural-auto') { D.settings.treeAutoSpacing = el.checked; saveDraft(); toast(el.checked ? '가지를 이을 때 간격을 자동으로 펴요' : '이을 때 자동으로 펴지 않아요'); return; }
    if (el.dataset.wf && el.type === 'checkbox') {
      const w = toon(ui.w);
      if (el.dataset.wf === 'autoCount') { w.episodes = WT.schedule.episodes(w); w.baseDate = WT.schedule.today(); }
      w[el.dataset.wf] = el.checked; saveDraft(); render(); return;
    }
    if (el.dataset.wd) {
      const w = toon(ui.w);
      w.episodes = WT.schedule.episodes(w); w.baseDate = WT.schedule.today();   // 요일을 바꾸기 전까지 늘어난 화수는 굳혀 둬요
      const d = el.dataset.wd;
      w.days = el.checked ? Array.from(new Set((w.days || []).concat(d))) : (w.days || []).filter((x) => x !== d);
      saveDraft(); render(); return;
    }
    if (el.dataset.ws) {
      const w = toon(ui.w);
      const sid = el.dataset.ws;
      w.subs = el.checked ? Array.from(new Set((w.subs || []).concat(sid))) : (w.subs || []).filter((x) => x !== sid);
      if (!w.subs.length) delete w.subs;
      saveDraft(); render(); return;
    }
    if (el.dataset.subf) { render(); return; }
    if (el.dataset.wg) {
      const w = toon(ui.w);
      const g = el.dataset.wg;
      w.genres = el.checked ? Array.from(new Set(w.genres.concat(g))) : w.genres.filter((x) => x !== g);
      saveDraft(); render(); return;
    }
    if (el.dataset.wf === 'cover') { const w = toon(ui.w); w.color = ''; saveDraft(); autoColor(w, true); render(); return; }
    if (el.dataset.wf || el.dataset.gf) { render(); return; }
    if (el.dataset.aChange === 'g-shape') { if (SHAPES[el.value]) { genre(ui.g).shape = clone(SHAPES[el.value].shape); saveDraft(); render(); } return; }
    if (el.dataset.aChange === 'g-start') { const T = D.trees[ui.g]; const v = el.value || null; T.starts = WT.starts(T).filter((x) => x !== v); T.start = v; saveDraft(); render(); return; }
    if (el.dataset.aChange === 't-genre') { ui.tg = el.value; ui.tsel = null; ui.from = null; ui.branchFor = null; render(); return; }
    if (el.dataset.sf && el.type === 'checkbox') { setPath(D.settings, el.dataset.sf, el.checked); saveDraft(); return; }
    if (el.dataset.shop !== undefined) {
      const it = D.shop[Number(el.dataset.shop)];
      it[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
      saveDraft(); render();
    }
  }

  function importFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const next = JSON.parse(r.result);
        if (!Array.isArray(next.webtoons) || !Array.isArray(next.genres) || !next.settings) throw new Error('shape');
        D = next; ensure(); saveDraft();
        ui.w = null; ui.g = null; ui.tsel = null; ui.msel = null;
        toast('data.json을 불러왔어요'); render();
      } catch (err) {
        toast('웹툰트리 data.json 파일이 아닌 것 같아요');
      }
    };
    r.readAsText(file);
  }

  async function init() {
    let site = null;
    try {
      const res = await fetch('data/data.json', { cache: 'no-cache' });
      site = await res.json();
    } catch (e) {
      root().innerHTML = '<p style="padding:40px">data/data.json을 불러오지 못했어요.</p>';
      return;
    }
    siteHash = fp(JSON.stringify(site));
    D = clone(site);
    ensure();                     // 빠진 칸(meta 등)을 채운 상태를 "사이트 데이터"로 봐요
    siteJSON = JSON.stringify(D);
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) { draft = null; }
    let savedBase = '';
    try { savedBase = localStorage.getItem(BASE) || ''; } catch (e) { savedBase = ''; }
    if (draft && Array.isArray(draft.webtoons)) { D = draft; ensure(); setBase(savedBase || siteHash); } else setBase(siteHash);
    root().addEventListener('click', onClick);
    root().addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'fx-q' && !e.isComposing) { e.preventDefault(); const w = toon(ui.w); if (w) linkFind(w); }
      if (e.key === 'Enter' && e.target.id === 'f-au-new' && !e.isComposing) {
        e.preventDefault();
        const w = toon(ui.w); const n = e.target.value.trim();
        if (w && n) { const l = WT.authorsOf(w).map((x) => Object.assign({}, x)); if (!l.some((x) => x.name === n)) l.push({ name: n, roles: [] }); setAuthors(w, l); setTimeout(() => { const el = document.getElementById('f-au-new'); if (el) el.focus(); }, 0); }
      } });
    root().addEventListener('input', onInput);
    root().addEventListener('compositionstart', () => { composing = true; });
    root().addEventListener('compositionend', (e) => { composing = false; onInput(e); });
    root().addEventListener('change', onChange);
    if (location.hash === '#server' && (srv.pw || srv.token) && (D.settings.apiUrl || '').trim()) {
      ui.tab = 'server';
      history.replaceState(null, '', 'admin.html');
      render();
      srvLoad();
      toast('관리자 화면에 들어왔어요');
      fillMissingColors();
      return;
    }
    render();
    if (draft && isDirty()) toast('이전에 하던 작업을 불러왔어요');
    fillMissingColors();
    // 이 탭에서 이미 관리자로 들어와 있었으면 (새로고침 등) 조용히 다시 연결해요
    if ((D.settings.apiUrl || '').trim() && (srv.pw || (srv.token && userRole === 'admin'))) srvLoad();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
