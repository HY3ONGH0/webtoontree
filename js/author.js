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
    const info = (WT.data.authorInfo || {})[key(me.name)] || {};
    // 네이버 웹툰의 다른 작품 중 웹툰트리에 없는 것
    const have = new Set((WT.data.webtoons || []).map((w) => (w.source || '') + '|' + key(w.title)));
    const tkey = (t) => key(t).replace(/[^0-9a-z가-힣]/g, '');   // 느낌표 · 띄어쓰기 차이는 같은 작품으로 봐요
    const haveTitle = new Set((WT.data.webtoons || []).map((w) => tkey(w.title)));
    const outside = (info.works || []).filter((x) => !haveTitle.has(tkey(x.title)) && !have.has(x.source + '|' + key(x.title)));
    const counts = [['writer', '글'], ['painter', '그림'], ['original', '원작']].map(([r, n]) => (count(r) ? `${n} ${count(r)}` : '')).filter(Boolean).join(' · ');
    app.innerHTML = `<div class="view ap-view">
      <div class="ap-top"><button type="button" class="ap-back" id="ap-back" aria-label="뒤로">←</button><div><b>${esc(me.name)}</b><small>웹툰 ${works.length}편</small></div></div>
      <div class="ap-banner" style="--h:${h}"></div>
      <section class="ap-head">
        <span class="ap-av" style="--h:${h}">${info.img ? `<img src="${esc(info.img)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}${studio ? '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 20V9l5 3V9l5 3V6l8 5v9z"/></svg>' : esc(me.name[0])}</span>
        <h1>${esc(me.name)}${studio ? ' <span class="ap-badge">스튜디오</span>' : ''}</h1>
        ${info.url ? `<a class="ap-follow" href="${esc(info.url)}" target="_blank" rel="noopener">작가 페이지 ↗</a>` : ''}
        <p class="ap-sub">웹툰 ${works.length}편${counts ? ' · ' + counts : ''}${plats.length ? ' · ' + esc(plats.join(', ')) : ''}</p>
        ${info.bio ? `<p class="ap-bio">${esc(info.bio)}</p>` : ''}
        <p class="ap-stats"><span><b>${works.length}</b> 웹툰트리 작품</span>${outside.length ? `<span><b>${outside.length}</b> 다른 작품</span>` : ''}${works.filter((x) => x.w.pick).length ? `<span><b>${works.filter((x) => x.w.pick).length}</b> 관리자 강추</span>` : ''}${works.filter((x) => WT.inTree && WT.inTree(x.w.id)).length ? `<span><b>${works.filter((x) => WT.inTree(x.w.id)).length}</b> 트리 웹툰</span>` : ''}</p>
        ${mates.size ? `<p class="ap-mates"><span>함께 만든 작가</span>${[...mates.values()].map((n) => `<a class="ap-chip" href="${WT.authorHref(n)}">${esc(n)}</a>`).join('')}</p>` : ''}
      </section>
      <nav class="ap-tabs" role="tablist">
        <button type="button" role="tab" aria-selected="true" data-tab="works">작품 <em>${works.length}</em></button>
        ${outside.length ? `<button type="button" role="tab" aria-selected="false" data-tab="out">다른 작품 <em>${outside.length}</em></button>` : ''}
        ${related.length ? `<button type="button" role="tab" aria-selected="false" data-tab="rel">${studio ? '소속 작가' : '스튜디오 · 관련'} <em>${related.reduce((n, o) => n + o.works.length, 0)}</em></button>` : ''}
      </nav>
      <section class="ap-pane" data-pane="works"><div class="ap-grid">${works.map(card).join('')}</div></section>
      ${outside.length ? `<section class="ap-pane" data-pane="out" hidden><p class="ap-note">웹툰트리에는 아직 없는 작품이에요. 누르면 네이버 웹툰에서 열려요.</p><div class="ap-grid">${outside.map((x) => `<a class="ap-card" href="${esc(x.source)}" target="_blank" rel="noopener">
          <span class="ap-cv" style="--c:#55607F"><span class="ap-ini">${esc(x.title)}</span>${x.cover ? `<img src="${esc(x.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="ap-role">↗</span></span>
          <b>${esc(x.title)}</b><small>네이버웹툰${x.finished ? ' · 완결' : ''}</small></a>`).join('')}</div></section>` : ''}
      ${related.length ? `<section class="ap-pane" data-pane="rel" hidden>${related.map((o) => `
        <div class="ap-rel"><a class="ap-rel-h" href="${WT.authorHref(o.name)}"><span class="ap-av sm" style="--h:${hue(o.name)}">${esc(o.name[0])}</span><b>${esc(o.name)}</b><small>웹툰 ${o.works.length}편 ›</small></a>
          <div class="ap-grid">${o.works.map(card).join('')}</div></div>`).join('')}</section>` : ''}
    </div>`;
    document.getElementById('ap-back').addEventListener('click', () => { if (history.length > 1) history.back(); else location.hash = '#/library/all'; });
    app.querySelectorAll('.ap-tabs button').forEach((b) => b.addEventListener('click', () => {
      app.querySelectorAll('.ap-tabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
      app.querySelectorAll('.ap-pane').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
    }));
  }
  if (WT.views) WT.views.author = view;
})();
