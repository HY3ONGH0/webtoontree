#!/usr/bin/env node
/* 웹툰 ID를 w001 꼴로 다시 매겨요 (w + 세 자리 숫자가 아닌 것만).
   data.json 안의 모든 참조(트리 노드 · 연결선 · 시작점 · 지도 위치 · 오늘 폭주)를 함께 바꿔요.
   주의: 감상 기록 · 별점 · 댓글은 옛 ID에 묶여 있어서 바뀐 웹툰은 처음부터예요.
   쓰는 법: node scripts/renumber-ids.js  (바꾼 목록을 보여 주고 data/data.json 을 고쳐 써요) */
'use strict';
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', 'data', 'data.json');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const good = (id) => /^w\d{3}$/.test(id);
let next = d.webtoons.reduce((m, w) => (good(w.id) ? Math.max(m, Number(w.id.slice(1))) : m), 0);
const map = {};
d.webtoons.forEach((w) => { if (!good(w.id)) { next += 1; map[w.id] = 'w' + String(next).padStart(3, '0'); } });
const re = (id) => (id in map ? map[id] : id);
d.webtoons.forEach((w) => { w.id = re(w.id); });
Object.values(d.trees || {}).forEach((T) => {
  T.nodes = Object.fromEntries(Object.entries(T.nodes || {}).map(([k, v]) => [re(k), v]));
  (T.links || []).forEach((l) => { l.from = re(l.from); l.to = re(l.to); });
  if (T.start) T.start = re(T.start);
  if (Array.isArray(T.starts)) T.starts = T.starts.map(re);
});
if (d.map) {
  d.map.pins = Object.fromEntries(Object.entries(d.map.pins || {}).map(([k, v]) => [re(k), v]));
  (d.map.links || []).forEach((l, i) => { if (Array.isArray(l)) d.map.links[i] = l.map(re); else if (l && typeof l === 'object') { if (l.from) l.from = re(l.from); if (l.to) l.to = re(l.to); } });
}
if (Array.isArray(d.hotToday)) d.hotToday = d.hotToday.map((x) => (typeof x === 'string' ? re(x) : x && x.id ? Object.assign(x, { id: re(x.id) }) : x));
d.meta = d.meta || {};
d.meta.lastWebtoonId = next;
// 혹시 남은 옛 ID가 있는지 글자로 한 번 더 찾아봐요
const text = JSON.stringify(d, null, 2) + '\n';
const left = Object.keys(map).filter((old) => text.includes(JSON.stringify(old)));
if (left.length) { console.error('아직 남은 옛 ID:', left.join(', ')); process.exit(1); }
fs.writeFileSync(file, text);
console.log(`ID ${Object.keys(map).length}개를 바꿨어요 (다음 번호 w${String(next + 1).padStart(3, '0')})`);
Object.entries(map).forEach(([a, b]) => console.log(`  ${b}  ←  ${a}  ${d.webtoons.find((w) => w.id === b).title}`));
