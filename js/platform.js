/* 플랫폼 아이콘 (사이트와 관리자 화면이 함께 써요)
   웹툰이 올라오는 플랫폼을 앱 아이콘 느낌의 작은 네모로 보여 줘요. 직접 그린 단순한 그림이에요. */
(function () {
  'use strict';
  window.WT = window.WT || {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const box = (bg, inner) => `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6.5" fill="${bg}"/>${inner}</svg>`;
  const line = (d, color, w) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ICON = {
    // 네이버웹툰: 초록 바탕 · 흰 말풍선 · W
    naver: box('#00DC64', '<path d="M6.2 5.6h11.6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6.3l-3.6 2.8v-2.8H6.2a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" fill="#fff"/>' + line('M8 9l1.8 4.4L12 9.6l2.2 3.8L16 9', '#00B955', 1.7)),
    // 카카오페이지: 노란 바탕 · 검은 P
    kakaopage: box('#FFD400', line('M9.2 18V6.6h3.6a3.5 3.5 0 0 1 0 7H9.2', '#1B1B1B', 2.7)),
    // 카카오웹툰: 검은 바탕 · 노란 W
    kakaowebtoon: box('#141414', line('M5.4 8l3.1 8.2L12 9.8l3.5 6.4L18.6 8', '#FFD400', 2.3)),
    // 레진코믹스: 빨간 바탕 · 흰 L
    lezhin: box('#E5141B', line('M9 6.6v10.6h6.6', '#fff', 2.8)),
    // 리디: 파란 바탕 · 흰 R
    ridi: box('#1F8CE6', line('M8.8 17.6V6.6h3.6a3.1 3.1 0 0 1 0 6.2H8.8M12.6 12.8l3.2 4.8', '#fff', 2.5)),
    // 그 밖의 플랫폼: 회색 바탕 · 책
    etc: box('#6B7390', line('M7 6.5h8.5a1.5 1.5 0 0 1 1.5 1.5v9.5H8.5A1.5 1.5 0 0 1 7 16zM7 16a1.5 1.5 0 0 1 1.5-1.5H17', '#fff', 1.7)),
  };
  function key(name) {
    const s = String(name || '').toLowerCase().replace(/\s+/g, '');
    if (!s) return '';
    if (/네이버|naver/.test(s)) return 'naver';
    if (/카카오페이지|kakaopage/.test(s)) return 'kakaopage';
    if (/카카오|kakao/.test(s)) return 'kakaowebtoon';
    if (/레진|lezhin/.test(s)) return 'lezhin';
    if (/리디|ridi/.test(s)) return 'ridi';
    return 'etc';
  }
  /** 플랫폼 아이콘 HTML. cls 로 크기 · 위치를 정해요 (pf-cv: 표지 구석, pf-in: 글 옆) */
  function icon(name, cls) {
    const k = key(name);
    if (!k) return '';
    return `<span class="pf pf-${k}${cls ? ' ' + cls : ''}" role="img" aria-label="${esc(name)}" title="${esc(name)}">${ICON[k]}</span>`;
  }
  WT.platform = { key, icon };
})();
