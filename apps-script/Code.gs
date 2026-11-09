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
  users: ['userId', 'nickname', 'pwHash', 'salt', 'createdAt', 'status', 'coins', 'progress', 'rewarded', 'daily', 'owned', 'equip', 'unlocked', 'role'],
  sessions: ['token', 'userId', 'expiresAt'],
  ratings: ['webtoonId', 'userId', 'score', 'updatedAt'],
  comments: ['commentId', 'webtoonId', 'userId', 'text', 'createdAt', 'hidden'],
  views: ['date', 'webtoonId', 'viewerId'],
  coinLog: ['logId', 'userId', 'amount', 'reason', 'ref', 'eps', 'createdAt'],
  reports: ['reportId', 'webtoonId', 'viewerId', 'note', 'createdAt', 'done']
};
var JSON_COLS = { progress: 1, rewarded: 1, daily: 1, owned: 1, equip: 1, unlocked: 1 };

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
    return out_({ ok: false, error: msg });
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

  // ---------- 랭킹 ----------
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
  adminCheck: function (b) {
    var me = who_(b);
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
    var text = JSON.stringify(data, null, 2) + '\n';
    var who = me.owner ? '최종 관리자' : me.name + ' (' + me.userId + ')';
    var res = UrlFetchApp.fetch(g.api, {
      method: 'put', headers: g.headers, contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ message: '관리자 화면에서 데이터 저장 - ' + who, content: Utilities.base64Encode(text, Utilities.Charset.UTF_8), sha: cur ? cur.sha : undefined, branch: g.branch })
    });
    if (res.getResponseCode() === 409) return { conflict: true };
    if (res.getResponseCode() >= 300) fail_('GitHub에 저장하지 못했어요 (' + res.getResponseCode() + '). 토큰 권한을 확인해 주세요.');
    cacheDel_('site');
    return { savedAt: now_(), hash: hash_(JSON.stringify(data)) };
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
  if (!PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD')) {
    console.warn('스크립트 속성 ADMIN_PASSWORD 를 꼭 넣어 주세요.');
  }
  return '완료: 시트 탭과 매주 월요일 9시 알림을 만들었어요.';
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
    var s = findRow_('sessions', 'token', String(b.token));
    var u = s && new Date(s.obj.expiresAt).getTime() >= Date.now() ? findRow_('users', 'userId', s.obj.userId) : null;
    if (u && u.obj.status !== 'banned' && u.obj.role === 'admin') return { owner: false, userId: u.obj.userId, name: u.obj.nickname };
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
function githubFile_(g) {
  var res = UrlFetchApp.fetch(g.api + '?ref=' + encodeURIComponent(g.branch) + '&t=' + Date.now(), { headers: g.headers, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  var j = JSON.parse(res.getContentText());
  var text = Utilities.newBlob(Utilities.base64Decode(String(j.content || '').replace(/\s/g, ''))).getDataAsString('UTF-8');
  return { sha: j.sha, text: text };
}
function publicMe_(u) {
  var ratings = {};
  readAll_('ratings').forEach(function (r) { if (r.obj.userId === u.userId) ratings[r.obj.webtoonId] = Number(r.obj.score); });
  return {
    userId: u.userId, nickname: u.nickname, coins: Number(u.coins), progress: u.progress, rewarded: u.rewarded,
    daily: u.daily, owned: u.owned, equip: u.equip, unlocked: u.unlocked, ratings: ratings, role: u.role === 'admin' ? 'admin' : ''
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
