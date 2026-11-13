/* 웹툰트리 저장소
   지금은 이 브라우저(localStorage)에만 저장해요. Apps Script를 연결하면 같은 함수 이름으로 서버에 저장하게 바꿉니다. */
(function () {
  const KEY = 'webtoontree.v1';

  function blank() {
    return {
      profile: null,        // { nick } : 닉네임으로 시작한 사람
      guest: false,         // 둘러보기 중
      progress: {},         // 웹툰ID → 본 화수 (화수만 저장, %는 화면에서 계산)
      rewarded: {},         // 웹툰ID → 코인 받은 최대 화수, '웹툰ID:done' → 완독 보너스 받음
      daily: { date: '', eps: 0 },
      coins: 0,
      owned: { basic: true },
      equip: { acc: 'basic', color: null },
      unlocked: {},         // 웹툰ID → true (잠금 해제)
      favs: {},             // 웹툰ID → 1 (관심 웹툰)
      ratings: {},          // 웹툰ID → 1~5
      comments: {},         // 웹툰ID → [{ text, at }]
      log: []               // { d: 날짜, t: 'ep' | 'done', n, w }  (내 기록·랭킹 계산용)
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  let state = Object.assign(blank(), load() || {});

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장 공간이 없거나 막힌 브라우저 */ }
  }

  // 한국 시간 기준 날짜 (YYYY-MM-DD)
  function today() {
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  }
  // 이번 주 월요일 (한국 시간)
  function weekStart() {
    const d = new Date(Date.now() + 9 * 3600 * 1000);
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
  }

  /**
   * 본 화수를 기록하고, 받을 코인을 계산해요.
   * - 새로 본 화수만 코인(하루 상한), 이미 코인을 받은 화수는 다시 주지 않아요.
   * - 마지막 화에 처음 도달하면 완독 보너스.
   */
  function recordEpisodes(wid, value, total, rules, canEarn) {
    const prev = state.progress[wid] || 0;
    const next = Math.max(0, Math.min(total, Math.round(Number(value) || 0)));
    state.progress[wid] = next;

    const result = { gain: 0, label: '', completed: false, prev, next };
    if (next >= total && prev < total) result.completed = true;

    if (state.daily.date !== today()) state.daily = { date: today(), eps: 0 };
    const best = state.rewarded[wid] || 0;
    const fresh = Math.max(0, next - Math.max(prev, best));
    const left = Math.max(0, rules.dailyEpisodeCap - state.daily.eps);
    const counted = Math.min(fresh, left);
    state.rewarded[wid] = Math.max(best, next);

    if (counted > 0) {
      state.daily.eps += counted;
      state.log.push({ d: today(), t: 'ep', n: counted, w: wid });
    }
    if (canEarn) {
      result.gain = counted * rules.perEpisode;
      if (counted > 0) result.label = `+${result.gain} 코인 · 화수 기록`;
      else if (fresh > 0) result.label = '오늘 화수 코인은 다 받았어요';
    }
    if (result.completed && !state.rewarded[wid + ':done']) {
      state.rewarded[wid + ':done'] = true;
      state.log.push({ d: today(), t: 'done', n: 1, w: wid });
      if (canEarn) {
        result.gain += rules.completeBonus;
        result.label = `+${result.gain} 코인 · 완독 보너스!`;
      }
    }
    if (state.log.length > 3000) state.log = state.log.slice(-3000);
    state.coins += result.gain;
    save();
    return result;
  }

  function stats(fromDate) {
    let eps = 0, done = 0;
    state.log.forEach((e) => {
      if (fromDate && e.d < fromDate) return;
      if (e.t === 'ep') eps += e.n;
      if (e.t === 'done') done += e.n;
    });
    return { eps, done };
  }

  function reset() {
    state = blank();
    save();
  }

  window.WT = window.WT || {};
  WT.store = {
    get state() { return state; },
    save, today, weekStart, recordEpisodes, stats, reset
  };
})();
