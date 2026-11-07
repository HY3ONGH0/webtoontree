/* 서버(Apps Script) 연결
   data.json 의 settings.apiUrl 에 Apps Script 웹앱 주소를 넣으면 "서버 모드"가 켜져요.
   비어 있으면 지금처럼 이 브라우저에만 저장하는 "혼자 모드"로 동작해요. */
(function () {
  window.WT = window.WT || {};

  function url() { return (WT.data && WT.data.settings && WT.data.settings.apiUrl || '').trim(); }

  async function call(action, payload) {
    const res = await fetch(url(), {
      method: 'POST',
      // text/plain 으로 보내야 브라우저가 사전 확인(CORS preflight) 없이 Apps Script에 바로 보내요
      body: JSON.stringify(Object.assign({ action }, payload || {}))
    });
    let json;
    try { json = await res.json(); } catch (e) { throw new Error('서버 응답을 읽지 못했어요.'); }
    if (!json.ok) {
      const err = new Error(json.error || '서버에서 문제가 생겼어요.');
      if (/로그인이 필요/.test(json.error || '')) err.auth = true;
      throw err;
    }
    return json;
  }

  /** 로그인한 사람의 요청: 토큰을 붙이고, 로그인이 풀렸으면 로그인 화면으로 보내요 */
  async function authed(action, payload) {
    const S = WT.store.state;
    try {
      return await call(action, Object.assign({ token: S.token }, payload || {}));
    } catch (e) {
      if (e.auth) {
        S.token = null; S.profile = null; WT.store.save();
        WT.toast('로그인이 풀렸어요. 다시 로그인해 주세요.');
        location.hash = '#/login';
      }
      throw e;
    }
  }

  /** 서버에서 받은 내 정보로 이 기기 기록을 맞춰요 (서버가 기준) */
  function applyMe(me) {
    const S = WT.store.state;
    S.profile = { nick: me.nickname, userId: me.userId };
    S.coins = me.coins;
    S.progress = me.progress || {};
    S.rewarded = me.rewarded || {};
    S.daily = me.daily || { date: '', eps: 0 };
    S.owned = Object.assign({ basic: true }, me.owned || {});
    S.equip = me.equip || { acc: 'basic', color: null };
    S.unlocked = me.unlocked || {};
    S.ratings = me.ratings || {};
    WT.store.save();
  }

  function viewerId() {
    const S = WT.store.state;
    if (S.profile && S.profile.userId) return 'u:' + S.profile.userId;
    if (!S.viewerId) { S.viewerId = 'g:' + Math.random().toString(36).slice(2, 12); WT.store.save(); }
    return S.viewerId;
  }

  WT.api = {
    on: () => !!url(),
    call, authed, applyMe, viewerId,
    /** 결과를 기다릴 필요 없는 요청 (조회 기록 등) */
    fire(action, payload) { if (url()) call(action, payload).catch(() => {}); }
  };
})();
