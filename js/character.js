/* 캐릭터 "별똥이" (임시 디자인)
   나중에 직접 그린 그림(PNG/SVG)으로 바꿀 때는 이 파일의 charSVG 함수만 고치면 돼요. */
(function () {
  const ACC = {
    crown: '<polygon points="18,24 22,12 28,19 32,10 36,19 42,12 46,24" fill="#FFD34D" stroke="#C9A54C" stroke-width="1.2" stroke-linejoin="round"/>',
    wizard: '<polygon points="15,27 36,-4 49,27" fill="#7B5CFF" stroke="#B9A8FF" stroke-width="1.2" stroke-linejoin="round"/><rect x="15" y="22" width="34" height="5" rx="2" fill="#FFD34D"/><circle cx="36" cy="-3" r="2.6" fill="#FFE29A"/>',
    satgat: '<polygon points="2,28 32,10 62,28" fill="#D9B26A" stroke="#8A6A2E" stroke-width="1.4" stroke-linejoin="round"/><line x1="14" y1="28" x2="20" y2="50" stroke="#8A6A2E" stroke-width="1"/><line x1="50" y1="28" x2="44" y2="50" stroke="#8A6A2E" stroke-width="1"/>',
    phones: '<path d="M11 40 Q11 14 32 14 Q53 14 53 40" fill="none" stroke="#FF7EB6" stroke-width="4" stroke-linecap="round"/><rect x="6" y="34" width="9" height="15" rx="4" fill="#FF7EB6"/><rect x="49" y="34" width="9" height="15" rx="4" fill="#FF7EB6"/>'
  };

  /** look = { body, feet, acc } */
  function charSVG(look, width, label) {
    const body = look.body || '#CDEBFF';
    const feet = look.feet || '#7FB8F0';
    const acc = look.acc || 'none';
    const w = width || 56;
    const h = Math.round(w * 82 / 72);
    const antenna = !['crown', 'wizard', 'satgat'].includes(acc);
    const cat = acc === 'cat'
      ? `<polygon points="13,30 16,10 28,22" fill="${body}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><polygon points="51,30 48,10 36,22" fill="${body}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><polygon points="17,24 18,15 24,22" fill="#FF9EC4"/><polygon points="47,24 46,15 40,22" fill="#FF9EC4"/>`
      : '';
    const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
    return `<svg width="${w}" height="${h}" viewBox="-4 -6 72 82" ${a11y}>
      <ellipse cx="32" cy="72" rx="16" ry="3" fill="rgba(0,0,0,0.35)"/>
      <ellipse cx="23" cy="62" rx="6" ry="4" fill="${feet}"/><ellipse cx="41" cy="62" rx="6" ry="4" fill="${feet}"/>
      ${cat}
      <circle cx="32" cy="40" r="21" fill="${body}" stroke="#fff" stroke-width="2"/>
      ${antenna ? '<line x1="32" y1="19" x2="32" y2="9" stroke="#fff" stroke-width="2"/><polygon points="32,1 34.4,6 39.8,6.4 35.7,9.9 37,15.2 32,12.3 27,15.2 28.3,9.9 24.2,6.4 29.6,6" fill="#FFD34D"/>' : ''}
      <ellipse cx="25" cy="39" rx="3.2" ry="4.2" fill="#1A2050"/><ellipse cx="39" cy="39" rx="3.2" ry="4.2" fill="#1A2050"/>
      <circle cx="26" cy="37.5" r="1.1" fill="#fff"/><circle cx="40" cy="37.5" r="1.1" fill="#fff"/>
      <ellipse cx="20" cy="46" rx="3.5" ry="2" fill="#FF9EC4" opacity="0.8"/><ellipse cx="44" cy="46" rx="3.5" ry="2" fill="#FF9EC4" opacity="0.8"/>
      <path d="M28 47 Q32 51 36 47" fill="none" stroke="#1A2050" stroke-width="2" stroke-linecap="round"/>
      ${ACC[acc] || ''}
    </svg>`;
  }

  /** 지금 착용한 모습 (장식 칸 + 몸 색 칸) */
  function currentLook() {
    const items = WT.data.shop;
    const eq = WT.store.state.equip;
    const acc = items.find((i) => i.id === eq.acc) || items[0];
    const color = eq.color ? items.find((i) => i.id === eq.color) : null;
    return { acc: acc.acc, body: color ? color.body : acc.body, feet: color ? color.feet : acc.feet };
  }

  window.WT = window.WT || {};
  WT.charSVG = charSVG;
  WT.currentLook = currentLook;
})();
