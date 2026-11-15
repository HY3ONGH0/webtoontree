/* 로고 (사이트와 관리자 화면이 함께 써요): 세로 스크롤 웹툰 화면 속 나무 아이콘 + 알약 모양 사이트 이름 */
(function () {
  'use strict';
  window.WT = window.WT || {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LOGO = '<svg viewBox="0 0 120 120" aria-hidden="true"><rect x="6" y="6" width="108" height="108" rx="26" fill="#E0565B"/><rect x="31" y="12" width="58" height="96" rx="12" fill="#fff"/>'
    + '<path d="M37 25a7 7 0 0 1 7-7h32a7 7 0 0 1 7 7v23l-46 7z" fill="#1F2128"/><path d="M37 60l46-7v22l-46 6z" fill="#FFB648"/><path d="M37 86l46-6v15a7 7 0 0 1-7 7H44a7 7 0 0 1-7-7z" fill="#5BB8FF"/>'
    + '<g stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"><path d="M60 50V33M60 41l-9-8M60 38l9-8"/></g><circle cx="50" cy="31" r="4" fill="#fff"/><circle cx="70" cy="28.5" r="4" fill="#fff"/><circle cx="60" cy="27" r="4.5" fill="#E0565B"/>'
    + '<path d="M44 62.5h18a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-6l-3 3.5v-3.5h-9a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z" fill="#fff"/><path d="M46 91h22M46 97h14" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>';
  // 작은 크기용: 컷과 말풍선은 빼고 화면 속 나무만 크게 (메뉴 · 머리말처럼 40px 안쪽에서 또렷해요)
  const LOGO_S = '<svg viewBox="0 0 120 120" aria-hidden="true"><rect x="6" y="6" width="108" height="108" rx="26" fill="#E0565B"/><rect x="30" y="13" width="60" height="94" rx="13" fill="#fff"/>'
    + '<g stroke="#E0565B" stroke-width="8" stroke-linecap="round" fill="none"><path d="M60 92V52M60 72 44 56M60 64l16-16"/></g>'
    + '<circle cx="43" cy="53" r="8.5" fill="#E0565B"/><circle cx="77" cy="46" r="8.5" fill="#E0565B"/><circle cx="60" cy="38" r="9.5" fill="#1F2128"/></svg>';
  WT.logo = {
    /** big 을 주면 컷이 그려진 자세한 로고, 아니면 작은 크기용 단순한 로고 */
    mark: (big) => `<span class="wt-mark${big ? ' big' : ''}" aria-hidden="true">${big ? LOGO : LOGO_S}</span>`,
    /** 사이트 이름을 알약 모양으로. "웹툰트리"면 가운데에 점(트리의 노드)을 넣어요 */
    word: (name) => { const n = String(name || ''); return `<b class="wt-word">${n === '웹툰트리' ? '웹툰<i></i>트리' : esc(n)}</b>`; }
  };
})();
