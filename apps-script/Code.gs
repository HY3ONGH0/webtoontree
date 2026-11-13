/**
 * 웹툰트리 서버 (Google Apps Script)
 *
 * 설치: apps-script/설치방법.md 를 보고 따라 하세요.
 * - 이 코드는 구글 시트에 붙어 있는(컨테이너 결합) Apps Script 프로젝트에 넣어요.
 * - 처음 한 번 setup() 을 실행하면 필요한 시트 탭과 주간 알림이 만들어져요.
 * - 비밀 값은 [프로젝트 설정 → 스크립트 속성]에 넣어요. 코드에는 비밀번호를 적지 않아요.
 *     ADMIN_PASSWORD  (필수) 최종 관리자 비밀번호
 *     ADMIN_ID        (선택) 최종 관리자 아이디. 기본: admin
 *                     최종 관리자는 회원 중에서 관리자를 지정하거나 해제할 수 있어요 (관리자 화면 → 회원 목록).
 *     ADMIN_EMAIL     (선택) 주간 알림을 받을 메일. 비우면 스크립트 주인 메일
 *     DATA_URL        (선택) 사이트 data.json 주소. 기본: https://hy3ongh0.github.io/webtoontree/data/data.json
 *     GITHUB_TOKEN    (선택) 관리자 화면 [바로 저장]용 GitHub 토큰 (webtoontree 저장소 Contents 쓰기 권한만)
 *     GITHUB_REPO     (선택) 기본: hy3ongh0/webtoontree
 *     GITHUB_BRANCH   (선택) 기본: main
 */

var DEFAULT_DATA_URL = 'https://hy3ongh0.github.io/webtoontree/data/data.json';
var TZ = 'Asia/Seoul';

var SHEETS = {
  users: ['userId', 'nickname', 'pwHash', 'salt', 'createdAt', 'status', 'coins', 'progress', 'rewarded', 'daily', 'owned', 'equip', 'unlocked', 'role', 'favs'],
  sessions: ['token', 'userId', 'expiresAt'],
  ratings: ['webtoonId', 'userId', 'score', 'updatedAt'],
  comments: ['commentId', 'webtoonId', 'userId', 'text', 'createdAt', 'hidden'],
  views: ['date', 'webtoonId', 'viewerId'],
  coinLog: ['logId', 'userId', 'amount', 'reason', 'ref', 'eps', 'createdAt'],
  live: ['ver', 'at', 'by', 'name', 'ops'],
  reports: ['reportId', 'webtoonId', 'viewerId', 'note', 'createdAt', 'done']
};
var JSON_COLS = { progress: 1, rewarded: 1, daily: 1, owned: 1, equip: 1, unlocked: 1, favs: 1 };

// ======================================================================
// 웹 요청 입구
// ======================================================================
function doGet() {
  return out_({ ok: true, name: 'webtoontree', time: now_() });
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return out_({ ok: false, error: '요청 형식이 올바르지 않아요.' });
  }
  var fn = ACTIONS[body.action];
  if (!fn) return out_({ ok: false, error: '알 수 없는 요청이에요.' });
  var lock = null;
  try {
    if (WRITE_ACTIONS[body.action]) {
      lock = LockService.getScriptLock();
      lock.waitLock(15000);
    }
    var result = fn(body) || {};
    result.ok = true;
    return out_(result);
  } catch (err) {
    var msg = err && err.userMessage ? err.userMessage : '서버에서 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.';
    if (!(err && err.userMessage)) console.error(err && err.stack ? err.stack : err);
    var fail = { ok: false, error: msg };
    // 관리자 화면의 요청은 무엇이 잘못됐는지 짧게 함께 알려 줘요 (원인을 바로 찾을 수 있게)
    if (!(err && err.userMessage) && /^(live|admin)/.test(String(body.action))) fail.detail = String((err && err.message) || err).slice(0, 160);
    return out_(fail);
  } finally {
    if (lock) lock.releaseLock();
  }
}

var WRITE_ACTIONS = {
  signup: 1, login: 1, logout: 1, nick: 1, deleteAccount: 1, progress: 1, rate: 1, comment: 1, deleteComment: 1,
  view: 1, buy: 1, equip: 1, unlockCoin: 1, unlockAdmin: 1, report: 1,
  adminSetStatus: 1, adminResetPassword: 1, adminSetNick: 1, adminHideComment: 1, adminReportDone: 1, adminSaveData: 1, adminSetRole: 1
};

var ACTIONS = {
  // ---------- 회원 ----------
  signup: function (b) {
    var id = String(b.userId || '').trim().toLowerCase();
    var pw = String(b.password || '');
    var nick = String(b.nickname || '').trim();
    if (!b.agree) fail_('개인정보 수집·이용에 동의해 주세요.');
    if (!/^[a-z0-9]{4,16}$/.test(id)) fail_('아이디는 영어 소문자·숫자 4~16자로 정해 주세요.');
    if (pw.length < 8 || pw.length > 64) fail_('비밀번호는 8자 이상으로 정해 주세요.');
    checkNick_(nick);
    if (id === adminId_() || findRow_('users', 'userId', id)) fail_('이미 쓰고 있는 아이디예요.');
    if (nickTaken_(nick, null)) fail_('이미 쓰고 있는 닉네임이에요.');
    var salt = randomHex_(16);
    var site = siteData_();
    var user = {
      userId: id, nickname: nick, pwHash: hashPw_(pw, salt), salt: salt, createdAt: now_(), status: 'active',
      coins: Number(site.settings.coins.startCoins || 0), progress: {}, rewarded: {}, daily: { date: '', eps: 0 },
      owned: { basic: true }, equip: { acc: 'basic', color: null }, unlocked: {}
    };
    appendRow_('users', user);
    return { token: newSession_(id), me: publicMe_(user) };
  },

  login: function (b) {
    var id = String(b.userId || '').trim().toLowerCase();
    // 관리자 아이디로 로그인하면: 관리자 비밀번호를 확인하고 관리자 화면으로 보내요 (회원 계정은 만들지 않아요)
    if (id === adminId_()) {
      checkAdmin_(b.password);
      return { admin: true };
    }
    var tries = cacheGet_('login:' + id) || 0;
    if (tries >= 10) fail_('로그인을 너무 많이 시도했어요. 30분 뒤에 다시 해 주세요.');
    var hit = findRow_('users', 'userId', id);
    if (!hit || hit.obj.pwHash !== hashPw_(String(b.password || ''), hit.obj.salt)) {
      cachePut_('login:' + id, tries + 1, 1800);
      fail_('아이디 또는 비밀번호가 맞지 않아요.');
    }
    if (hit.obj.status === 'banned') fail_('이용이 정지된 계정이에요. 관리자에게 문의해 주세요.');
    cacheDel_('login:' + id);
    return { token: newSession_(id), me: publicMe_(hit.obj) };
  },

  logout: function (b) {
    var s = findRow_('sessions', 'token', String(b.token || ''));
    if (s) deleteRow_('sessions', s.row);
    return {};
  },

  me: function (b) {
    return { me: publicMe_(auth_(b.token).obj) };
  },

  nick: function (b) {
    var u = auth_(b.token);
    var nick = String(b.nickname || '').trim();
    checkNick_(nick);
    if (nickTaken_(nick, u.obj.userId)) fail_('이미 쓰고 있는 닉네임이에요.');
    u.obj.nickname = nick;
    updateRow_('users', u.row, u.obj);
    return { me: publicMe_(u.obj) };
  },

  deleteAccount: function (b) {
    var u = auth_(b.token);
    if (u.obj.pwHash !== hashPw_(String(b.password || ''), u.obj.salt)) fail_('비밀번호가 맞지 않아요.');
    var id = u.obj.userId;
    var touched = {};
    readAll_('ratings').concat(readAll_('comments')).forEach(function (r) { if (r.obj.userId === id) touched[r.obj.webtoonId] = 1; });
    Object.keys(touched).forEach(function (wid) { cacheDel_('social:' + wid); });
    deleteWhere_('sessions', function (r) { return r.userId === id; });
    deleteWhere_('ratings', function (r) { return r.userId === id; });
    deleteWhere_('coinLog', function (r) { return r.userId === id; });
    updateWhere_('comments', function (r) { return r.userId === id; }, function (r) { r.userId = ''; return r; });
    deleteRow_('users', findRow_('users', 'userId', id).row);
    return {};
  },

  // ---------- 감상 진행 · 코인 ----------
  progress: function (b) {
    var u = auth_(b.token);
    var site = siteData_();
    var w = findToon_(site, b.webtoonId);
    var total = episodes_(w, today_());
    var rules = site.settings.coins;
    var me = u.obj;
    var wid = w.id;
    var prev = Number(me.progress[wid] || 0);
    var next = Math.max(0, Math.min(total, Math.round(Number(b.value) || 0)));
    me.progress[wid] = next;
    if (!me.daily || me.daily.date !== today_()) me.daily = { date: today_(), eps: 0 };
    var best = Number(me.rewarded[wid] || 0);
    var fresh = Math.max(0, next - Math.max(prev, best));
    var left = Math.max(0, Number(rules.dailyEpisodeCap) - me.daily.eps);
    var counted = Math.min(fresh, left);
    me.rewarded[wid] = Math.max(best, next);
    var gain = 0, label = '', completed = next >= total && prev < total;
    if (counted > 0) {
      me.daily.eps += counted;
      gain = counted * Number(rules.perEpisode);
      label = '+' + gain + ' 코인 · 화수 기록';
      log_(me.userId, gain, 'ep', wid, counted);
    } else if (fresh > 0) {
      label = '오늘 화수 코인은 다 받았어요';
    }
    if (completed && !me.rewarded[wid + ':done']) {
      me.rewarded[wid + ':done'] = true;
      var bonus = Number(rules.completeBonus);
      gain += bonus;
      label = '+' + gain + ' 코인 · 완독 보너스!';
      log_(me.userId, bonus, 'done', wid, 0);
    }
    me.coins = Number(me.coins) + gain;
    updateRow_('users', u.row, me);
    return { me: publicMe_(me), gain: gain, label: label, completed: completed };
  },

  // ---------- 별점 · 댓글 ----------
  rate: function (b) {
    var u = auth_(b.token);
    var w = findToon_(siteData_(), b.webtoonId);
    var score = Math.round(Number(b.score));
    if (!(score >= 1 && score <= 5)) fail_('별점은 1~5점이에요.');
    var rows = readAll_('ratings');
    var hit = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].obj.webtoonId === w.id && rows[i].obj.userId === u.obj.userId) hit = rows[i];
    if (hit) { hit.obj.score = score; hit.obj.updatedAt = now_(); updateRow_('ratings', hit.row, hit.obj); }
    else appendRow_('ratings', { webtoonId: w.id, userId: u.obj.userId, score: score, updatedAt: now_() });
    cacheDel_('social:' + w.id);
    return { social: social_(w.id, u.obj.userId), me: publicMe_(u.obj) };
  },

  social: function (b) {
    var uid = null;
    if (b.token) { try { uid = auth_(b.token).obj.userId; } catch (err) { uid = null; } }
    return { social: social_(String(b.webtoonId || ''), uid) };
  },

  comment: function (b) {
    var u = auth_(b.token);
    var w = findToon_(siteData_(), b.webtoonId);
    var text = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!text) fail_('댓글 내용을 적어 주세요.');
    var key = 'cm:' + u.obj.userId + ':' + today_();
    var n = cacheGet_(key) || 0;
    if (n >= 30) fail_('오늘은 댓글을 너무 많이 썼어요. 내일 다시 써 주세요.');
    cachePut_(key, n + 1, 86400);
    appendRow_('comments', { commentId: randomHex_(8), webtoonId: w.id, userId: u.obj.userId, text: text, createdAt: now_(), hidden: '' });
    cacheDel_('social:' + w.id);
    return { social: social_(w.id, u.obj.userId) };
  },

  deleteComment: function (b) {
    var u = auth_(b.token);
    var hit = findRow_('comments', 'commentId', String(b.commentId || ''));
    if (!hit || hit.obj.userId !== u.obj.userId) fail_('내 댓글만 지울 수 있어요.');
    deleteRow_('comments', hit.row);
    cacheDel_('social:' + hit.obj.webtoonId);
    return { social: social_(hit.obj.webtoonId, u.obj.userId) };
  },

  // ---------- 조회 · 오늘 폭주 ----------
  view: function (b) {
    var wid = String(b.webtoonId || '');
    var viewer = String(b.viewerId || '').slice(0, 40);
    if (!wid || !viewer) return {};
    var key = 'v:' + today_() + ':' + wid + ':' + viewer;
    if (cacheGet_(key)) return {};
    cachePut_(key, 1, 21600);
    appendRow_('views', { date: today_(), webtoonId: wid, viewerId: viewer });
    return {};
  },

  hot: function () {
    var cached = cacheGet_('hot:' + today_());
    if (cached) return { hot: cached };
    var rules = siteData_().settings.hot || { topN: 3, minViewers: 5 };
    var day = today_();
    var seen = {}, count = {};
    readAll_('views').forEach(function (r) {
      var v = r.obj;
      if (v.date !== day) return;
      var k = v.webtoonId + '|' + v.viewerId;
      if (seen[k]) return;
      seen[k] = 1;
      count[v.webtoonId] = (count[v.webtoonId] || 0) + 1;
    });
    var hot = Object.keys(count).filter(function (id) { return count[id] >= Number(rules.minViewers); })
      .sort(function (a, b2) { return count[b2] - count[a]; }).slice(0, Number(rules.topN));
    cachePut_('hot:' + day, hot, 300);
    return { hot: hot };
  },

  // ---------- 관리자 함께 편집 (실시간) ----------
  /** 처음 들어올 때: 마지막으로 사이트에 올린 데이터 + 그 뒤 함께 고친 내용 */
  liveJoin: function (b) {
    var me = who_(b);
    var st = liveState_();
    var cur = githubFile_(github_());
    if (!cur) fail_('GitHub에서 data.json을 읽지 못했어요. ' + GH_LAST_);
    var data = JSON.parse(cur.text);
    // 저장 전 변경 기록을 읽지 못해도 연결은 되게 해요 (마지막으로 저장된 내용부터 다시 시작)
    var batches = [], lost = false;
    try { batches = liveOps_(st.base, st.ver); } catch (e) { console.error('liveOps', e && e.stack ? e.stack : e); lost = true; }
    var who = [];
    try { livePresence_(me, b.here); who = livePresence_(null); } catch (e) { console.error('presence', e); }
    return { version: st.ver, baseVersion: st.base, base: data, baseHash: hash_(JSON.stringify(data)), batches: batches, lost: lost, who: who };
  },

  /** 몇 초마다: 내 변경 올리기 + 다른 관리자 변경 받기 + 누가 있는지 */
  liveSync: function (b) {
    var me = who_(b);
    var since = Number(b.since) || 0;
    var myVer = null;
    if (b.ops && b.ops.length) {
      var text = JSON.stringify(b.ops);
      // 시트 한 칸에는 5만 자까지만 들어가요. 관리자 화면이 이보다 작게 나눠서 보내요
      if (text.length > 49000) fail_('한 번에 고친 내용이 너무 커요. 관리자 화면을 새로고침한 뒤 다시 해 주세요.');
      var lock = LockService.getScriptLock();
      lock.waitLock(15000);
      try {
        var st0 = liveState_();
        myVer = st0.ver + 1;
        var row = { ver: myVer, at: now_(), by: me.userId, name: me.name, ops: text };
        CacheService.getScriptCache().put('live:op:' + myVer, JSON.stringify(row), 21600);
        appendRow_('live', row);
        PropertiesService.getScriptProperties().setProperty('LIVE_VER', String(myVer));
      } finally { lock.releaseLock(); }
    }
    var st = liveState_();
    if (since < st.base) return { rejoin: true, version: st.ver };
    livePresence_(me, b.here);
    return {
      version: st.ver, myVer: myVer, batches: since < st.ver ? liveOps_(since, st.ver) : [],
      who: livePresence_(null), base: { version: st.base, hash: st.baseHash }
    };
  },

  /** 웹툰별 평균 별점 (도서관 마도서 별점순 정렬용) */
  ratingSummary: function () {
    var cached = cacheGet_('ratesum');
    if (cached) return { ratings: cached };
    var sum = {};
    readAll_('ratings').forEach(function (r) {
      var v = Number(r.obj.score);
      if (!v) return;
      var s = sum[r.obj.webtoonId] || (sum[r.obj.webtoonId] = { t: 0, c: 0 });
      s.t += v; s.c += 1;
    });
    var out = {};
    Object.keys(sum).forEach(function (id) { out[id] = { avg: Math.round(sum[id].t / sum[id].c * 10) / 10, count: sum[id].c }; });
    cachePut_('ratesum', out, 120);
    return { ratings: out };
  },

  /** 이번 주(월요일부터) 많이 읽은 웹툰: 읽은 화수, 같으면 본 사람 수 */
  topWebtoons: function () {
    var from = weekStart_();
    var key = 'topw:' + from + ':' + today_();
    var cached = cacheGet_(key);
    if (cached) return { from: from, top: cached };
    var eps = {}, viewers = {}, seen = {};
    readAll_('coinLog').forEach(function (r) {
      var l = r.obj;
      if (l.reason !== 'ep' || String(l.createdAt).slice(0, 10) < from) return;
      eps[l.ref] = (eps[l.ref] || 0) + Number(l.eps || 0);
    });
    readAll_('views').forEach(function (r) {
      var v = r.obj;
      if (String(v.date) < from) return;
      var k = v.webtoonId + '|' + v.viewerId;
      if (seen[k]) return;
      seen[k] = 1;
      viewers[v.webtoonId] = (viewers[v.webtoonId] || 0) + 1;
    });
    var idsAll = {};
    Object.keys(eps).concat(Object.keys(viewers)).forEach(function (id) { idsAll[id] = 1; });
    var top = Object.keys(idsAll).map(function (id) { return { id: id, eps: eps[id] || 0, viewers: viewers[id] || 0 }; })
      .sort(function (a, b2) { return (b2.eps - a.eps) || (b2.viewers - a.viewers); }).slice(0, 40);
    cachePut_(key, top, 300);
    return { from: from, top: top };
  },

  // ---------- 랭킹 ----------
  // 작가 소식: 네이버 웹툰 작가 홈의 최근 게시글 목록 (누구나, 1시간 동안 기억)
  // 글 전체를 옮겨 오지 않고 제목 · 짧은 미리보기 · 날짜 · 원문 링크만 보여 줘요
  authorPosts: function (b) {
    var name = String(b.name || '').trim();
    var url = String(b.url || '').trim();
    var artist = null;
    // 작가 홈 주소 · 프로필 사진을 모르면, 그 작가의 네이버 웹툰 작품 정보에서 찾아요
    if (name) {
      (b.sources || []).slice(0, 3).forEach(function (src) {
        if (artist || !/comic\.naver\.com/.test(String(src))) return;
        try {
          var inf = infoFor_(String(src), false).info;
          (inf.artists || []).forEach(function (a) { if (!artist && String(a.name).trim().toLowerCase() === name.toLowerCase()) artist = a; });
        } catch (e) { /* 다음 작품 */ }
      });
    }
    if (artist && artist.url && !/^https:\/\/comic\.naver\.com\/community\//.test(url)) url = artist.url;
    var out = { posts: [], url: url, artist: artist ? { img: artist.img || '', url: artist.url || '', bio: artist.bio || '' } : null };
    if (!/^https:\/\/comic\.naver\.com\/community\//.test(url)) { out.reason = 'no-home'; return out; }
    var key = 'posts3:' + sha256_(url).slice(0, 32);
    var memo = cacheGet_(key);
    if (memo) { out.posts = memo.posts; out.reason = memo.reason; return out; }
    try { out.posts = naverPosts_(url); } catch (e) { out.reason = String(e.message || e).slice(0, 120); }
    cachePut_(key, { posts: out.posts, reason: out.reason }, out.posts.length ? 3600 : 600);
    return out;
  },

  ranking: function (b) {
    var period = { week: 1, month: 1, all: 1 }[b.period] ? b.period : 'week';
    var metric = b.metric === 'done' ? 'done' : 'eps';
    var key = 'rank:' + period + ':' + metric + ':' + today_();
    var board = cacheGet_(key);
    if (!board) {
      var from = period === 'week' ? weekStart_() : period === 'month' ? today_().slice(0, 8) + '01' : '';
      var sum = {};
      readAll_('coinLog').forEach(function (r) {
        var l = r.obj;
        if (from && String(l.createdAt).slice(0, 10) < from) return;
        if (l.reason !== 'ep' && l.reason !== 'done') return;
        var s = sum[l.userId] || (sum[l.userId] = { eps: 0, done: 0 });
        if (l.reason === 'ep') s.eps += Number(l.eps || 0);
        else s.done += 1;
      });
      var users = {};
      readAll_('users').forEach(function (r) { users[r.obj.userId] = r.obj; });
      board = Object.keys(sum).filter(function (id) { return users[id] && users[id].status !== 'banned'; }).map(function (id) {
        return { userId: id, nickname: users[id].nickname, eps: sum[id].eps, done: sum[id].done, equip: users[id].equip };
      }).sort(function (a, b2) { return (b2[metric] - a[metric]) || (b2.eps - a.eps); });
      cachePut_(key, board, 300);
    }
    var mine = null;
    if (b.token) {
      try {
        var uid = auth_(b.token).obj.userId;
        for (var i = 0; i < board.length; i++) if (board[i].userId === uid) { mine = { rank: i + 1, eps: board[i].eps, done: board[i].done }; break; }
      } catch (err) { mine = null; }
    }
    var top = board.slice(0, 10).map(function (x, i) { return { rank: i + 1, nickname: x.nickname, eps: x.eps, done: x.done, equip: x.equip }; });
    var gap = null;
    if (mine && mine.rank > 1) {
      var above = board[mine.rank - 2];
      gap = { nickname: above.nickname, value: above[metric] - (metric === 'eps' ? mine.eps : mine.done) };
    }
    return { period: period, metric: metric, top: top, mine: mine, gap: gap, total: board.length };
  },

  // ---------- 상점 · 잠금 해제 ----------
  buy: function (b) {
    var u = auth_(b.token);
    var item = findItem_(siteData_(), b.itemId);
    var me = u.obj;
    if (me.owned[item.id] || Number(item.price) === 0) fail_('이미 가지고 있는 아이템이에요.');
    if (Number(me.coins) < Number(item.price)) fail_('코인이 부족해요.');
    me.coins = Number(me.coins) - Number(item.price);
    me.owned[item.id] = true;
    if (item.kind === 'color') me.equip.color = item.id; else me.equip.acc = item.id;
    log_(me.userId, -Number(item.price), 'buy', item.id, 0);
    updateRow_('users', u.row, me);
    return { me: publicMe_(me) };
  },

  // 관심 웹툰 담기 · 빼기 (계정에 저장, 200개까지)
  fav: function (b) {
    var u = auth_(b.token);
    var me = u.obj;
    var id = String(b.webtoonId || '');
    if (!id || id.length > 40) fail_('없는 웹툰이에요.');
    me.favs = me.favs || {};
    if (b.on) {
      if (!me.favs[id] && Object.keys(me.favs).length >= 200) fail_('관심 웹툰은 200개까지 담을 수 있어요.');
      me.favs[id] = 1;
    } else delete me.favs[id];
    updateRow_('users', u.row, me);
    return { me: publicMe_(me) };
  },

  equip: function (b) {
    var u = auth_(b.token);
    var me = u.obj;
    if (b.slot === 'color' && !b.itemId) { me.equip.color = null; updateRow_('users', u.row, me); return { me: publicMe_(me) }; }
    var item = findItem_(siteData_(), b.itemId);
    if (!me.owned[item.id] && Number(item.price) !== 0) fail_('먼저 아이템을 사 주세요.');
    if (item.kind === 'color') me.equip.color = item.id; else me.equip.acc = item.id;
    updateRow_('users', u.row, me);
    return { me: publicMe_(me) };
  },

  unlockCoin: function (b) {
    var u = auth_(b.token);
    var site = siteData_();
    var w = findToon_(site, b.webtoonId);
    var price = Number(site.settings.coins.unlockPrice);
    var me = u.obj;
    if (me.unlocked[w.id]) return { me: publicMe_(me) };
    if (Number(me.coins) < price) fail_('코인이 부족해요.');
    me.coins = Number(me.coins) - price;
    me.unlocked[w.id] = true;
    log_(me.userId, -price, 'unlock', w.id, 0);
    updateRow_('users', u.row, me);
    return { me: publicMe_(me) };
  },

  unlockAdmin: function (b) {
    who_(b);
    var w = findToon_(siteData_(), b.webtoonId);
    if (b.token) {
      var u = auth_(b.token);
      u.obj.unlocked[w.id] = true;
      updateRow_('users', u.row, u.obj);
      return { me: publicMe_(u.obj) };
    }
    return {};
  },

  // ---------- 새 화 제보 ----------
  report: function (b) {
    var wid = String(b.webtoonId || '');
    var viewer = String(b.viewerId || '').slice(0, 40);
    findToon_(siteData_(), wid);
    var key = 'rp:' + today_() + ':' + wid + ':' + viewer;
    if (cacheGet_(key)) return { already: true };
    cachePut_(key, 1, 86400);
    appendRow_('reports', { reportId: randomHex_(8), webtoonId: wid, viewerId: viewer, note: String(b.note || '').slice(0, 100), createdAt: now_(), done: '' });
    return {};
  },

  // ---------- 관리자 ----------
  // 제목으로 작품 찾기 (관리자만): 네이버 웹툰 정식 연재작
  adminSearch: function (b) {
    who_(b);
    var q = String(b.q || '').trim();
    if (q.length < 1) fail_('찾을 제목을 넣어 주세요.');
    var key = 'search2:' + sha256_(q).slice(0, 32);
    var memo = cacheGet_(key);
    if (memo) return memo;
    var list = [];
    list = naverSearch_(q);
    var r = { items: list };
    cachePut_(key, r, 1800);
    return r;
  },

  // 연결된 웹툰들의 자동 정보 한꺼번에 다시 가져오기 (관리자만, 한 번에 25개까지)
  adminRefreshInfo: function (b) {
    who_(b);
    var out = {};
    (b.items || []).slice(0, 25).forEach(function (x) {
      try { out[x.id] = infoFor_(String(x.source || ''), true); } catch (e) { out[x.id] = { error: e.userMessage || '가져오지 못했어요' }; }
    });
    return { infos: out };
  },

  // 링크(또는 작품 번호)로 웹툰 정보 가져오기 (관리자만) — 네이버 웹툰
  adminFetchInfo: function (b) {
    who_(b);
    var url = String(b.url || '').trim();
    return infoFor_(url, false);
  },

  adminCheck: function (b) {
    var me = who_(b);
    try { ensureAutoTrigger_(); } catch (e) { console.warn('trigger', e); }
    var p = PropertiesService.getScriptProperties();
    return { github: !!p.getProperty('GITHUB_TOKEN'), email: p.getProperty('ADMIN_EMAIL') || '', owner: me.owner, adminName: me.name, adminUserId: me.userId };
  },

  adminUsers: function (b) {
    var me = who_(b);
    return {
      users: readAll_('users').map(function (r) {
        var u = r.obj;
        return { userId: u.userId, nickname: u.nickname, createdAt: u.createdAt, status: u.status, coins: Number(u.coins), role: u.role === 'admin' ? 'admin' : '' };
      })
    };
  },

  adminSetStatus: function (b) {
    var me = who_(b);
    var hit = findRow_('users', 'userId', String(b.userId || ''));
    if (!hit) fail_('없는 회원이에요.');
    guardTarget_(me, hit.obj);
    hit.obj.status = b.status === 'banned' ? 'banned' : 'active';
    updateRow_('users', hit.row, hit.obj);
    if (hit.obj.status === 'banned') deleteWhere_('sessions', function (r) { return r.userId === hit.obj.userId; });
    return {};
  },

  adminResetPassword: function (b) {
    var me = who_(b);
    if (!me.owner) fail_('비밀번호 초기화는 최종 관리자만 할 수 있어요.');
    var hit = findRow_('users', 'userId', String(b.userId || ''));
    if (!hit) fail_('없는 회원이에요.');
    var pw = String(b.newPassword || '');
    if (pw.length < 8) fail_('새 비밀번호는 8자 이상이어야 해요.');
    hit.obj.salt = randomHex_(16);
    hit.obj.pwHash = hashPw_(pw, hit.obj.salt);
    updateRow_('users', hit.row, hit.obj);
    deleteWhere_('sessions', function (r) { return r.userId === hit.obj.userId; });
    return {};
  },

  adminSetNick: function (b) {
    var me = who_(b);
    var hit = findRow_('users', 'userId', String(b.userId || ''));
    if (!hit) fail_('없는 회원이에요.');
    guardTarget_(me, hit.obj);
    var nick = String(b.nickname || '').trim();
    checkNick_(nick);
    if (nickTaken_(nick, hit.obj.userId)) fail_('이미 쓰고 있는 닉네임이에요.');
    hit.obj.nickname = nick;
    updateRow_('users', hit.row, hit.obj);
    return {};
  },

  adminComments: function (b) {
    var me = who_(b);
    var nicks = nickMap_();
    var site = siteData_();
    var titles = {};
    site.webtoons.forEach(function (w) { titles[w.id] = w.title; });
    var list = readAll_('comments').map(function (r) {
      var c = r.obj;
      return { commentId: c.commentId, webtoonId: c.webtoonId, title: titles[c.webtoonId] || c.webtoonId, nickname: c.userId ? (nicks[c.userId] || c.userId) : '탈퇴한 사용자', userId: c.userId, text: c.text, createdAt: c.createdAt, hidden: !!c.hidden };
    }).reverse().slice(0, 200);
    return { comments: list };
  },

  adminHideComment: function (b) {
    var me = who_(b);
    var hit = findRow_('comments', 'commentId', String(b.commentId || ''));
    if (!hit) fail_('없는 댓글이에요.');
    hit.obj.hidden = b.hidden ? 'yes' : '';
    updateRow_('comments', hit.row, hit.obj);
    cacheDel_('social:' + hit.obj.webtoonId);
    return {};
  },

  adminReports: function (b) {
    var me = who_(b);
    var titles = {};
    siteData_().webtoons.forEach(function (w) { titles[w.id] = w.title; });
    return {
      reports: readAll_('reports').filter(function (r) { return !r.obj.done; }).map(function (r) {
        return { reportId: r.obj.reportId, webtoonId: r.obj.webtoonId, title: titles[r.obj.webtoonId] || r.obj.webtoonId, note: r.obj.note, createdAt: r.obj.createdAt };
      }).reverse()
    };
  },

  adminReportDone: function (b) {
    var me = who_(b);
    var wid = String(b.webtoonId || '');
    updateWhere_('reports', function (r) { return wid ? r.webtoonId === wid && !r.done : r.reportId === b.reportId; }, function (r) { r.done = 'yes'; return r; });
    return {};
  },

  adminSetRole: function (b) {
    var me = who_(b);
    if (!me.owner) fail_('관리자 지정·해제는 최종 관리자만 할 수 있어요.');
    var hit = findRow_('users', 'userId', String(b.userId || ''));
    if (!hit) fail_('없는 회원이에요.');
    if (b.role === 'admin' && hit.obj.status === 'banned') fail_('이용 정지된 회원은 관리자로 지정할 수 없어요.');
    hit.obj.role = b.role === 'admin' ? 'admin' : '';
    updateRow_('users', hit.row, hit.obj);
    readAll_('sessions').forEach(function (r) { if (r.obj.userId === hit.obj.userId) cacheDel_('who:' + r.obj.token); });
    return {};
  },

  /** 지금 GitHub에 올라가 있는 최신 data.json (다른 관리자가 막 저장한 것도 바로 보여요) */
  adminLatest: function (b) {
    who_(b);
    var cur = githubFile_(github_());
    if (!cur) fail_('GitHub에서 data.json을 읽지 못했어요.');
    var data = JSON.parse(cur.text);
    return { data: data, hash: hash_(JSON.stringify(data)) };
  },

  adminSaveData: function (b) {
    var me = who_(b);
    var data = b.data;
    if (!data || !Array.isArray(data.webtoons) || !Array.isArray(data.genres) || !data.settings) fail_('data.json 모양이 올바르지 않아요.');
    var g = github_();
    var cur = githubFile_(g);
    // 내가 고치기 시작한 뒤에 다른 관리자가 먼저 저장했으면, 덮어쓰기 전에 알려 줘요
    if (cur && b.baseHash && !b.force && hash_(JSON.stringify(JSON.parse(cur.text))) !== b.baseHash) return { conflict: true };
    var liveSt = null;
    if (b.liveVersion !== undefined && b.liveVersion !== null) {
      liveSt = liveState_();
      if (Number(b.liveVersion) !== liveSt.ver) return { behind: true, version: liveSt.ver };
    }
    var text = JSON.stringify(data, null, 2) + '\n';
    var who = me.owner ? '최종 관리자' : me.name + ' (' + me.userId + ')';
    var res = UrlFetchApp.fetch(g.api, {
      method: 'put', headers: g.headers, contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ message: '관리자 화면에서 데이터 저장 - ' + who, content: Utilities.base64Encode(text, Utilities.Charset.UTF_8), sha: cur ? cur.sha : undefined, branch: g.branch })
    });
    if (res.getResponseCode() === 409) return { conflict: true };
    if (res.getResponseCode() >= 300) fail_('GitHub에 저장하지 못했어요 (' + res.getResponseCode() + '). 토큰 권한을 확인해 주세요.');
    cacheDel_('site');
    var savedHash = hash_(JSON.stringify(data));
    if (liveSt) {
      // 함께 편집: 여기까지 사이트에 올렸어요. 그 전 기록은 정리해요
      var props = PropertiesService.getScriptProperties();
      props.setProperty('LIVE_BASE', String(liveSt.ver));
      props.setProperty('LIVE_BASE_HASH', savedHash);
      livePrune_(liveSt.ver);
    }
    return { savedAt: now_(), hash: savedHash };
  }
};

// ======================================================================
// 처음 한 번 실행: 시트 탭 만들기 + 주간 알림 예약
// ======================================================================
function setup() {
  Object.keys(SHEETS).forEach(function (name) { sheet_(name); });
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'weeklyDigest') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('weeklyDigest').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).inTimezone(TZ).create();
  ensureAutoTrigger_();
  if (!PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD')) {
    console.warn('스크립트 속성 ADMIN_PASSWORD 를 꼭 넣어 주세요.');
  }
  return '완료: 시트 탭, 매주 월요일 9시 알림, 매일 웹툰 정보 자동 갱신을 만들었어요.';
}

/** 매주 월요일 아침: 확인할 연재 중 웹툰 + 새 화 제보를 관리자 메일로 보내요. 오래된 조회 기록도 정리해요. */
function weeklyDigest() {
  var site = siteData_();
  var day = today_();
  var ongoing = site.webtoons.filter(function (w) { return status_(w) === 'ongoing'; });
  var hiatus = site.webtoons.filter(function (w) { return status_(w) === 'hiatus'; });
  var titles = {};
  site.webtoons.forEach(function (w) { titles[w.id] = w.title; });
  var reports = readAll_('reports').filter(function (r) { return !r.obj.done; });
  var byToon = {};
  reports.forEach(function (r) { byToon[r.obj.webtoonId] = (byToon[r.obj.webtoonId] || 0) + 1; });
  var dayKo = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
  var lines = [];
  lines.push('웹툰트리 주간 점검 (' + day + ')', '');
  lines.push('[새 화 제보] ' + (Object.keys(byToon).length ? '' : '없음'));
  Object.keys(byToon).forEach(function (id) { lines.push('- ' + (titles[id] || id) + ' : 제보 ' + byToon[id] + '건'); });
  lines.push('', '[연재 중 ' + ongoing.length + '개] 총 화수가 맞는지 확인해 주세요');
  ongoing.forEach(function (w) {
    lines.push('- ' + w.title + ' : 지금 ' + episodes_(w, day) + '화' + (w.autoCount ? ' (자동 계산)' : '') + ((w.days || []).length ? ' · 매주 ' + w.days.map(function (d) { return dayKo[d] || d; }).join('·') : ' · 요일 없음'));
  });
  lines.push('', '[휴재 ' + hiatus.length + '개] 다시 연재되면 상태를 바꿔 주세요');
  hiatus.forEach(function (w) { lines.push('- ' + w.title); });
  lines.push('', '관리자 화면: https://hy3ongh0.github.io/webtoontree/admin.html');
  var to = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || Session.getEffectiveUser().getEmail();
  if (to) MailApp.sendEmail(to, '[웹툰트리] 주간 점검 ' + day, lines.join('\n'));
  // 8일 지난 조회 기록 정리 (폭주 계산에는 오늘 기록만 써요)
  var cut = Utilities.formatDate(new Date(Date.now() - 8 * 86400000), TZ, 'yyyy-MM-dd');
  deleteWhere_('views', function (r) { return String(r.date) < cut; });
}

// ======================================================================
// 도우미
// ======================================================================
// ---------- 링크로 정보 가져오기 ----------
function infoFor_(url, fresh) {
  var key = 'info:' + sha256_(url).slice(0, 32);
  var memo = fresh ? null : cacheGet_(key);
  if (memo) return memo;
  var r = naverInfo_(url);
  r.info.source = r.info.url;   // 정보를 가져오는 공식 작품 주소 (보러 가기 링크와는 따로)
  cachePut_(key, r, 3600);
  return r;
}
/** 가져온 정보를 웹툰에 반영 (보러 가기 링크 · 장르 · 추천은 건드리지 않아요). 바뀐 게 있으면 true */
function applyInfo_(w, info, day) {
  var before = JSON.stringify(w);
  ['title', 'author', 'platform', 'desc'].forEach(function (k) { if (info[k]) w[k] = String(info[k]).slice(0, k === 'desc' ? 300 : 200); });
  if ((info.tags || []).length) w.tags = info.tags.slice(0, 8);
  if ((info.authors || []).length) { w.authors = info.authors.slice(0, 8); w.author = w.authors.map(function (a) { return a.name; }).join(', '); }
  if (info.status) { if (w.status !== info.status) { w.episodes = episodes_(w, day); w.baseDate = day; } w.status = info.status; delete w.ongoing; }
  if ((info.days || []).length) w.days = info.days.slice();
  if (info.episodes && Number(info.episodes) !== episodes_(w, day)) { w.episodes = Math.max(1, Number(info.episodes)); w.baseDate = day; }
  if (info.cover && (!w.cover || w.coverAuto)) { if (w.cover !== info.cover) w.color = ''; w.cover = info.cover; w.coverAuto = true; }
  w.autoCount = w.status === 'ongoing' && (w.days || []).length > 0;
  var changed = JSON.stringify(w) !== before;
  w.autoAt = day;
  return changed;
}
// 네이버 웹툰 제목 검색: 정식 연재 웹툰만 (도전만화 · 베스트도전 · 단행본은 빼요)
function naverSearch_(q) {
  var j = get_('https://comic.naver.com/api/search/webtoon?keyword=' + encodeURIComponent(q) + '&page=1', true);
  var seen = {};
  return ((j && j.searchList) || []).map(function (o) {
    if (!o || !o.titleId || !o.titleName || seen[o.titleId]) return null;
    seen[o.titleId] = 1;
    return { title: clean_(o.titleName),
      author: clean_(o.displayAuthor || (o.communityArtists || []).map(function (a) { return a.name; }).join(' / ')),
      platform: '네이버웹툰', cover: o.thumbnailUrl || '', source: 'https://comic.naver.com/webtoon/list?titleId=' + o.titleId,
      finished: !!o.finished, rest: !!o.rest, when: clean_(o.publishDescription || ''), episodes: Number(o.articleTotalCount) || 0, adult: !!o.adult };
  }).filter(Boolean).slice(0, 10);
}
// 링크나 숫자에서 네이버 웹툰 작품 번호 찾기 (PC · 모바일 · 회차 링크 모두)
function naverTitleId_(s) {
  s = String(s || '').trim();
  if (/^\d{3,9}$/.test(s)) return s;
  if (!/(^|[\/.])comic\.naver\.com\//i.test(s)) return '';
  return (s.match(/[?&]titleId=(\d+)/) || [])[1] || '';
}
function pickKey_(o, re) { for (var k in o) { if (re.test(k) && typeof o[k] === 'string' && o[k]) return o[k]; } return ''; }
function naverArtists_(list, people, titleId) {
  return list.slice(0, 4).map(function (a) {
    var name = String(a.name || '').trim();
    if (!name) return null;
    var key = 'artist:' + sha256_(name).slice(0, 24);
    var memo = cacheGet_(key);
    if (memo) return Object.assign({}, memo, { roles: people[name] || [] });
    var r = { name: name, roles: people[name] || [] };
    r.img = a.profileImageUrl || pickKey_(a, /image|thumbnail|profileImg/i);
    r.url = String(a.profilePageUrl || '').replace(/\?.*$/, '');   // 작가 홈 (예: https://comic.naver.com/community/u/_3i1sk)
    if (r.url && /^\//.test(r.url)) r.url = 'https://comic.naver.com' + r.url;
    var cid = a.communityId || a.artistId || a.id;
    if (!r.url && a.communityId) r.url = 'https://comic.naver.com/community/u/' + a.communityId;
    // 작가 페이지의 소개 문구
    if (r.url) {
      try {
        var html = get_(r.url, false);
        var bio = meta_(html, 'og:description') || meta_(html, 'description');
        if (bio && !/네이버 웹툰|NAVER Webtoon/i.test(bio.slice(0, 20))) r.bio = bio.slice(0, 300);
        if (!r.img) { var im = meta_(html, 'og:image'); if (im && !/og_image|default/i.test(im)) r.img = im; }
      } catch (e) { /* 작가 페이지는 없어도 괜찮아요 */ }
    }
    // 같은 이름으로 검색한 네이버 웹툰의 작품들
    try {
      r.works = naverSearch_(name).filter(function (x) { return x.author && x.author.indexOf(name) >= 0 && x.source.indexOf('titleId=' + titleId) < 0; })
        .slice(0, 12).map(function (x) { return { title: x.title, source: x.source, cover: x.cover, finished: x.finished }; });
    } catch (e) { r.works = []; }
    var keep = Object.assign({}, r); delete keep.roles;
    cachePut_(key, keep, 21600);
    return r;
  }).filter(Boolean);
}
// 작가 홈 게시글: 네이버 웹툰 작가 홈이 웹에서 쓰는 공개 글 목록에서 최근 글을 가져와요 (로그인 없이 보이는 글만)
function naverPosts_(url) {
  var handle = (url.match(/\/community\/u\/([^/?#]+)/) || [])[1] || '';
  if (!handle) throw new Error('작가 홈 주소가 아니에요');
  var pageId = naverPageId_(handle);
  var j = get_('https://comic.naver.com/community/api/v2/posts?pageId=' + encodeURIComponent(pageId) + '&nextSize=20&cursor=&childPreviewCount=0&pinRepresentation=distinct', true);
  return naverPostList_((j && j.result) || {}, 'https://comic.naver.com/community/u/' + handle);
}
// 글 목록에 쓰는 작가 번호: 주소가 _3i1sk 꼴이면 3i1sk, 직접 정한 주소(232inthe 등)면 작가 홈 페이지 안에서 찾아요
function naverPageId_(handle) {
  if (/^_/.test(handle)) return handle.slice(1);
  var key = 'cuid:' + sha256_(handle).slice(0, 24);
  var memo = cacheGet_(key);
  if (memo && memo.id) return memo.id;
  var html = get_('https://comic.naver.com/community/u/' + encodeURIComponent(handle), false);
  var m = html.match(/creatorId\\*"\s*:\s*\\*"([0-9a-z]+)/i) || html.match(/cuid\\*"\s*:\s*\\*"([0-9a-z]+)/i);
  if (!m) throw new Error('작가 번호를 찾지 못했어요');
  cachePut_(key, { id: m[1] }, 21600);
  return m[1];
}
function naverPostList_(r, home) {
  var seen = {};
  var MILESTONE = { FOLLOWER_COUNT_ATTAINED: ['관심 독자 ', '명 돌파'], REACTION_COUNT_ATTAINED: ['누적 리액션 ', '개 달성'] };
  return (r.pins || []).map(function (o) { o._pin = true; return o; }).concat(r.posts || []).map(function (o) {
    if (!o || !o.id || seen[o.id] || o.status !== 'SERVICE') return null;
    seen[o.id] = 1;
    var title = clean_(o.title || ''), body = clean_(o.body || ''), img = '', images = 0, system = o.creationType === 'BY_SYSTEM';
    ((o.sectionGroup || {}).sections || []).forEach(function (s) {
      var d = s.data || {};
      if (s.sectionType === 'IMAGE' && d.domain && d.path) { images++; if (!img) img = d.domain + d.path + '?type=w900'; }
      var m = s.sectionType === 'VARIABLES' && MILESTONE[d.variablesType];
      if (m && d.variablesData && d.variablesData.count && !title) title = m[0] + String(d.variablesData.count).replace(/\B(?=(\d{3})+$)/g, ',') + m[1] + ' 🎉';
    });
    if (!title && !body && !img) return null;
    var likes = 0;
    (o.reactions || []).forEach(function (x) { (x.emotions || []).forEach(function (e) { likes += Number(e.count) || 0; }); });
    return { title: title.slice(0, 80), excerpt: body.slice(0, 120) + (body.length > 120 ? '…' : ''),
      date: o.createdAt ? Utilities.formatDate(new Date(Number(o.createdAt)), TZ, 'yyyy-MM-dd') : '',
      url: home + '/posts/' + encodeURIComponent(o.id), img: img, images: images, likes: likes, comments: Number(o.activeChildPostCount) || 0,
      pinned: !!o._pin, system: system };
  }).filter(Boolean).slice(0, 20);
}

// 작가 정보를 사이트 데이터(authorInfo)에 모아 둬요
function applyArtists_(data, artists) {
  if (!(artists || []).length) return false;
  data.authorInfo = data.authorInfo || {};
  var before = JSON.stringify(data.authorInfo);
  artists.forEach(function (a) {
    var k = String(a.name).trim().toLowerCase().replace(/\s+/g, ' ');
    var cur = data.authorInfo[k] || {};
    data.authorInfo[k] = { name: a.name, img: a.img || cur.img || '', bio: a.bio || cur.bio || '', url: a.url || cur.url || '', works: (a.works && a.works.length ? a.works : cur.works) || [] };
  });
  return JSON.stringify(data.authorInfo) !== before;
}

// ---------- 매일 한 번 자동 갱신 (새벽 4시 이후 첫 번째로 조용할 때) ----------
function ensureAutoTrigger_() {
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'autoRefresh'; });
  if (!has) ScriptApp.newTrigger('autoRefresh').timeBased().everyHours(1).create();
}
function autoRefresh() {
  var p = PropertiesService.getScriptProperties();
  var day = today_();
  if (p.getProperty('AUTO_DAY') === day) return '오늘은 이미 갱신했어요';
  if (Number(Utilities.formatDate(new Date(), TZ, 'H')) < 4) return '새벽 4시 이후에 해요';
  if (!p.getProperty('GITHUB_TOKEN')) return 'GitHub 토큰이 없어요';
  // 관리자가 편집 중이거나, 함께 고친 내용이 아직 저장 전이면 다음 시간으로 미뤄요
  if (livePresence_(null).length) return '관리자가 편집 중이라 다음에 해요';
  var live = liveState_();
  if (live.ver > live.base) return '아직 저장 안 된 함께 편집 내용이 있어서 다음에 해요';
  var g = github_();
  var cur = githubFile_(g);
  if (!cur) return 'data.json을 읽지 못했어요';
  var data = JSON.parse(cur.text);
  var start = Date.now(), changed = [], fails = 0;
  data.webtoons.forEach(function (w) {
    if (!w.source || Date.now() - start > 270000) return;   // 5분 안에 끝내요
    try {
      var inf = infoFor_(w.source, true).info;
      var c1 = applyInfo_(w, inf, day), c2 = applyArtists_(data, inf.artists);
      if (c1 || c2) changed.push(w.title);
    } catch (e) { fails++; }
  });
  p.setProperty('AUTO_DAY', day);
  if (!changed.length) return '바뀐 게 없어요' + (fails ? ' (못 가져온 웹툰 ' + fails + '개)' : '');
  var text = JSON.stringify(data, null, 2) + '\n';
  var res = UrlFetchApp.fetch(g.api, {
    method: 'put', headers: g.headers, contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ message: '자동 정보 갱신 - ' + changed.length + '개 (' + changed.slice(0, 5).join(', ') + (changed.length > 5 ? ' 외' : '') + ')', content: Utilities.base64Encode(text, Utilities.Charset.UTF_8), sha: cur.sha, branch: g.branch })
  });
  if (res.getResponseCode() >= 300) { p.deleteProperty('AUTO_DAY'); return 'GitHub 저장 실패 ' + res.getResponseCode(); }
  cacheDel_('site');
  // 함께 편집 기준도 새 데이터로 맞춰요 (저장 버튼을 누른 것과 같아요)
  p.setProperty('LIVE_BASE', String(live.ver));
  p.setProperty('LIVE_BASE_HASH', hash_(JSON.stringify(data)));
  return changed.length + '개 갱신했어요';
}
var DAY_EN_ = { MONDAY: 'mon', TUESDAY: 'tue', WEDNESDAY: 'wed', THURSDAY: 'thu', FRIDAY: 'fri', SATURDAY: 'sat', SUNDAY: 'sun' };
var DAY_KO_ = { '월': 'mon', '화': 'tue', '수': 'wed', '목': 'thu', '금': 'fri', '토': 'sat', '일': 'sun' };
function get_(url, json) {
  var res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true, followRedirects: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'ko-KR,ko;q=0.9', 'Referer': url }
  });
  if (res.getResponseCode() >= 400) fail_('그 페이지를 열지 못했어요 (응답 ' + res.getResponseCode() + '). 링크를 확인해 주세요.');
  var text = res.getContentText('UTF-8');
  if (!json) return text;
  try { return JSON.parse(text); } catch (e) { fail_('받은 정보를 읽지 못했어요.'); }
}
function clean_(s) { return String(s == null ? '' : s).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim(); }
function uniq_(a) { var seen = {}; return a.filter(function (x) { x = String(x || '').trim(); if (!x || seen[x]) return false; seen[x] = 1; return true; }); }
function daysKo_(s) { var out = []; String(s || '').replace(/[월화수목금토일]/g, function (c) { if (out.indexOf(DAY_KO_[c]) < 0) out.push(DAY_KO_[c]); return c; }); return out; }
function meta_(html, prop) {
  var m = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]*content=["\']([^"\']*)["\']', 'i')) ||
          html.match(new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + prop + '["\']', 'i'));
  return m ? clean_(m[1]) : '';
}

function naverInfo_(url) {
  var id = naverTitleId_(url);
  if (!id) fail_('네이버 웹툰 작품 링크만 연결할 수 있어요. comic.naver.com 의 작품 목록(또는 회차) 링크를 넣어 주세요.');
  var j = get_('https://comic.naver.com/api/article/list/info?titleId=' + id, true);
  if (!j || !j.titleName) fail_('네이버 웹툰에서 작품 정보를 찾지 못했어요.');
  var roleOf = function (a) { var t = (a.artistTypeList || []).join(','); var r = []; if (/WRITER/.test(t)) r.push('writer'); if (/PAINTER/.test(t)) r.push('painter'); if (/ORIGIN/.test(t)) r.push('original'); return r; };
  var people = {};
  (j.communityArtists || []).forEach(function (a) { var n = String(a.name || '').trim(); if (!n) return; people[n] = (people[n] || []).concat(roleOf(a)).filter(function (x, i, arr) { return arr.indexOf(x) === i; }); });
  var info = {
    authors: Object.keys(people).map(function (n) { return { name: n, roles: people[n] }; }),
    title: j.titleName,
    author: uniq_((j.communityArtists || []).slice().sort(function (x, y) { return (/WRITER/.test((y.artistTypeList || []).join()) ? 1 : 0) - (/WRITER/.test((x.artistTypeList || []).join()) ? 1 : 0); }).map(function (a) { return a.name; })).join(', '),   // 글 작가 먼저
    platform: '네이버웹툰',
    url: 'https://comic.naver.com/webtoon/list?titleId=' + id,
    cover: j.thumbnailUrl || j.sharedThumbnailUrl || '',
    desc: clean_(j.synopsis || ''),
    status: j.finished ? 'completed' : j.rest ? 'hiatus' : 'ongoing',
    days: (j.publishDayOfWeekList || []).map(function (d) { return DAY_EN_[String(d).toUpperCase()]; }).filter(Boolean),
    tags: uniq_((j.curationTagList || []).map(function (t) { return t.tagName; })).slice(0, 8)
  };
  try { info.artists = naverArtists_(j.communityArtists || [], people, id); } catch (e) { console.warn('artists', e); }
  try {
    var l = get_('https://comic.naver.com/api/article/list?titleId=' + id + '&page=1&sort=DESC', true);
    if (l && l.totalCount) info.episodes = Number(l.totalCount);
  } catch (e) { /* 아래에서 다른 방법으로 찾아요 */ }
  // 성인 작품은 회차 목록이 로그인 뒤에만 보여서, 완결 화수 표시나 검색 결과의 화수를 써요
  if (!info.episodes) {
    var fin = String(j.publishDescription || '').match(/(\d+)\s*화\s*완결/);
    if (fin) info.episodes = Number(fin[1]);
    else {
      try {
        naverSearch_(j.titleName).forEach(function (x) { if (!info.episodes && x.episodes && x.source.split('titleId=')[1] === id) info.episodes = x.episodes; });
      } catch (e) { /* 화수는 못 가져와도 괜찮아요 */ }
    }
  }
  return { info: info, source: '네이버 웹툰' };
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function fail_(msg) { var e = new Error(msg); e.userMessage = msg; throw e; }
function now_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"); }
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function weekStart_() {
  var t = today_().split('-').map(Number);
  var d = new Date(Date.UTC(t[0], t[1] - 1, t[2]));
  var back = (d.getUTCDay() + 6) % 7;
  return Utilities.formatDate(new Date(d.getTime() - back * 86400000), 'UTC', 'yyyy-MM-dd');
}
function hex_(bytes) {
  return bytes.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}
function sha256_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
function randomHex_(n) {
  var s = '';
  while (s.length < n * 2) s += Utilities.getUuid().replace(/-/g, '');
  return s.slice(0, n * 2);
}
/** 비밀번호는 회원별 랜덤 값(salt)과 섞어 여러 번 해시해서 저장해요. 원래 비밀번호는 저장하지 않아요. */
function hashPw_(pw, salt) {
  var h = sha256_(salt + ':' + pw);
  for (var i = 0; i < 2000; i++) h = sha256_(h + salt);
  return h;
}
function checkNick_(nick) {
  if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(nick)) fail_('닉네임은 2~10자의 한글, 영어, 숫자로 정해 주세요.');
}
function nickTaken_(nick, exceptId) {
  var low = nick.toLowerCase();
  return readAll_('users').some(function (r) { return String(r.obj.nickname).toLowerCase() === low && r.obj.userId !== exceptId; });
}
function nickMap_() {
  var m = {};
  readAll_('users').forEach(function (r) { m[r.obj.userId] = r.obj.nickname; });
  return m;
}
function newSession_(userId) {
  var token = randomHex_(24);
  var exp = new Date(Date.now() + 30 * 86400000).toISOString();
  var t = Date.now();
  deleteWhere_('sessions', function (r) { return new Date(r.expiresAt).getTime() < t; });
  appendRow_('sessions', { token: token, userId: userId, expiresAt: exp });
  return token;
}
function auth_(token) {
  var s = token && findRow_('sessions', 'token', String(token));
  if (!s || new Date(s.obj.expiresAt).getTime() < Date.now()) fail_('로그인이 필요해요. 다시 로그인해 주세요.');
  var u = findRow_('users', 'userId', s.obj.userId);
  if (!u) fail_('로그인이 필요해요. 다시 로그인해 주세요.');
  if (u.obj.status === 'banned') fail_('이용이 정지된 계정이에요.');
  return u;
}
function adminId_() {
  return String(PropertiesService.getScriptProperties().getProperty('ADMIN_ID') || 'admin').trim().toLowerCase();
}
function checkAdmin_(pw) {
  var real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!real) fail_('서버에 관리자 비밀번호(ADMIN_PASSWORD)가 설정되지 않았어요.');
  var tries = cacheGet_('admin-tries') || 0;
  if (tries >= 10) fail_('관리자 비밀번호를 너무 많이 틀렸어요. 1시간 뒤에 다시 해 주세요.');
  if (String(pw || '') !== real) {
    cachePut_('admin-tries', tries + 1, 3600);
    fail_('관리자 비밀번호가 맞지 않아요.');
  }
}
/**
 * 관리자 확인
 * - 최종 관리자: 관리자 비밀번호(adminPassword)
 * - 관리자 회원: 로그인 토큰(token) + users 시트의 role 이 admin
 */
function who_(b) {
  if (b.adminPassword) {
    checkAdmin_(b.adminPassword);
    return { owner: true, userId: adminId_(), name: '최종 관리자' };
  }
  if (b.token) {
    var memo = cacheGet_('who:' + b.token);
    if (memo) return memo;
    var s = findRow_('sessions', 'token', String(b.token));
    var u = s && new Date(s.obj.expiresAt).getTime() >= Date.now() ? findRow_('users', 'userId', s.obj.userId) : null;
    if (u && u.obj.status !== 'banned' && u.obj.role === 'admin') {
      var meAdmin = { owner: false, userId: u.obj.userId, name: u.obj.nickname };
      cachePut_('who:' + b.token, meAdmin, 60);
      return meAdmin;
    }
    if (u) fail_('관리자 권한이 없는 계정이에요. 최종 관리자에게 권한을 받아 주세요.');
  }
  fail_('관리자로 로그인해 주세요.');
}
/** 관리자 회원은 다른 관리자의 정지·닉네임을 바꿀 수 없어요 (최종 관리자만) */
function guardTarget_(me, target) {
  if (!me.owner && target.role === 'admin') fail_('다른 관리자 계정은 최종 관리자만 바꿀 수 있어요.');
}
/** 바뀐 내용 확인용 짧은 지문 (js/admin.js 와 같은 계산) */
function hash_(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ('0000000' + h.toString(16)).slice(-8) + ':' + str.length;
}
function github_() {
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('GITHUB_TOKEN');
  if (!token) fail_('GitHub 토큰이 설정되지 않았어요. 설치방법.md의 [바로 저장] 부분을 봐 주세요.');
  var repo = p.getProperty('GITHUB_REPO') || 'hy3ongh0/webtoontree';
  var branch = p.getProperty('GITHUB_BRANCH') || 'main';
  return {
    api: 'https://api.github.com/repos/' + repo + '/contents/data/data.json', branch: branch,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  };
}
var GH_LAST_ = '';   // 마지막으로 GitHub에서 받은 응답 (실패 이유를 알려 줄 때 써요)
function githubFile_(g) {
  var res = null, code = 0;
  // GitHub가 잠깐 응답하지 못할 때가 있어서 세 번까지 다시 물어봐요 (토큰 · 주소 문제는 바로 멈춰요)
  for (var i = 0; i < 3; i++) {
    try {
      res = UrlFetchApp.fetch(g.api + '?ref=' + encodeURIComponent(g.branch) + '&t=' + Date.now(), { headers: g.headers, muteHttpExceptions: true });
      code = res.getResponseCode();
    } catch (e) { res = null; code = 0; }
    if (code === 200 || code === 401 || code === 404) break;
    Utilities.sleep(700 * (i + 1));
  }
  GH_LAST_ = code === 401 ? 'GitHub 토큰이 만료됐거나 틀렸어요 (응답 401)' : code === 404 ? '저장소나 data.json을 찾지 못했어요 (응답 404)' : code === 403 || code === 429 ? 'GitHub 사용량 제한에 걸렸어요 (응답 ' + code + ')' : code ? '응답 ' + code : 'GitHub에 닿지 못했어요';
  if (code !== 200) return null;
  var j = JSON.parse(res.getContentText());
  var b64 = String(j.content || '').replace(/\s/g, '');
  // 파일이 1MB를 넘으면 GitHub가 내용을 비워서 줘요. 그때는 파일 덩어리(blob) 주소로 다시 받아요
  if (!b64 && j.git_url) {
    var r2 = UrlFetchApp.fetch(j.git_url, { headers: g.headers, muteHttpExceptions: true });
    if (r2.getResponseCode() !== 200) { GH_LAST_ = 'data.json 내용을 받지 못했어요 (응답 ' + r2.getResponseCode() + ')'; return null; }
    b64 = String(JSON.parse(r2.getContentText()).content || '').replace(/\s/g, '');
  }
  if (!b64) { GH_LAST_ = 'data.json 내용이 비어 있어요'; return null; }
  var text = Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString('UTF-8');
  return { sha: j.sha, text: text };
}
function liveState_() {
  var p = PropertiesService.getScriptProperties();
  return { ver: Number(p.getProperty('LIVE_VER') || 0), base: Number(p.getProperty('LIVE_BASE') || 0), baseHash: p.getProperty('LIVE_BASE_HASH') || '' };
}
/** since 다음부터 upto 까지의 변경 묶음 (캐시에 없으면 시트에서) */
function liveOps_(since, upto) {
  if (upto <= since) return [];
  var cache = CacheService.getScriptCache();
  var keys = [];
  for (var v = since + 1; v <= upto; v++) keys.push('live:op:' + v);
  var got = {};
  for (var i = 0; i < keys.length; i += 100) {
    var part = cache.getAll(keys.slice(i, i + 100));
    Object.keys(part).forEach(function (k) { try { got[k] = JSON.parse(part[k]); } catch (e) { /* 시트에서 다시 읽어요 */ } });
  }
  var rows = keys.map(function (k) { return got[k]; });
  if (rows.some(function (r) { return !r; })) {
    var byVer = {};
    readAll_('live').forEach(function (r) { byVer[Number(r.obj.ver)] = r.obj; });
    rows = [];
    for (var w = since + 1; w <= upto; w++) if (byVer[w]) rows.push(byVer[w]);
  }
  // 읽을 수 없는 기록 한 줄 때문에 전체가 막히지 않게, 그 줄만 건너뛰어요
  return rows.map(function (r) {
    var ops = r.ops;
    if (typeof ops === 'string') { try { ops = JSON.parse(ops); } catch (e) { console.warn('live op ' + r.ver + ' 건너뜀'); return null; } }
    return Array.isArray(ops) ? { ver: Number(r.ver), by: r.by, name: r.name, ops: ops } : null;
  }).filter(Boolean);
}
/** 사이트에 올린 지점까지의 기록은 시트에서 지워요 */
function livePrune_(upto) {
  var sh = sheet_('live');
  var last = sh.getLastRow();
  if (last < 2) return;
  var vals = sh.getRange(2, 1, last - 1, 1).getValues();
  var keep = 0;
  for (var i = 0; i < vals.length; i++) if (Number(vals[i][0]) <= upto) keep = i + 1;
  if (keep > 0) sh.deleteRows(2, keep);
}
/** 지금 관리자 화면에 있는 사람들 (me 를 주면 내 위치를 갱신) */
function livePresence_(me, here) {
  var map = cacheGet_('live:who') || {};
  var nowMs = Date.now();
  if (me) {
    var h = here || {};
    map[me.userId] = { name: me.name, owner: !!me.owner, at: nowMs, tab: String(h.tab || ''), w: String(h.w || ''), g: String(h.g || '') };
  }
  Object.keys(map).forEach(function (k) { if (nowMs - map[k].at > 20000) delete map[k]; });
  if (me) cachePut_('live:who', map, 120);
  return Object.keys(map).map(function (k) { var x = map[k]; return { userId: k, name: x.name, owner: x.owner, tab: x.tab, w: x.w, g: x.g }; });
}
function publicMe_(u) {
  var ratings = {};
  readAll_('ratings').forEach(function (r) { if (r.obj.userId === u.userId) ratings[r.obj.webtoonId] = Number(r.obj.score); });
  return {
    userId: u.userId, nickname: u.nickname, coins: Number(u.coins), progress: u.progress, rewarded: u.rewarded,
    daily: u.daily, owned: u.owned, equip: u.equip, unlocked: u.unlocked, favs: u.favs || {}, ratings: ratings, role: u.role === 'admin' ? 'admin' : ''
  };
}
function social_(wid, uid) {
  var base = cacheGet_('social:' + wid);
  if (!base) {
    var sum = 0, n = 0;
    readAll_('ratings').forEach(function (r) { if (r.obj.webtoonId === wid) { sum += Number(r.obj.score); n++; } });
    var nicks = nickMap_();
    var comments = readAll_('comments').filter(function (r) { return r.obj.webtoonId === wid && !r.obj.hidden; })
      .map(function (r) { return { commentId: r.obj.commentId, nickname: r.obj.userId ? (nicks[r.obj.userId] || '알 수 없음') : '탈퇴한 사용자', userId: r.obj.userId, text: r.obj.text, createdAt: r.obj.createdAt }; })
      .reverse().slice(0, 50);
    base = { avg: n ? Math.round(sum / n * 10) / 10 : 0, count: n, comments: comments };
    cachePut_('social:' + wid, base, 120);
  }
  return {
    avg: base.avg, count: base.count,
    comments: base.comments.map(function (c) { return { commentId: c.commentId, nickname: c.nickname, text: c.text, createdAt: c.createdAt, mine: !!uid && c.userId === uid }; })
  };
}
function log_(userId, amount, reason, ref, eps) {
  appendRow_('coinLog', { logId: randomHex_(8), userId: userId, amount: amount, reason: reason, ref: ref, eps: eps, createdAt: now_() });
}

// ---------- 사이트 데이터 (data.json) ----------
function siteData_() {
  var cached = cacheGet_('site');
  if (cached) return cached;
  var url = PropertiesService.getScriptProperties().getProperty('DATA_URL') || DEFAULT_DATA_URL;
  var res = UrlFetchApp.fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) fail_('사이트 데이터를 불러오지 못했어요.');
  var data = JSON.parse(res.getContentText());
  cachePut_('site', data, 600);
  return data;
}
function findToon_(site, id) {
  for (var i = 0; i < site.webtoons.length; i++) if (site.webtoons[i].id === id) return site.webtoons[i];
  fail_('없는 웹툰이에요.');
}
function findItem_(site, id) {
  for (var i = 0; i < (site.shop || []).length; i++) if (site.shop[i].id === id) return site.shop[i];
  fail_('없는 아이템이에요.');
}
// js/schedule.js 와 같은 계산
function status_(w) { return w.status || (w.ongoing ? 'ongoing' : 'completed'); }
function episodes_(w, onDate) {
  var base = Math.max(1, Number(w.episodes) || 1);
  if (status_(w) !== 'ongoing' || !w.autoCount || !(w.days || []).length || !w.baseDate || onDate <= w.baseDate) return base;
  var order = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var want = {};
  w.days.forEach(function (d) { want[order.indexOf(d)] = 1; });
  var b = w.baseDate.split('-').map(Number), e = onDate.split('-').map(Number);
  var t = Date.UTC(b[0], b[1] - 1, b[2]), end = Date.UTC(e[0], e[1] - 1, e[2]);
  var n = 0;
  for (var i = 0; i < 3660; i++) {
    t += 86400000;
    if (t > end) break;
    if (want[new Date(t).getUTCDay()]) n++;
  }
  return base + n;
}

// ---------- 캐시 ----------
function cacheGet_(k) {
  var v = CacheService.getScriptCache().get(k);
  return v ? JSON.parse(v) : null;
}
function cachePut_(k, v, sec) {
  var s = JSON.stringify(v);
  if (s.length < 90000) CacheService.getScriptCache().put(k, s, sec);
}
function cacheDel_(k) { CacheService.getScriptCache().remove(k); }

// ---------- 시트 읽기·쓰기 ----------
function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < SHEETS[name].length) {
    // 새 칸(예: users 의 role)이 생기면 제목 줄만 늘려요. 기존 내용은 그대로예요
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
  }
  return sh;
}
function toObj_(name, row) {
  var o = {};
  SHEETS[name].forEach(function (k, i) {
    var v = row[i];
    if (JSON_COLS[k] && name === 'users') { try { v = v ? JSON.parse(v) : {}; } catch (e) { v = {}; } }
    else if (v instanceof Date) v = Utilities.formatDate(v, TZ, "yyyy-MM-dd'T'HH:mm:ss");
    else v = v === '' || v == null ? '' : (typeof v === 'number' ? v : String(v));
    o[k] = v;
  });
  return o;
}
function toRow_(name, o) {
  return SHEETS[name].map(function (k) {
    var v = o[k];
    if (JSON_COLS[k] && name === 'users') return JSON.stringify(v || {});
    return v == null ? '' : v;
  });
}
function readAll_(name) {
  var sh = sheet_(name);
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var vals = sh.getRange(2, 1, n, SHEETS[name].length).getValues();
  return vals.map(function (r, i) { return { row: i + 2, obj: toObj_(name, r) }; });
}
function findRow_(name, key, value) {
  if (!value) return null;
  var rows = readAll_(name);
  for (var i = 0; i < rows.length; i++) if (String(rows[i].obj[key]) === String(value)) return rows[i];
  return null;
}
function appendRow_(name, o) {
  var sh = sheet_(name);
  sh.getRange(sh.getLastRow() + 1, 1, 1, SHEETS[name].length).setNumberFormat('@').setValues([toRow_(name, o)]);
}
function updateRow_(name, row, o) {
  sheet_(name).getRange(row, 1, 1, SHEETS[name].length).setNumberFormat('@').setValues([toRow_(name, o)]);
}
function deleteRow_(name, row) { sheet_(name).deleteRow(row); }
function deleteWhere_(name, test) {
  var rows = readAll_(name);
  for (var i = rows.length - 1; i >= 0; i--) if (test(rows[i].obj)) deleteRow_(name, rows[i].row);
}
function updateWhere_(name, test, change) {
  readAll_(name).forEach(function (r) { if (test(r.obj)) updateRow_(name, r.row, change(r.obj)); });
}
