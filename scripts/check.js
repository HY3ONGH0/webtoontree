#!/usr/bin/env node
/* 올리기 전에 돌리는 검사: 문법 오류, 깨진 데이터, 없는 파일 참조, 서버 · 관리자 화면 판 번호 어긋남을 잡아요.
   쓰는 법: node scripts/check.js  (문제가 있으면 목록을 보여 주고 실패로 끝나요) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(root, f));
const problems = [];
const bad = (msg) => problems.push(msg);
const notes = [];   // 실패는 아니지만 알아 두면 좋은 것

// 1) 자바스크립트 · 서버 코드 문법
const jsFiles = fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f).concat(['apps-script/Code.gs', 'scripts/check.js']);
jsFiles.forEach((f) => { try { new vm.Script(read(f).replace(/^#!.*\n/, '\n'), { filename: f }); } catch (e) { bad(`${f}: 문법 오류 — ${e.message}`); } });

// 2) 사이트 데이터
let data = null;
try { data = JSON.parse(read('data/data.json')); } catch (e) { bad(`data/data.json: JSON을 읽지 못했어요 — ${e.message}`); }
if (data) {
  ['webtoons', 'genres', 'trees', 'settings'].forEach((k) => { if (!data[k]) bad(`data/data.json: ${k} 가 없어요`); });
  const ids = (data.webtoons || []).map((w) => w.id);
  const seen = new Set();
  ids.forEach((id) => { if (!id) bad('data/data.json: ID가 빈 웹툰이 있어요'); if (seen.has(id)) bad(`data/data.json: 웹툰 ID가 겹쳐요 — ${id}`); seen.add(id); });
  const gids = new Set((data.genres || []).map((g) => g.id));
  (data.webtoons || []).forEach((w) => {
    if (!w.title) bad(`data/data.json: 제목이 빈 웹툰 — ${w.id}`);
    (w.genres || []).forEach((g) => { if (!gids.has(g)) bad(`data/data.json: ${w.title} 의 장르 ${g} 가 장르 목록에 없어요`); });
  });
  Object.keys(data.trees || {}).forEach((g) => {
    const T = data.trees[g] || {};
    if (!gids.has(g)) bad(`data/data.json: 트리 ${g} 의 장르가 없어요`);
    Object.keys(T.nodes || {}).forEach((id) => { if (!seen.has(id)) bad(`data/data.json: ${g} 트리에 없는 웹툰이 있어요 — ${id}`); });
    // 끊어진 연결선은 사이트가 알아서 건너뛰어서 알려만 줘요 (관리자 화면에서 한 번 저장하면 정리돼요)
    (T.links || []).forEach((l) => { if (!(T.nodes || {})[l.from] || !(T.nodes || {})[l.to]) notes.push(`data/data.json: ${g} 트리의 연결선이 트리에 없는 웹툰을 가리켜요 — ${l.from} → ${l.to}`); });
  });
}

// 3) HTML이 가리키는 파일이 있는지, 새로고침용 번호(?v=)가 한 파일 안에서 같은지
['index.html', 'admin.html', 'server-code.html'].forEach((f) => {
  const html = read(f);
  const refs = [...html.matchAll(/(?:src|href)="([^"#?:]+\.(?:js|css|woff2|png|jpg|html))(\?v=([\w]+))?"/g)];
  const vers = new Set();
  refs.forEach((m) => { if (!exists(m[1])) bad(`${f}: 없는 파일을 가리켜요 — ${m[1]}`); if (m[3]) vers.add(m[3]); });
  if (vers.size > 1) bad(`${f}: ?v= 번호가 서로 달라요 — ${[...vers].join(', ')}`);
});

// 4) 스타일이 가리키는 글꼴 · 그림이 있는지
['css/style.css', 'css/admin.css'].forEach((f) => {
  [...read(f).matchAll(/url\(["']?(\.\.\/[^"')]+)["']?\)/g)].forEach((m) => { const p = path.normalize(path.join('css', m[1])); if (!exists(p)) bad(`${f}: 없는 파일을 가리켜요 — ${m[1]}`); });
});

// 5) 서버 코드 판 번호와 관리자 화면이 필요한 판 번호가 같은지
const sv = Number((read('apps-script/Code.gs').match(/var SERVER_VERSION = (\d+)/) || [])[1]);
const need = Number((read('js/admin.js').match(/const NEED_SERVER = (\d+)/) || [])[1]);
if (!sv || !need) bad('서버 판 번호(SERVER_VERSION) 또는 관리자 화면의 NEED_SERVER 를 찾지 못했어요');
else if (need > sv) bad(`관리자 화면은 서버 ${need}판이 필요한데 서버 코드는 ${sv}판이에요`);

if (notes.length) console.log(`참고 ${notes.length}개:\n- ` + notes.join('\n- '));
if (problems.length) { console.error(`문제 ${problems.length}개:\n- ` + problems.join('\n- ')); process.exit(1); }
console.log(`검사 통과: 파일 ${jsFiles.length}개 문법, 웹툰 ${data.webtoons.length}편 데이터, HTML · 스타일 참조, 서버 ${sv}판`);
