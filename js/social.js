/* 회원끼리: 공개 프로필(#/u/공개번호) · 친구 소식(#/feed) · 팔로우
   로그인 아이디는 드러내지 않고, 서버가 만든 공개 번호(pid)로 다른 회원을 가리켜요 */
(function () {
  'use strict';
  const esc = WT.esc;
  WT.userLink = (nick, pid) => (pid ? `<a class="u-link" href="#/u/${esc(pid)}">${esc(nick)}</a>` : esc(nick));
  const libHref = (w) => `#/library/${(w.genres || [])[0] || 'all'}/${w.id}`;
  const cover = (w, small) => `<a class="u-cv${small ? ' sm' : ''}" href="${libHref(w)}" title="${esc(w.title)}" style="--c:${esc(w.color || (WT.genre((w.genres || [])[0]) || {}).color || '#55607F')}"><span>${esc(w.title)}</span>${w.cover ? `<img src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</a>`;
  const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const av = (nick) => `<span class="u-av" style="--h:${hue(nick)}" aria-hidden="true">${esc(String(nick || '?')[0])}</span>`;
  const when = (t) => { const m = String(t || '').match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${Number(m[1])}월 ${Number(m[2])}일` : ''; };
  const shell = (title, sub, body) => `<div class="view u-view">
      <div class="topbar"><div class="left"><button type="button" class="icon-btn press" onclick="history.length > 1 ? history.back() : (location.hash = '#/ranking')" aria-label="뒤로">${WT.icon.back}</button>
        <div class="title-block"><h1>${title}</h1>${sub ? `<span class="sub">${sub}</span>` : ''}</div></div>${WT.topRight()}</div>
      <main class="u-main">${body}</main></div>`;
  const needServer = () => `<p class="u-note">회원 기능이 켜져 있지 않아요.</p>`;

  // ---------- 공개 프로필 ----------
  async function viewUser(parts) {
    const pid = (parts || [])[0] || '';
    const app = document.getElementById('app');
    const S = WT.store.state;
    if (!WT.api.on()) { app.innerHTML = shell('회원 프로필', '', needServer()); return; }
    app.innerHTML = shell('회원 프로필', '', '<p class="u-note">불러오는 중…</p>');
    let p;
    try { p = (await WT.api.call('userProfile', { pid, token: S.token || '' })).profile; }
    catch (e) { app.innerHTML = shell('회원 프로필', '', `<p class="u-note">${esc(e.message)}</p>`); return; }
    const list = { kind: '', html: '' };   // 펼친 팔로워 · 팔로잉 목록
    const openList = async (kind) => {
      if (list.kind === kind) { list.kind = ''; draw(); return; }
      list.kind = kind; list.html = '<p class="u-note">불러오는 중…</p>'; draw();
      try {
        const r = await WT.api.call('followList', { pid, kind, token: S.token || '' });
        if (list.kind !== kind) return;
        list.html = (r.users || []).length ? rowsHTML(r.users) : `<p class="u-note">${kind === 'followers' ? '아직 팔로워가 없어요.' : '아직 팔로우한 사람이 없어요.'}</p>`;
      } catch (e) { list.html = `<p class="u-note">${esc(/알 수 없는 요청/.test(e.message) ? '서버 코드가 예전 버전이에요. 관리자에게 서버 배포를 부탁해 주세요.' : e.message)}</p>`; }
      if (list.kind === kind) draw();
    };
    const draw = () => {
      const recs = (p.recs || []).filter((r) => WT.toon(r.webtoonId));
      const favs = (p.favs || []).map((id) => WT.toon(id)).filter(Boolean);
      const followBtn = p.self ? `<a class="btn press" href="#/me">내 프로필 · 공개 범위</a>`
        : S.profile && S.token ? `<button type="button" class="btn press ${p.iFollow ? '' : 'u-follow'}" id="u-follow">${p.iFollow ? '팔로우 중 ✓' : '+ 팔로우'}</button>`
        : `<a class="btn press" href="#/login">로그인하고 팔로우</a>`;
      app.querySelector('.u-main').innerHTML = `
        <section class="u-card">
          <div class="u-head">${av(p.nickname)}<div><h2>${esc(p.nickname)}</h2><span class="u-stat">${p.open ? `<button type="button" class="u-cnt" data-fl="followers" aria-pressed="${list.kind === 'followers'}">팔로워 <b>${p.followers}</b></button> · <button type="button" class="u-cnt" data-fl="following" aria-pressed="${list.kind === 'following'}">팔로잉 <b>${p.following}</b></button>` : `팔로워 ${p.followers} · 팔로잉 ${p.following}`} · 다 본 웹툰 ${p.done}편</span></div>${followBtn}</div>
          ${list.kind ? `<div class="u-fl"><h3>${p.self ? (list.kind === 'followers' ? '나를 팔로우하는 사람' : '내가 팔로우하는 사람') : list.kind === 'followers' ? `${esc(p.nickname)} 님을 팔로우하는 사람` : `${esc(p.nickname)} 님이 팔로우하는 사람`}</h3><div class="u-find-r">${list.html}</div></div>` : ''}
          ${p.open ? `
          <h3>${esc(p.nickname)} 님의 추천 ${recs.length ? `<small>${recs.length}</small>` : ''}</h3>
          ${recs.length ? `<div class="u-recs">${recs.map((r) => { const w = WT.toon(r.webtoonId); return `<div class="u-rec">${cover(w, true)}<div><a href="${libHref(w)}"><b>${esc(w.title)}</b></a><p>“${esc(r.text)}”</p><small>${when(r.at)}</small></div></div>`; }).join('')}</div>` : '<p class="u-note">아직 남긴 추천이 없어요.</p>'}
          <h3>관심 웹툰 ${favs.length ? `<small>${favs.length}</small>` : ''}</h3>
          ${favs.length ? `<div class="u-favs">${favs.map((w) => cover(w)).join('')}</div>` : '<p class="u-note">관심 웹툰이 없어요.</p>'}`
          : `<p class="u-note">${p.privacy === 'followers' ? '팔로워에게만 공개한 프로필이에요. 팔로우하면 추천과 관심 웹툰이 보여요.' : '비공개 프로필이에요.'}</p>`}
        </section>`;
      app.querySelectorAll('[data-fl]').forEach((b) => b.addEventListener('click', () => openList(b.dataset.fl)));
      const fl = app.querySelector('.u-fl');
      if (fl) bindFollow(fl, (on) => {   // 내 프로필에서 팔로우를 바꾸면 팔로잉 수도 맞춰요
        list.html = fl.querySelector('.u-find-r').innerHTML;
        if (!p.self) return;
        p.following = Math.max(0, p.following + (on ? 1 : -1));
        const c = app.querySelector('[data-fl="following"] b'); if (c) c.textContent = p.following;
      });
      const fb = document.getElementById('u-follow');
      if (fb) fb.addEventListener('click', async () => {
        fb.disabled = true;
        try {
          const r = await WT.api.authed('follow', { pid, on: !p.iFollow });
          p.iFollow = r.following; p.followers = r.followers;
          WT.toast(p.iFollow ? `${p.nickname} 님을 팔로우했어요. 추천이 친구 소식에 떠요` : '팔로우를 그만뒀어요');
          if (p.iFollow && p.privacy === 'followers' && !p.open) { viewUser(parts); return; }
        } catch (e) { if (!e.auth) WT.toast(e.message); }
        draw();
      });
    };
    draw();
  }

  // ---------- 회원 줄 (친구 찾기 · 팔로워 목록이 함께 써요) ----------
  function rowsHTML(us) {
    const S = WT.store.state, can = S.profile && S.token;
    return us.map((u) => `<div class="u-find-it">${av(u.nickname)}<a href="#/u/${esc(u.pid)}" class="u-find-n"><b>${esc(u.nickname)}${u.me ? ' <small>(나)</small>' : ''}</b><small>팔로워 ${u.followers}</small></a>
      ${can && !u.me ? `<button type="button" class="btn btn-sm press ${u.iFollow ? '' : 'u-follow'}" data-fpid="${esc(u.pid)}" data-on="${u.iFollow ? 0 : 1}">${u.iFollow ? '팔로우 중 ✓' : '+ 팔로우'}</button>` : ''}</div>`).join('');
  }
  /** 줄 안의 팔로우 버튼. after(on) 은 팔로우가 바뀐 뒤에 불러요 */
  function bindFollow(box, after) {
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-fpid]'); if (!b) return;
      b.disabled = true;
      try {
        const on = b.dataset.on === '1';
        await WT.api.authed('follow', { pid: b.dataset.fpid, on });
        b.dataset.on = on ? '0' : '1'; b.textContent = on ? '팔로우 중 ✓' : '+ 팔로우'; b.classList.toggle('u-follow', !on);
        WT.toast(on ? '팔로우했어요. 그 사람의 추천이 친구 소식에 떠요' : '팔로우를 그만뒀어요');
        if (after) after(on);
      } catch (er) { if (!er.auth) WT.toast(er.message); }
      b.disabled = false;
    });
  }

  // ---------- 닉네임으로 친구 찾기 ----------
  function findHTML() {
    return `<section class="u-card u-find" aria-label="친구 찾기">
      <h3 style="margin:0">친구 찾기</h3>
      <form class="u-find-f" id="u-find-f" role="search"><label class="sr" for="u-q">닉네임</label>
        <input id="u-q" class="fld" placeholder="닉네임으로 찾기" autocomplete="off" maxlength="20" enterkeyhint="search"><button type="submit" class="btn press">찾기</button></form>
      <div id="u-find-r" class="u-find-r" aria-live="polite"></div>
    </section>`;
  }
  function mountFind(root) {
    const f = root.querySelector('#u-find-f'), q = root.querySelector('#u-q'), out = root.querySelector('#u-find-r');
    if (!f) return;
    const S = WT.store.state;
    let seq = 0, timer = 0, comp = false;
    const run = async () => {
      const v = q.value.trim();
      if (!v) { out.innerHTML = ''; return; }
      const my = ++seq;
      out.innerHTML = '<p class="u-note">찾는 중…</p>';
      let r;
      try { r = await WT.api.call('searchUsers', { q: v, token: S.token || '' }); }
      catch (e) { if (my === seq) out.innerHTML = `<p class="u-note">${esc(/알 수 없는 요청/.test(e.message) ? '서버 코드가 예전 버전이에요. 관리자에게 서버 배포를 부탁해 주세요.' : e.message)}</p>`; return; }
      if (my !== seq) return;
      const us = r.users || [];
      out.innerHTML = us.length ? rowsHTML(us) : `<p class="u-note">"${esc(v)}" 닉네임을 찾지 못했어요.</p>`;
    };
    const soon = () => { clearTimeout(timer); timer = setTimeout(run, 300); };
    f.addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); run(); });
    q.addEventListener('compositionstart', () => { comp = true; });
    q.addEventListener('compositionend', () => { comp = false; soon(); });
    q.addEventListener('input', () => { if (!comp) soon(); });
    bindFollow(out, (on) => { if (on && root.dataset.refeed) viewFeed(); });
  }

  // ---------- 친구 소식 ----------
  async function viewFeed() {
    const app = document.getElementById('app');
    const S = WT.store.state;
    const tabs = `<nav class="rank-switch" aria-label="랭킹 종류"><a href="#/top">웹툰 랭킹</a><a href="#/ranking">독자 랭킹</a><a href="#/feed" aria-current="page">친구 소식</a></nav>`;
    const sh = (body) => shell('친구 소식', '내가 팔로우한 사람들의 추천', `<div class="u-tabs">${tabs}</div>${body}`);
    if (!WT.api.on()) { app.innerHTML = sh(needServer()); return; }
    const keep = (document.getElementById('u-q') || {}).value || '';   // 다시 그려도 검색어는 남겨요
    if (!S.profile || !S.token) { app.innerHTML = sh(findHTML() + '<section class="u-card"><p class="u-note">로그인하면 친구를 팔로우하고, 팔로우한 사람들의 추천을 모아 볼 수 있어요.</p><a class="btn press" href="#/login">로그인</a></section>'); mountFind(app.querySelector('.u-main')); return; }
    app.innerHTML = sh('<p class="u-note">불러오는 중…</p>');
    let r;
    try { r = await WT.api.authed('feed', {}); } catch (e) { if (!e.auth) app.querySelector('.u-main').innerHTML = `<div class="u-tabs">${tabs}</div><p class="u-note">${esc(e.message)}</p>`; return; }
    const items = (r.items || []).filter((x) => WT.toon(x.webtoonId));
    app.querySelector('.u-main').innerHTML = `<div class="u-tabs">${tabs}</div>${findHTML()}<section class="u-card">
      ${items.length ? `<div class="u-feed">${items.map((x) => { const w = WT.toon(x.webtoonId); return `<div class="u-feed-it">${av(x.nickname)}<div class="u-feed-tx"><span><b>${WT.userLink(x.nickname, x.pid)}</b> 님이 <a href="${libHref(w)}"><b>${esc(w.title)}</b></a>을(를) 추천했어요 <small>${when(x.at)}</small></span><p>“${esc(x.text)}”</p></div>${cover(w, true)}</div>`; }).join('')}</div>`
        : `<p class="u-note">${r.following ? '팔로우한 사람들이 아직 추천을 남기지 않았어요.' : '아직 팔로우한 사람이 없어요. 위 친구 찾기나 독자 랭킹 · 댓글에서 닉네임을 눌러 팔로우해 보세요.'}</p><a class="btn press" href="#/ranking">독자 랭킹 보기</a>`}
    </section>`;
    const main = app.querySelector('.u-main');
    main.dataset.refeed = r.following ? '' : '1';   // 처음 팔로우하면 소식을 다시 불러와요
    mountFind(main);
    if (keep) { const qi = document.getElementById('u-q'); qi.value = keep; qi.form.requestSubmit(); }
  }

  WT.views.u = viewUser;
  WT.views.feed = viewFeed;
})();
