/* 캐릭터 상점과 랭킹 */
(function () {
  const esc = WT.esc;

  // ---------- 상점 ----------
  function viewShop() {
    const S = WT.store.state;
    const items = WT.data.shop;
    let tab = 'all';
    let preview = S.equip.acc || 'basic';

    const lookWith = (item) => {
      const now = WT.currentLook();
      if (item.kind === 'color') return { acc: now.acc, body: item.body, feet: item.feet };
      const color = S.equip.color ? items.find((i) => i.id === S.equip.color) : null;
      return { acc: item.acc, body: color ? color.body : item.body, feet: color ? color.feet : item.feet };
    };
    const isEquipped = (item) => (item.kind === 'color' ? S.equip.color === item.id : S.equip.acc === item.id);

    function draw(animPreview) {
      const item = items.find((i) => i.id === preview) || items[0];
      const own = !!S.owned[item.id] || item.price === 0;
      const eq = isEquipped(item);
      const canBuy = S.profile && S.coins >= item.price;
      let btnCls = 'btn-gold', btnLabel = '착용하기', disabled = false;
      if (!S.profile) { btnCls = ''; btnLabel = '닉네임으로 시작하면 꾸밀 수 있어요'; disabled = true; }
      else if (eq) { btnCls = 'btn-soft'; btnLabel = item.kind === 'color' ? '착용 중 · 눌러서 벗기' : '착용 중'; disabled = item.kind !== 'color'; }
      else if (!own) {
        if (canBuy) { btnCls = 'btn-coin'; btnLabel = `${item.price} 코인으로 구매`; }
        else { btnCls = ''; btnLabel = `코인 부족 (${item.price - S.coins}개 더 필요)`; disabled = true; }
      }
      const rules = WT.settings().coins;
      const shown = items.filter((i) => tab === 'all' || i.kind === tab);
      document.getElementById('app').innerHTML = `<div class="view">
        <div class="topbar">
          <div class="left">
            <a href="#/" class="icon-btn press" aria-label="홈으로">${WT.icon.back}</a>
            <div class="title-block"><h1 style="color:var(--coin)">캐릭터 상점</h1><span class="sub">웹툰을 보고 모은 코인으로 내 캐릭터를 꾸며 보세요</span></div>
          </div>
          ${WT.topRight()}
        </div>
        <main class="shop-main">
          <section class="preview rpg" aria-label="미리보기"><span class="corner-b" aria-hidden="true"></span>
            <span style="font-size:13px; color:var(--muted); font-weight:700; align-self:flex-start">${S.profile ? esc(S.profile.nick) + ' 님의 캐릭터' : '캐릭터 미리보기'}</span>
            <div class="preview-stage">
              <span class="spark" style="left:30px; top:40px; width:8px; height:8px; background:#FFE29A"></span>
              <span class="spark" style="right:34px; top:70px; width:6px; height:6px; background:#fff; animation-delay:.6s"></span>
              <span class="spark" style="left:50px; bottom:40px; width:5px; height:5px; background:#9FD4FF; animation-delay:1s"></span>
              <div class="${animPreview ? 'preview-anim' : ''}"><div style="animation:bob 1.4s ease-in-out infinite">${WT.charSVG(lookWith(item), 150, item.name + ' 미리보기')}</div></div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center">
              <span style="font-family:var(--display); font-size:24px">${esc(item.name)}</span>
              <span class="hint" style="font-size:13px">${esc(item.desc)}</span>
            </div>
            <button type="button" class="btn ${btnCls} press" id="shop-act" style="align-self:stretch; min-height:52px; font-size:16px" ${disabled ? 'disabled' : ''}>${btnLabel}</button>
            <div class="rules">
              <span class="h">코인 모으는 법</span>
              <span>웹툰 1화 기록</span><span class="v">+${rules.perEpisode} (하루 ${rules.dailyEpisodeCap}까지)</span>
              <span>웹툰 1개 완독</span><span class="v">+${rules.completeBonus}</span>
              <span class="h">코인 쓰는 곳</span>
              <span>캐릭터 꾸미기</span><span>${Math.min(...items.filter((i) => i.price).map((i) => i.price))} ~ ${Math.max(...items.map((i) => i.price))}</span>
              <span>잠긴 웹툰 잠금 해제</span><span>${rules.unlockPrice}</span>
            </div>
          </section>
          <section class="items" aria-label="꾸미기 목록">
            <div class="seg" role="tablist" aria-label="종류">
              ${[['all', '전체'], ['acc', '장식'], ['color', '몸 색']].map(([id, name]) => `<button type="button" role="tab" class="press" aria-selected="${tab === id}" data-tab="${id}">${name}</button>`).join('')}
            </div>
            <div class="item-grid">
              ${shown.map((i) => {
                const o = !!S.owned[i.id] || i.price === 0;
                return `<button type="button" class="item${preview === i.id ? ' sel' : ''}" data-item="${i.id}" aria-label="${esc(i.name)}, ${o ? '보유 중' : i.price + '코인'}">
                  ${isEquipped(i) ? '<span class="tag eq">착용 중</span>' : ''}
                  ${i.isNew && !o ? '<span class="tag new">NEW</span>' : ''}
                  ${WT.charSVG(lookWith(i), 84)}
                  <b>${esc(i.name)}</b>
                  <span class="price ${o ? 'own' : S.coins >= i.price ? 'ok' : ''}">${o ? '보유 중' : i.price + ' 코인'}</span>
                </button>`;
              }).join('')}
            </div>
          </section>
        </main>
      </div>`;

      const app = document.getElementById('app');
      app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; draw(false); }));
      app.querySelectorAll('[data-item]').forEach((b) => b.addEventListener('click', () => { preview = b.dataset.item; draw(true); }));
      document.getElementById('shop-act').addEventListener('click', async () => {
        if (!S.profile) return;
        if (WT.api.on() && S.token) {
          const btn = document.getElementById('shop-act');
          btn.disabled = true;
          try {
            let r;
            if (eq && item.kind === 'color') r = await WT.api.authed('equip', { slot: 'color', itemId: null });
            else if (eq) return;
            else if (own) r = await WT.api.authed('equip', { itemId: item.id });
            else r = await WT.api.authed('buy', { itemId: item.id });
            WT.api.applyMe(r.me);
            WT.toast(eq ? '원래 몸 색으로 돌아왔어요' : own ? `${item.name} 착용!` : `${item.name} 구매 완료! 바로 착용했어요`);
            draw(false);
          } catch (x) { btn.disabled = false; if (!x.auth) WT.toast(x.message); }
          return;
        }
        if (eq && item.kind === 'color') { S.equip.color = null; WT.store.save(); WT.toast('원래 몸 색으로 돌아왔어요'); return draw(false); }
        if (eq) return;
        if (!own) {
          if (S.coins < item.price) return;
          S.coins -= item.price;
          S.owned[item.id] = true;
        }
        if (item.kind === 'color') S.equip.color = item.id; else S.equip.acc = item.id;
        WT.store.save();
        WT.toast(own ? `${item.name} 착용!` : `${item.name} 구매 완료! 바로 착용했어요`);
        draw(false);
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
          <span style="font-size:16px; font-weight:700">${esc(u.nickname)}</span>
          <span style="font-size:14px; font-weight:700; color:var(--coin)">${fmt(u)}</span>
          <div style="align-self:stretch; height:${h}px; border-radius:8px 8px 0 0; background:${bg}; display:flex; justify-content:center; padding-top:10px; transform-origin:50% 100%; animation:rise .6s cubic-bezier(.2,.9,.3,1.2) ${i * 0.1}s both"><span style="font-family:var(--display); font-size:34px; color:#2A2410">${i + 1}</span></div>
        </div>`;
      }).join('');
      const rest = r.top.slice(3).map((u, k) => `<li class="stat" style="flex-direction:row; align-items:center; gap:12px; animation-delay:${k * 0.05}s">
          <span style="width:32px; text-align:center; font-family:var(--display); font-size:20px; color:var(--muted)">${u.rank}</span>
          ${WT.charSVG(look(u.equip), 36)}
          <span style="flex:1 1 auto; font-weight:700">${esc(u.nickname)}</span>
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
        </div>
        ${WT.topRight()}
      </div>
      <div class="rank-wrap">
        <section class="rpg" style="padding:24px; display:flex; flex-direction:column; gap:16px; align-items:center; text-align:center"><span class="corner-b" aria-hidden="true"></span>
          <svg width="60" height="44" viewBox="0 0 40 30" aria-hidden="true" style="animation:starTw 2.4s ease-in-out infinite"><polygon points="4,28 6,8 14,16 20,4 26,16 34,8 36,28" fill="#FFD34D" stroke="#FFF4C2" stroke-width="1.5" stroke-linejoin="round"/></svg>
          <h2 style="margin:0; font-family:var(--display); font-weight:400; font-size:24px">친구들과의 랭킹은 곧 열려요</h2>
          <p class="hint" style="font-size:14px; max-width:460px; margin:0">회원 기능(Apps Script)이 연결되면 이번 주·이번 달·전체 기간으로 "많이 본 화수"와 "완독 수" 순위를 보여 드려요. 그 전까지는 내 기록을 모아 둘게요.</p>
        </section>
        <h2 style="margin:6px 0 0; font-size:16px; color:var(--gold)">${S.profile ? esc(S.profile.nick) + ' 님의 기록' : '이 기기의 기록'}</h2>
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
  WT.views.ranking = viewRanking;
})();
