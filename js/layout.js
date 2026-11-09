/* 전체 지도 자동 배치 (사이트와 관리자 화면이 함께 써요)
   - 장르마다 "무리"를 만들어요: 그 장르 트리 모양 그대로 + 트리에 없는 웹툰은 무리 아래에 줄지어.
   - 무리 안의 웹툰 별은 서로 겹치지 않게 살짝 밀어내요.
   - 장르 무리는 관리자가 [전체 지도 편집]에서 놓은 장르 위치(map.regions)를 중심으로 두고,
     서로 겹치면 자연스럽게 밀어내요. 웹툰이 늘면 무리가 커지고, 다른 무리도 알아서 비켜요.
   - 관리자가 웹툰 별 하나를 끌어서 고정한 위치(map.pins)는 그대로 지켜요. (예전 map.nodes 는 쓰지 않아요)
   - 연결선은 관리자가 지도에 그은 선 + 모든 장르 트리의 연결선이에요. */
(function () {
  const TREE_W = 1000, TREE_H = 560, SCALE = 0.8;
  const GAP_X = 175, GAP_Y = 125;          // 웹툰 별끼리 최소 간격 (이름표 포함)
  const PAD_X = 100, PAD_TOP = 130, PAD_BOTTOM = 70;   // 무리 테두리 여백 (위쪽은 장르 이름 자리)
  const BETWEEN = 70;                      // 무리와 무리 사이 여백
  const MARGIN = 80;

  /** 무리 안에서 별끼리 겹치지 않게 밀어내기 */
  function relax(pts, pinned) {
    for (let it = 0; it < 80; it++) {
      let moved = false;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          let dx = (b[0] - a[0]) / GAP_X, dy = (b[1] - a[1]) / GAP_Y;
          let d = Math.hypot(dx, dy);
          if (d >= 1) continue;
          if (d < 1e-6) { dx = 1; dy = 0.3; d = Math.hypot(dx, dy); }
          const push = (1 - d) / 2 + 0.01;
          const ux = dx / d, uy = dy / d;
          const fa = pinned && pinned[i] ? 0 : (pinned && pinned[j] ? 2 : 1);
          const fb = pinned && pinned[j] ? 0 : (pinned && pinned[i] ? 2 : 1);
          a[0] -= ux * push * GAP_X * fa; a[1] -= uy * push * GAP_Y * fa;
          b[0] += ux * push * GAP_X * fb; b[1] += uy * push * GAP_Y * fb;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  function layoutMap(data) {
    const M = data.map || {};
    const webtoons = data.webtoons || [];
    const ids = new Set(webtoons.map((w) => w.id));
    const pinnedPos = {};
    Object.keys(M.pins || {}).forEach((id) => { if (ids.has(id)) pinnedPos[id] = M.pins[id].slice(); });
    const saved = {};
    (M.regions || []).forEach((r) => { saved[r.genre] = r; });

    // 1) 장르마다 무리 만들기
    const used = new Set(Object.keys(pinnedPos));
    const groups = [];
    const groupOf = {};
    const genres = (data.genres || []).filter((g) => webtoons.some((w) => (w.genres || []).includes(g.id)));
    genres.forEach((g) => {
      const members = [];
      const T = (data.trees || {})[g.id];
      if (T) {
        Object.keys(T.nodes || {}).forEach((id) => {
          if (used.has(id) || !ids.has(id)) return;
          const [tx, ty] = T.nodes[id];
          members.push({ id, p: [(tx - TREE_W / 2) * SCALE, (ty - TREE_H / 2) * SCALE] });
          used.add(id);
        });
      }
      groups.push({ genre: g.id, color: g.color, name: g.name, members });
    });
    // 트리에 없는 웹툰: 첫 번째 장르 무리 아래에 줄지어 (장르가 없으면 '기타' 무리)
    let other = null;
    webtoons.forEach((w) => {
      if (used.has(w.id)) return;
      let G = groups.find((x) => x.genre === (w.genres || [])[0]);
      if (!G) {
        if (!other) { other = { genre: '_other', color: '#9AA6C8', name: '기타', members: [] }; groups.push(other); }
        G = other;
      }
      (G.extra = G.extra || []).push(w.id);
      used.add(w.id);
    });
    groups.forEach((G) => {
      if (G.extra) {
        const ys = G.members.map((m) => m.p[1]);
        const baseY = ys.length ? Math.max(...ys) + GAP_Y : 0;
        const per = Math.max(3, Math.min(5, Math.ceil(Math.sqrt(G.extra.length + G.members.length))));
        G.extra.forEach((id, i) => {
          const row = Math.floor(i / per), col = i % per;
          const inRow = Math.min(per, G.extra.length - row * per);
          G.members.push({ id, p: [(col - (inRow - 1) / 2) * GAP_X, baseY + row * GAP_Y] });
        });
      }
      const pts = G.members.map((m) => m.p);
      relax(pts);
      // 무리 크기 (가운데를 0,0 으로)
      if (!pts.length) pts.push([0, 0]);
      const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
      const y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      G.members.forEach((m) => { m.p[0] -= cx; m.p[1] -= cy; });
      G.w = (x1 - x0) + PAD_X * 2;
      G.h = (y1 - y0) + PAD_TOP + PAD_BOTTOM;
      G.oy = (PAD_TOP - PAD_BOTTOM) / 2;   // 상자 가운데와 별 무리 가운데의 차이 (위쪽 이름 자리만큼)
    });

    // 2) 무리 놓기: 저장된 장르 위치가 있으면 거기, 없으면 빈칸 격자
    const cols = Math.max(1, Math.ceil(Math.sqrt(groups.length)));
    const cellW = Math.max(600, ...groups.map((G) => G.w)) + BETWEEN, cellH = Math.max(480, ...groups.map((G) => G.h)) + BETWEEN;
    groups.forEach((G, i) => {
      const r = saved[G.genre];
      if (r) { G.x = r.x; G.y = r.y; G.saved = true; } else { G.x = MARGIN + cellW * (i % cols + 0.5); G.y = MARGIN + cellH * (Math.floor(i / cols) + 0.5); }
      G.x0 = G.x; G.y0 = G.y;
    });
    // 겹치면 밀어내기 (덜 겹친 방향으로)
    for (let it = 0; it < 400; it++) {
      let moved = false;
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const A = groups[i], B = groups[j];
          const ox = (A.w + B.w) / 2 + BETWEEN - Math.abs(B.x - A.x);
          const oy = (A.h + B.h) / 2 + BETWEEN - Math.abs((B.y + B.oy) - (A.y + A.oy));
          if (ox <= 0 || oy <= 0) continue;
          moved = true;
          if (ox / (A.w + B.w) < oy / (A.h + B.h)) {
            const s = (B.x >= A.x ? 1 : -1) * (ox / 2 + 0.5);
            A.x -= s; B.x += s;
          } else {
            const s = ((B.y + B.oy) >= (A.y + A.oy) ? 1 : -1) * (oy / 2 + 0.5);
            A.y -= s; B.y += s;
          }
        }
      }
      if (!moved) break;
    }

    // 3) 웹툰 위치
    const pos = {};
    const auto = {};
    groups.forEach((G) => G.members.forEach((m) => {
      pos[m.id] = [Math.round(G.x + m.p[0]), Math.round(G.y + G.oy + m.p[1])];
      auto[m.id] = true;
      groupOf[m.id] = G.genre;
    }));
    Object.keys(pinnedPos).forEach((id) => { pos[id] = pinnedPos[id]; });

    // 4) 지도 크기: 모두 들어가게. 왼쪽·위로 넘치면 전체를 옮겨요 (shift)
    const boxes = groups.map((G) => [G.x - G.w / 2, G.y + G.oy - G.h / 2, G.x + G.w / 2, G.y + G.oy + G.h / 2]);
    Object.values(pinnedPos).forEach((p) => boxes.push([p[0] - 100, p[1] - 60, p[0] + 100, p[1] + 70]));
    const minX = boxes.length ? Math.min(...boxes.map((b) => b[0])) : 0;
    const minY = boxes.length ? Math.min(...boxes.map((b) => b[1])) : 0;
    const sx = minX < MARGIN ? Math.round(MARGIN - minX) : 0;
    const sy = minY < MARGIN ? Math.round(MARGIN - minY) : 0;
    if (sx || sy) {
      Object.keys(pos).forEach((id) => { pos[id] = [pos[id][0] + sx, pos[id][1] + sy]; });
      groups.forEach((G) => { G.x += sx; G.y += sy; });
    }
    const W = Math.max(M.width || 2400, ...boxes.map((b) => b[2] + sx + MARGIN));
    const H = Math.max(M.height || 1400, ...boxes.map((b) => b[3] + sy + MARGIN));

    const regions = groups.map((G) => ({
      genre: G.genre, name: G.name, color: G.color,
      x: Math.round(G.x), y: Math.round(G.y),                     // 장르 위치 (관리자가 끄는 점)
      cx: Math.round(G.x), cy: Math.round(G.y + G.oy),            // 무리 가운데
      w: Math.round(G.w), h: Math.round(G.h),
      labelY: Math.round(G.y + G.oy - G.h / 2 + 18),               // 장르 이름 위쪽
      pushed: Math.round(Math.hypot(G.x - G.x0, G.y - G.y0))       // 다른 무리에 밀린 거리
    }));

    // 연결선: 지도에 그은 선 + 트리 연결선 (같은 쌍은 한 번만)
    const seen = new Set();
    const links = [];
    const add = (a, b) => {
      if (!pos[a] || !pos[b] || a === b) return;
      const key = a < b ? a + '|' + b : b + '|' + a;
      if (seen.has(key)) return;
      seen.add(key);
      links.push([a, b]);
    };
    (M.links || []).forEach(([a, b]) => add(a, b));
    Object.values(data.trees || {}).forEach((T) => (T.links || []).forEach((l) => add(l.from, l.to)));

    return { nodes: pos, links, auto, groupOf, regions, shift: [sx, sy], width: Math.round(W), height: Math.round(H) };
  }

  /** 장르 트리 판 너비: 기본 1000, 웹툰이 오른쪽으로 더 있으면 그만큼 넓혀요 */
  function treeWidth(T) {
    const xs = Object.values((T && T.nodes) || {}).map((p) => p[0]);
    return Math.max(TREE_W, Math.ceil(((xs.length ? Math.max(...xs) : 0) + 140) / 10) * 10);
  }

  window.WT = window.WT || {};
  WT.layoutMap = layoutMap;
  WT.treeWidth = treeWidth;
})();
