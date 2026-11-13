/* 작가 프로필: #/author/<이름> — 그 작가의 웹툰과, 이름이 겹치는 스튜디오(예: LICO ↔ LICO studio) 작품을 함께 보여요 */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ROLE = { writer: '글', painter: '그림', original: '원작' };
  const key = (n) => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // 웹툰의 작가 목록: 새 형식(authors 배열)이 없으면 예전 '작가' 글을 쉼표 · 슬래시로 나눠요
  WT.authorsOf = (w) => {
    if (!w) return [];
    if (Array.isArray(w.authors) && w.authors.length) return w.authors.filter((a) => a && a.name);
    return String(w.author || '').split(/\s*[,/·&]\s*/).map((n) => n.trim()).filter(Boolean).map((name) => ({ name, roles: [] }));
  };
  WT.authorHref = (name) => `#/author/${encodeURIComponent(name)}`;
  WT.authorLinks = (w, sep) => WT.authorsOf(w).map((a) => `<a class="au-link" href="${WT.authorHref(a.name)}">${esc(a.name)}</a>`).join(sep || ', ') || '작가 미상';

  function allAuthors() {
    const m = new Map();
    (WT.data.webtoons || []).forEach((w) => WT.authorsOf(w).forEach((a) => {
      const k = key(a.name);
      if (!m.has(k)) m.set(k, { name: a.name, works: [] });
      m.get(k).works.push({ w, roles: a.roles || [] });
    }));
    return m;
  }
  const hue = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const libHref = (w) => `#/library/${(w.genres || [])[0] || 'all'}/${w.id}`;

  function card(x) {
    const w = x.w;
    const st = WT.schedule.status(w);
    const roles = (x.roles || []).map((r) => ROLE[r]).filter(Boolean).join(' · ');
    return `<a class="ap-card" href="${libHref(w)}" title="${esc(w.title)}">
        <span class="ap-cv" style="--c:${esc(w.color || ((WT.genre((w.genres || [])[0]) || {}).color) || '#55607F')}">
          <span class="ap-ini">${esc(w.title)}</span>
          ${w.cover ? `<img src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
          ${roles ? `<span class="ap-role">${roles}</span>` : ''}
          ${w.pick ? '<span class="ap-pick">강추</span>' : ''}
        </span>
        <b>${esc(w.title)}</b>
        <small>${esc(w.platform || '웹툰')} · ${st === 'completed' ? '완결' : st === 'hiatus' ? '휴재' : '연재 중'}</small>
      </a>`;
  }

  function view(parts) {
    const name = decodeURIComponent((parts || [])[0] || '');
    const all = allAuthors();
    const me = all.get(key(name));
    const app = document.getElementById('app');
    if (!me) {
      app.innerHTML = `<div class="view ap-view"><div class="ap-top"><button type="button" class="ap-back" onclick="history.length > 1 ? history.back() : (location.hash = '#/library/all')" aria-label="뒤로">←</button></div>
        <p class="ap-empty">"${esc(name)}" 작가의 웹툰을 찾지 못했어요.</p></div>`;
      return;
    }
    const works = me.works.slice().sort((a, b) => (b.w.pick ? 1 : 0) - (a.w.pick ? 1 : 0) || WT.recRank(b.w) - WT.recRank(a.w) || a.w.title.localeCompare(b.w.title, 'ko'));
    const count = (r) => works.filter((x) => (x.roles || []).includes(r)).length;
    const plats = [...new Set(works.map((x) => x.w.platform).filter(Boolean))];
    const mates = new Map();
    works.forEach((x) => WT.authorsOf(x.w).forEach((a) => { const k = key(a.name); if (k !== key(me.name)) mates.set(k, a.name); }));
    // 이름이 서로 들어 있는 작가(스튜디오 포함): LICO ↔ LICO studio
    const k0 = key(me.name);
    const related = [...all.values()].filter((o) => { const k = key(o.name); return k !== k0 && k0.length >= 2 && k.length >= 2 && (k.includes(k0) || k0.includes(k)); });
    const studio = /studio|스튜디오/i.test(me.name);
    const h = hue(me.name);
    const info = Object.assign({}, (WT.data.authorInfo || {})[key(me.name)] || {});
    const naverSrc = works.map((x) => x.w.source).filter((u) => /comic\.naver\.com/.test(u || ''));
    // 네이버 웹툰의 다른 작품 중 웹툰트리에 없는 것
    const have = new Set((WT.data.webtoons || []).map((w) => (w.source || '') + '|' + key(w.title)));
    const tkey = (t) => key(t).replace(/[^0-9a-z가-힣]/g, '');   // 느낌표 · 띄어쓰기 차이는 같은 작품으로 봐요
    const haveTitle = new Set((WT.data.webtoons || []).map((w) => tkey(w.title)));
    const outside = (info.works || []).filter((x) => !haveTitle.has(tkey(x.title)) && !have.has(x.source + '|' + key(x.title)));
    const counts = [['writer', '글'], ['painter', '그림'], ['original', '원작']].map(([r, n]) => (count(r) ? `${n} ${count(r)}` : '')).filter(Boolean).join(' · ');
    app.innerHTML = `<div class="view ap-view">
      <section class="ap-hero" style="--h:${h}">
        <div class="ap-hl">
          <div class="ap-mark-row"><button type="button" class="ap-back2" id="ap-back" aria-label="뒤로">←</button></div>
          <span class="ap-photo${info.img ? '' : ' plain'}" style="--h:${h}">${info.img ? `<img src="${esc(info.img)}" alt="${esc(me.name)} 프로필" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('plain'); this.remove()">` : ''}</span>
          <span class="ap-kind">${studio ? 'STUDIO' : 'ARTIST'}${counts ? ` · ${counts}` : ''}</span>
          <h1 class="ap-name">${esc(me.name)}</h1>
          <p class="ap-lead">${info.bio ? esc(info.bio) : `${esc(me.name)}${studio ? '의 작품' : ' 작가의 웹툰'} ${works.length}편이 웹툰트리에 있어요.${plats.length ? ` ${esc(plats.join(', '))}에서 볼 수 있어요.` : ''}`}</p>
          <div class="ap-acts">${info.url ? `<a class="ap-more ap-home" href="${esc(info.url)}" target="_blank" rel="noopener">작가 홈 · 소식 보기 <i aria-hidden="true">→</i></a>` : ''}</div>
          ${mates.size ? `<p class="ap-mates"><span>함께 만든</span>${[...mates.values()].map((n) => `<a class="ap-chip" href="${WT.authorHref(n)}">${esc(n)}</a>`).join('')}</p>` : ''}
        </div>
        <div class="ap-empty-r" aria-hidden="true"></div>
        <div class="ap-band">
          <button type="button" class="ap-down" id="ap-down" aria-label="작품 목록으로">↓</button>
          <span class="ap-count">웹툰 ${works.length}편</span>
        </div>
      </section>
      <nav class="ap-tabs" role="tablist">
        <button type="button" role="tab" aria-selected="true" data-tab="works">작품 <em>${works.length}</em></button>
        ${naverSrc.length || /comic\.naver\.com\/community\//.test(info.url || '') ? `<button type="button" role="tab" aria-selected="false" data-tab="posts">작가 소식</button>` : ''}
        ${outside.length ? `<button type="button" role="tab" aria-selected="false" data-tab="out">다른 작품 <em>${outside.length}</em></button>` : ''}
        ${related.length ? `<button type="button" role="tab" aria-selected="false" data-tab="rel">${studio ? '소속 작가' : '스튜디오 · 관련'} <em>${related.reduce((n, o) => n + o.works.length, 0)}</em></button>` : ''}
      </nav>
      <section class="ap-pane" data-pane="works"><div class="ap-grid">${works.map(card).join('')}</div></section>
      <section class="ap-pane" data-pane="posts" hidden><div id="ap-posts" class="ap-posts"><p class="ap-note">불러오는 중…</p></div></section>
      ${outside.length ? `<section class="ap-pane" data-pane="out" hidden><p class="ap-note">웹툰트리에는 아직 없는 작품이에요. 누르면 네이버 웹툰에서 열려요.</p><div class="ap-grid">${outside.map((x) => `<a class="ap-card" href="${esc(x.source)}" target="_blank" rel="noopener">
          <span class="ap-cv" style="--c:#55607F"><span class="ap-ini">${esc(x.title)}</span>${x.cover ? `<img src="${esc(x.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="ap-role">↗</span></span>
          <b>${esc(x.title)}</b><small>네이버웹툰${x.finished ? ' · 완결' : ''}</small></a>`).join('')}</div></section>` : ''}
      ${related.length ? `<section class="ap-pane" data-pane="rel" hidden>${related.map((o) => `
        <div class="ap-rel"><a class="ap-rel-h" href="${WT.authorHref(o.name)}"><span class="ap-av sm" style="--h:${hue(o.name)}">${esc(o.name[0])}</span><b>${esc(o.name)}</b><small>웹툰 ${o.works.length}편 ›</small></a>
          <div class="ap-grid">${o.works.map(card).join('')}</div></div>`).join('')}</section>` : ''}
    </div>`;
    document.getElementById('ap-back').addEventListener('click', () => { if (history.length > 1) history.back(); else location.hash = '#/library/all'; });

    // 작가 소식: 네이버 웹툰 작가 홈의 최근 글 (제목 · 미리보기 · 원문 링크)
    let postsLoaded = false, fetched = null;
    const home = () => fetched && fetched.url ? fetched.url : info.url || '';
    const linkOut = () => (home() ? ` <a href="${esc(home())}" target="_blank" rel="noopener">네이버 웹툰 작가 홈에서 보기 ↗</a>` : '');
    // 프로필 사진 · 작가 홈 · 소식을 서버에서 한 번에 가져와요 (네이버 작품이 있는 작가만)
    const fetchAuthor = () => {
      if (fetched || !WT.api || !WT.api.on() || !(naverSrc.length || info.url)) return Promise.resolve(fetched);
      fetched = WT.api.call('authorPosts', { name: me.name, url: info.url || '', sources: naverSrc }).then((r) => { fetched = r; return r; }, () => { fetched = { posts: [], error: true }; return fetched; });
      return fetched;
    };
    const applyPhoto = (r) => {
      const a = r && r.artist;
      if (!a) return;
      const ph = app.querySelector('.ap-photo');
      if (a.img && ph && !ph.querySelector('img')) { ph.classList.remove('plain'); ph.innerHTML = `<img src="${esc(a.img)}" alt="${esc(me.name)} 프로필" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('plain'); this.remove()">`; }
      const lead = app.querySelector('.ap-lead');
      if (a.bio && lead && !info.bio) lead.textContent = a.bio;
      const acts = app.querySelector('.ap-acts');
      if (a.url && acts && !acts.querySelector('.ap-home')) acts.innerHTML = `<a class="ap-more ap-home" href="${esc(a.url)}" target="_blank" rel="noopener">작가 홈 · 소식 보기 <i aria-hidden="true">→</i></a>`;
    };
    if (!info.img || !info.url) Promise.resolve(fetchAuthor()).then(applyPhoto);
    async function loadPosts() {
      if (postsLoaded) return;
      postsLoaded = true;
      const box = document.getElementById('ap-posts');
      if (!WT.api || !WT.api.on()) { box.innerHTML = `<p class="ap-note">서버가 연결되어 있지 않아 소식을 불러오지 못했어요.${linkOut()}</p>`; return; }
      const r = await fetchAuthor();
      applyPhoto(r);
      const ps = (r && r.posts) || [];
      const img = (r && r.artist && r.artist.img) || info.img || '';
      if (ps.length) {
        box.innerHTML = ps.map((x) => `<a class="ap-post" href="${esc(x.url)}" target="_blank" rel="noopener">
            <span class="ap-pav${img && !x.system ? '' : ' plain'}" style="--h:${x.system ? 140 : h}">${img && !x.system ? `<img src="${esc(img)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
            <span class="ap-pbody"><span class="ap-phead"><b>${x.system ? '네이버웹툰' : esc(me.name)}</b>${x.date ? `<small>${esc(x.date)}</small>` : ''}${x.pinned ? '<small class="ap-pin">고정</small>' : ''}</span>
              ${x.title ? `<strong>${esc(x.title)}</strong>` : ''}${x.excerpt ? `<p>${esc(x.excerpt)}</p>` : ''}
              ${x.img ? `<span class="ap-pimg"><img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()">${x.images > 1 ? `<i>+${x.images - 1}</i>` : ''}</span>` : ''}
              <span class="ap-pfoot">${x.likes ? `<i>♡ ${x.likes}</i>` : ''}${x.comments ? `<i>💬 ${x.comments}</i>` : ''}<em>원문 보기 ↗</em></span></span></a>`).join('')
          + (home() ? `<a class="ap-pall" href="${esc(home())}" target="_blank" rel="noopener">작가 홈에서 모든 글 보기 ↗</a>` : '');
      } else {
        const why = !r || r.error ? '소식을 불러오지 못했어요. 서버 코드가 예전 버전일 수 있어요.' : r.reason === 'no-home' ? '이 작가의 네이버 웹툰 작가 홈을 찾지 못했어요.' : '아직 가져온 소식이 없어요.';
        box.innerHTML = `<p class="ap-note">${why}${linkOut()}</p>`;
      }
    }
    document.getElementById('ap-down').addEventListener('click', () => { const t = app.querySelector('.ap-tabs'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

    app.querySelectorAll('.ap-tabs button').forEach((b) => b.addEventListener('click', () => {
      app.querySelectorAll('.ap-tabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
      app.querySelectorAll('.ap-pane').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
      if (b.dataset.tab === 'posts') loadPosts();
    }));
  }
  // 작가 소식 글: 사이트 위에 작은 창으로 네이버 원문을 열어요 (창이 막히면 새 탭)
  WT.openPost = (url) => {
    const w = Math.min(560, screen.availWidth - 40), h = Math.min(820, screen.availHeight - 60);
    const left = Math.round((window.screenX || 0) + Math.max(0, (window.outerWidth - w) / 2));
    const top = Math.round((window.screenY || 0) + Math.max(0, (window.outerHeight - h) / 2));
    let win = null;
    if (window.innerWidth > 760) { try { win = window.open(url, 'wt-post', `popup=yes,width=${w},height=${h},left=${left},top=${top}`); } catch (e) { win = null; } }
    if (!win) win = window.open(url, '_blank', 'noopener');
    if (win) { try { win.focus(); } catch (e) { /* 다른 창 */ } }
    return !!win;
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.ap-post, a.ap-pall, a.ap-home');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    WT.openPost(a.href);
  });
  if (WT.views) WT.views.author = view;
})();
