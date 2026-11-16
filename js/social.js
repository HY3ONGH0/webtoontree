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
    const draw = () => {
      const recs = (p.recs || []).filter((r) => WT.toon(r.webtoonId));
      const favs = (p.favs || []).map((id) => WT.toon(id)).filter(Boolean);
      const followBtn = p.self ? `<a class="btn press" href="#/me">내 프로필 · 공개 범위</a>`
        : S.profile && S.token ? `<button type="button" class="btn press ${p.iFollow ? '' : 'u-follow'}" id="u-follow">${p.iFollow ? '팔로우 중 ✓' : '+ 팔로우'}</button>`
        : `<a class="btn press" href="#/login">로그인하고 팔로우</a>`;
      app.querySelector('.u-main').innerHTML = `
        <section class="u-card">
          <div class="u-head">${av(p.nickname)}<div><h2>${esc(p.nickname)}</h2><span>팔로워 ${p.followers} · 팔로잉 ${p.following} · 다 본 웹툰 ${p.done}편</span></div>${followBtn}</div>
          ${p.open ? `
          <h3>${esc(p.nickname)} 님의 추천 ${recs.length ? `<small>${recs.length}</small>` : ''}</h3>
          ${recs.length ? `<div class="u-recs">${recs.map((r) => { const w = WT.toon(r.webtoonId); return `<div class="u-rec">${cover(w, true)}<div><a href="${libHref(w)}"><b>${esc(w.title)}</b></a><p>“${esc(r.text)}”</p><small>${when(r.at)}</small></div></div>`; }).join('')}</div>` : '<p class="u-note">아직 남긴 추천이 없어요.</p>'}
          <h3>관심 웹툰 ${favs.length ? `<small>${favs.length}</small>` : ''}</h3>
          ${favs.length ? `<div class="u-favs">${favs.map((w) => cover(w)).join('')}</div>` : '<p class="u-note">관심 웹툰이 없어요.</p>'}`
          : `<p class="u-note">${p.privacy === 'followers' ? '팔로워에게만 공개한 프로필이에요. 팔로우하면 추천과 관심 웹툰이 보여요.' : '비공개 프로필이에요.'}</p>`}
        </section>`;
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

  // ---------- 친구 소식 ----------
  async function viewFeed() {
    const app = document.getElementById('app');
    const S = WT.store.state;
    const tabs = `<nav class="rank-switch" aria-label="랭킹 종류"><a href="#/top">웹툰 랭킹</a><a href="#/ranking">독자 랭킹</a><a href="#/feed" aria-current="page">친구 소식</a></nav>`;
    const sh = (body) => shell('친구 소식', '내가 팔로우한 사람들의 추천', `<div class="u-tabs">${tabs}</div>${body}`);
    if (!WT.api.on()) { app.innerHTML = sh(needServer()); return; }
    if (!S.profile || !S.token) { app.innerHTML = sh('<section class="u-card"><p class="u-note">로그인하면 팔로우한 사람들의 추천을 모아 볼 수 있어요.</p><a class="btn press" href="#/login">로그인</a></section>'); return; }
    app.innerHTML = sh('<p class="u-note">불러오는 중…</p>');
    let r;
    try { r = await WT.api.authed('feed', {}); } catch (e) { if (!e.auth) app.querySelector('.u-main').innerHTML = `<div class="u-tabs">${tabs}</div><p class="u-note">${esc(e.message)}</p>`; return; }
    const items = (r.items || []).filter((x) => WT.toon(x.webtoonId));
    app.querySelector('.u-main').innerHTML = `<div class="u-tabs">${tabs}</div><section class="u-card">
      ${items.length ? `<div class="u-feed">${items.map((x) => { const w = WT.toon(x.webtoonId); return `<div class="u-feed-it">${av(x.nickname)}<div class="u-feed-tx"><span><b>${WT.userLink(x.nickname, x.pid)}</b> 님이 <a href="${libHref(w)}"><b>${esc(w.title)}</b></a>을(를) 추천했어요 <small>${when(x.at)}</small></span><p>“${esc(x.text)}”</p></div>${cover(w, true)}</div>`; }).join('')}</div>`
        : `<p class="u-note">${r.following ? '팔로우한 사람들이 아직 추천을 남기지 않았어요.' : '아직 팔로우한 사람이 없어요. 독자 랭킹이나 댓글에서 닉네임을 눌러 팔로우해 보세요.'}</p><a class="btn press" href="#/ranking">독자 랭킹 보기</a>`}
    </section>`;
  }

  WT.views.u = viewUser;
  WT.views.feed = viewFeed;
})();
