/* 웹툰트리 관리자
   - 고친 내용은 이 브라우저에 "초안"으로 자동 저장돼요.
   - 사이트에 반영하려면 [데이터] 탭에서 data.json을 내보내 GitHub의 data 폴더에 올려요.
   - 이 화면은 서버에 아무것도 바꾸지 않아요. 실제 수정 권한은 GitHub 저장소가 가져요. */
(function () {
  const DRAFT = 'webtoontree.admin.draft';
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
  const ui = {
    tab: 'webtoons', w: null, q: '', fg: 'all', confirm: null,
    g: null, newGenre: false,
    tg: null, tsel: null, mode: 'select', from: null, branchFor: null, bq: '',
    msel: null, mmode: 'select', mfrom: null, mq: ''
  };

  // ---------- 저장 ----------
  function saveDraft() {
    try { localStorage.setItem(DRAFT, JSON.stringify(D)); } catch (e) { /* 저장 공간 없음 */ }
    setState();
  }
  function isDirty() { return JSON.stringify(D) !== siteJSON; }
  function setState() {
    const el = document.getElementById('ad-state');
    if (!el) return;
    const d = isDirty();
    el.textContent = d ? '사이트에 아직 안 올린 변경이 있어요 → [데이터] 탭에서 내보내기' : '사이트 데이터와 같아요';
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
    D.map = D.map || { width: 2400, height: 1400, regions: [], nodes: {}, links: [] };
    D.shop = D.shop || [];
    D.hotToday = D.hotToday || [];
    D.genres.forEach((g) => { if (!D.trees[g.id]) D.trees[g.id] = { start: null, nodes: {}, links: [] }; });
  }
  function newWebtoonId() {
    D.meta.lastWebtoonId += 1;          // 지운 번호는 다시 쓰지 않아요
    return 'w' + String(D.meta.lastWebtoonId).padStart(3, '0');
  }
  function blankWebtoon(title, gid) {
    return { id: newWebtoonId(), title: title || '새 웹툰', author: '', platform: '네이버웹툰', url: '', cover: '', genres: gid ? [gid] : [], recommended: false, episodes: 1, status: 'ongoing', days: [], autoCount: true, baseDate: WT.schedule.today(), tags: [], desc: '' };
  }
  function treesOf(id) { return Object.keys(D.trees).filter((g) => D.trees[g].nodes[id]); }
  function removeFromTree(gid, id) {
    const T = D.trees[gid];
    delete T.nodes[id];
    T.links = T.links.filter((l) => l.from !== id && l.to !== id);
    if (T.start === id) T.start = Object.keys(T.nodes)[0] || null;
  }
  function deleteWebtoon(id) {
    Object.keys(D.trees).forEach((g) => removeFromTree(g, id));
    delete D.map.nodes[id];
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
    const off = D.webtoons.filter((w) => !D.map.nodes[w.id]).length;
    if (off) out.push(`전체 지도에 아직 없는 웹툰이 ${off}개 있어요`);
    return out;
  }

  // ---------- 틀 ----------
  const TABS = [['webtoons', '웹툰 목록'], ['genres', '장르 관리'], ['tree', '트리 편집'], ['map', '전체 지도 편집'], ['settings', '디자인 · 코인 설정'], ['shop', '상점 아이템'], ['data', '데이터 내보내기']];
  function render() {
    const scrollY = window.scrollY;
    root().innerHTML = `<header class="ad-head">
        <div class="brand"><b>웹툰트리</b><span class="ad-tag">관리자</span></div>
        <span id="ad-state" class="ad-state" aria-live="polite"></span>
        <div class="ad-actions">
          <a class="btn btn-sm press" href="index.html?preview=1" target="_blank" rel="noopener">사이트 미리보기</a>
          <button type="button" class="btn btn-gold btn-sm press" data-a="export">data.json 내보내기</button>
        </div>
      </header>
      <div class="ad-body">
        <nav class="ad-nav" aria-label="관리 메뉴">
          ${TABS.map(([id, name]) => `<button type="button" data-a="tab" data-id="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}>${name}</button>`).join('')}
          <a href="index.html" target="_blank" rel="noopener">실제 사이트 열기</a>
        </nav>
        <main class="ad-main" id="ad-main">${({ webtoons: tabWebtoons, genres: tabGenres, tree: tabTree, map: tabMap, settings: tabSettings, shop: tabShop, data: tabData })[ui.tab]()}</main>
      </div>`;
    setState();
    if (ui.tab === 'tree') mountTree();
    if (ui.tab === 'map') mountMap();
    window.scrollTo(0, scrollY);
  }

  // ---------- 웹툰 목록 ----------
  function tabWebtoons() {
    const q = ui.q.trim().toLowerCase();
    const list = D.webtoons.filter((w) => (ui.fg === 'all' || (ui.fg === 'none' ? !w.genres.length : w.genres.includes(ui.fg))) &&
      (!q || w.title.toLowerCase().includes(q) || (w.author || '').toLowerCase().includes(q)));
    const w = ui.w && toon(ui.w);
    return `<h2>웹툰 목록 <span class="ad-help" style="display:inline">${D.webtoons.length}개</span></h2>
      <p class="ad-help">웹툰을 추가하고 고쳐요. 웹툰 ID(w001 같은 값)는 자동으로 정해지고 바뀌지 않아요. 감상 기록이 ID로 연결돼 있어요.</p>
      <div class="ad-split">
        <section class="ad-list" aria-label="웹툰 목록">
          <button type="button" class="btn btn-gold press" data-a="new-w">+ 새 웹툰</button>
          <label class="sr" for="w-q">웹툰 검색</label>
          <input id="w-q" class="fld" type="search" placeholder="제목, 작가 검색" value="${esc(ui.q)}">
          <label class="sr" for="w-fg">장르로 거르기</label>
          <select id="w-fg" class="fld">
            <option value="all">모든 장르</option>
            ${D.genres.map((g) => `<option value="${g.id}" ${ui.fg === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}
            <option value="none" ${ui.fg === 'none' ? 'selected' : ''}>장르 없음</option>
          </select>
          <div class="items-box">
            ${list.map((x) => `<button type="button" class="ad-row${ui.w === x.id ? ' sel' : ''}" data-a="pick-w" data-id="${x.id}">
              <span class="dotc" style="background:${gColor(x)}">${esc(x.title[0] || '?')}</span>
              <span class="t"><b>${x.recommended ? '★ ' : ''}${esc(x.title)}</b><span>${x.id} · ${esc(x.genres.map((g) => (genre(g) || {}).name).join(', ') || '장르 없음')} · ${WT.schedule.episodes(x)}화 · ${esc(WT.schedule.label(x))}</span></span>
            </button>`).join('') || '<p class="ad-help">찾는 웹툰이 없어요</p>'}
          </div>
        </section>
        ${w ? webtoonForm(w) : '<section class="ad-form"><div class="ad-empty">왼쪽에서 웹툰을 고르거나 [+ 새 웹툰]을 눌러 주세요</div></section>'}
      </div>`;
  }
  function webtoonForm(w) {
    const inTrees = treesOf(w.id).map((g) => (genre(g) || {}).name);
    const confirming = ui.confirm === 'w:' + w.id;
    return `<section class="ad-form" aria-label="웹툰 정보 수정">
      <div style="display:flex; align-items:center; gap:12px">
        <span class="dotc" style="width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:var(--display); font-size:24px; color:#fff; background:${w.cover ? `url('${esc(w.cover)}') center/cover` : gColor(w)}">${w.cover ? '' : esc(w.title[0] || '?')}</span>
        <div><b style="font-size:17px">${esc(w.title)}</b><div class="ad-help">${w.id} · 트리: ${esc(inTrees.join(', ') || '없음')} · 전체 지도: ${D.map.nodes[w.id] ? '있음' : '없음'}</div></div>
      </div>
      <div class="field"><label for="f-title">제목</label><input id="f-title" class="fld" data-wf="title" value="${esc(w.title)}"></div>
      <div class="field"><label for="f-author">작가</label><input id="f-author" class="fld" data-wf="author" value="${esc(w.author)}" placeholder="예: 김작가 글 · 이작가 그림"></div>
      <div class="grid2">
        <div class="field"><label for="f-plat">플랫폼</label><input id="f-plat" class="fld" data-wf="platform" list="plat-list" value="${esc(w.platform)}"><datalist id="plat-list">${PLATFORMS.map((p) => `<option value="${p}">`).join('')}</datalist></div>
        <div class="field"><label for="f-ep">총 화수 (오늘 기준)</label><input id="f-ep" class="fld" type="number" min="1" data-wf="episodes" value="${WT.schedule.episodes(w)}"></div>
      </div>
      <div class="field"><label for="f-url">보러 가기 링크</label><input id="f-url" class="fld" type="url" data-wf="url" value="${esc(w.url)}" placeholder="https://"></div>
      <div class="field"><label for="f-cover">표지 이미지 주소 (선택)</label><input id="f-cover" class="fld" type="url" data-wf="cover" value="${esc(w.cover)}" placeholder="비워 두면 제목 첫 글자로 표시"><span class="hint">직접 만들었거나 써도 되는 이미지만 넣어 주세요.</span></div>
      <fieldset style="border:none; margin:0; padding:0"><legend class="hint" style="margin-bottom:6px; font-size:14px; color:var(--soft)">장르 (여러 개 가능)</legend>
        <div class="checks">${D.genres.map((g) => `<label><input type="checkbox" data-wg="${g.id}" ${w.genres.includes(g.id) ? 'checked' : ''}> ${esc(g.name)}</label>`).join('')}</div>
      </fieldset>
      <div class="checks">
        <label class="ad-check" style="color:var(--coin); font-weight:700"><input type="checkbox" data-wf="recommended" ${w.recommended ? 'checked' : ''}> 관리자 강추 (노드에 큰 별)</label>
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
      <div class="ad-actions">
        ${treesOf(w.id).length ? '' : (w.genres.length ? `<button type="button" class="btn btn-sm press" data-a="w-to-tree" data-id="${w.id}">${esc((genre(w.genres[0]) || {}).name)} 트리에 넣기</button>` : '')}
        ${D.map.nodes[w.id] ? '' : `<button type="button" class="btn btn-sm press" data-a="w-to-map" data-id="${w.id}">전체 지도에 넣기</button>`}
        <button type="button" class="btn btn-sm btn-danger press" data-a="del-w" data-id="${w.id}">${confirming ? '한 번 더 누르면 삭제돼요 (트리·지도에서도 빠져요)' : '웹툰 삭제'}</button>
      </div>
    </section>`;
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
    const shapeKey = Object.keys(SHAPES).find((k) => JSON.stringify(SHAPES[k].shape) === JSON.stringify(g.shape)) || 'custom';
    const confirming = ui.confirm === 'g:' + g.id;
    const lines = g.shape.lines.map((pts) => `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${g.color}" stroke-width="1.6"/>`).join('');
    const stars = g.shape.stars.map((s) => `<circle cx="${s[0]}" cy="${s[1]}" r="${s[2]}" fill="${g.color}"/>`).join('');
    return `<section class="ad-form" aria-label="장르 수정">
      <div style="display:flex; align-items:center; gap:14px"><svg viewBox="0 0 100 72" width="100" height="72" aria-hidden="true">${lines}${stars}</svg><div><b style="font-size:18px; color:${g.color}">${esc(g.name)}</b><div class="ad-help">ID: ${g.id}</div></div></div>
      <div class="grid2">
        <div class="field"><label for="g-name">이름</label><input id="g-name" class="fld" data-gf="name" value="${esc(g.name)}" maxlength="12"></div>
        <div class="field"><label for="g-con">별자리 이름</label><input id="g-con" class="fld" data-gf="constellation" value="${esc(g.constellation || '')}" placeholder="예: 왕관자리"></div>
      </div>
      <div class="grid2">
        <div class="field"><label for="g-color">대표 색</label><input id="g-color" class="swatch" type="color" data-gf="color" value="${esc(g.color)}"></div>
        <div class="field"><label for="g-shape">별자리 모양</label><select id="g-shape" class="fld" data-a-change="g-shape">
          ${Object.keys(SHAPES).map((k) => `<option value="${k}" ${shapeKey === k ? 'selected' : ''}>${SHAPES[k].name}</option>`).join('')}
          ${shapeKey === 'custom' ? '<option value="custom" selected>직접 만든 모양</option>' : ''}
        </select></div>
      </div>
      <div class="field"><label for="g-desc">한 줄 설명</label><input id="g-desc" class="fld" data-gf="desc" value="${esc(g.desc)}"></div>
      <div class="field"><label for="g-start">입문작 (트리의 시작 웹툰)</label><select id="g-start" class="fld" data-a-change="g-start">
        <option value="">정하지 않음</option>
        ${Object.keys(T.nodes).map((id) => `<option value="${id}" ${T.start === id ? 'selected' : ''}>${esc((toon(id) || {}).title)}</option>`).join('')}
      </select><span class="hint">트리에 넣은 웹툰 중에서 고를 수 있어요. 트리는 [트리 편집]에서 만들어요.</span></div>
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
        <button type="button" class="btn btn-sm press" data-a="auto" ${n ? '' : 'disabled'}>자동 정렬</button>
        <span class="ad-help">${n}개 · 연결 ${T.links.length}개</span>
      </div>
      <div class="ad-split">
        <div style="flex:999 1 560px; min-width:0">
          <div class="ad-canvas-wrap" id="t-wrap"><div class="ad-canvas" id="t-canvas" style="width:${TREE_W}px; height:${TREE_H}px"></div></div>
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
        <p class="ad-help">입문작: <b>${esc((toon(T.start) || {}).title || '정하지 않음')}</b></p>`;
    }
    const w = toon(id);
    const outs = T.links.map((l, i) => [l, i]).filter(([l]) => l.from === id);
    const ins = T.links.filter((l) => l.to === id);
    const confirming = ui.confirm === 'tn:' + id;
    return `<h3>${esc(w.title)}</h3>
      <p class="ad-help">${T.start === id ? '★ 이 트리의 입문작이에요' : ''}${ins.length ? ` 이전 웹툰: ${ins.map((l) => esc((toon(l.from) || {}).title)).join(', ')}` : ''}</p>
      <div class="ad-actions">
        ${T.start === id ? '' : `<button type="button" class="btn btn-sm press" data-a="set-start" data-id="${id}">입문작으로 정하기</button>`}
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

  function mountTree() {
    const g = genre(ui.tg);
    const T = D.trees[g.id];
    const wrap = document.getElementById('t-wrap');
    const cv = document.getElementById('t-canvas');
    const scale = () => Math.min(1, wrap.clientWidth / TREE_W);
    const fit = () => { const s = scale(); cv.style.transform = `scale(${s})`; wrap.style.height = `${TREE_H * s}px`; };
    cv.innerHTML = T.links.map((l, i) => `<div class="ad-link${ui.tsel && (l.from === ui.tsel || l.to === ui.tsel) ? ' sel' : ''}" data-l="${i}"></div>`).join('') +
      Object.keys(T.nodes).map((id) => {
        const w = toon(id) || { title: '?' };
        const [x, y] = T.nodes[id];
        const cls = [T.start === id ? 'start' : '', ui.tsel === id ? 'sel' : '', ui.from === id ? 'from' : ''].join(' ');
        return `<div class="ad-node ${cls}" data-n="${id}" style="--gc:${gColor(w)}; left:${x}px; top:${y - (T.start === id ? 45 : 36)}px" role="button" tabindex="0" aria-label="${esc(w.title)}">
          <div class="c">${esc(w.title[0] || '?')}${ui.tsel === id && ui.mode === 'select' ? '<span class="plus" data-plus="1" aria-hidden="true">+</span>' : ''}</div>
          <span>${w.recommended ? '★ ' : ''}${esc(w.title)}</span>${T.start === id ? '<span class="start-tag">입문작</span>' : ''}
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
      const nx = Math.round(Math.min(TREE_W - 60, Math.max(60, drag.x + dx)) / 10) * 10;
      const ny = Math.round(Math.min(TREE_H - 60, Math.max(50, drag.y + dy)) / 10) * 10;
      T.nodes[drag.id] = [nx, ny];
      drag.el.style.left = `${nx}px`;
      drag.el.style.top = `${ny - (T.start === drag.id ? 45 : 36)}px`;
      drawLinks();
    });
    cv.addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (d.moved >= 5) { saveDraft(); return; }
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
    const free = ([x, y]) => x >= 70 && x <= TREE_W - 70 && y >= 60 && y <= TREE_H - 60 && taken.every(([a, b]) => Math.hypot(a - x, b - y) > 120);
    const spot = tries.map(([dx, dy]) => [p[0] + dx, p[1] + dy]).find(free) ||
      [Math.round(Math.min(TREE_W - 70, Math.max(70, p[0] + 60))), Math.round(Math.min(TREE_H - 60, p[1] + 90))];
    T.nodes[childId] = [Math.round(spot[0]), Math.round(spot[1])];
    T.links.push({ from: parentId, to: childId, why: '' });
    ui.tsel = childId; ui.branchFor = null; ui.mode = 'select';
    saveDraft();
    toast(`${toon(childId).title}을(를) 이었어요`);
    render();
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
    const stepX = maxL ? Math.min(230, (TREE_W - 220) / maxL) : 0;
    for (let L = 0; L <= maxL; L++) {
      const row = ids.filter((id) => level[id] === L);
      row.forEach((id, k) => {
        const y = row.length === 1 ? TREE_H / 2 : 90 + k * ((TREE_H - 180) / (row.length - 1));
        T.nodes[id] = [Math.round(110 + L * stepX), Math.round(y)];
      });
    }
    saveDraft();
    render();
  }

  // ---------- 전체 지도 편집 ----------
  function tabMap() {
    const M = D.map;
    const off = D.webtoons.filter((w) => !M.nodes[w.id]);
    const id = ui.msel && M.nodes[ui.msel] ? ui.msel : null;
    const links = M.links.map((l, i) => [l, i]).filter(([l]) => id && (l[0] === id || l[1] === id));
    const modeBtn = (m, label) => `<button type="button" class="btn btn-sm tool press" data-a="mmode" data-id="${m}" aria-pressed="${ui.mmode === m}">${label}</button>`;
    return `<h2>전체 지도 편집</h2>
      <p class="ad-help">웹툰 별과 장르 구역(색 영역)을 끌어서 옮겨요. 장르가 애매한 웹툰은 두 구역 사이에 두면 좋아요. 다른 장르끼리 이은 선은 사이트에서 점선으로 보여요.</p>
      <div class="ad-toolbar">
        ${modeBtn('select', '선택 · 이동')}${modeBtn('link', '연결하기 (A ↔ B)')}
        <button type="button" class="btn btn-sm press" data-a="map-import">장르 트리 연결 모두 가져오기</button>
        <span class="ad-help">별 ${Object.keys(M.nodes).length}개 · 연결 ${M.links.length}개</span>
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
            <div class="ad-actions"><button type="button" class="btn btn-sm btn-danger press" data-a="map-remove" data-id="${id}">지도에서 빼기</button></div>` : '<h3>지도에 없는 웹툰</h3>'}
          ${off.length ? `${id ? '<h3 style="margin-top:8px">지도에 없는 웹툰</h3>' : ''}<div class="pop-list">${off.map((w) => `<button type="button" data-a="map-add" data-id="${w.id}">+ ${esc(w.title)}</button>`).join('')}</div>
            <button type="button" class="btn btn-sm press" data-a="map-add-all">모두 장르 구역에 넣기</button>` : (id ? '' : '<span class="hint">모든 웹툰이 지도에 있어요</span>')}
        </aside>
      </div>`;
  }
  function mountMap() {
    const M = D.map;
    const wrap = document.getElementById('m-wrap');
    const cv = document.getElementById('m-canvas');
    const scale = () => wrap.clientWidth / M.width;
    const fit = () => { const s = scale(); cv.style.transform = `scale(${s})`; wrap.style.height = `${M.height * s}px`; };
    cv.innerHTML = M.regions.map((r, i) => {
      const g = genre(r.genre);
      if (!g) return '';
      return `<div class="ad-region" data-r="${i}" style="left:${r.x}px; top:${r.y}px; background:radial-gradient(ellipse at center, ${g.color}55 0%, ${g.color}18 50%, transparent 72%)"><b style="color:${g.color}">${esc(g.name)}</b></div>`;
    }).join('') + M.links.map((l, i) => `<div class="ad-link${ui.msel && l.includes(ui.msel) ? ' sel' : ''}" data-l="${i}"></div>`).join('') +
      Object.keys(M.nodes).filter((id) => toon(id)).map((id) => {
        const w = toon(id);
        const [x, y] = M.nodes[id];
        return `<div class="ad-node${ui.msel === id ? ' sel' : ''}${ui.mfrom === id ? ' from' : ''}" data-n="${id}" style="--gc:${gColor(w)}; left:${x}px; top:${y - 36}px" role="button" tabindex="0" aria-label="${esc(w.title)}"><div class="c">${esc(w.title[0])}</div><span>${esc(w.title)}</span></div>`;
      }).join('');
    const drawLinks = () => M.links.forEach(([a, b], i) => {
      const el = cv.querySelector(`[data-l="${i}"]`);
      if (el && M.nodes[a] && M.nodes[b]) placeLink(el, M.nodes[a], M.nodes[b]);
    });
    drawLinks();
    fit();
    window.onresize = fit;
    let drag = null;
    cv.addEventListener('pointerdown', (e) => {
      const nEl = e.target.closest('[data-n]');
      const rEl = !nEl && e.target.closest('[data-r]');
      if (!nEl && !rEl) return;
      const isNode = !!nEl;
      const key = isNode ? nEl.dataset.n : Number(rEl.dataset.r);
      const pos = isNode ? M.nodes[key] : [M.regions[key].x, M.regions[key].y];
      drag = { isNode, key, el: nEl || rEl, sx: e.clientX, sy: e.clientY, x: pos[0], y: pos[1], moved: 0 };
      (nEl || rEl).setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag || ui.mmode !== 'select') return;
      const s = scale();
      const dx = (e.clientX - drag.sx) / s, dy = (e.clientY - drag.sy) / s;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved < 8) return;
      const nx = Math.round(Math.min(M.width - 60, Math.max(60, drag.x + dx)));
      const ny = Math.round(Math.min(M.height - 60, Math.max(60, drag.y + dy)));
      if (drag.isNode) { M.nodes[drag.key] = [nx, ny]; drag.el.style.left = `${nx}px`; drag.el.style.top = `${ny - 36}px`; drawLinks(); }
      else { M.regions[drag.key].x = nx; M.regions[drag.key].y = ny; drag.el.style.left = `${nx}px`; drag.el.style.top = `${ny}px`; }
    });
    cv.addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (d.moved >= 8) { saveDraft(); return; }
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
    const w = toon(id);
    const r = D.map.regions.find((x) => w.genres.includes(x.genre)) || { x: D.map.width / 2, y: D.map.height / 2 };
    const k = Object.keys(D.map.nodes).length;
    D.map.nodes[id] = [Math.round(r.x + Math.cos(k * 2.4) * 160), Math.round(r.y + 40 + Math.sin(k * 2.4) * 120)];
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
      <section class="ad-card"><h3>문구</h3>
        ${f('siteName', '사이트 이름', 'text', 'maxlength="20"')}
        ${f('tagline', '홈 소개 문구', 'text')}
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

  // ---------- 데이터 ----------
  function tabData() {
    const list = issues();
    return `<h2>데이터 내보내기</h2>
      <section class="ad-card"><h3>사이트에 반영하는 방법</h3>
        <ol>
          <li>아래 [data.json 내보내기]를 눌러 파일을 받아요.</li>
          <li>GitHub의 <a href="https://github.com/hy3ongh0/webtoontree/tree/main/data" target="_blank" rel="noopener">webtoontree 저장소 → data 폴더</a>로 가요.</li>
          <li>오른쪽 위 Add file → Upload files를 누르고 받은 data.json을 끌어다 놓아요.</li>
          <li>아래쪽 Commit changes를 누르면 1~2분 뒤 사이트에 반영돼요.</li>
        </ol>
        <div class="ad-actions">
          <button type="button" class="btn btn-gold press" data-a="export">data.json 내보내기</button>
          <a class="btn press" href="index.html?preview=1" target="_blank" rel="noopener">올리기 전에 미리보기</a>
        </div>
      </section>
      <section class="ad-card"><h3>확인할 것 ${list.length ? `(${list.length})` : ''}</h3>
        ${list.length ? `<ul class="ad-issues">${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="ad-help">문제없어요.</p>'}
      </section>
      <section class="ad-card"><h3>불러오기 · 되돌리기</h3>
        <div class="field"><label for="import-file">data.json 불러오기 (백업 복원)</label><input id="import-file" type="file" accept="application/json,.json"></div>
        <button type="button" class="btn btn-danger press" data-a="revert">${ui.confirm === 'revert' ? '한 번 더 누르면 지금 작업이 사라지고 사이트 데이터로 돌아가요' : '사이트에 올라가 있는 데이터로 되돌리기'}</button>
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
      case 'mode': ui.mode = id; ui.from = null; ui.branchFor = null; if (id !== 'branch') ui.pendingChild = null; render(); break;
      case 'auto': autoLayout(); toast('자동으로 정렬했어요'); break;
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
      case 'set-start': D.trees[ui.tg].start = id; saveDraft(); render(); break;
      case 'del-link': D.trees[ui.tg].links.splice(i, 1); saveDraft(); render(); break;
      case 'del-node': if (confirmOnce('tn:' + id)) { removeFromTree(ui.tg, id); ui.tsel = null; saveDraft(); render(); } break;
      case 'mmode': ui.mmode = id; ui.mfrom = null; render(); break;
      case 'map-add': placeOnMap(id); ui.msel = id; saveDraft(); render(); break;
      case 'map-add-all': D.webtoons.filter((w) => !D.map.nodes[w.id]).forEach((w) => placeOnMap(w.id)); saveDraft(); toast('지도에 모두 넣었어요'); render(); break;
      case 'map-remove': delete D.map.nodes[id]; D.map.links = D.map.links.filter(([x, y]) => x !== id && y !== id); ui.msel = null; saveDraft(); render(); break;
      case 'mdel-link': D.map.links.splice(i, 1); saveDraft(); render(); break;
      case 'map-import': {
        let added = 0;
        Object.values(D.trees).forEach((T) => T.links.forEach((l) => {
          if (!D.map.nodes[l.from] || !D.map.nodes[l.to]) return;
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
        D = JSON.parse(siteJSON); ensure();
        try { localStorage.removeItem(DRAFT); } catch (err) { /* 무시 */ }
        ui.w = null; ui.g = null; ui.tsel = null; ui.msel = null;
        toast('사이트 데이터로 되돌렸어요'); render();
      } break;
      default: break;
    }
  }

  function setPath(obj, path, val) {
    const keys = path.split('.');
    let o = obj;
    keys.slice(0, -1).forEach((k) => { o[k] = o[k] || {}; o = o[k]; });
    o[keys[keys.length - 1]] = val;
  }

  function onInput(e) {
    const el = e.target;
    if (el.id === 'w-q') { ui.q = el.value; const pos = el.selectionStart; render(); const n = document.getElementById('w-q'); n.focus(); n.setSelectionRange(pos, pos); return; }
    if (el.id === 'b-q') { ui.bq = el.value; const pos = el.selectionStart; render(); const n = document.getElementById('b-q'); n.focus(); n.setSelectionRange(pos, pos); return; }
    if (el.dataset.wf && el.type !== 'checkbox') {
      const w = toon(ui.w);
      const k = el.dataset.wf;
      if (k === 'episodes') { w.episodes = Math.max(1, parseInt(el.value, 10) || 1); w.baseDate = WT.schedule.today(); }
      else if (k === 'status') { w.episodes = WT.schedule.episodes(w); w.baseDate = WT.schedule.today(); w.status = el.value; delete w.ongoing; }
      else if (k === 'tags') w.tags = el.value.split(',').map((x) => x.trim()).filter(Boolean);
      else w[k] = el.value;
      saveDraft();
      return;
    }
    if (el.dataset.gf) { genre(ui.g)[el.dataset.gf] = el.value; saveDraft(); return; }
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
    if (el.dataset.wg) {
      const w = toon(ui.w);
      const g = el.dataset.wg;
      w.genres = el.checked ? Array.from(new Set(w.genres.concat(g))) : w.genres.filter((x) => x !== g);
      saveDraft(); render(); return;
    }
    if (el.dataset.wf || el.dataset.gf) { render(); return; }
    if (el.dataset.aChange === 'g-shape') { if (SHAPES[el.value]) { genre(ui.g).shape = clone(SHAPES[el.value].shape); saveDraft(); render(); } return; }
    if (el.dataset.aChange === 'g-start') { D.trees[ui.g].start = el.value || null; saveDraft(); render(); return; }
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
    D = clone(site);
    ensure();                     // 빠진 칸(meta 등)을 채운 상태를 "사이트 데이터"로 봐요
    siteJSON = JSON.stringify(D);
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) { draft = null; }
    if (draft && Array.isArray(draft.webtoons)) { D = draft; ensure(); }
    root().addEventListener('click', onClick);
    root().addEventListener('input', onInput);
    root().addEventListener('change', onChange);
    render();
    if (draft && isDirty()) toast('이전에 하던 작업을 불러왔어요');
  }
  document.addEventListener('DOMContentLoaded', init);
})();
