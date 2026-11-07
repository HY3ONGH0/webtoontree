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
      document.getElementById('shop-act').addEventListener('click', () => {
        if (!S.profile) return;
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
  function viewRanking() {
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
          <div class="title-block"><h1 style="color:var(--coin)">랭킹</h1><span class="sub">누가 웹툰 별자리를 가장 많이 밝혔을까?</span></div>
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
