/* 캐릭터 "별똥이" (임시 디자인)
   나중에 직접 그린 그림(PNG/SVG)으로 바꿀 때는 이 파일의 charSVG 함수만 고치면 돼요. */
(function () {
  const ACC = {
    crown: '<polygon points="18,24 22,12 28,19 32,10 36,19 42,12 46,24" fill="#FFD34D" stroke="#C9A54C" stroke-width="1.2" stroke-linejoin="round"/>',
    wizard: '<polygon points="15,27 36,-4 49,27" fill="#7B5CFF" stroke="#B9A8FF" stroke-width="1.2" stroke-linejoin="round"/><rect x="15" y="22" width="34" height="5" rx="2" fill="#FFD34D"/><circle cx="36" cy="-3" r="2.6" fill="#FFE29A"/>',
    satgat: '<polygon points="2,28 32,10 62,28" fill="#D9B26A" stroke="#8A6A2E" stroke-width="1.4" stroke-linejoin="round"/><line x1="14" y1="28" x2="20" y2="50" stroke="#8A6A2E" stroke-width="1"/><line x1="50" y1="28" x2="44" y2="50" stroke="#8A6A2E" stroke-width="1"/>',
    phones: '<path d="M11 40 Q11 14 32 14 Q53 14 53 40" fill="none" stroke="#FF7EB6" stroke-width="4" stroke-linecap="round"/><rect x="6" y="34" width="9" height="15" rx="4" fill="#FF7EB6"/><rect x="49" y="34" width="9" height="15" rx="4" fill="#FF7EB6"/>',
    santa: '<path d="M14 26 Q30 -2 50 12 Q44 14 48 26 Z" fill="#E0383E"/><rect x="12" y="22" width="40" height="7" rx="3.5" fill="#fff"/><circle cx="51" cy="12" r="4.5" fill="#fff"/>',
    rudolph: '<path d="M20 22 q-8 -8 -6 -20 M17 12 q-6 -1 -9 -6 M44 22 q8 -8 6 -20 M47 12 q6 -1 9 -6" fill="none" stroke="#8A5A2B" stroke-width="3.2" stroke-linecap="round"/><circle cx="32" cy="44" r="4.2" fill="#E0383E"/>',
    pumpkin: '<ellipse cx="32" cy="15" rx="15" ry="10" fill="#F28C28"/><path d="M24 8 Q22 15 24 23 M32 5 V25 M40 8 Q42 15 40 23" stroke="#C96A12" stroke-width="1.4" fill="none"/><rect x="30" y="1" width="4" height="6" rx="1.5" fill="#4E8B3A"/>',
    witch: '<polygon points="16,26 34,-6 48,26" fill="#3A2A4A"/><ellipse cx="32" cy="25" rx="27" ry="5" fill="#3A2A4A"/><rect x="19" y="19" width="26" height="4.5" fill="#F28C28"/>',
    gat: '<ellipse cx="32" cy="23" rx="30" ry="5.5" fill="#22242C"/><rect x="21" y="6" width="22" height="17" rx="3" fill="#2E313B"/><rect x="21" y="18" width="22" height="3" fill="#C9A54C"/>',
    bok: '<path d="M22 24 Q14 10 32 8 Q50 10 42 24 Z" fill="#D93A4A"/><rect x="24" y="6" width="16" height="5" rx="2" fill="#F1B92E"/><text x="32" y="21" font-size="9" text-anchor="middle" fill="#F1B92E" font-weight="900">福</text>',
    jobawi: '<path d="M11 30 Q12 6 32 6 Q52 6 53 30 Q32 20 11 30z" fill="#C93A56"/><circle cx="32" cy="8" r="4" fill="#F1B92E"/><path d="M14 27 Q32 17 50 27" fill="none" stroke="#F1B92E" stroke-width="2"/>',
    ribbon: '<path d="M32 18 L18 9 V27 Z M32 18 L46 9 V27 Z" fill="#FF7EB6" stroke="#E0569A" stroke-width="1"/><circle cx="32" cy="18" r="4" fill="#FF9EC4"/>',
    shades: '<rect x="15" y="33" width="14" height="10" rx="4" fill="#1F2128"/><rect x="35" y="33" width="14" height="10" rx="4" fill="#1F2128"/><path d="M29 37 H35" stroke="#1F2128" stroke-width="2"/>',
    straw: '<ellipse cx="32" cy="23" rx="27" ry="5" fill="#E9C46A"/><path d="M17 23 Q32 -2 47 23 Z" fill="#F0D488"/><path d="M18 21 Q32 26 46 21" stroke="#E0565B" stroke-width="3.5" fill="none"/>',
    horn: '<path d="M18 22 Q12 8 22 6 Q20 14 26 18 Z M46 22 Q52 8 42 6 Q44 14 38 18 Z" fill="#8E44AD"/>',
    flower: '<g transform="translate(46 16)"><circle r="4" cx="0" cy="-6" fill="#FFB7D5"/><circle r="4" cx="6" cy="-2" fill="#FFB7D5"/><circle r="4" cx="4" cy="5" fill="#FFB7D5"/><circle r="4" cx="-4" cy="5" fill="#FFB7D5"/><circle r="4" cx="-6" cy="-2" fill="#FFB7D5"/><circle r="3.2" fill="#FFD34D"/></g>',
    halo: '<ellipse cx="32" cy="8" rx="14" ry="4" fill="none" stroke="#FFD34D" stroke-width="3"/>',
    cap: '<path d="M13 26 Q14 8 32 8 Q50 8 51 26 Z" fill="#3B82F6"/><path d="M46 24 Q60 24 62 30 Q52 30 44 28z" fill="#2563EB"/><circle cx="32" cy="8" r="2.5" fill="#fff"/>',
    beanie: '<path d="M13 28 Q14 6 32 6 Q50 6 51 28 Z" fill="#4E9B5A"/><rect x="12" y="23" width="40" height="7" rx="3" fill="#3C7F48"/><circle cx="32" cy="4" r="5" fill="#F4F1EA"/>',
    chef: '<rect x="20" y="16" width="24" height="10" fill="#fff" stroke="#DDD" stroke-width="1"/><circle cx="22" cy="12" r="8" fill="#fff"/><circle cx="32" cy="8" r="9" fill="#fff"/><circle cx="42" cy="12" r="8" fill="#fff"/>',
    grad: '<polygon points="32,6 58,16 32,26 6,16" fill="#22242C"/><rect x="22" y="18" width="20" height="8" fill="#2E313B"/><path d="M54 17 v12" stroke="#F1B92E" stroke-width="2"/><circle cx="54" cy="30" r="2.6" fill="#F1B92E"/>',
    sprout: '<path d="M32 20 V8" stroke="#4E9B5A" stroke-width="2.5"/><path d="M32 10 Q22 2 18 10 Q26 16 32 10z M32 10 Q42 2 46 10 Q38 16 32 10z" fill="#6DB277"/>',
    bunny: '<ellipse cx="22" cy="6" rx="6" ry="16" fill="#fff" stroke="#E8E4DA" stroke-width="1"/><ellipse cx="42" cy="6" rx="6" ry="16" fill="#fff" stroke="#E8E4DA" stroke-width="1"/><ellipse cx="22" cy="8" rx="2.6" ry="10" fill="#FFB7D5"/><ellipse cx="42" cy="8" rx="2.6" ry="10" fill="#FFB7D5"/>',
    snorkel: '<rect x="13" y="31" width="38" height="14" rx="7" fill="#7FD4FF" stroke="#1E8FC4" stroke-width="2.5" opacity=".9"/><path d="M53 36 V10 q0 -6 6 -6" fill="none" stroke="#F6922C" stroke-width="3.4" stroke-linecap="round"/>'
  };
  // 머리 위 별 더듬이를 가리는 장식
  const NO_ANTENNA = ['crown', 'wizard', 'satgat', 'santa', 'pumpkin', 'witch', 'gat', 'bok', 'jobawi', 'ribbon', 'straw', 'halo', 'cap', 'beanie', 'chef', 'grad', 'sprout', 'bunny'];
  // 관리자 화면에서 고를 때 보이는 이름
  const ACC_NAMES = { none: '없음 (별)', crown: '왕관', wizard: '마법사 모자', satgat: '삿갓', cat: '고양이 귀', phones: '헤드폰', santa: '산타 모자', rudolph: '루돌프 뿔', pumpkin: '호박 모자', witch: '마녀 모자', gat: '선비 갓', bok: '복주머니', jobawi: '조바위', ribbon: '리본', shades: '선글라스', straw: '밀짚모자', horn: '꼬마 뿔', flower: '꽃 핀', halo: '천사 고리', cap: '야구 모자', beanie: '털모자', chef: '요리사 모자', grad: '학사모', sprout: '새싹', bunny: '토끼 귀', snorkel: '스노클' };

  /** look = { body, feet, acc } */
  function charSVG(look, width, label) {
    const body = look.body || '#CDEBFF';
    const feet = look.feet || '#7FB8F0';
    const acc = look.acc || 'none';
    const w = width || 56;
    const h = Math.round(w * 82 / 72);
    const antenna = !NO_ANTENNA.includes(acc);
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
    return lookOf(eq);
  }
  /** 착용 정보(equip)로 캐릭터 모습 만들기 (랭킹 · 남의 프로필에서도 써요) */
  function lookOf(eq) {
    const items = WT.data.shop;
    const acc = items.find((i) => i.id === (eq && eq.acc) && (i.kind || 'acc') === 'acc') || items[0];
    const color = eq && eq.color ? items.find((i) => i.id === eq.color && i.kind === 'color') : null;
    return { acc: acc.acc, body: color ? color.body : acc.body, feet: color ? color.feet : acc.feet };
  }

  window.WT = window.WT || {};
  WT.charSVG = charSVG;
  WT.ACC_NAMES = ACC_NAMES;
  WT.currentLook = currentLook;
  WT.lookOf = lookOf;
})();
