/* 캐릭터 상점과 랭킹 */
(function () {
  const esc = WT.esc;

  // ---------- 상점 ----------
  function viewShop() {
    const S = WT.store.state;
    const items = WT.data.shop;
    let tab = 'all';
    let preview = S.equip.acc || 'basic';
    let recSpan = 'month';   // 내 기록: 이번 달 | 전체
    let calM = WT.store.today().slice(0, 7);   // 기록 달력에 보이는 달

    // ---------- 출석 체크 ----------
    function attHTML() {
      if (!(WT.api.on() && S.token)) return '';
      const a = S.attend || { last: '', streak: 0, days: [] };
      const rewards = (WT.settings().attend && WT.settings().attend.length ? WT.settings().attend : [2, 2, 3, 3, 4, 4, 20]);
      const done = a.last === WT.store.today();
      const streak = a.streak || 0;
      const pos = done ? ((streak - 1) % rewards.length) : (streak % rewards.length);   // 오늘 받을(받은) 칸
      return `<div class="rec-box att"><small>출석 체크${streak ? ` · <b class="att-fire">${streak}일 연속</b>` : ''}</small>
        <div class="att-row">${rewards.map((n, i) => `<span class="att-d${i < pos || (done && i === pos) ? ' ok' : ''}${i === pos ? ' today' : ''}${i === rewards.length - 1 ? ' big' : ''}"><i>${i === pos ? '오늘' : `${i + 1}일`}</i><b>+${n}</b></span>`).join('')}</div>
        <button type="button" class="btn ${done ? '' : 'u-follow'} press" id="att-go" ${done ? 'disabled' : ''}>${done ? '오늘 출석 완료 ✓' : `오늘 출석하고 +${rewards[pos]} 코인`}</button>
        <p class="rec-empty">하루 빠지면 1일부터 다시 시작해요. ${rewards.length}일을 채우면 처음으로 돌아가 계속 받아요.</p></div>`;
    }
    // ---------- 기록 달력 ----------
    function calHTML() {
      const today = WT.store.today();
      const [y, m] = calM.split('-').map(Number);
      const first = new Date(Date.UTC(y, m - 1, 1)), days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const lead = (first.getUTCDay() + 6) % 7;   // 월요일부터
      const eps = {}; (S.log || []).forEach((e) => { if (e.t === 'ep' && e.d.slice(0, 7) === calM) eps[e.d] = (eps[e.d] || 0) + e.n; });
      const att = new Set(((S.attend || {}).days || []).filter((d) => d.slice(0, 7) === calM));
      const shift = (k) => { const d = new Date(Date.UTC(y, m - 1 + k, 1)); return d.toISOString().slice(0, 7); };
      const cells = Array.from({ length: lead }, () => '<span class="e"></span>').concat(Array.from({ length: days }, (_, i) => {
        const d = `${calM}-${String(i + 1).padStart(2, '0')}`, n = eps[d] || 0;
        return `<span class="${n >= 30 ? 'l3' : n >= 10 ? 'l2' : n ? 'l1' : ''}${att.has(d) ? ' at' : ''}${d === today ? ' now' : ''}" title="${m}월 ${i + 1}일${n ? ` · ${n}화` : ''}${att.has(d) ? ' · 출석' : ''}">${i + 1}</span>`;
      }));
      return `<div class="rec-box cal"><small>${y}년 ${m}월 기록 달력</small>
        <div class="cal-nav"><button type="button" class="press" data-calm="${shift(-1)}" aria-label="이전 달">‹</button><button type="button" class="press" data-calm="${shift(1)}" aria-label="다음 달" ${shift(1) > today.slice(0, 7) ? 'disabled' : ''}>›</button></div>
        <div class="cal-h">${['월', '화', '수', '목', '금', '토', '일'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal-g">${cells.join('')}</div>
        <div class="cal-leg"><span><i></i>안 봄</span><span><i class="l1"></i>1~9화</span><span><i class="l2"></i>10~29화</span><span><i class="l3"></i>30화+</span><span><i class="at"></i>출석</span></div>
        <p class="rec-empty">이번 달 ${Object.keys(eps).length}일 봤어요 · 출석 ${att.size}일</p></div>`;
    }

    // ---------- 내 기록 정리 (이 기기에 남은 감상 기록으로 계산해요) ----------
    function recordHTML() {
      const log = S.log || [];
      const today = WT.store.today();
      const mStart = today.slice(0, 7) + '-01';
      const [yy, mm] = today.split('-').map(Number);
      const pm = mm === 1 ? `${yy - 1}-12` : `${yy}-${String(mm - 1).padStart(2, '0')}`;
      const inSpan = (e) => recSpan === 'all' || e.d >= mStart;
      const eps = log.filter((e) => e.t === 'ep' && inSpan(e)).reduce((a, e) => a + e.n, 0);
      const prevEps = log.filter((e) => e.t === 'ep' && e.d.slice(0, 7) === pm).reduce((a, e) => a + e.n, 0);
      const dones = log.filter((e) => e.t === 'done' && inSpan(e) && WT.toon(e.w));
      const reading = WT.data.webtoons.filter((w) => { const e = (S.progress || {})[w.id] || 0; return e > 0 && e < WT.eps(w); });
      // 연속으로 본 날
      const days = [...new Set(log.filter((e) => e.t === 'ep').map((e) => e.d))].sort();
      const dayN = (d) => Math.round(Date.UTC(...d.split('-').map((v, i) => (i === 1 ? v - 1 : +v))) / 86400000);
      let best = 0, run = 0, prev = null;
      days.forEach((d) => { run = prev !== null && dayN(d) - prev === 1 ? run + 1 : 1; prev = dayN(d); best = Math.max(best, run); });
      const lastN = days.length ? dayN(days[days.length - 1]) : null;
      const streak = lastN !== null && dayN(today) - lastN <= 1 ? run : 0;
      // 많이 본 장르
      const byG = {};
      log.filter((e) => e.t === 'ep' && inSpan(e)).forEach((e) => { const w = WT.toon(e.w); const g = w && WT.genre((w.genres || [])[0]); if (g) byG[g.id] = (byG[g.id] || 0) + e.n; });
      const gs = Object.keys(byG).map((id) => ({ g: WT.genre(id), n: byG[id] })).sort((a, b) => b.n - a.n).slice(0, 4);
      const top = gs.length ? gs[0].n : 1;
      const since = log.length ? Math.max(1, dayN(today) - dayN(log[0].d) + 1) : 0;
      const diff = eps - prevEps;
      const recent = dones.slice(-4).reverse().map((e) => WT.toon(e.w));
      const cv = (w) => `<a class="rec-cv" href="#/library/${(w.genres || [])[0] || 'all'}/${w.id}" title="${esc(w.title)}" style="--c:${esc(w.color || (WT.genre((w.genres || [])[0]) || {}).color || '#55607F')}"><span>${esc(w.title)}</span>${w.cover ? `<img src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</a>`;
      return `<section class="rec" aria-label="내 기록">
        <div class="rec-head"><div><h2>${esc(S.profile ? S.profile.nick : '')} 님의 기록</h2>${since ? `<span>웹툰트리와 함께한 지 ${since}일</span>` : '<span>웹툰을 기록하면 여기에 모여요</span>'}</div>
          <div class="rec-seg" role="group" aria-label="기간"><button type="button" data-span="month" aria-pressed="${recSpan === 'month'}">이번 달</button><button type="button" data-span="all" aria-pressed="${recSpan === 'all'}">전체</button></div></div>
        <div class="rec-tiles">
          <div class="rec-tile hi"><small>${recSpan === 'month' ? '이번 달' : '지금까지'} 본 화수</small><b>${eps}<i>화</i></b><span>${recSpan === 'month' ? (prevEps || eps ? `지난달보다 ${diff >= 0 ? '+' : ''}${diff}화` : '이번 달 첫 기록을 남겨 보세요') : `하루 평균 ${since ? Math.round(eps / since) : 0}화`}</span></div>
          <div class="rec-tile"><small>다 본 웹툰</small><b>${dones.length}<i>편</i></b><span>${dones.length ? esc(WT.toon(dones[dones.length - 1].w).title) + (dones.length > 1 ? ` 외 ${dones.length - 1}편` : '') : '아직 없어요'}</span></div>
          <div class="rec-tile"><small>보는 중</small><b>${reading.length}<i>편</i></b><span>${WT.newCount() ? `새 화가 나온 웹툰 ${WT.newCount()}편` : reading.length ? '새 화를 기다리는 중' : '보기 시작하면 모여요'}</span></div>
          <div class="rec-tile"><small>연속으로 본 날</small><b>${streak}<i>일</i></b><span>최고 기록 ${best}일</span></div>
        </div>
        <div class="rec-row">
          <div class="rec-box"><small>많이 본 장르</small>${gs.length ? `<div class="rec-bars">${gs.map(({ g, n }) => `<div><span>${esc(g.name)}</span><i><em style="width:${Math.max(4, Math.round((n / top) * 100))}%; background:${esc(g.color)}"></em></i><b>${n}화</b></div>`).join('')}</div>` : '<p class="rec-empty">기록이 쌓이면 보여요</p>'}</div>
          <div class="rec-box"><small>최근 다 본 웹툰</small>${recent.length ? `<div class="rec-covers">${recent.map(cv).join('')}</div>` : '<p class="rec-empty">다 본 웹툰이 생기면 보여요</p>'}</div>
        </div>
        <div class="rec-row">${attHTML()}${calHTML()}</div>
        <p class="rec-note">화수 기록은 계정에 저장돼서 다른 기기에서도 이어져요.</p>
        ${WT.api.on() && S.token ? `<form class="rec-box pf-form" id="pf-form"><small>공개 프로필 꾸미기</small>
          <label class="sr" for="pf-bio">소개글</label><input id="pf-bio" class="fld" maxlength="60" placeholder="소개글 (60자) 예: 무협이랑 스포츠물 좋아해요" value="${esc(S.bio || '')}">
          <div class="pf-best">${[0, 1, 2].map((k) => `<label class="sr" for="pf-b${k}">최애 웹툰 ${k + 1}</label><input id="pf-b${k}" class="fld" list="pf-dl" data-best placeholder="최애 웹툰 ${k + 1} (제목)" value="${esc((WT.toon((S.best || [])[k]) || {}).title || '')}">`).join('')}</div>
          <datalist id="pf-dl">${WT.data.webtoons.map((w) => `<option value="${esc(w.title)}">`).join('')}</datalist>
          <button type="submit" class="btn btn-sm press">저장</button></form>` : ''}
        ${WT.api.on() && S.token ? `<div class="rec-pub"><span>프로필 공개 범위</span>
          <div class="rec-seg" role="group" aria-label="프로필 공개 범위">${[['all', '전체'], ['followers', '팔로워만'], ['me', '나만']].map(([k, n]) => `<button type="button" data-privacy="${k}" aria-pressed="${(S.privacy || 'all') === k}">${n}</button>`).join('')}</div>
          ${S.pid ? `<a class="btn btn-sm press" href="#/u/${esc(S.pid)}">내 공개 프로필 보기</a>` : ''}<a class="btn btn-sm press" href="#/feed">친구 소식</a></div>` : ''}
      </section>`;
    }


    const kindOf = (i) => i.kind || 'acc';
    const slotOf = (i) => ({ color: 'color', bg: 'bg', tree: 'tree' }[kindOf(i)] || 'acc');
    const eqItem = (slot) => items.find((i) => i.id === S.equip[slot] && slotOf(i) === slot) || null;
    const lookWith = (item) => {
      const now = WT.currentLook();
      if (kindOf(item) === 'color') return { acc: now.acc, body: item.body, feet: item.feet };
      if (kindOf(item) !== 'acc') return now;
      const color = eqItem('color');
      return { acc: item.acc, body: color ? color.body : item.body, feet: color ? color.feet : item.feet };
    };
    const isEquipped = (item) => (S.equip[slotOf(item)] || (slotOf(item) === 'acc' ? 'basic' : null)) === item.id;
    const KIND_KO = { acc: '장식', color: '몸 색', bg: '배경', tree: '트리 디자인' };
    const seasonName = (id) => ((WT.data.seasons || []).find((s) => s.id === id) || {}).name || '시즌';
    const thumbOf = (i) => (kindOf(i) === 'bg' ? `<span class="it-th bg-box">${WT.skin.thumb(i, 6)}${WT.charSVG(WT.currentLook(), 44)}</span>`
      : kindOf(i) === 'tree' ? `<span class="it-th it-tree">${WT.skin.treeThumb(i, 150, 84)}</span>`
      : `<span class="it-th">${WT.charSVG(lookWith(i), 72)}</span>`);

    function draw(animPreview) {
      const item = items.find((i) => i.id === preview) || items[0];
      const own = !!S.owned[item.id] || item.price === 0;
      const eq = isEquipped(item);
      const sale = WT.skin.onSale(item);
      const canBuy = S.profile && S.coins >= item.price;
      const canOff = eq && item.id !== 'basic';
      let btnCls = 'btn-gold', btnLabel = '착용하기', disabled = false;
      if (!S.profile) { btnCls = ''; btnLabel = '닉네임으로 시작하면 꾸밀 수 있어요'; disabled = true; }
      else if (eq) { btnCls = 'btn-soft'; btnLabel = canOff ? '착용 중 · 눌러서 벗기' : '착용 중'; disabled = !canOff; }
      else if (!own) {
        if (!sale) { btnCls = ''; btnLabel = `${seasonName(item.season)} 시즌에만 팔아요`; disabled = true; }
        else if (canBuy) { btnCls = 'btn-coin'; btnLabel = `${item.price} 코인으로 구매`; }
        else { btnCls = ''; btnLabel = `코인 부족 (${item.price - S.coins}개 더 필요)`; disabled = true; }
      }
      const rules = WT.settings().coins;
      const now = WT.skin.seasonNow();
      // 시즌 한정은 파는 기간이거나 이미 가진 것만 보여요 ('시즌 한정' 탭에서는 다음 시즌 것도 미리 보여 줘요)
      const visible = (i) => !i.season || WT.skin.onSale(i) || !!S.owned[i.id];
      const shown = items.filter((i) => (tab === 'season' ? !!i.season : (tab === 'all' || kindOf(i) === tab) && visible(i)))
        .sort((a, b) => (tab === 'season' ? (WT.skin.onSale(b) ? 1 : 0) - (WT.skin.onSale(a) ? 1 : 0) : 0));
      const count = (k) => items.filter((i) => (k === 'season' ? !!i.season : kindOf(i) === k && visible(i))).length;
      const pvBg = kindOf(item) === 'bg' ? item : eqItem('bg');
      const pvTree = kindOf(item) === 'tree' ? item : eqItem('tree');
      const slotName = (slot) => { const it = slotOf(item) === slot ? item : eqItem(slot); return it ? it.name : slot === 'acc' ? (items[0] || {}).name : '기본'; };
      document.getElementById('app').innerHTML = `<div class="view">
        <div class="topbar">
          <div class="left">
            <a href="#/" class="icon-btn press" aria-label="홈으로">${WT.icon.back}</a>
            <div class="title-block"><h1 style="color:var(--coin)">내 프로필</h1><span class="sub">웹툰을 보고 모은 코인으로 캐릭터 · 배경 · 트리를 꾸며 보세요</span></div>
          </div>
          ${WT.topRight()}
        </div>
        ${S.profile ? `<div class="profile-wrap">${WT.profileCard()}</div>` : ''}
        ${S.profile ? recordHTML() : ''}
        <h2 class="shop-h" id="shop">꾸미기</h2>
        <main class="shop-main">
          <section class="preview rpg" aria-label="미리보기"><span class="corner-b" aria-hidden="true"></span>
            <div class="pv-box bg-box${pvBg ? '' : ' plain'}">${pvBg ? WT.skin.thumb(pvBg, 14) : ''}
              <div class="${animPreview ? 'preview-anim' : ''}"><div style="animation:bob 1.4s ease-in-out infinite">${WT.charSVG(lookWith(item), 132, item.name + ' 미리보기')}</div></div>
              <span class="pv-tree">${WT.skin.treeThumb(pvTree, 96, 58)}</span>
            </div>
            <div class="pv-slots">${['acc', 'color', 'bg', 'tree'].map((k) => `<button type="button" class="press${slotOf(item) === k ? ' on' : ''}" data-tab="${k}"><small>${KIND_KO[k]}</small><b>${esc(slotName(k))}</b></button>`).join('')}</div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center">
              <span style="font-family: var(--display); font-weight: 800; font-size:22px">${esc(item.name)}</span>
              <span class="hint" style="font-size:13px">${esc(item.desc || '')}</span>
              ${item.season ? `<span class="it-lim">${esc(seasonName(item.season))} 한정${sale && now ? ` · ${now.to.slice(5).replace('-', '.')}까지 판매` : ''}</span>` : ''}
            </div>
            <button type="button" class="btn ${btnCls} press" id="shop-act" style="align-self:stretch; min-height:52px; font-size:16px" ${disabled ? 'disabled' : ''}>${btnLabel}</button>
            <p class="pv-season">계절 · 시즌 테마는 위쪽 <b>테마 버튼(☀/☾)</b>에서 골라요.${WT.skin.pickedTheme() ? ` 지금은 <b>${esc(WT.skin.pickedTheme().name)}</b>가 켜져 있어서, 여기서 고른 배경 · 트리 디자인은 테마를 '기본'으로 돌리면 보여요.` : ''}</p>
            <div class="rules">
              <span class="h">코인 모으는 법</span>
              <span>웹툰 1화 기록</span><span class="v">+${rules.perEpisode} (하루 ${rules.dailyEpisodeCap}까지)</span>
              <span>웹툰 1개 완독</span><span class="v">+${rules.completeBonus}</span>
              <span>출석 체크</span><span class="v">매일 (7일째 보너스)</span>
              <span class="h">꾸미기가 보이는 곳</span>
              <span>배경</span><span>사이트 전체 · 내 프로필</span>
              <span>트리 디자인</span><span>트리 화면의 선과 칸</span>
            </div>
          </section>
          <section class="items" aria-label="꾸미기 목록">
            <div class="seg" role="tablist" aria-label="종류">
              ${[['all', '전체'], ['acc', '장식'], ['color', '몸 색'], ['bg', '배경'], ['tree', '트리 디자인']].map(([id, name]) => `<button type="button" role="tab" class="press" aria-selected="${tab === id}" data-tab="${id}">${name}${id === 'all' ? '' : ` <small>${count(id)}</small>`}</button>`).join('')}
              ${count('season') ? `<button type="button" role="tab" class="press seg-season" aria-selected="${tab === 'season'}" data-tab="season">시즌 한정 <small>${count('season')}</small></button>` : ''}
            </div>
            ${tab === 'season' ? `<p class="hint" style="margin:0">${now ? `지금은 <b>${esc(now.season.name)}</b> 시즌이에요 (${now.from.slice(5).replace('-', '.')} ~ ${now.to.slice(5).replace('-', '.')}). ` : '지금 진행 중인 시즌이 없어요. '}시즌 한정 아이템은 그 시즌에만 살 수 있고, 한번 사면 계속 쓸 수 있어요.</p>` : ''}
            <div class="item-grid">
              ${shown.map((i) => {
                const o = !!S.owned[i.id] || i.price === 0, s = WT.skin.onSale(i);
                return `<button type="button" class="item k-${kindOf(i)}${preview === i.id ? ' sel' : ''}${!o && !s ? ' off' : ''}" data-item="${i.id}" aria-label="${esc(i.name)}, ${o ? '보유 중' : i.price + '코인'}">
                  ${isEquipped(i) ? '<span class="tag eq">착용 중</span>' : ''}
                  ${i.season && !o ? `<span class="tag new">${esc(seasonName(i.season))}</span>` : i.isNew && !o ? '<span class="tag new">NEW</span>' : ''}
                  ${thumbOf(i)}
                  <b>${esc(i.name)}</b>
                  <span class="price ${o ? 'own' : s && S.coins >= i.price ? 'ok' : ''}">${o ? '보유 중' : s ? i.price + ' 코인' : '시즌에 판매'}</span>
                </button>`;
              }).join('')}
            </div>
          </section>
        </main>
      </div>`;

      const app = document.getElementById('app');
      if (S.profile) WT.bindProfileCard(() => draw(false));
      const keepY = (fn) => { const y = window.scrollY, v = document.querySelector('#app > .view'), vy = v ? v.scrollTop : 0; fn(); window.scrollTo(0, y); const n = document.querySelector('#app > .view'); if (n) n.scrollTop = vy; };
      app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; keepY(() => draw(false)); }));
      app.querySelectorAll('[data-privacy]').forEach((b) => b.addEventListener('click', async () => {
        try { const r = await WT.api.authed('setPrivacy', { privacy: b.dataset.privacy }); WT.api.applyMe(r.me); WT.toast(`프로필을 '${b.textContent}'에게 공개해요`); keepY(() => draw(false)); }
        catch (e) { if (!e.auth) WT.toast(e.message); }
      }));
      app.querySelectorAll('[data-span]').forEach((b) => b.addEventListener('click', () => { recSpan = b.dataset.span; keepY(() => draw(false)); }));
      app.querySelectorAll('[data-item]').forEach((b) => b.addEventListener('click', () => { preview = b.dataset.item; keepY(() => draw(true)); }));
      app.querySelectorAll('[data-calm]').forEach((b) => b.addEventListener('click', () => { calM = b.dataset.calm; keepY(() => draw(false)); }));
      const att = document.getElementById('att-go');
      if (att) att.addEventListener('click', async () => {
        att.disabled = true;
        try { const r = await WT.api.authed('attend', {}); WT.api.applyMe(r.me); WT.popCoin(`+${r.gain} 코인 · ${r.streak}일 연속 출석`); keepY(() => draw(false)); }
        catch (e) { att.disabled = false; if (!e.auth) WT.toast(/알 수 없는 요청/.test(e.message) ? '서버 코드가 예전 버전이에요.' : e.message); }
      });
      const pf = document.getElementById('pf-form');
      if (pf) pf.addEventListener('submit', async (e) => {
        e.preventDefault();
        const best = [...pf.querySelectorAll('[data-best]')].map((i) => (WT.data.webtoons.find((w) => w.title === i.value.trim()) || {}).id).filter(Boolean);
        try { const r = await WT.api.authed('setProfile', { bio: pf.querySelector('#pf-bio').value, best }); WT.api.applyMe(r.me); WT.toast('프로필을 저장했어요'); keepY(() => draw(false)); }
        catch (x) { if (!x.auth) WT.toast(/알 수 없는 요청/.test(x.message) ? '서버 코드가 예전 버전이에요.' : x.message); }
      });
      document.getElementById('shop-act').addEventListener('click', async () => {
        if (!S.profile) return;
        const slot = slotOf(item);
        const said = () => WT.toast(eq ? `${KIND_KO[slot]}을(를) 기본으로 돌렸어요` : own ? `${item.name} 착용!` : `${item.name} 구매 완료! 바로 착용했어요`);
        if (WT.api.on() && S.token) {
          const btn = document.getElementById('shop-act');
          btn.disabled = true;
          try {
            let r;
            if (eq && slot === 'acc') r = await WT.api.authed('equip', { itemId: 'basic' });
            else if (eq) r = await WT.api.authed('equip', { slot, itemId: null });
            else if (own) r = await WT.api.authed('equip', { itemId: item.id });
            else r = await WT.api.authed('buy', { itemId: item.id });
            WT.api.applyMe(r.me);
            said(); WT.skin.apply();
            keepY(() => draw(false));
          } catch (x) { btn.disabled = false; if (!x.auth) WT.toast(x.message); }
          return;
        }
        if (eq) S.equip[slot] = slot === 'acc' ? 'basic' : null;
        else {
          if (!own) {
            if (S.coins < item.price || !sale) return;
            S.coins -= item.price;
            S.owned[item.id] = true;
          }
          S.equip[slot] = item.id;
        }
        WT.store.save();
        said(); WT.skin.apply();
        keepY(() => draw(false));
      });
    }
    draw(true);
  }

  // ---------- 랭킹 ----------
  function viewRankingServer() {
    const S = WT.store.state;
    let period = 'week', metric = 'eps';
    const look = (eq) => {
      const items = WT.data.shop;
      const acc = items.find((i) => i.id === (eq && eq.acc)) || items[0];
      const color = eq && eq.color ? items.find((i) => i.id === eq.color) : null;
      return { acc: acc.acc, body: color ? color.body : acc.body, feet: color ? color.feet : acc.feet };
    };
    async function draw() {
      document.getElementById('app').innerHTML = `<div class="view">
        <div class="topbar">
          <div class="left">
            <a href="#/" class="icon-btn press" aria-label="홈으로">${WT.icon.back}</a>
            <div class="title-block"><h1 style="color:var(--coin)">랭킹</h1><span class="sub">이번 주에 누가 웹툰을 가장 많이 봤을까?</span></div>
          ${WT.rankTabs('ranking')}
          </div>
          ${WT.topRight()}
        </div>
        <div class="rank-wrap">
          <div style="display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center">
            <div class="seg" role="tablist" aria-label="기간">${[['week', '이번 주'], ['month', '이번 달'], ['all', '전체']].map(([id, n]) => `<button type="button" role="tab" aria-selected="${period === id}" data-p="${id}">${n}</button>`).join('')}</div>
            <div class="seg" role="tablist" aria-label="기준">${[['eps', '많이 본 화수'], ['done', '완독 수']].map(([id, n]) => `<button type="button" role="tab" aria-selected="${metric === id}" data-m="${id}">${n}</button>`).join('')}</div>
          </div>
          <div id="rank-body"><p class="hint" style="text-align:center; padding:30px">랭킹 불러오는 중…</p></div>
          <p class="hint" style="text-align:center">이번 주 랭킹은 매주 월요일 0시(한국 시간)에 새로 시작해요. 하루에 인정되는 화수는 ${WT.settings().coins.dailyEpisodeCap}화까지예요.</p>
        </div>
      </div>`;
      document.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { period = b.dataset.p; draw(); }));
      document.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { metric = b.dataset.m; draw(); }));
      let r;
      try { r = await WT.api.call('ranking', { period, metric, token: S.token || '' }); }
      catch (x) { document.getElementById('rank-body').innerHTML = `<p class="err" style="text-align:center">${esc(x.message)}</p>`; return; }
      const fmt = (u) => (metric === 'eps' ? `${u.eps.toLocaleString()}화` : `${u.done}개 완독`);
      const body = document.getElementById('rank-body');
      if (!body) return;
      if (!r.top.length) { body.innerHTML = '<section class="rpg" style="padding:28px; text-align:center"><span class="corner-b" aria-hidden="true"></span><p style="margin:0">아직 기록이 없어요. 첫 1등의 주인공이 되어 보세요!</p></section>'; return; }
      const podium = [1, 0, 2].filter((i) => r.top[i]).map((i) => {
        const u = r.top[i];
        const h = [150, 110, 84][i];
        const bg = ['linear-gradient(180deg, #FFE9A0, #E8B730)', 'linear-gradient(180deg, #E6ECF5, #9FAEC6)', 'linear-gradient(180deg, #F2B98A, #B9733F)'][i];
        return `<div style="flex:1 1 0; max-width:200px; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:6px">
          ${i === 0 ? '<svg aria-hidden="true" width="40" height="30" viewBox="0 0 40 30" style="animation:starTw 2s ease-in-out infinite"><polygon points="4,28 6,8 14,16 20,4 26,16 34,8 36,28" fill="#FFD34D" stroke="#FFF4C2" stroke-width="1.5" stroke-linejoin="round"/></svg>' : ''}
          <div style="animation:bob 1.4s ease-in-out infinite">${WT.charSVG(look(u.equip), i === 0 ? 76 : 60)}</div>
          <span style="font-size:16px; font-weight:700">${WT.userLink(u.nickname, u.pid)}</span>
          <span style="font-size:14px; font-weight:700; color:var(--coin)">${fmt(u)}</span>
          <div style="align-self:stretch; height:${h}px; border-radius:8px 8px 0 0; background:${bg}; display:flex; justify-content:center; padding-top:10px; transform-origin:50% 100%; animation:rise .6s cubic-bezier(.2,.9,.3,1.2) ${i * 0.1}s both"><span style="font-family: var(--display); font-weight: 800; font-size:34px; color:#2A2410">${i + 1}</span></div>
        </div>`;
      }).join('');
      const rest = r.top.slice(3).map((u, k) => `<li class="stat" style="flex-direction:row; align-items:center; gap:12px; animation-delay:${k * 0.05}s">
          <span style="width:32px; text-align:center; font-family: var(--display); font-weight: 800; font-size:20px; color:var(--muted)">${u.rank}</span>
          ${WT.charSVG(look(u.equip), 36)}
          <span style="flex:1 1 auto; font-weight:700">${WT.userLink(u.nickname, u.pid)}</span>
          <span style="font-size:13px; color:var(--muted)">${metric === 'eps' ? `완독 ${u.done}개` : `${u.eps}화 감상`}</span>
          <span style="min-width:90px; text-align:right; font-weight:700; color:var(--coin)">${fmt(u)}</span></li>`).join('');
      const mine = S.profile ? (r.mine
        ? `<div class="stat" style="flex-direction:row; align-items:center; gap:12px; border:2px solid var(--gold); background:rgba(232,198,106,0.12)">
            <em class="chip chip-done" style="font-style:normal; color:#1A1405">내 순위</em><b style="font-size:22px">${r.mine.rank}위</b><span style="flex:1 1 auto; font-weight:700">${esc(S.profile.nick)}</span>
            <span class="hint" style="font-size:13px">${r.gap ? (r.gap.value > 0 ? `${esc(r.gap.nickname)}님까지 ${r.gap.value}${metric === 'eps' ? '화' : '개'} 남았어요` : `${esc(r.gap.nickname)}님과 동점!`) : '1등이에요!'}</span>
            <span style="font-weight:700; color:var(--coin)">${fmt(r.mine)}</span></div>`
        : '<p class="hint" style="text-align:center">이 기간에는 아직 내 기록이 없어요. 웹툰을 보고 화수를 기록해 보세요!</p>') : '';
      body.innerHTML = `<section style="display:flex; align-items:flex-end; justify-content:center; gap:14px; border-bottom:2px solid rgba(232,198,106,0.4)">${podium}</section>
        <ol style="list-style:none; margin:16px 0 0; padding:0; display:flex; flex-direction:column; gap:8px">${rest}</ol>
        <div style="margin-top:12px">${mine}</div>`;
    }
    draw();
  }

  function viewRanking() {
    if (WT.api.on()) return viewRankingServer();
    const S = WT.store.state;
    const week = WT.store.stats(WT.store.weekStart());
    const all = WT.store.stats();
    const reading = Object.keys(S.progress).filter((id) => {
      const w = WT.toon(id);
      return w && S.progress[id] > 0 && S.progress[id] < WT.eps(w);
    }).length;
    document.getElementById('app').innerHTML = `<div class="view">
      <div class="topbar">
        <div class="left">
          <a href="#/" class="icon-btn press" aria-label="홈으로">${WT.icon.back}</a>
          <div class="title-block"><h1 style="color:var(--coin)">랭킹</h1><span class="sub">이번 주에 누가 웹툰을 가장 많이 봤을까?</span></div>
          ${WT.rankTabs('ranking')}
        </div>
        ${WT.topRight()}
      </div>
      <div class="rank-wrap">
        <section class="rpg" style="padding:24px; display:flex; flex-direction:column; gap:16px; align-items:center; text-align:center"><span class="corner-b" aria-hidden="true"></span>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E0565B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8"/></svg>
          <h2 style="margin:0; font-family:var(--display); font-weight:800; font-size:24px">친구들과의 랭킹은 곧 열려요</h2>
          <p class="hint" style="font-size:14px; max-width:460px; margin:0">회원 기능(Apps Script)이 연결되면 이번 주·이번 달·전체 기간으로 "많이 본 화수"와 "완독 수" 순위를 보여 드려요. 그 전까지는 내 기록을 모아 둘게요.</p>
        </section>
        <h2 style="margin:6px 0 0; font-size:16px; color:var(--text)">${S.profile ? esc(S.profile.nick) + ' 님의 기록' : '이 기기의 기록'}</h2>
        <div class="stat-grid">
          <div class="stat"><b>${week.eps.toLocaleString()}화</b><span>이번 주 본 화수</span></div>
          <div class="stat" style="animation-delay:.05s"><b>${all.eps.toLocaleString()}화</b><span>지금까지 본 화수</span></div>
          <div class="stat" style="animation-delay:.1s"><b>${all.done}개</b><span>완독한 웹툰</span></div>
          <div class="stat" style="animation-delay:.15s"><b>${reading}개</b><span>보는 중인 웹툰</span></div>
          ${S.profile ? `<div class="stat" style="animation-delay:.2s"><b>${S.coins}</b><span>보유 코인</span></div>` : ''}
        </div>
        <p class="hint" style="text-align:center">랭킹은 매주 월요일 0시(한국 시간)에 새로 시작하고, 하루에 인정되는 화수는 ${WT.settings().coins.dailyEpisodeCap}화까지예요.</p>
      </div>
    </div>`;
  }

  WT.views.shop = viewShop;
  // 프로필 = 내 정보 + 캐릭터 꾸미기 (닉네임이 없으면 로그인 화면으로)
  WT.views.me = (params) => (WT.store.state.profile ? viewShop(params) : (location.replace('#/login')));
  WT.views.ranking = viewRanking;
})();
