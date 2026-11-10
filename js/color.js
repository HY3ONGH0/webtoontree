/* 표지 색 뽑기 · 상세 창 색 만들기 (사이트와 관리자 화면이 함께 써요)
   - extract(url): 표지 이미지를 작게 줄여 가장 눈에 띄는 색을 뽑아요 (#rrggbb).
     다른 사이트 이미지는 브라우저가 픽셀을 못 읽게 막아서, 막히면 이미지 중계 서비스(images.weserv.nl)를 거쳐 읽어요.
   - palette(hex): 그 색으로 상세 창 배경·테두리·강조색을 만들어요. 글자가 잘 보이게 어둡고 차분하게 바꿔요. */
(function () {
  const CACHE_KEY = 'webtoontree.coverColors.v2';   // 색 뽑는 방식이 바뀌면 이름을 바꿔 새로 뽑아요
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { cache = {}; }
  const saveCache = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* 무시 */ } };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }
  const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  /**
   * 픽셀에서 대표 색 고르기: 표지에서 가장 넓은 면적을 차지하는 색
   * - 비슷한 색끼리 묶어요 (색 공간을 16단계로 나눠 4096칸)
   * - 가장 픽셀이 많은 칸의 실제 평균 색을 써요
   * - 그 칸이 거의 흰색·검은색(여백·배경)이고, 비슷하게 넓은 '색 있는' 칸이 있으면 그쪽을 써요
   */
  function dominant(data) {
    const bins = new Map();
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      let x = bins.get(key);
      if (!x) { x = { n: 0, r: 0, g: 0, b: 0 }; bins.set(key, x); }
      x.n++; x.r += r; x.g += g; x.b += b;
      total++;
    }
    if (!total) return null;
    // 이웃 칸까지 합쳐 '넓이'를 세요 (그라데이션으로 퍼진 같은 색을 한 덩어리로)
    const list = Array.from(bins.entries()).map(([key, x]) => ({ key, x }));
    list.forEach((it) => {
      const r = it.key >> 8, g = (it.key >> 4) & 15, b = it.key & 15;
      let area = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dg = -1; dg <= 1; dg++) for (let db = -1; db <= 1; db++) {
        const nr = r + dr, ng = g + dg, nb = b + db;
        if (nr < 0 || ng < 0 || nb < 0 || nr > 15 || ng > 15 || nb > 15) continue;
        const y = bins.get((nr << 8) | (ng << 4) | nb);
        if (y) area += y.n * (dr || dg || db ? 0.5 : 1);
      }
      it.area = area;
      const c = it.x;
      it.hsl = rgbToHsl(c.r / c.n, c.g / c.n, c.b / c.n);
    });
    list.sort((a, b) => b.area - a.area);
    const plain = (it) => it.hsl[1] < 0.12 || it.hsl[2] < 0.07 || it.hsl[2] > 0.95;
    let best = list[0];
    if (plain(best)) {
      const colorful = list.find((it) => !plain(it));
      if (colorful && colorful.area >= best.area * 0.45) best = colorful;
    }
    const c = best.x;
    return hex(c.r / c.n, c.g / c.n, c.b / c.n);
  }

  async function readColor(src) {
    const img = await loadImage(src);
    const c = document.createElement('canvas');
    const k = Math.min(1, 72 / Math.max(img.naturalWidth || 72, img.naturalHeight || 72));
    c.width = Math.max(1, Math.round((img.naturalWidth || 48) * k));
    c.height = Math.max(1, Math.round((img.naturalHeight || 48) * k));
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return dominant(ctx.getImageData(0, 0, c.width, c.height).data);   // 막히면 여기서 오류가 나요
  }

  /** 표지 주소 → 대표 색 (#rrggbb). 못 뽑으면 null */
  async function extract(url) {
    if (!url) return null;
    if (cache[url]) return cache[url];
    let color = null;
    try { color = await readColor(url); } catch (e) { color = null; }
    if (!color && /^https?:\/\//.test(url)) {
      try { color = await readColor(`https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=72&h=72&fit=inside&output=png`); } catch (e) { color = null; }
    }
    if (color) { cache[url] = color; saveCache(); }
    return color;
  }

  function hexToHsl(h) {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
  }
  const hsl = (h, s, l, a) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%${a == null ? '' : ` / ${a}`})`;

  /** 대표 색 → 상세 창 색 묶음 (CSS 변수로 써요) */
  function palette(color) {
    const v = hexToHsl(color);
    if (!v) return null;
    const [h, s0] = v;
    const s = s0 < 0.1 ? 0.06 : Math.min(0.5, Math.max(0.25, s0 * 0.7));
    return {
      '--p-bg1': hsl(h, s, 0.29),
      '--p-bg2': hsl(h, s * 0.85, 0.18),
      '--p-box': hsl(h, s, 0.12, 0.45),
      '--p-border': hsl(h, Math.min(0.6, s + 0.15), 0.62),
      '--p-accent': hsl(h, s0 < 0.1 ? 0.1 : 0.85, 0.78),
      '--p-glow': hsl(h, Math.min(0.9, s0 + 0.2), 0.6, 0.85)
    };
  }
  const styleOf = (color) => {
    const p = palette(color);
    return p ? Object.entries(p).map(([k, v]) => `${k}:${v}`).join('; ') : '';
  };

  window.WT = window.WT || {};
  WT.color = { extract, palette, styleOf, cached: (url) => cache[url] || null };
})();
