/* 전체 지도 자동 배치 (사이트와 관리자 화면이 함께 써요)
   - 관리자가 [전체 지도 편집]에서 직접 놓은 위치(map.nodes)가 있으면 그 위치를 써요.
   - 없으면 그 웹툰이 들어 있는 장르 트리의 모양 그대로, 장르 구역 안에 줄여서 놓아요.
   - 어느 트리에도 없는 웹툰은 자기 장르 구역 둘레에 놓아요.
   - 연결선은 관리자가 지도에 그은 선 + 모든 장르 트리의 연결선이에요. */
(function () {
  const TREE_W = 1000, TREE_H = 560, SCALE = 0.55;

  function layoutMap(data) {
    const M = data.map || { width: 2400, height: 1400, regions: [], nodes: {}, links: [] };
    const W = M.width || 2400, H = M.height || 1400;
    const regionOf = {};
    (M.regions || []).forEach((r) => { regionOf[r.genre] = r; });
    const fallbackRegion = { x: W / 2, y: H / 2 };
    const pos = {};
    const auto = {};
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const ids = new Set((data.webtoons || []).map((w) => w.id));

    // 1) 관리자가 직접 놓은 위치
    Object.keys(M.nodes || {}).forEach((id) => { if (ids.has(id)) pos[id] = M.nodes[id]; });

    // 2) 장르 트리 모양 그대로
    (data.genres || []).forEach((g) => {
      const T = (data.trees || {})[g.id];
      if (!T) return;
      const r = regionOf[g.id] || fallbackRegion;
      Object.keys(T.nodes || {}).forEach((id) => {
        if (pos[id] || !ids.has(id)) return;
        const [tx, ty] = T.nodes[id];
        pos[id] = [Math.round(clamp(r.x + (tx - TREE_W / 2) * SCALE, 60, W - 60)), Math.round(clamp(r.y + 30 + (ty - TREE_H / 2) * SCALE, 60, H - 60))];
        auto[id] = true;
      });
    });

    // 3) 트리에 없는 웹툰은 장르 구역 둘레에
    let k = 0;
    (data.webtoons || []).forEach((w) => {
      if (pos[w.id]) return;
      const r = regionOf[(w.genres || [])[0]] || fallbackRegion;
      const a = k++ * 2.4;
      pos[w.id] = [Math.round(clamp(r.x + Math.cos(a) * 230, 60, W - 60)), Math.round(clamp(r.y + 40 + Math.sin(a) * 170, 60, H - 60))];
      auto[w.id] = true;
    });

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

    return { nodes: pos, links, auto, width: W, height: H };
  }

  window.WT = window.WT || {};
  WT.layoutMap = layoutMap;
})();
