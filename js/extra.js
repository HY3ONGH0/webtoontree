/* 덧붙인 화면: 이달의 웹툰 투표(#/vote) · 시즌 이벤트(#/event) · 사이트 소개(#/about) · 홈 화면의 출석 · 시즌 알림 */
(function () {
  'use strict';
  const esc = WT.esc;
  const old = (m) => (/알 수 없는 요청/.test(m) ? '서버 코드가 예전 버전이에요. 관리자에게 서버 배포를 부탁해 주세요.' : m);
  const libHref = (w) => `#/library/${(w.genres || [])[0] || 'all'}/${w.id}`;
  const cover = (w) => `<a class="u-cv sm" href="${libHref(w)}" title="${esc(w.title)}" style="--c:${esc(w.color || (WT.genre((w.genres || [])[0]) || {}).color || '#55607F')}"><span>${esc(w.title)}</span>${w.cover ? `<img src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</a>`;
  const md = (d) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
  const shell = (title, sub, body, back) => `<div class="view u-view">
      <div class="topbar"><div class="left"><button type="button" class="icon-btn press" onclick="history.length > 1 ? history.back() : (location.hash = '${back || '#/'}')" aria-label="뒤로">${WT.icon.back}</button>
        <div class="title-block"><h1>${title}</h1>${sub ? `<span class="sub">${sub}</span>` : ''}</div></div>${WT.topRight()}</div>
      <main class="u-main">${body}</main></div>`;

  /** 랭킹 화면들 위의 탭 */
  WT.rankTabs = (cur) => `<nav class="rank-switch" aria-label="랭킹 종류">${[['top', '웹툰 랭킹'], ['ranking', '독자 랭킹'], ['vote', '이달의 투표'], ['feed', '친구 소식']].map(([k, n]) => `<a href="#/${k}"${cur === k ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>`;

  // ---------- 이달의 웹툰 투표 ----------
  async function viewVote() {
    const app = document.getElementById('app'), S = WT.store.state;
    const tabs = `<div class="u-tabs">${WT.rankTabs('vote')}</div>`;
    const sh = (b) => shell('이달의 웹툰', '회원들이 뽑는 이번 달 최고의 웹툰', tabs + b, '#/ranking');
    if (!WT.api.on()) { app.innerHTML = sh('<p class="u-note">회원 기능이 켜져 있지 않아요.</p>'); return; }
    app.innerHTML = sh('<p class="u-note">불러오는 중…</p>');
    let r, q = '';
    const load = async (wid) => { r = await (wid ? WT.api.authed('voteMonth', { webtoonId: wid }) : WT.api.call('voteMonth', { token: S.token || '' })); };
    try { await load(); } catch (e) { app.querySelector('.u-main').innerHTML = tabs + `<p class="u-note">${esc(old(e.message))}</p>`; return; }
    const can = !!(S.profile && S.token);
    const draw = () => {
      const m = Number(r.month.slice(5, 7)), last = new Date(Date.UTC(+r.month.slice(0, 4), m, 0)).getUTCDate();
      const top = (r.top || []).filter((x) => WT.toon(x.webtoonId)), max = top.length ? top[0].n : 1;
      const row = (w, n, i) => `<div class="vt-row">${i == null ? '' : `<span class="vt-rk${i === 0 ? ' g' : ''}">${i + 1}</span>`}${cover(w)}
          <div class="vt-nm"><a href="${libHref(w)}"><b>${esc(w.title)}</b></a><small>${n ? `${n}표 · ${Math.round(n / (r.total || 1) * 100)}%` : esc(WT.authorsOf(w).map((a) => a.name).join(', '))}</small>${n ? `<i class="vt-bar"><em style="width:${Math.max(4, Math.round(n / max * 100))}%"></em></i>` : ''}</div>
          ${can ? (r.mine === w.id ? '<span class="btn btn-sm vt-mine">내 표 ✓</span>' : `<button type="button" class="btn btn-sm press" data-vote="${w.id}">${r.mine ? '여기로 바꾸기' : '투표'}</button>`) : ''}</div>`;
      const key = q.replace(/\s+/g, '').toLowerCase();
      const found = key ? WT.data.webtoons.filter((w) => w.title.replace(/\s+/g, '').toLowerCase().includes(key)).slice(0, 8) : [];
      const past = (r.past || []).filter((x) => WT.toon(x.webtoonId));
      app.querySelector('.u-main').innerHTML = `${tabs}
        <section class="u-card"><h3 style="margin-top:0">${m}월의 웹툰 <small>${m}월 ${last}일 마감 · 총 ${r.total}표</small></h3>
          <p class="u-note" style="margin:0 0 6px">한 달에 한 표예요. 마감 전까지는 바꿀 수 있어요.${can ? '' : ' <a href="#/login">로그인</a>하면 투표할 수 있어요.'}</p>
          ${top.length ? top.map((x, i) => row(WT.toon(x.webtoonId), x.n, i)).join('') : '<p class="u-note">아직 표가 없어요. 첫 표의 주인공이 되어 보세요!</p>'}
          ${can ? `<form class="u-find-f" id="vt-f" role="search" style="margin-top:14px"><label class="sr" for="vt-q">웹툰 제목</label><input id="vt-q" class="fld" placeholder="다른 웹툰 찾아서 투표" autocomplete="off" value="${esc(q)}" enterkeyhint="search"><button type="submit" class="btn press">찾기</button></form>
          <div id="vt-found">${key ? (found.length ? found.map((w) => row(w, 0, null)).join('') : `<p class="u-note">"${esc(q)}" 웹툰을 찾지 못했어요.</p>`) : ''}</div>` : ''}
        </section>
        ${past.length ? `<section class="u-card"><h3 style="margin-top:0">역대 이달의 웹툰</h3><div class="vt-past">${past.map((x) => { const w = WT.toon(x.webtoonId); return `<div>${cover(w)}<small>${Number(x.month.slice(0, 4))}년 ${Number(x.month.slice(5, 7))}월</small><b>${esc(w.title)}</b></div>`; }).join('')}</div></section>` : ''}`;
      const f = document.getElementById('vt-f');
      if (f) f.addEventListener('submit', (e) => { e.preventDefault(); q = document.getElementById('vt-q').value.trim(); draw(); const i = document.getElementById('vt-q'); if (i) i.focus(); });
      app.querySelectorAll('[data-vote]').forEach((b) => b.addEventListener('click', async () => {
        b.disabled = true;
        try { await load(b.dataset.vote); q = ''; WT.toast(`${WT.toon(b.dataset.vote).title}에 투표했어요`); draw(); }
        catch (e) { b.disabled = false; if (!e.auth) WT.toast(old(e.message)); }
      }));
    };
    draw();
  }

  // ---------- 시즌 이벤트 ----------
  const MISSION = { eps: (m) => `${m.genre && WT.genre(m.genre) ? WT.genre(m.genre).name + ' ' : ''}웹툰 ${m.n}화 보기`, attend: (m) => `${m.n}일 출석하기`, done: (m) => `웹툰 ${m.n}편 완독하기`, rec: (m) => `추천 한 줄 ${m.n}개 남기기` };
  WT.missionText = (m) => (MISSION[m.type] || MISSION.eps)(m);
  async function viewEvent() {
    const app = document.getElementById('app'), S = WT.store.state;
    const now = WT.skin.seasonNow();
    if (!now) { app.innerHTML = shell('시즌 이벤트', '', '<section class="u-card"><p class="u-note">지금 진행 중인 시즌 이벤트가 없어요. 다음 시즌을 기다려 주세요!</p><a class="btn press" href="#/">홈으로</a></section>'); return; }
    const s = now.season, bg = WT.data.shop.find((i) => i.id === s.bg), rw = WT.data.shop.find((i) => i.id === s.reward);
    const banner = `<section class="ev-hero bg-box">${bg ? WT.skin.thumb(bg, 16) : ''}<div><span class="ev-date">${md(now.from)} ~ ${md(now.to)}</span><h2>${esc(s.name)} 이벤트</h2><p>미션을 깨고 코인${rw ? `과 한정 ${rw.kind === 'bg' ? '배경' : '아이템'} '${esc(rw.name)}'` : ''}을 받아요 · ${now.left ? `${now.left}일 남음` : '오늘까지'}</p></div></section>`;
    const sh = (b) => shell(`${esc(s.name)} 이벤트`, `${md(now.from)} ~ ${md(now.to)}`, banner + b);
    if (!WT.api.on() || !S.token) { app.innerHTML = sh(`<section class="u-card"><h3 style="margin-top:0">미션</h3>${(s.missions || []).map((m) => `<div class="ev-ms"><div class="ev-t"><b>${esc(WT.missionText(m))}</b><small>보상 ${m.reward} 코인</small></div></div>`).join('')}<p class="u-note">로그인하면 미션에 참여할 수 있어요.</p><a class="btn press" href="#/login">로그인</a></section>`); return; }
    app.innerHTML = sh('<p class="u-note">불러오는 중…</p>');
    let ev;
    const draw = () => {
      const ms = ev.missions, all = ms.length && ms.every((m) => m.have >= m.n);
      const doneN = ms.filter((m) => m.have >= m.n).length;
      app.querySelector('.u-main').innerHTML = banner + `<section class="u-card"><h3 style="margin-top:0">미션 <small>${doneN} / ${ms.length} 완료</small></h3>
        ${ms.map((m, i) => `<div class="ev-ms"><div class="ev-t"><b>${esc(WT.missionText(m))}</b><small>보상 ${m.reward} 코인</small></div>
          <i class="ev-bar"><em style="width:${Math.round(m.have / m.n * 100)}%"></em></i>
          ${m.claimed ? '<span class="ev-st got">받음 ✓</span>' : m.have >= m.n ? `<button type="button" class="btn btn-sm u-follow press" data-claim="${i}">받기</button>` : `<span class="ev-st">${m.have} / ${m.n}</span>`}</div>`).join('')}
        ${rw ? `<div class="ev-final"><span class="ev-rw bg-box">${rw.kind === 'bg' ? WT.skin.thumb(rw, 5) : rw.kind === 'tree' ? WT.skin.treeThumb(rw, 80, 50) : WT.charSVG({ acc: rw.acc, body: rw.body, feet: rw.feet }, 44)}</span>
          <div><b>미션 ${ms.length}개를 모두 깨면</b><small>한정 ${({ bg: '배경', tree: '트리 디자인', color: '몸 색' })[rw.kind] || '장식'} '${esc(rw.name)}'</small></div>
          ${ev.finalClaimed ? '<span class="ev-st got">받음 ✓</span>' : all ? '<button type="button" class="btn btn-sm u-follow press" data-claim="final">받기</button>' : '<span class="ev-st">한정</span>'}</div>` : ''}
      </section>
      <p class="u-note" style="text-align:center">이벤트 기간에 한 기록만 세요. ${esc(s.name)} 한정 아이템은 <a href="#/me">꾸미기</a>에서 살 수 있어요.</p>`;
      app.querySelectorAll('[data-claim]').forEach((b) => b.addEventListener('click', async () => {
        b.disabled = true;
        try {
          const c = b.dataset.claim, r = await WT.api.authed('event', { claim: c === 'final' ? 'final' : Number(c) });
          ev = r.event; if (r.me) WT.api.applyMe(r.me);
          if (r.got) WT.toast(`'${(WT.data.shop.find((i) => i.id === r.got) || {}).name}' 을(를) 받았어요! 꾸미기에서 착용해 보세요`); else WT.popCoin(`+${r.gain} 코인 · 미션 완료`);
          draw();
        } catch (e) { b.disabled = false; if (!e.auth) WT.toast(old(e.message)); }
      }));
    };
    try { ev = (await WT.api.authed('event', {})).event; } catch (e) { if (!e.auth) app.querySelector('.u-main').innerHTML = banner + `<p class="u-note">${esc(old(e.message))}</p>`; return; }
    if (!ev) { app.querySelector('.u-main').innerHTML = '<p class="u-note">지금 진행 중인 이벤트가 없어요.</p>'; return; }
    draw();
  }

  // ---------- 사이트 소개 · 이용약관 · 개인정보 ----------
  function viewAbout(parts) {
    const tab = { terms: 'terms', privacy: 'privacy' }[(parts || [])[0]] || 'about';
    const st = WT.settings(), name = esc(st.siteName || '웹툰트리');
    const mails = (st.contact || []).map((m) => `<a href="mailto:${esc(m)}">${esc(m)}</a>`).join(' · ');
    const rules = st.coins || {};
    const PAGES = {
      about: `<h2>${name}는</h2><p>수많은 웹툰 중에 볼 만한 것만 골라, 순서대로 따라갈 수 있게 정리한 웹툰 추천 사이트예요.</p>
        <h3>이렇게 써요</h3><ol><li><b>트리</b>에서 장르를 고르면 입문작부터 이어 볼 순서가 보여요.</li><li><b>도서관 · 요일</b>에서 전체 웹툰과 요일별 연재를 둘러봐요.</li><li>본 화수를 기록하면 <b>코인</b>이 쌓이고, 코인으로 캐릭터 · 배경 · 트리를 꾸며요.</li><li>친구를 팔로우하고 추천 한 줄, 이달의 웹툰 투표로 함께 즐겨요.</li></ol>
        <h3>알아 두세요</h3><p>웹툰은 각 공식 플랫폼(네이버웹툰, 카카오페이지 등)에서 봐요. ${name}는 작품을 직접 싣지 않고 공식 페이지로 안내만 해요. 표지 · 제목 · 작품 정보의 권리는 각 작가와 플랫폼에 있어요.</p>
        <h3>만든 사람들</h3><p>김형호 · 신효제 · 이유섭</p>
        ${mails ? `<h3>문의</h3><p>${mails}</p>` : ''}`,
      terms: `<h2>이용약관</h2><p class="ab-d">${name}를 이용하면 아래 내용에 동의한 것으로 봐요.</p>
        <h3>1. 서비스</h3><p>${name}는 웹툰 추천 · 감상 기록 · 회원 간 추천 공유를 제공하는 무료 서비스예요. 학생들이 만들어 운영하는 사이트라 예고 없이 기능이 바뀌거나 잠시 멈출 수 있어요.</p>
        <h3>2. 계정</h3><p>아이디와 비밀번호는 본인이 관리해요. 다른 사람의 계정을 쓰거나, 한 사람이 랭킹 · 투표를 조작하려고 여러 계정을 만들면 안 돼요.</p>
        <h3>3. 코인과 아이템</h3><p>코인은 화수 기록(1화에 ${rules.perEpisode || 1}코인, 하루 ${rules.dailyEpisodeCap || 50}화까지) · 완독 · 출석 · 이벤트로 얻는 사이트 안의 점수예요. 돈으로 사고팔 수 없고, 현금이나 다른 것으로 바꿀 수 없어요. 실제로 보지 않은 화수를 기록해 얻은 코인과 순위는 되돌릴 수 있어요.</p>
        <h3>4. 글과 닉네임</h3><p>댓글 · 추천 · 소개글 · 닉네임에 욕설, 비방, 광고, 스포일러 도배, 개인정보를 쓰면 안 돼요. 그런 글은 관리자가 가리거나 지울 수 있고, 반복되면 계정 이용을 멈출 수 있어요.</p>
        <h3>5. 저작권</h3><p>웹툰의 표지와 정보는 각 권리자의 것이고, ${name}는 공식 페이지로 연결만 해요. 불법 공유 사이트 주소를 올리면 안 돼요. 권리자가 요청하면 해당 정보를 바로 내려요.</p>
        <h3>6. 탈퇴</h3><p>내 프로필에서 언제든 탈퇴할 수 있어요. 탈퇴하면 기록 · 코인 · 아이템은 지워지고 되살릴 수 없어요. 남긴 댓글은 '탈퇴한 사용자'로 남아요.</p>
        <h3>7. 책임</h3><p>${name}는 외부 플랫폼의 작품 내용 · 유료 결제 · 서비스 장애에 책임지지 않아요.</p>
        ${mails ? `<h3>문의</h3><p>${mails}</p>` : ''}`,
      privacy: `<h2>개인정보 안내</h2><p class="ab-d">${name}가 모으는 정보는 아래가 전부예요.</p>
        <h3>모으는 정보</h3><ul><li><b>아이디 · 닉네임 · 비밀번호</b> (비밀번호는 알아볼 수 없게 바꿔서 저장해요)</li><li><b>사이트 안 활동</b>: 본 화수, 별점, 댓글, 추천, 투표, 출석, 코인, 팔로우</li></ul>
        <p>이름 · 전화번호 · 이메일 · 주소 같은 정보는 받지 않아요.</p>
        <h3>쓰는 곳</h3><p>로그인, 기록 이어 보기, 랭킹 · 투표 · 친구 소식을 보여 주는 데에만 써요. 광고에 쓰거나 다른 곳에 넘기지 않아요.</p>
        <h3>다른 사람에게 보이는 것</h3><p>닉네임, 꾸민 캐릭터, 랭킹 순위, 댓글과 추천은 다른 회원에게 보여요. 로그인 아이디는 보이지 않아요. 프로필(추천 · 관심 웹툰 · 소개글)은 내 프로필에서 '전체 / 팔로워만 / 나만'으로 공개 범위를 고를 수 있어요.</p>
        <h3>보관과 삭제</h3><p>정보는 운영자의 구글 스프레드시트에 저장돼요. 탈퇴하면 계정 정보와 기록을 바로 지워요.</p>
        ${mails ? `<h3>문의</h3><p>${mails}</p>` : ''}`
    };
    const logged = !!(WT.store.state.profile || WT.store.state.guest);
    document.getElementById('app').innerHTML = `<div class="view u-view">
      <div class="topbar"><div class="left"><button type="button" class="icon-btn press" onclick="history.length > 1 ? history.back() : (location.hash = '${logged ? '#/' : '#/login'}')" aria-label="뒤로">${WT.icon.back}</button>
        <div class="title-block"><h1>${name} 안내</h1></div></div>${logged ? WT.topRight() : `<div class="right">${WT.themeBtn()}</div>`}</div>
      <main class="u-main"><section class="u-card ab">
        <nav class="ab-tabs" aria-label="안내 종류">${[['about', '소개', ''], ['terms', '이용약관', '/terms'], ['privacy', '개인정보 안내', '/privacy']].map(([k, n, h]) => `<a href="#/about${h}"${tab === k ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
        ${PAGES[tab]}</section></main></div>`;
  }

  // ---------- 홈 화면: 시즌 알림 · 출석 ----------
  /** 홈 화면 아래에 붙는 알약들 (시즌 이벤트 · 출석 체크 · 안내 링크) */
  WT.homeExtras = function () {
    const S = WT.store.state, now = WT.skin.seasonNow();
    const srv = WT.api.on() && S.token;
    const done = ((S.attend || {}).last || '') === WT.store.today();
    const streak = (S.attend || {}).streak || 0;
    const rewards = (WT.settings().attend && WT.settings().attend.length ? WT.settings().attend : [2, 2, 3, 3, 4, 4, 20]);
    return `<div class="hm-extra">
      ${now ? `<a class="hm-pill ev" href="#/event"><b>${esc(now.season.name)} 이벤트</b>${now.left ? `${now.left}일 남음` : '오늘까지'} · 미션 보기 →</a>` : ''}
      ${srv ? (done ? `<a class="hm-pill" href="#/me"><b>출석 완료 ✓</b>${streak}일 연속</a>` : `<button type="button" class="hm-pill att press" id="hm-att"><b>출석 체크</b>오늘 +${rewards[streak % rewards.length]} 코인 받기</button>`) : ''}
    </div>`;
  };
  WT.homeFoot = () => `<p class="hm-foot"><a href="#/about">소개</a><a href="#/about/terms">이용약관</a><a href="#/about/privacy">개인정보 안내</a></p>`;
  WT.bindHomeExtras = function (redraw) {
    const b = document.getElementById('hm-att');
    if (b) b.addEventListener('click', async () => {
      b.disabled = true;
      try { const r = await WT.api.authed('attend', {}); WT.api.applyMe(r.me); WT.popCoin(`+${r.gain} 코인 · ${r.streak}일 연속 출석`); if (redraw) redraw(); }
      catch (e) { b.disabled = false; if (!e.auth) WT.toast(old(e.message)); }
    });
  };

  WT.views.vote = viewVote;
  WT.views.event = viewEvent;
  WT.views.about = viewAbout;
})();
