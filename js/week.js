/* 요일별 연재: #/week — 등록해 둔 웹툰을 올라오는 요일별로 한 주 달력처럼 보여 줘요 */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAY_FULL = { mon: '월요일', tue: '화요일', wed: '수요일', thu: '목요일', fri: '금요일', sat: '토요일', sun: '일요일' };
  const F = { show: 'all', hiatus: true, day: null };   // show: all | mine(보는 중) | fav(관심)

  // 한국 시간 기준 이번 주(월~일) 날짜
  function weekDates() {
    const [y, m, d] = WT.schedule.today().split('-').map(Number);
    const t = Date.UTC(y, m - 1, d);
    const back = (new Date(t).getUTCDay() + 6) % 7;   // 월요일까지 며칠 전인지
    return WT.schedule.DAYS.map((k, i) => { const x = new Date(t + (i - back) * 86400000); return { key: k, m: x.getUTCMonth() + 1, d: x.getUTCDate(), today: i === back }; });
  }
  function mine(w) {
    const S = WT.store.state;
    const tot = WT.eps(w), e = Math.min(tot, (S.progress || {})[w.id] || 0);
    return { e, tot, state: e >= tot || (S.rewarded || {})[w.id + ':done'] ? 'done' : e > 0 ? 'reading' : 'none' };
  }
  const libHref = (w) => `#/library/${(w.genres || [])[0] || 'all'}/${w.id}`;
  // 요일 칸의 웹툰: 표지만 보여 줘요 (표지가 없을 때만 제목이 보여요)
  function card(w) {
    const st = WT.schedule.status(w), me = mine(w);
    const pct = me.tot ? Math.round((me.e / me.tot) * 100) : 0;
    const color = w.color || (WT.genre((w.genres || [])[0]) || {}).color || '#55607F';
    const label = `${w.title}, ${st === 'hiatus' ? '휴재' : '연재 중'}, ${WT.eps(w)}화${me.state === 'reading' ? `, ${me.e}화까지 봤어요` : me.state === 'done' ? ', 다 따라왔어요' : ''}`;
    return `<a class="wk-card${st === 'hiatus' ? ' rest' : ''}" href="${libHref(w)}" title="${esc(w.title)}" aria-label="${esc(label)}">
        <span class="wk-cv" style="--c:${esc(color)}"><span class="wk-ini">${esc(w.title)}</span>
          ${w.cover ? `<img src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
          ${st === 'hiatus' ? '<em class="wk-tag">휴재</em>' : ''}
          ${WT.fav.mark(w.id)}
          ${WT.platform.icon(w.platform, 'pf-cv')}
          ${me.state !== 'none' ? `<span class="wk-bar" aria-hidden="true"><i style="width:${me.state === 'done' ? 100 : Math.max(6, pct)}%"></i></span>` : ''}
        </span>
      </a>`;
  }
  function tile(title, num, sub) {
    return `<div class="wk-tile"><span class="wk-t-h">${title}</span><b class="wk-t-n">${num}</b><span class="wk-t-s">${sub}</span></div>`;
  }

  function view() {
    const app = document.getElementById('app');
    const days = weekDates();
    const today = days.find((x) => x.today) || days[0];
    if (!F.day) F.day = today.key;
    const all = WT.data.webtoons;
    const ongoing = all.filter((w) => WT.schedule.status(w) === 'ongoing');
    const hiatus = all.filter((w) => WT.schedule.status(w) === 'hiatus');
    const noDay = ongoing.filter((w) => !(w.days || []).length);
    const reading = ongoing.filter((w) => mine(w).state === 'reading');
    const todayList = ongoing.filter((w) => (w.days || []).includes(today.key));

    const draw = () => {
      const pool = (F.hiatus ? ongoing.concat(hiatus) : ongoing).filter((w) => (F.show === 'mine' ? mine(w).state !== 'none' : F.show === 'fav' ? WT.fav.has(w.id) : true));
      const order = (a, b) => (WT.schedule.status(a) === 'hiatus') - (WT.schedule.status(b) === 'hiatus')
        || (mine(b).state === 'reading') - (mine(a).state === 'reading') || WT.recRank(b) - WT.recRank(a) || a.title.localeCompare(b.title, 'ko');
      const cols = days.map((d) => ({ d, list: pool.filter((w) => (w.days || []).includes(d.key)).sort(order) }));
      document.getElementById('wk-tabs').innerHTML = cols.map(({ d, list }) => `<button type="button" role="tab" data-day="${d.key}" aria-selected="${F.day === d.key}" class="${d.today ? 'today' : ''}">${WT.schedule.DAY_KO[d.key]}<em>${list.length}</em></button>`).join('');
      const grid = document.getElementById('wk-grid');
      grid.dataset.day = F.day;
      grid.innerHTML = cols.map(({ d, list }) => `<section class="wk-col${d.today ? ' today' : ''}" data-day="${d.key}" aria-label="${DAY_FULL[d.key]} 연재 ${list.length}편">
          <header class="wk-col-h"><b>${DAY_FULL[d.key]}</b><span>${d.m}.${String(d.d).padStart(2, '0')}${d.today ? ' · 오늘' : ''}</span><em>${list.length}</em></header>
          <div class="wk-col-b">${list.length ? list.map(card).join('') : `<p class="wk-none">${F.show === 'mine' ? '보는 웹툰이 없어요' : F.show === 'fav' ? '관심 웹툰이 없어요' : '올라오는 웹툰이 없어요'}</p>`}</div>
        </section>`).join('');
      app.querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === 'show' ? F.show === b.dataset.v : F.hiatus)));
    };

    app.innerHTML = `<div class="view wk-view">
      <header class="wk-head">
        <div class="wk-title"><h1>요일별 연재</h1><p>${days[0].m}월 ${days[0].d}일 – ${days[6].m}월 ${days[6].d}일 · 오늘은 <b>${DAY_FULL[today.key]}</b></p></div>
        <div class="wk-tools">
          <div class="wk-seg" role="group" aria-label="보여 줄 웹툰"><button type="button" data-f="show" data-v="all">전체</button><button type="button" data-f="show" data-v="mine">보는 웹툰</button><button type="button" data-f="show" data-v="fav">관심 웹툰</button></div>
          <button type="button" class="wk-chip" data-f="hiatus">휴재 포함</button>
        </div>
      </header>
      <section class="wk-tiles" aria-label="한눈에 보기">
        ${tile('오늘 올라와요', `${todayList.length}<small>편</small>`, esc(todayList.slice(0, 2).map((w) => w.title).join(', ') || '오늘은 쉬는 날이에요') + (todayList.length > 2 ? ` 외 ${todayList.length - 2}편` : ''))}
        ${tile('연재 중', `${ongoing.length}<small>편</small>`, `등록한 웹툰 ${all.length}편 가운데`)}
        ${tile('내가 보는 연재작', `${reading.length}<small>편</small>`, reading.length ? esc(reading.slice(0, 2).map((w) => w.title).join(', ')) + (reading.length > 2 ? ` 외 ${reading.length - 2}편` : '') : '보기 시작하면 여기에 모여요')}
        ${tile('휴재 중', `${hiatus.length}<small>편</small>`, '돌아오면 요일 칸에 다시 떠요')}
      </section>
      <nav class="wk-tabs" id="wk-tabs" role="tablist" aria-label="요일 고르기"></nav>
      <div class="wk-grid" id="wk-grid"></div>
      ${noDay.length ? `<p class="wk-foot">요일이 정해지지 않은 연재작 ${noDay.length}편: ${noDay.slice(0, 6).map((w) => `<a href="${libHref(w)}">${esc(w.title)}</a>`).join(', ')}</p>` : ''}
      <p class="wk-foot">완결된 웹툰은 <a href="#/books">도서관 목록</a>에서 볼 수 있어요.</p>
    </div>`;
    draw();
    app.querySelector('.wk-view').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.f === 'show') F.show = b.dataset.v;
      else if (b.dataset.f === 'hiatus') F.hiatus = !F.hiatus;
      else if (b.dataset.day) F.day = b.dataset.day;
      else return;
      draw();
    });
  }
  WT.views.week = view;
})();
