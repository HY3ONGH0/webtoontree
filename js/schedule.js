/* 연재 요일 · 연재 상태 도구 (사이트와 관리자 화면이 함께 써요)
   - status: 'ongoing'(연재 중) | 'hiatus'(휴재) | 'completed'(완결)
   - days: ['mon', 'thu'] 처럼 올라오는 요일
   - autoCount: true면, 연재 중일 때 baseDate 다음 날부터 오늘까지 연재 요일 수만큼 총 화수를 자동으로 더해요 */
(function () {
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const DAY_KO = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
  const STATUS_KO = { ongoing: '연재 중', hiatus: '휴재', completed: '완결' };

  // 한국 시간 기준 오늘 (YYYY-MM-DD)
  function today() {
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  }

  function status(w) {
    if (w.status && STATUS_KO[w.status]) return w.status;
    return w.ongoing ? 'ongoing' : 'completed';   // 예전 데이터(ongoing: true/false)도 읽어요
  }

  /** baseDate 다음 날부터 toDate까지, 연재 요일이 몇 번 있었는지 */
  function countDays(days, baseDate, toDate) {
    if (!days || !days.length || !baseDate || !toDate || toDate <= baseDate) return 0;
    const want = new Set(days.map((d) => (DAYS.indexOf(d) + 1) % 7));   // JS: 일=0, 월=1 …
    const [y, m, d] = baseDate.split('-').map(Number);
    const end = Date.UTC(...toDate.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))));
    let t = Date.UTC(y, m - 1, d);
    let n = 0;
    for (let i = 0; i < 3660; i++) {
      t += 86400000;
      if (t > end) break;
      if (want.has(new Date(t).getUTCDay())) n++;
    }
    return n;
  }

  /** 오늘 기준 총 화수 */
  function episodes(w, onDate) {
    const base = Math.max(1, Number(w.episodes) || 1);
    if (status(w) !== 'ongoing' || !w.autoCount) return base;
    return base + countDays(w.days, w.baseDate, onDate || today());
  }

  function daysLabel(w) {
    const list = (w.days || []).filter((d) => DAY_KO[d]);
    if (!list.length) return '';
    return DAYS.filter((d) => list.includes(d)).map((d) => DAY_KO[d]).join('·');
  }

  /** 화면에 띄울 짧은 글: "연재 중 · 월·목" / "휴재" / "완결" */
  function label(w) {
    const st = status(w);
    const days = daysLabel(w);
    return st === 'ongoing' && days ? `${STATUS_KO[st]} · 매주 ${days}` : STATUS_KO[st];
  }

  window.WT = window.WT || {};
  WT.schedule = { DAYS, DAY_KO, STATUS_KO, today, status, countDays, episodes, daysLabel, label };
  /** 관리자 추천 별 개수 0~3 (예전 데이터의 true 는 1개) */
  WT.recStars = (w) => Math.max(0, Math.min(3, w && w.recommended === true ? 1 : Math.round(Number(w && w.recommended) || 0)));
})();
