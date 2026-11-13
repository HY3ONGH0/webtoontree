/* 도서관 목록 보기: #/books — 왼쪽 거르기 · 오른쪽 표지 4개씩, 스크롤로 쭉 */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAYK = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
  const F = { q: '', genres: [], subs: [], status: [], stars: 0, pick: false, tree: false, fav: false, mine: 'all', sort: 'rec', open: { genre: true, status: true, more: true } };
  const PAGE = 24;
  let shown = PAGE;

  function stateOf(w) {
    const S = WT.store.state;
    const tot = WT.eps(w), e = Math.min(tot, (S.progress || {})[w.id] || 0);
    if (e >= tot || (S.rewarded || {})[w.id + ':done']) return 'done';
    return e > 0 ? 'reading' : 'none';
  }
  function filtered() {
    const q = F.q.trim().toLowerCase();
    let list = WT.data.webtoons.filter((w) => {
      if (q && !(w.title + ' ' + WT.authorsOf(w).map((a) => a.name).join(' ') + ' ' + (w.tags || []).join(' ')).toLowerCase().includes(q)) return false;
      if (F.genres.length && !F.genres.some((g) => (w.genres || []).includes(g))) return false;
      if (F.subs.length && !F.subs.some((x) => (w.subs || []).includes(x))) return false;
      if (F.status.length && !F.status.includes(WT.schedule.status(w))) return false;
      if (F.pick && !w.pick) return false;
      if (F.stars && WT.recRank(w) < F.stars) return false;
      if (F.tree && !WT.inTree(w.id)) return false;
      if (F.fav && !WT.fav.has(w.id)) return false;
      if (F.mine !== 'all' && stateOf(w) !== F.mine) return false;
      return true;
    });
    const by = {
      rec: (a, b) => WT.recRank(b) - WT.recRank(a) || a.title.localeCompare(b.title, 'ko'),
      abc: (a, b) => a.title.localeCompare(b.title, 'ko'),
      eps: (a, b) => WT.eps(b) - WT.eps(a),
    }[F.sort];
    return list.sort(by);
  }
  const libHref = (w) => `#/library/${(w.genres || [])[0] || 'all'}/${w.id}`;
  function card(w) {
    const st = WT.schedule.status(w), me = stateOf(w), rs = w.pick ? 0 : WT.recStars(w);
    const gs = (w.genres || []).map((g) => (WT.genre(g) || {}).name).filter(Boolean);
    const color = w.color || (WT.genre((w.genres || [])[0]) || {}).color || '#55607F';
    return `<a class="bk-card" href="${libHref(w)}">
      <span class="bk-cv" style="--c:${esc(color)}"><span class="bk-ini">${esc(w.title)}</span>
        ${w.cover ? `<img src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
        ${w.pick ? '<span class="bk-pick">관리자 강추</span>' : ''}
        <span class="bk-st ${st}">${st === 'completed' ? '완결' : st === 'hiatus' ? '휴재' : '연재 ' + (w.days || []).map((d) => DAYK[d]).join('')}</span>
        ${WT.platform.icon(w.platform, 'pf-cv')}
        ${WT.fav.btn(w.id, 'fav-cv')}
        ${me !== 'none' ? `<span class="bk-me ${me}">${me === 'done' ? '✓ 다 봤어요' : '보는 중'}</span>` : ''}
      </span>
      <b class="bk-t">${esc(w.title)}</b>
      <small class="bk-g">${esc(gs.join(', ') || '장르 없음')}</small>
      <span class="bk-foot">${rs ? `<i class="bk-stars">${'★'.repeat(rs)}<em>${'★'.repeat(5 - rs)}</em></i>` : w.pick ? '<i class="bk-pk">강추</i>' : '<i class="bk-none">추천 전</i>'}<span>${WT.eps(w)}화</span></span>
    </a>`;
  }
  const sec = (key, title, body) => `<section class="bk-box${F.open[key] ? ' open' : ''}"><button type="button" class="bk-bh" data-tog="${key}" aria-expanded="${!!F.open[key]}">${title}<i>⌃</i></button><div class="bk-bb">${body}</div></section>`;
  const chk = (attr, val, on, label, n) => `<label class="bk-chk"><input type="checkbox" data-${attr}="${esc(val)}" ${on ? 'checked' : ''}><span>${esc(label)}</span>${n != null ? `<em>${n}</em>` : ''}</label>`;

  function sideHTML() {
    const all = WT.data.webtoons;
    const subGenres = WT.data.genres.filter((g) => (F.genres.length ? F.genres.includes(g.id) : false) && (g.subs || []).length);
    return `<h2 class="bk-h2">거르기</h2>
      ${sec('genre', '장르', `<div class="bk-chks two">${WT.data.genres.map((g) => chk('g', g.id, F.genres.includes(g.id), g.name, all.filter((w) => (w.genres || []).includes(g.id)).length)).join('')}</div>
        ${subGenres.map((g) => `<p class="bk-subh">${esc(g.name)} 세부 장르</p><div class="bk-chks">${g.subs.map((x) => chk('s', x.id, F.subs.includes(x.id), x.name, all.filter((w) => (w.subs || []).includes(x.id)).length)).join('')}</div>`).join('')}`)}
      ${sec('status', '연재 상태', `<div class="bk-chks">${[['ongoing', '연재 중'], ['completed', '완결'], ['hiatus', '휴재']].map(([k, n]) => chk('st', k, F.status.includes(k), n, all.filter((w) => WT.schedule.status(w) === k).length)).join('')}</div>`)}
      ${sec('more', '추천 · 내 기록', `<div class="bk-chks">
          ${chk('pick', '1', F.pick, '관리자 강추만', all.filter((w) => w.pick).length)}
          ${chk('tree', '1', F.tree, '트리 웹툰만', all.filter((w) => WT.inTree(w.id)).length)}
          ${chk('favonly', '1', F.fav, '관심 웹툰만', WT.fav.list().length)}
        </div>
        <p class="bk-subh">추천 별</p>
        <div class="bk-seg">${[[0, '전체'], [3, '★3 이상'], [4, '★4 이상'], [5, '★5']].map(([v, n]) => `<button type="button" data-stars="${v}" aria-pressed="${F.stars === v}">${n}</button>`).join('')}</div>
        <p class="bk-subh">내 기록</p>
        <div class="bk-seg">${[['all', '전체'], ['none', '안 본'], ['reading', '보는 중'], ['done', '다 본']].map(([v, n]) => `<button type="button" data-mine="${v}" aria-pressed="${F.mine === v}">${n}</button>`).join('')}</div>`)}
      <button type="button" class="bk-reset" id="bk-reset">거르기 모두 지우기</button>`;
  }
  function gridHTML(list) {
    return list.length ? list.slice(0, shown).map(card).join('') : '<p class="bk-empty">조건에 맞는 웹툰이 없어요. 거르기를 조금 풀어 보세요.</p>';
  }

  function view() {
    shown = PAGE;
    const app = document.getElementById('app');
    app.innerHTML = `<div class="view bk-view">
      <div class="bk-top">
        <a class="bk-crumb" href="#/library/all">도서관</a><span class="bk-sep">/</span><b>목록으로 보기</b>
        <label class="bk-search">${WT.icon.search}<input id="bk-q" placeholder="제목, 작가, 태그 검색" value="${esc(F.q)}" autocomplete="off" aria-label="목록에서 검색"></label>
      </div>
      <div class="bk-body">
        <aside class="bk-side" id="bk-side">${sideHTML()}</aside>
        <main class="bk-main">
          <div class="bk-bar">
            <h1>웹툰 <em id="bk-n"></em></h1>
            <div class="bk-views" role="group" aria-label="보기 방식"><a href="#/library/all" title="책장으로 보기" aria-label="책장으로 보기"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="4" height="14"/><rect x="10" y="5" width="4" height="14"/><rect x="17" y="5" width="4" height="14"/></svg></a><span aria-current="true" title="목록으로 보기"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg></span></div>
            <label class="bk-sort">정렬 <select id="bk-sort"><option value="rec">추천순</option><option value="abc">ㄱㄴㄷ순</option><option value="eps">화수 많은 순</option></select></label>
          </div>
          <div class="bk-grid" id="bk-grid"></div>
          <div class="bk-more" id="bk-more"></div>
        </main>
      </div>
    </div>`;
    const side = document.getElementById('bk-side'), grid = document.getElementById('bk-grid'), more = document.getElementById('bk-more');
    document.getElementById('bk-sort').value = F.sort;
    const draw = (keepSide) => {
      const list = filtered();
      document.getElementById('bk-n').textContent = `${list.length}편`;
      grid.innerHTML = gridHTML(list);
      more.innerHTML = list.length > shown ? `<span>${list.length}편 중 ${shown}편</span><button type="button" id="bk-load">더 보기</button>` : list.length ? `<span>${list.length}편 모두 봤어요</span>` : '';
      if (!keepSide) side.innerHTML = sideHTML();
    };
    draw(true);
    side.addEventListener('change', (e) => {
      const t = e.target, arr = (k, v) => { const a = F[k]; const i = a.indexOf(v); if (t.checked && i < 0) a.push(v); if (!t.checked && i >= 0) a.splice(i, 1); };
      if (t.dataset.g) { arr('genres', t.dataset.g); if (!t.checked) { const g = WT.genre(t.dataset.g); F.subs = F.subs.filter((s) => !((g && g.subs) || []).some((x) => x.id === s)); } }
      else if (t.dataset.s) arr('subs', t.dataset.s);
      else if (t.dataset.st) arr('status', t.dataset.st);
      else if (t.dataset.pick) F.pick = t.checked;
      else if (t.dataset.tree) F.tree = t.checked;
      else if (t.dataset.favonly) F.fav = t.checked;
      shown = PAGE; draw(false);
    });
    side.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.tog) { F.open[b.dataset.tog] = !F.open[b.dataset.tog]; side.innerHTML = sideHTML(); return; }
      if (b.dataset.stars != null) F.stars = Number(b.dataset.stars);
      else if (b.dataset.mine) F.mine = b.dataset.mine;
      else if (b.id === 'bk-reset') Object.assign(F, { q: '', genres: [], subs: [], status: [], stars: 0, pick: false, tree: false, fav: false, mine: 'all' });
      else return;
      if (b.id === 'bk-reset') document.getElementById('bk-q').value = '';
      shown = PAGE; draw(false);
    });
    let composing = false;
    const q = document.getElementById('bk-q');
    q.addEventListener('compositionstart', () => { composing = true; });
    q.addEventListener('compositionend', () => { composing = false; F.q = q.value; shown = PAGE; draw(true); });
    q.addEventListener('input', (e) => { if (composing || e.isComposing) return; F.q = q.value; shown = PAGE; draw(true); });
    document.getElementById('bk-sort').addEventListener('change', (e) => { F.sort = e.target.value; draw(true); });
    more.addEventListener('click', (e) => { if (e.target.id === 'bk-load') { shown += PAGE; draw(true); } });
    // 아래로 내리면 저절로 더 불러와요
    const scroller = app.querySelector('.bk-view');
    const io = window.IntersectionObserver ? new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting) && document.getElementById('bk-load')) { shown += PAGE; draw(true); } }, { root: null, rootMargin: '300px' }) : null;
    if (io) io.observe(more);
    const onFav = () => { if (F.fav) draw(false); else side.innerHTML = sideHTML(); };
    document.addEventListener('wt:fav', onFav);
    WT.leaveView = () => { if (io) io.disconnect(); document.removeEventListener('wt:fav', onFav); };
    void scroller;
  }
  WT.views.books = view;
})();
