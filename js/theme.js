/* 배경 · 트리 디자인 · 시즌 (사이트와 관리자 화면이 함께 써요)
   - 배경 아이템: 색 두 개(c1 위, c2 아래) + 그림(scene) + 날리는 무늬(pattern) + 직접 올린 그림(img)
   - 트리 디자인 아이템: 테두리 색(ring) · 선 색(line) · 칸 모양(shape) · 선 모양(lineStyle)
   - 시즌: 그날 앞뒤로 정한 기간 동안 사이트 배경이 자동으로 바뀌고, 한정 아이템을 팔아요.
   apps-script/Code.gs 의 seasonNow_ 와 같은 계산이에요 (한쪽을 고치면 다른 쪽도 고쳐요). */
(function () {
  'use strict';
  window.WT = window.WT || {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- 시즌 날짜 ----------
  // 음력 명절은 해마다 날짜가 달라서 표로 둬요 (한국 기준)
  const LUNAR = {
    seollal: { 2026: '02-17', 2027: '02-07', 2028: '01-27', 2029: '02-13', 2030: '02-03', 2031: '01-23', 2032: '02-11', 2033: '01-31', 2034: '02-19', 2035: '02-08' },
    chuseok: { 2026: '09-25', 2027: '09-15', 2028: '10-03', 2029: '09-22', 2030: '09-12', 2031: '10-01', 2032: '09-19', 2033: '09-08', 2034: '09-27', 2035: '09-16' }
  };
  const DAY = 86400000;
  const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const num = (d) => Math.round(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / DAY);
  const str = (n) => new Date(n * DAY).toISOString().slice(0, 10);
  /** 그 해의 시즌 당일 (YYYY-MM-DD). 음력 표에 없는 해면 '' */
  function seasonDay(s, year) {
    const md = s.lunar ? (LUNAR[s.lunar] || {})[year] : s.date;
    return md && /^\d{2}-\d{2}$/.test(md) ? `${year}-${md}` : '';
  }
  /** 날짜 d 가 시즌 기간 안이면 { from, to, day, year, key } */
  function seasonSpan(s, d) {
    const y = +d.slice(0, 4), n = num(d);
    const before = s.before == null ? 10 : +s.before, after = s.after == null ? 3 : +s.after;
    for (const year of [y - 1, y, y + 1]) {
      const day = seasonDay(s, year); if (!day) continue;
      const c = num(day);
      if (n >= c - before && n <= c + after) return { from: str(c - before), to: str(c + after), day, year, key: `${s.id}:${year}`, left: c + after - n };
    }
    return null;
  }
  const seasons = () => ((WT.data && WT.data.seasons) || []);
  /** 지금 진행 중인 시즌 (없으면 null). 겹치면 당일이 가까운 쪽 */
  function seasonNow(d) {
    d = d || kstToday();
    let best = null;
    seasons().forEach((s) => {
      if (s.on === false) return;
      const sp = seasonSpan(s, d); if (!sp) return;
      const dist = Math.abs(num(sp.day) - num(d));
      if (!best || dist < best.dist) best = Object.assign({ season: s, dist }, sp);
    });
    return best;
  }
  /** 다음에 올 시즌 (관리자 안내용) */
  function seasonNext(s, d) {
    d = d || kstToday();
    const y = +d.slice(0, 4), before = s.before == null ? 10 : +s.before, after = s.after == null ? 3 : +s.after;
    for (const year of [y, y + 1]) { const day = seasonDay(s, year); if (day && num(day) + after >= num(d)) return { from: str(num(day) - before), to: str(num(day) + after), day }; }
    return null;
  }
  /** 이 아이템을 지금 살 수 있나 (시즌 한정이면 그 시즌 기간에만) */
  function onSale(item, d) {
    if (!item || !item.season) return true;
    const s = seasons().find((x) => x.id === item.season);
    return !!(s && s.on !== false && seasonSpan(s, d || kstToday()));
  }

  // ---------- 배경 그림 ----------
  // 모두 1200 x 700 판에 그려요. 화면 아래쪽에 맞춰 깔려요.
  const pine = (x, y, s, c, lights) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="0" width="12" height="26" fill="#5B3A1E"/><polygon points="0,-120 -46,-52 46,-52" fill="${c}"/><polygon points="0,-88 -58,-14 58,-14" fill="${c}"/><polygon points="0,-52 -70,26 70,26" fill="${c}" transform="translate(0 -22)"/>${lights ? [[-20, -60, '#FFD34D'], [14, -74, '#FF6B6B'], [-34, -22, '#7FD4FF'], [8, -36, '#FFD34D'], [36, -18, '#FF6B6B'], [-10, -6, '#B5F58A'], [0, -122, '#FFE680']].map((l) => `<circle cx="${l[0]}" cy="${l[1]}" r="${l[1] === -122 ? 8 : 5}" fill="${l[2]}"/>`).join('') : ''}</g>`;
  const cloudK = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"><path d="M0 0 q18 -26 44 -8 q28 -22 52 4 q30 -6 34 22 h-150 q-6 -16 20 -18"/><path d="M26 6 q12 -12 22 0"/></g>`;
  const bat = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0 q-10 -14 -24 -6 q-6 -10 -20 -8 q10 8 8 22 q10 -8 18 0 q8 -8 18 -2 q8 -6 18 2 q8 -8 18 0 q-2 -14 8 -22 q-14 -2 -20 8 q-14 -8 -24 6z" fill="#1A0F24"/>`;
  const pumpkin = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="-50" width="10" height="16" rx="4" fill="#4E8B3A"/><ellipse cx="-22" cy="0" rx="26" ry="36" fill="#E87A1A"/><ellipse cx="22" cy="0" rx="26" ry="36" fill="#E87A1A"/><ellipse cx="0" cy="0" rx="26" ry="38" fill="#F6922C"/><polygon points="-22,-10 -8,-10 -15,-24" fill="#2A1638"/><polygon points="22,-10 8,-10 15,-24" fill="#2A1638"/><path d="M-22 10 l8 8 l7 -8 l7 8 l7 -8 l8 8 l7 -8 v8 q-22 16 -44 0z" fill="#2A1638"/></g>`;
  const blossom = (x, y, r, c) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="${-r}" rx="${r * 0.62}" ry="${r}" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="${r * 0.42}" fill="#FFE08A"/></g>`;
  const burst = (x, y, r, c) => `<g transform="translate(${x} ${y})" stroke="${c}" stroke-width="4" stroke-linecap="round">${Array.from({ length: 14 }, (_, i) => { const a = i * Math.PI / 7; return `<line x1="${Math.cos(a) * r * 0.35}" y1="${Math.sin(a) * r * 0.35}" x2="${Math.cos(a) * r}" y2="${Math.sin(a) * r}"/><circle cx="${Math.cos(a) * r * 1.14}" cy="${Math.sin(a) * r * 1.14}" r="3" fill="${c}" stroke="none"/>`; }).join('')}</g>`;
  const sheep = (x, y, s, wool, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><rect x="-22" y="20" width="7" height="26" rx="3" fill="#4A3A3A"/><rect x="14" y="20" width="7" height="26" rx="3" fill="#4A3A3A"/><g fill="${wool}" stroke="#E7C9BE" stroke-width="1.5"><circle cx="-26" cy="4" r="17"/><circle cx="-8" cy="-12" r="19"/><circle cx="14" cy="-10" r="18"/><circle cx="28" cy="6" r="16"/><circle cx="10" cy="16" r="17"/><circle cx="-12" cy="16" r="17"/><circle cx="0" cy="2" r="20"/></g><ellipse cx="40" cy="-6" rx="15" ry="17" fill="#4A3A3A"/><ellipse cx="27" cy="-16" rx="8" ry="4.5" fill="#4A3A3A" transform="rotate(-30 27 -16)"/><circle cx="34" cy="-22" r="9" fill="${wool}" stroke="#E7C9BE" stroke-width="1.5"/><circle cx="44" cy="-23" r="8" fill="${wool}" stroke="#E7C9BE" stroke-width="1.5"/><circle cx="44" cy="-8" r="2.6" fill="#fff"/><path d="M40 2 q4 3 8 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
  const hills = (c1, c2, y) => `<path d="M0 ${y + 40} Q200 ${y - 60} 420 ${y + 20} T820 ${y} T1200 ${y + 30} V700 H0z" fill="${c1}"/><path d="M0 ${y + 90} Q260 ${y + 10} 560 ${y + 80} T1200 ${y + 60} V700 H0z" fill="${c2}"/>`;
  const stars = (n, seed, c) => Array.from({ length: n }, (_, i) => { const a = Math.sin(seed + i * 12.9898) * 43758.5453, b = Math.sin(seed + i * 78.233) * 12543.123; return `<circle cx="${Math.round((a - Math.floor(a)) * 1200)}" cy="${Math.round((b - Math.floor(b)) * 420)}" r="${i % 5 === 0 ? 3 : 1.8}" fill="${c}" opacity="${i % 3 ? 0.9 : 0.55}"/>`; }).join('');
  const SCENES = {
    none: { name: '없음', draw: () => '' },
    night: { name: '별밤 언덕', draw: () => stars(46, 3, '#FFF3C9') + '<circle cx="980" cy="130" r="54" fill="#FFF3C9"/><circle cx="1002" cy="116" r="48" fill="#232B5C" opacity=".92"/>' + hills('#1A2147', '#10152F', 560) },
    sunset: { name: '노을 언덕', draw: () => '<circle cx="600" cy="520" r="150" fill="#FFF1C2" opacity=".9"/><circle cx="600" cy="520" r="230" fill="#FFF1C2" opacity=".25"/>' + hills('#C9603F', '#8E3B35', 560) },
    forest: { name: '숲', draw: () => hills('#6DB277', '#3F8A56', 540) + [80, 210, 330, 900, 1030, 1140].map((x, i) => pine(x, 600 + (i % 2) * 24, 1 + (i % 3) * 0.25, i % 2 ? '#2F7A4A' : '#3F915A')).join('') },
    sea: { name: '바닷속', draw: () => '<path d="M0 600 q80 -50 160 0 t160 0 t160 0 t160 0 t160 0 t160 0 t160 0 t160 0 V700 H0z" fill="#F4D9A0"/>' + [[160, 420, 1], [340, 300, -1], [900, 380, 1], [1040, 240, -1]].map((f) => `<g transform="translate(${f[0]} ${f[1]}) scale(${f[2]} 1)"><ellipse rx="34" ry="18" fill="#FFB35C"/><polygon points="30,0 58,-18 58,18" fill="#FF8F3C"/><circle cx="-16" cy="-4" r="4" fill="#1A2050"/></g>`).join('') + [100, 520, 1120].map((x) => `<path d="M${x} 620 q-20 -70 10 -130 q20 60 -4 130z M${x + 26} 620 q24 -50 8 -100 q-22 44 -14 100z" fill="#2E9E7A"/>`).join('') + [[220, 160], [620, 240], [760, 120], [980, 520]].map((b) => `<circle cx="${b[0]}" cy="${b[1]}" r="14" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>`).join('') },
    city: { name: '도시의 밤', draw: () => stars(30, 9, '#fff') + Array.from({ length: 16 }, (_, i) => { const h = 120 + ((i * 53) % 190), x = i * 76; return `<rect x="${x}" y="${700 - h}" width="64" height="${h}" fill="#161B38"/>` + Array.from({ length: Math.floor(h / 34) }, (_, r) => [0, 1, 2].map((c) => ((i + r + c) % 3 ? `<rect x="${x + 10 + c * 17}" y="${700 - h + 14 + r * 32}" width="9" height="14" fill="#FFD98A" opacity=".85"/>` : '')).join('')).join(''); }).join('') },
    space: { name: '우주', draw: () => stars(70, 5, '#fff') + '<circle cx="230" cy="200" r="70" fill="#F2A65A"/><ellipse cx="230" cy="200" rx="120" ry="22" fill="none" stroke="#FFE1B0" stroke-width="8" transform="rotate(-18 230 200)"/><circle cx="960" cy="480" r="110" fill="#6C8CFF"/><path d="M880 440 q60 30 140 0 M870 500 q80 34 180 -6" stroke="#9DB4FF" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="1050" cy="150" r="26" fill="#E8E6F5"/>' },
    xmas: { name: '크리스마스', draw: () => stars(36, 2, '#fff') + '<circle cx="1010" cy="120" r="50" fill="#FFF6D6"/>'
      + '<path d="M0 30 Q150 90 300 30 T600 30 T900 30 T1200 30" fill="none" stroke="#2F7A4A" stroke-width="12"/>' + Array.from({ length: 13 }, (_, i) => `<circle cx="${i * 100}" cy="${i % 3 === 1 ? 60 : 38}" r="11" fill="${['#FF6B6B', '#FFD34D', '#7FD4FF', '#B5F58A'][i % 4]}"/>`).join('')
      + '<path d="M0 560 Q220 470 460 550 T900 530 T1200 560 V700 H0z" fill="#EAF4FF"/><path d="M0 620 Q300 560 620 620 T1200 600 V700 H0z" fill="#fff"/>'
      + pine(130, 590, 1.5, '#1F6B45', 1) + pine(300, 610, 1, '#2A7F53') + pine(1060, 590, 1.7, '#1F6B45', 1) + pine(900, 615, 1.05, '#2A7F53')
      + '<g transform="translate(620 600)"><circle r="34" cy="-20" fill="#fff"/><circle r="24" cy="-66" fill="#fff"/><circle r="3.4" cx="-8" cy="-70" fill="#22242C"/><circle r="3.4" cx="8" cy="-70" fill="#22242C"/><polygon points="0,-64 22,-60 0,-56" fill="#F6922C"/><rect x="-18" y="-104" width="36" height="20" fill="#22242C"/><rect x="-26" y="-88" width="52" height="6" fill="#22242C"/><path d="M-22 -48 h44" stroke="#E0383E" stroke-width="8" stroke-linecap="round"/></g>' },
    seollal: { name: '설날', draw: () => '<circle cx="600" cy="470" r="170" fill="#FFE9A8"/><circle cx="600" cy="470" r="250" fill="#FFE9A8" opacity=".22"/>'
      + cloudK(90, 150, 1.1, '#FFE9A8') + cloudK(930, 110, 1.3, '#FFE9A8') + cloudK(760, 260, 0.8, '#FFD27A') + cloudK(240, 300, 0.8, '#FFD27A')
      + '<path d="M0 560 L170 400 L330 520 L520 380 L700 540 L880 410 L1060 520 L1200 440 V700 H0z" fill="#8E1A26"/><path d="M0 620 L220 500 L420 600 L640 510 L860 610 L1040 530 L1200 600 V700 H0z" fill="#6E121C"/>'
      + '<g transform="translate(1040 300) rotate(12)"><polygon points="0,-70 52,0 0,70 -52,0" fill="#fff" stroke="#22242C" stroke-width="4"/><circle r="16" fill="#E0383E"/><path d="M0 70 q20 50 -10 100 q-24 40 6 90" fill="none" stroke="#fff" stroke-width="3"/></g>'
      + '<g transform="translate(150 560)"><path d="M-50 60 Q-70 -10 0 -24 Q70 -10 50 60 Q0 84 -50 60z" fill="#F1B92E"/><path d="M-26 -22 q26 -34 52 0" fill="none" stroke="#C98A12" stroke-width="8"/><text y="40" font-size="54" font-weight="900" text-anchor="middle" fill="#B3202C" font-family="serif">福</text></g>' },
    chuseok: { name: '추석', draw: () => stars(30, 7, '#FFF3C9') + '<circle cx="820" cy="230" r="170" fill="#FFF1B8"/><circle cx="820" cy="230" r="230" fill="#FFF1B8" opacity=".16"/><circle cx="770" cy="190" r="26" fill="#F2DC8E"/><circle cx="870" cy="270" r="38" fill="#F2DC8E"/><circle cx="850" cy="160" r="16" fill="#F2DC8E"/>'
      + '<path d="M40 560 q130 -90 260 -90 q130 0 260 90z" fill="#1B1E38"/><path d="M0 566 h600 v14 H0z" fill="#262A4C"/><path d="M110 580 h380 v120 H110z" fill="#15172C"/><rect x="250" y="610" width="100" height="90" fill="#F2B95A" opacity=".85"/>'
      + '<path d="M0 640 Q300 590 620 640 T1200 620 V700 H0z" fill="#2B2440"/>'
      + Array.from({ length: 16 }, (_, i) => { const x = 640 + i * 36; return `<path d="M${x} 700 q${-10 + (i % 3) * 8} -110 ${20 + (i % 4) * 6} -${170 + (i % 5) * 16}" fill="none" stroke="#E9D9A6" stroke-width="5" stroke-linecap="round" opacity=".9"/><ellipse cx="${x + 20 + (i % 4) * 6}" cy="${700 - 170 - (i % 5) * 16}" rx="7" ry="22" fill="#F4E8C1" transform="rotate(${14 + i % 3 * 6} ${x + 20} ${530})"/>`; }).join('')
      + '<path d="M1200 60 q-150 10 -260 90" fill="none" stroke="#3A2A1E" stroke-width="10" stroke-linecap="round"/>' + [[1080, 110], [1010, 150], [1140, 150]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="24" fill="#F0792B"/><rect x="${p[0] - 6}" y="${p[1] - 30}" width="12" height="8" rx="3" fill="#4E8B3A"/>`).join('') },
    halloween: { name: '할로윈', draw: () => '<circle cx="900" cy="200" r="130" fill="#FFE08A"/><circle cx="900" cy="200" r="190" fill="#FFE08A" opacity=".16"/>' + bat(780, 170, 1.3) + bat(980, 250, 0.9) + bat(300, 130, 1.1) + bat(520, 250, 0.8) + bat(140, 300, 0.7)
      + '<path d="M0 600 Q260 520 560 590 T1200 570 V700 H0z" fill="#1A0F24"/>'
      + '<g fill="none" stroke="#1A0F24" stroke-linecap="round"><path d="M210 620 q-10 -150 30 -260" stroke-width="26"/><path d="M236 420 q-70 -40 -110 -110 M240 380 q60 -50 70 -130 M226 470 q60 -10 110 -60 M150 350 q-30 -10 -40 -50 M300 300 q30 -6 46 -40" stroke-width="12"/></g>'
      + pumpkin(520, 620, 1.1) + pumpkin(660, 640, 0.75) + pumpkin(1050, 630, 1.25)
      + [[800, 600], [880, 612]].map((t, i) => `<path d="M${t[0] - 26} ${t[1] + 40} v-60 q26 -34 52 0 v60z" fill="#3A2A4A"/><path d="M${t[0]} ${t[1] - 6} v28 M${t[0] - 10} ${t[1] + 4} h20" stroke="#6B5A80" stroke-width="5"/>`).join('') },
    summer: { name: '여름 바다', draw: () => '<circle cx="960" cy="150" r="80" fill="#FFF1A8"/>' + Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line x1="${960 + Math.cos(a) * 100}" y1="${150 + Math.sin(a) * 100}" x2="${960 + Math.cos(a) * 130}" y2="${150 + Math.sin(a) * 130}" stroke="#FFF1A8" stroke-width="8" stroke-linecap="round"/>`; }).join('')
      + '<g fill="#fff" opacity=".9"><ellipse cx="220" cy="150" rx="90" ry="30"/><ellipse cx="280" cy="126" rx="60" ry="34"/><ellipse cx="640" cy="230" rx="70" ry="22"/></g>'
      + '<path d="M0 450 q75 -26 150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 V700 H0z" fill="#2FA8D8"/><path d="M0 500 q75 -26 150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 V700 H0z" fill="#1E8FC4"/>'
      + '<path d="M0 600 Q320 540 700 600 T1200 580 V700 H0z" fill="#F6E2A6"/>'
      + '<g transform="translate(170 600)"><path d="M0 0 q20 -140 -10 -250" fill="none" stroke="#8A5A2B" stroke-width="16" stroke-linecap="round"/>' + [-70, -30, 10, 50, 90].map((a) => `<path d="M-10 -250 q60 -50 130 -10 q-70 -6 -130 10z" fill="#2E9E5B" transform="rotate(${a * 1.6 - 60} -10 -250)"/>`).join('') + '</g>'
      + '<g transform="translate(960 610)"><path d="M0 0 v-130" stroke="#8A5A2B" stroke-width="7"/><path d="M-100 -120 q100 -90 200 0z" fill="#FF6B6B"/><path d="M-34 -120 q34 -80 68 0z" fill="#fff"/></g>' },
    spring: { name: '벚꽃', draw: () => hills('#BFE3A8', '#9BD08A', 580)
      + '<g fill="none" stroke="#6B4A3A" stroke-linecap="round"><path d="M0 40 q200 20 360 130" stroke-width="16"/><path d="M180 86 q40 60 30 120 M270 120 q70 -10 110 -60" stroke-width="9"/><path d="M1200 30 q-190 30 -340 150" stroke-width="16"/><path d="M1010 100 q-30 70 -10 130 M930 150 q-70 -4 -120 -50" stroke-width="9"/></g>'
      + [[60, 50], [140, 76], [220, 110], [300, 150], [360, 176], [200, 190], [214, 214], [330, 96], [384, 60], [1140, 44], [1060, 76], [980, 120], [900, 166], [860, 184], [996, 210], [1004, 236], [880, 110], [812, 96]].map((p, i) => blossom(p[0], p[1], i % 3 ? 16 : 22, i % 2 ? '#FFC2DA' : '#FFE0EC')).join('') },
    sheep: { name: '붉은 양의 해 (2027)', draw: () => '<circle cx="600" cy="430" r="160" fill="#FFF1C2"/><circle cx="600" cy="430" r="240" fill="#FFF1C2" opacity=".25"/>'
      + cloudK(80, 130, 1.2, '#FFE9A8') + cloudK(920, 100, 1.4, '#FFE9A8') + cloudK(250, 280, 0.8, '#FFD27A') + cloudK(800, 250, 0.8, '#FFD27A')
      + '<text x="600" y="200" text-anchor="middle" font-family="Jalnan, sans-serif" font-weight="800" font-size="92" fill="#FFF6E0" opacity=".5">2027</text><text x="600" y="246" text-anchor="middle" font-family="Jalnan, sans-serif" font-weight="800" font-size="30" fill="#FFE9A8" opacity=".6">붉은 양의 해</text>'
      + '<path d="M0 520 Q200 440 420 510 T820 490 T1200 520 V700 H0z" fill="#9E2A33"/><path d="M0 590 Q300 520 620 590 T1200 570 V700 H0z" fill="#7A1F28"/>'
      + sheep(250, 560, 1.5, '#FFE3E0') + sheep(470, 600, 1, '#FFF6EE') + sheep(940, 560, 1.6, '#FFD0CC', true) + sheep(740, 610, 0.9, '#FFF6EE', true)
      + '<g transform="translate(1080 330) rotate(10)"><polygon points="0,-60 44,0 0,60 -44,0" fill="#fff" stroke="#7A1F28" stroke-width="4"/><text y="14" text-anchor="middle" font-size="40" font-weight="900" fill="#C8323A" font-family="serif">未</text><path d="M0 60 q16 40 -8 80" fill="none" stroke="#fff" stroke-width="3"/></g>' },
    winter: { name: '겨울 눈밭', draw: () => stars(24, 4, '#fff') + '<circle cx="950" cy="140" r="56" fill="#FFF6D6"/>'
      + '<path d="M0 540 Q240 450 480 530 T900 510 T1200 540 V700 H0z" fill="#DCEBFA"/><path d="M0 610 Q300 550 620 610 T1200 590 V700 H0z" fill="#fff"/>'
      + pine(140, 590, 1.4, '#3E7F6A') + pine(290, 612, 0.95, '#4E9480') + pine(1070, 592, 1.5, '#3E7F6A')
      + '<g fill="#fff" opacity=".85">' + [[150, 470], [118, 510], [182, 520], [1080, 462], [1046, 505], [1112, 512]].map((q) => `<ellipse cx="${q[0]}" cy="${q[1]}" rx="34" ry="9"/>`).join('') + '</g>'
      + '<g transform="translate(640 606)"><circle r="34" cy="-20" fill="#fff"/><circle r="24" cy="-66" fill="#fff"/><circle r="3.4" cx="-8" cy="-70" fill="#22242C"/><circle r="3.4" cx="8" cy="-70" fill="#22242C"/><polygon points="0,-64 22,-60 0,-56" fill="#F6922C"/><path d="M-22 -48 h44" stroke="#3B82F6" stroke-width="8" stroke-linecap="round"/><path d="M-30 -30 l-26 -18 M30 -30 l26 -18" stroke="#8A5A2B" stroke-width="4" stroke-linecap="round"/></g>'
      + '<g transform="translate(820 560)"><path d="M-70 60 v-50 l70 -46 l70 46 v50z" fill="#B5553C"/><path d="M-84 14 l84 -56 l84 56" fill="none" stroke="#fff" stroke-width="14" stroke-linejoin="round"/><rect x="-16" y="20" width="32" height="40" fill="#5B3A1E"/><rect x="30" y="16" width="24" height="22" fill="#FFD98A"/></g>' },
    autumn: { name: '가을 단풍', draw: () => '<circle cx="930" cy="150" r="70" fill="#FFF1C2" opacity=".9"/>' + hills('#D98A3A', '#B8612A', 560)
      + [[120, 600, 1.5, '#D9482B'], [300, 615, 1.05, '#F2A03D'], [1060, 598, 1.6, '#E8862E'], [900, 618, 1.1, '#C9482B']].map((t) => `<g transform="translate(${t[0]} ${t[1]}) scale(${t[2]})"><rect x="-7" y="-40" width="14" height="70" fill="#6B4A2E"/><circle cx="0" cy="-78" r="46" fill="${t[3]}"/><circle cx="-34" cy="-52" r="32" fill="${t[3]}"/><circle cx="34" cy="-52" r="32" fill="${t[3]}"/><circle cx="-14" cy="-92" r="16" fill="#F6D08A" opacity=".5"/></g>`).join('')
      + Array.from({ length: 12 }, (_, i) => { const x = 420 + i * 34; return `<path d="M${x} 700 q${-8 + (i % 3) * 8} -90 ${16 + (i % 4) * 5} -${130 + (i % 5) * 14}" fill="none" stroke="#F4E3B0" stroke-width="5" stroke-linecap="round"/><ellipse cx="${x + 16 + (i % 4) * 5}" cy="${700 - 130 - (i % 5) * 14}" rx="6" ry="20" fill="#FBF0CC" transform="rotate(${14 + (i % 3) * 6} ${x + 16} 570)"/>`; }).join('') },
    newyear: { name: '새해 불꽃놀이', draw: () => stars(28, 11, '#fff') + burst(260, 190, 90, '#FFD34D') + burst(620, 130, 110, '#FF7EB6') + burst(940, 220, 84, '#7FD4FF') + burst(440, 320, 56, '#B5F58A') + burst(800, 360, 50, '#FFD34D')
      + Array.from({ length: 16 }, (_, i) => { const h = 90 + ((i * 47) % 150), x = i * 76; return `<rect x="${x}" y="${700 - h}" width="66" height="${h}" fill="#0E1230"/>` + Array.from({ length: Math.floor(h / 36) }, (_, r) => [0, 1, 2].map((c) => ((i + r * 2 + c) % 3 ? `<rect x="${x + 10 + c * 18}" y="${700 - h + 14 + r * 32}" width="9" height="13" fill="#FFD98A" opacity=".8"/>` : '')).join('')).join(''); }).join('') }
  };
  const PATTERNS = { none: '없음', snow: '눈', star: '별빛', petal: '꽃잎', leaf: '낙엽', bubble: '물방울', heart: '하트', spark: '반짝이' };
  const MOTIONS = { none: '없음', fall: '천천히 내리기', twinkle: '반짝임', rise: '위로 떠오르기' };

  /** 배경 그림 SVG (칸 크기에 맞춰 아래쪽 기준으로 채워요) */
  function art(item, cls) {
    const it = item || {};
    const c1 = it.c1 || '#0E1530', c2 = it.c2 || '#3A2C6B';
    const id = 'g' + Math.abs(String(it.id || c1 + c2).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
    const img = it.img ? `<image href="${esc(it.img)}" x="0" y="0" width="1200" height="700" preserveAspectRatio="xMidYMid slice"/>` : '';
    return `<svg class="bgart${cls ? ' ' + cls : ''}" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(c1)}"/><stop offset="1" stop-color="${esc(c2)}"/></linearGradient></defs><rect width="1200" height="700" fill="url(#${id})"/>${img || (SCENES[it.scene] || SCENES.none).draw()}</svg>`;
  }
  /** 날리는 무늬 조각들 */
  function bits(item, n) {
    const it = item || {}; const p = it.pattern;
    if (!p || p === 'none') return '';
    const m = it.motion || (p === 'star' || p === 'spark' ? 'twinkle' : p === 'bubble' ? 'rise' : 'fall');
    return `<div class="bgbits p-${esc(p)} m-${esc(m)}" aria-hidden="true">${Array.from({ length: n || 22 }, (_, i) => { const a = Math.sin(i * 12.9898 + 1) * 43758.5453, b = Math.sin(i * 78.233 + 2) * 12543.123; const x = (a - Math.floor(a)) * 100, y = (b - Math.floor(b)) * 100; return `<i style="left:${x.toFixed(1)}%; top:${y.toFixed(1)}%; --d:${(6 + (i % 7) * 1.3).toFixed(1)}s; --w:${-(i * 0.9).toFixed(1)}s; --z:${(0.7 + (i % 4) * 0.25).toFixed(2)}"></i>`; }).join('')}</div>`;
  }
  /** 작은 칸에 넣는 배경 (상점 · 프로필) */
  const thumb = (item, n) => art(item) + bits(item, n == null ? 8 : n);
  /** 배경 색이 어두운가 (글자색을 고를 때) */
  function isDark(item) {
    const h = String((item && item.c1) || '#000').replace('#', ''); if (h.length < 6) return true;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 150;
  }

  // ---------- 트리 칸 장식 틀 · 선 무늬 ----------
  // 틀: 칸 중심이 (0,0), 칸 반지름 40 기준 (-70 ~ 70 판). 선: 가로로 이어 붙는 무늬 한 조각 [너비, 그림] (높이 16, 가운데 y=8)
  const FRAMES = {
    wool: { name: '양털 구름', art: () => `<g fill="#fff" stroke="#E7B9B0" stroke-width="2">${Array.from({ length: 10 }, (_, k) => `<circle cx="${(44 * Math.cos(k * Math.PI / 5)).toFixed(1)}" cy="${(44 * Math.sin(k * Math.PI / 5)).toFixed(1)}" r="15"/>`).join('')}</g><path d="M-36 -36 q-18 -2 -14 16 M36 -36 q18 -2 14 16" stroke="#E9D7A8" stroke-width="7" fill="none" stroke-linecap="round"/>`,
      line: [22, '<circle cx="11" cy="8" r="5.5" fill="#fff" stroke="#E7B9B0" stroke-width="1.5"/>'] },
    lantern: { name: '청사초롱', art: () => '<rect x="-26" y="-62" width="52" height="14" rx="3" fill="#22242C"/><rect x="-26" y="48" width="52" height="14" rx="3" fill="#22242C"/><path d="M-50 0 V-18 a32 32 0 0 1 32 -32 h36 a32 32 0 0 1 32 32 V0z" fill="#D93A4A"/><path d="M-50 0 V18 a32 32 0 0 0 32 32 h36 a32 32 0 0 0 32 -32 V0z" fill="#3B6FD9"/><path d="M0 62 v6" stroke="#F1B92E" stroke-width="4"/><circle cx="0" cy="66" r="4" fill="#F1B92E"/>',
      line: [20, '<rect x="0" y="6" width="20" height="4" fill="#D93A4A"/><rect x="0" y="6" width="10" height="4" fill="#F1B92E"/>'] },
    blossom: { name: '벚꽃', art: () => [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-42" rx="25" ry="28" fill="#FFC2DA" stroke="#F48FB1" stroke-width="1.5" transform="rotate(${a})"/>`).join(''),
      line: [44, '<rect x="0" y="6" width="44" height="4" rx="2" fill="#8A5A4A"/><circle cx="14" cy="4" r="4.5" fill="#FFC2DA"/><circle cx="34" cy="12" r="3.5" fill="#FFE0EC"/>'] },
    tube: { name: '튜브', art: () => '<circle r="53" fill="#fff"/>' + [0, 90, 180, 270].map((a) => { const p = (d) => `${(53 * Math.cos(d * Math.PI / 180)).toFixed(1)} ${(53 * Math.sin(d * Math.PI / 180)).toFixed(1)}`; return `<path d="M0 0 L${p(a - 22)} A53 53 0 0 1 ${p(a + 22)}z" fill="#FF6B6B"/>`; }).join('') + '<circle r="53" fill="none" stroke="#E0565B" stroke-width="2"/>',
      line: [32, '<path d="M0 8 q8 -9 16 0 t16 0" fill="none" stroke="#2FA8D8" stroke-width="3.5" stroke-linecap="round"/>'] },
    moon: { name: '보름달 토끼', art: () => '<circle r="64" fill="#FFF1B8" opacity=".2"/><ellipse cx="-20" cy="-54" rx="10" ry="16" fill="#FFF1B8" transform="rotate(-12 -20 -54)"/><ellipse cx="20" cy="-54" rx="10" ry="16" fill="#FFF1B8" transform="rotate(12 20 -54)"/><circle r="51" fill="#FFF1B8"/>',
      line: [14, '<circle cx="7" cy="8" r="2.2" fill="#E9D9A6"/>'] },
    pumpkin: { name: '호박', art: () => '<rect x="-7" y="-68" width="14" height="18" rx="5" fill="#4E8B3A"/><ellipse cx="-28" cy="0" rx="32" ry="50" fill="#E87A1A"/><ellipse cx="28" cy="0" rx="32" ry="50" fill="#E87A1A"/><ellipse cx="0" cy="0" rx="35" ry="53" fill="#F6922C"/>',
      line: [24, '<rect x="0" y="6" width="14" height="4" rx="2" fill="#F28C28"/>'] },
    ornament: { name: '트리 방울', art: () => '<rect x="-11" y="-62" width="22" height="14" rx="3" fill="#F1B92E"/><circle cx="0" cy="-64" r="6" fill="none" stroke="#F1B92E" stroke-width="3"/><circle r="50" fill="#D93A4A"/><path d="M-34 -24 q10 -16 26 -18" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>',
      line: [48, '<rect x="0" y="6" width="48" height="3" fill="#2F7A4A"/><circle cx="8" cy="11" r="4" fill="#FF6B6B"/><circle cx="24" cy="11" r="4" fill="#FFD34D"/><circle cx="40" cy="11" r="4" fill="#7FD4FF"/>'] },
    maple: { name: '단풍잎', art: () => [0, 60, 120, 180, 240, 300].map((a, i) => `<path d="M0 -34 C-16 -46 -14 -62 0 -68 C14 -62 16 -46 0 -34z" fill="${['#D9482B', '#F2A03D', '#E8862E'][i % 3]}" transform="rotate(${a})"/>`).join('') + '<circle r="48" fill="#F6D08A"/>',
      line: [40, '<rect x="0" y="6" width="40" height="4" rx="2" fill="#8A5A2B"/><ellipse cx="12" cy="5" rx="5" ry="3.5" fill="#E8862E"/><ellipse cx="30" cy="12" rx="5" ry="3.5" fill="#D9482B"/>'] },
    snow: { name: '눈꽃', art: () => [0, 60, 120, 180, 240, 300].map((a) => `<g transform="rotate(${a})"><path d="M0 -46 V-66 M0 -58 l-7 -7 M0 -58 l7 -7" stroke="#9CD3F0" stroke-width="5" stroke-linecap="round" fill="none"/></g>`).join('') + '<circle r="50" fill="#E4F4FC" stroke="#9CD3F0" stroke-width="3"/>',
      line: [18, '<circle cx="9" cy="8" r="3" fill="#fff" stroke="#9CD3F0" stroke-width="1.5"/>'] }
  };
  const svgUrl = (inner, vb) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`)}")`;
  // 사계절: 그 달에 고를 수 있는 테마 (배경 · 트리 디자인은 상점 아이템을 가리켜요)
  const CAL = [
    { id: 'winter', name: '겨울', months: [12, 1, 2], bg: 'bg-winter', tree: 'tk-snow' },
    { id: 'spring', name: '봄', months: [3, 4, 5], bg: 'bg-spring', tree: 'tk-blossom' },
    { id: 'summer', name: '여름', months: [6, 7, 8], bg: 'bg-summer', tree: 'tk-tube' },
    { id: 'autumn', name: '가을', months: [9, 10, 11], bg: 'bg-autumn', tree: 'tk-maple' }
  ];
  const calNow = (d) => { const m = Number((d || kstToday()).slice(5, 7)); return CAL.find((c) => c.months.includes(m)); };

  // ---------- 사이트에 입히기 ----------
  const items = () => ((WT.data && WT.data.shop) || []);
  const byId = (id) => items().find((i) => i.id === id);
  /** 지금 고를 수 있는 테마들: 기본 + 이번 계절 + (시즌 중이면) 시즌 테마. 기본이 처음 상태예요 */
  function themeOptions(d) {
    const out = [];
    const c = calNow(d);
    if (c && byId(c.bg)) out.push({ key: 'cal:' + c.id, name: `${c.name} 테마`, sub: '이번 계절', bg: c.bg, tree: byId(c.tree) ? c.tree : '' });
    const now = seasonNow(d);
    if (now) {
      const s = now.season, tree = (items().find((i) => i.kind === 'tree' && i.season === s.id) || {}).id || '';
      const bgs = items().filter((i) => i.kind === 'bg' && i.season === s.id).sort((a, b) => (b.id === s.bg ? 1 : 0) - (a.id === s.bg ? 1 : 0));
      bgs.filter((b) => !out.some((o) => o.bg === b.id)).forEach((b) => out.push({ key: `ev:${now.key}:${b.id}`, name: bgs.length > 1 ? b.name : `${s.name} 테마`, sub: `${s.name} 시즌 · ${now.to.slice(5).replace('-', '.')}까지`, bg: b.id, tree }));
    }
    return out;
  }
  /** 내가 고른 테마 (기간이 지났으면 기본으로 돌아가요) */
  function pickedTheme() {
    const S = WT.store ? WT.store.state : {};
    if (!S.themePick) return null;
    const hit = themeOptions().find((o) => o.key === S.themePick);
    if (!hit) { S.themePick = ''; if (WT.store) WT.store.save(); }
    return hit || null;
  }
  function pickTheme(key) {
    const S = WT.store.state;
    S.themePick = themeOptions().some((o) => o.key === key) ? key : '';
    WT.store.save(); apply();
  }
  /** 지금 사이트에 깔 배경: 고른 테마가 있으면 그 배경, 아니면 내가 착용한 배경 (기본은 배경 없음) */
  function currentBg() {
    const S = WT.store ? WT.store.state : {};
    const t = pickedTheme();
    if (t) { const b = byId(t.bg); if (b) return { item: b, theme: t }; }
    const mine = S.equip && S.equip.bg ? byId(S.equip.bg) : null;
    return mine && mine.kind === 'bg' ? { item: mine, theme: null } : { item: null, theme: null };
  }
  function currentTree() {
    const S = WT.store ? WT.store.state : {};
    const pt = pickedTheme();
    if (pt && pt.tree && byId(pt.tree)) return byId(pt.tree);
    const t = S.equip && S.equip.tree ? byId(S.equip.tree) : null;
    return t && t.kind === 'tree' ? t : null;
  }
  let lastKey = null;
  function apply() {
    if (!document.body) return;
    const cur = currentBg(), bg = cur.item, tr = currentTree();
    const key = JSON.stringify([bg, tr]);
    if (key !== lastKey) {
      lastKey = key;
      let el = document.getElementById('site-bg');
      if (!bg) { if (el) el.remove(); document.body.classList.remove('has-bg', 'bg-dark', 'bg-light'); }
      else {
        if (!el) { el = document.createElement('div'); el.id = 'site-bg'; el.setAttribute('aria-hidden', 'true'); document.body.insertBefore(el, document.body.firstChild); }
        el.innerHTML = art(bg) + bits(bg, 26);
        document.body.classList.add('has-bg');
        document.body.classList.toggle('bg-dark', isDark(bg)); document.body.classList.toggle('bg-light', !isDark(bg));
      }
      // 배경을 깔면 글씨가 읽히게 화면 밝기를 배경에 맞춰요 (어두운 배경 → 어두운 화면). 배경을 끄면 내가 고른 밝기로 돌아와요
      const html = document.documentElement;
      let want = 'dark';
      try { want = localStorage.getItem('webtoontree.theme') === 'light' ? 'light' : 'dark'; } catch (e) { /* 저장소를 못 읽으면 어두운 화면 */ }
      if (bg) want = isDark(bg) ? 'dark' : 'light';
      if (want === 'light') html.dataset.theme = 'light'; else delete html.dataset.theme;
      // 강추 · 폭주 효과도 배경 그림에 맞춰요 (배경이 없으면 기본 효과)
      const FX = { winter: 'winter', spring: 'spring', summer: 'summer', sea: 'summer', autumn: 'autumn', xmas: 'xmas', sheep: 'sheep', newyear: 'firework', seollal: 'seollal', chuseok: 'chuseok', halloween: 'halloween' };
      const fx = bg && FX[bg.scene];
      if (fx) document.body.dataset.fx = fx; else delete document.body.dataset.fx;
      const b = document.body;
      if (tr) {
        b.dataset.tkShape = tr.shape || 'circle'; b.dataset.tkLine = tr.lineStyle || 'solid';
        b.style.setProperty('--tk-ring', tr.ring || '#E0565B'); b.style.setProperty('--tk-line', tr.line || '#B8BECC');
        b.classList.add('has-tk');
        const f = FRAMES[tr.frame];
        if (f) {
          b.dataset.tkFrame = tr.frame; b.dataset.tkShape = 'circle'; delete b.dataset.tkLine;
          b.style.setProperty('--tk-frame', svgUrl(f.art(), '-70 -70 140 140'));
          b.style.setProperty('--tk-linebg', svgUrl(f.line[1], `0 0 ${f.line[0]} 16`)); b.style.setProperty('--tk-linew', f.line[0] + 'px');
        } else { delete b.dataset.tkFrame; b.style.removeProperty('--tk-frame'); b.style.removeProperty('--tk-linebg'); }
      } else { delete b.dataset.tkShape; delete b.dataset.tkLine; delete b.dataset.tkFrame; ['--tk-ring', '--tk-line', '--tk-frame', '--tk-linebg', '--tk-linew'].forEach((k) => b.style.removeProperty(k)); b.classList.remove('has-tk'); }
    }
    // 새 시즌 · 새 계절이 시작되면 한 번 알려요 (테마는 자동으로 바뀌지 않고, 테마 버튼에서 골라요)
    const S = WT.store ? WT.store.state : null;
    if (S && (S.profile || S.guest)) {
      const now = seasonNow(), c = calNow();
      const key = now ? now.key : c ? 'cal:' + c.id + ':' + kstToday().slice(0, 4) : '';
      if (key && S.seasonSeen !== key) {
        const first = S.seasonSeen == null;
        S.seasonSeen = key; WT.store.save();
        if (WT.toast && !(first && !now)) setTimeout(() => WT.toast(now ? `${now.season.name} 시즌이에요! 위쪽 테마 버튼에서 ${now.season.name} 테마를 골라 보세요` : `${c.name}이 왔어요! 위쪽 테마 버튼에서 ${c.name} 테마를 고를 수 있어요`), 900);
      }
    }
  }
  /** 트리 디자인 미리보기 (작은 그림) */
  function treeThumb(t, w, h) {
    const o = t || {}; const ring = o.ring || '#E0565B', line = o.line || '#B8BECC';
    const n = [[30, 60], [95, 28], [95, 92], [160, 60]];
    const F = FRAMES[o.frame];
    const node = (x, y, i) => {
      const f = i ? 'rgba(255,255,255,.85)' : ring;
      if (F) return `<g transform="translate(${x} ${y}) scale(.3)">${F.art()}</g><circle cx="${x}" cy="${y}" r="11" fill="${['#8fa3d6', '#b0736b', '#6ba089', '#a78bc9'][i]}"/>`;
      if (o.shape === 'hex') return `<polygon points="${[0, 1, 2, 3, 4, 5].map((k) => (x + 16 * Math.cos(Math.PI / 3 * k + Math.PI / 6)).toFixed(1) + ',' + (y + 16 * Math.sin(Math.PI / 3 * k + Math.PI / 6)).toFixed(1)).join(' ')}" fill="${f}" stroke="${ring}" stroke-width="3"/>`;
      if (o.shape === 'square') return `<rect x="${x - 13}" y="${y - 13}" width="26" height="26" rx="8" fill="${f}" stroke="${ring}" stroke-width="3"/>`;
      if (o.shape === 'diamond') return `<rect x="${x - 12}" y="${y - 12}" width="24" height="24" rx="5" fill="${f}" stroke="${ring}" stroke-width="3" transform="rotate(45 ${x} ${y})"/>`;
      return `<circle cx="${x}" cy="${y}" r="14" fill="${f}" stroke="${ring}" stroke-width="3"/>`;
    };
    const lnF = (a, b) => { const dx = n[b][0] - n[a][0], dy = n[b][1] - n[a][1], len = Math.hypot(dx, dy), k = Math.max(1, Math.round(len / (F.line[0] * 0.6))); return `<g transform="translate(${n[a][0]} ${n[a][1]}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}) scale(${len / (k * F.line[0])} .6) translate(0 -8)">${Array.from({ length: k }, (_, q) => `<g transform="translate(${q * F.line[0]} 0)">${F.line[1]}</g>`).join('')}</g>`; };
    const ln = (a, b) => F ? lnF(a, b) : `<path d="M${n[a][0]} ${n[a][1]} L${n[b][0]} ${n[b][1]}" stroke="${line}" stroke-width="${o.lineStyle === 'glow' ? 3.4 : 2.6}" ${o.lineStyle === 'dash' ? 'stroke-dasharray="6 6"' : o.lineStyle === 'dot' ? 'stroke-dasharray="1 8" stroke-linecap="round"' : ''} ${o.lineStyle === 'glow' ? `style="filter:drop-shadow(0 0 4px ${line})"` : ''}/>`;
    return `<svg viewBox="0 0 190 120" width="${w || 150}" height="${h || 90}" aria-hidden="true">${ln(0, 1)}${ln(0, 2)}${ln(1, 3)}${ln(2, 3)}${n.map((p, i) => node(p[0], p[1], i)).join('')}</svg>`;
  }

  WT.skin = {
    LUNAR, SCENES, PATTERNS, MOTIONS,
    SHAPES: { circle: '원', square: '둥근 네모', hex: '육각', diamond: '마름모' },
    LINES: { solid: '실선', dash: '점선', dot: '점점이', glow: '빛나는 선' },
    FRAMES, CAL, calNow, themeOptions, pickedTheme, pickTheme,
    seasonNow, seasonSpan, seasonNext, seasonDay, onSale, art, bits, thumb, isDark, apply, currentBg, currentTree, treeThumb, kstToday
  };
})();
