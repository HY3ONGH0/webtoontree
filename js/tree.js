/* 장르 트리 화면: 별자리 노드, 캐릭터 이동, 상세 창(감상 진행 · 별점 · 댓글), 잠금 해제 */
(function () {
  const esc = WT.esc;
  const STAGE_W = 1000, STAGE_H = 560;

  function view(params) {
    const trees = WT.data.trees;
    const live = WT.liveGenres().map((x) => x.id);
    if (!live.length) { document.getElementById('app').innerHTML = '<div class="view" style="align-items:center; justify-content:center; padding:40px; text-align:center"><p>아직 트리가 준비되지 않았어요.</p><a class="btn press" href="#/">홈으로</a></div>'; return; }
    const gid = live.includes(params[0]) ? params[0] : live[0];
    const g = WT.genre(gid);
    const T = trees[gid];
    const ids = Object.keys(T.nodes).filter((id) => WT.toon(id));
    const S = WT.store.state;
    const rules = WT.settings().coins;
    const labels = WT.settings().labels || {};
    const hasChar = !!S.profile;

    let sel = null;
    const server = WT.api.on();
    const social = {};          // 웹툰ID → { avg, count, comments } (서버 모드)
    let charAt = T.start;
    let facing = 1;
    const sigs = {};

    // ---------- 상태 계산 ----------
    const total = (id) => WT.eps(WT.toon(id));
    const newEps = (id) => (S.rewarded[id + ':done'] && ep(id) < total(id) ? total(id) - ep(id) : 0);
    const ep = (id) => Math.min(total(id), S.progress[id] || 0);
    const isDone = (id) => ep(id) >= total(id);
    const status = (id) => {
      if (isDone(id)) return 'done';
      if (ep(id) > 0) return 'reading';
      if (id === T.start || S.unlocked[id]) return 'open';
      return T.links.some((l) => l.to === id && isDone(l.from)) ? 'open' : 'locked';
    };
    const pct = (id) => Math.round(ep(id) / total(id) * 100);
    const sizeOf = (id) => (id === T.start ? 108 : 86);
    const statusText = { done: labels.done || '완독', reading: '보는 중', open: '안 봄', locked: '잠김' };

    // ---------- 그리기 ----------
    function fireHTML(f) {
      const embers = [[0.25, -0.2, 0], [0.6, -0.3, 0.6], [0.82, -0.1, 1], [0.05, -0.45, 0.3], [0.95, -0.5, 1.3]]
        .map(([x, y, d], i) => `<span class="ember" style="left:${f * x}px; top:${f * y}px; width:${6 - (i % 3)}px; height:${6 - (i % 3)}px; animation-delay:${d}s; animation-duration:${1.4 + (i % 3) * 0.25}s"></span>`).join('');
      return `<span class="fire" aria-hidden="true" style="left:0; top:0">
        <span class="glow" style="left:${-f * 0.55}px; top:${-f * 0.55}px; width:${f * 2.1}px; height:${f * 2.1}px"></span>
        <span class="outer" style="left:${-f * 0.6}px; top:${-f * 1.25}px; width:${f * 2.2}px; height:${f * 2.4}px"></span>
        <span class="inner" style="left:${-f * 0.1}px; top:${-f * 0.8}px; width:${f * 1.2}px; height:${f * 1.5}px"></span>
        ${embers}
      </span>`;
    }

    function nodeInner(id) {
      const w = WT.toon(id);
      const st = status(id);
      const sz = sizeOf(id);
      const hot = WT.isHot(id) && st !== 'locked';
      let sub = newEps(id) ? `새 화 ${newEps(id)}개` : st === 'reading' ? `${ep(id)}화 · ${pct(id)}%` : statusText[st];
      if (hot) sub = `오늘 폭주 · ${sub}`;
      // 제목 아래에는 꼭 필요한 것만 (읽는 중 진행률, 새 화, 폭주). 안 봄·잠김·완독은 원 모양으로 보여 줘요
      const showSub = hot || newEps(id) || st === 'reading';
      const subCls = hot ? 'hot' : st === 'reading' ? 'reading' : st === 'done' ? 'done' : '';
      const cover = w.cover ? `<img class="cover" src="${esc(w.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.nextElementSibling.hidden = false; this.remove()">` : '';
      return `<div class="node-box${st === 'locked' ? ' is-locked' : ''}" style="--sz:${sz}px">
          ${hot ? fireHTML(sz) : ''}
          ${st === 'locked' ? '<span class="shackle" aria-hidden="true"></span>' : ''}
          ${st !== 'locked' ? `<span class="ring" style="--sz:${sz}px; --pct:${pct(id)}%"></span>` : ''}
          <button type="button" class="node st-${st}${hot ? ' is-hot' : ''}${sel === id ? ' is-sel' : ''}" style="--sz:${sz}px" data-node="${id}"
            aria-label="${esc(w.title)}, ${esc(sub)}, ${esc(WT.schedule.label(w))}${w.recommended ? ', 관리자 강추' : ''}">
            ${cover}<span class="letter" ${w.cover ? 'hidden' : ''}>${esc(w.title[0])}</span>
            ${st === 'done' ? `<span class="badge-done" aria-hidden="true">${WT.icon.check}</span>` : ''}
            ${st === 'locked' ? '<span class="keyhole" aria-hidden="true"><i></i></span>' : ''}
          </button>
          ${w.recommended ? `<span class="badge-rec" aria-hidden="true">${WT.icon.star}</span>` : ''}
          <span class="node-tag tag-${WT.schedule.status(w)}" aria-hidden="true">${esc(WT.schedule.label(w))}</span>
        </div>
        <span class="node-label${st === 'locked' ? ' dim' : ''}">${esc(w.title)}</span>
        ${showSub ? `<span class="node-sub ${subCls}">${esc(sub)}</span>` : ''}`;
    }

    function linkHTML(l, i) {
      const a = T.nodes[l.from], b = T.nodes[l.to];
      if (!a || !b) return '';
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      return `<div class="link" data-link="${i}" aria-hidden="true" style="left:${a[0]}px; top:${a[1] - 1.5}px; width:${len}px; transform:rotate(${ang}deg)"></div>
        <div class="ldot" data-dot="${i}" aria-hidden="true" style="left:${(a[0] + b[0]) / 2 - 6}px; top:${(a[1] + b[1]) / 2 - 6}px"></div>`;
    }

    const counts = () => {
      const d = ids.filter(isDone).length;
      const r = ids.filter((id) => status(id) === 'reading').length;
      return { d, r };
    };

    const c0 = counts();
    document.getElementById('app').innerHTML = `<div class="view" style="--gc:${g.color}">
      <div class="topbar">
        <div class="left">
          <a href="#/" class="icon-btn press" aria-label="홈으로">${WT.icon.back}</a>
          <div class="title-block">
            <div style="display:flex; align-items:baseline; gap:10px; flex-wrap:wrap">
              <h1 style="color:${g.color}">${esc(g.name)}</h1>
              <span class="sub">${esc(g.constellation || '')} · ${esc(g.desc)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap">
              <div class="progress" role="progressbar" aria-label="장르 진행률" aria-valuemin="0" aria-valuemax="${ids.length}" aria-valuenow="${c0.d}"><div id="prog-bar" style="width:${c0.d / ids.length * 100}%"></div></div>
              <span id="prog-text" style="font-size:13px; color:var(--gold); font-weight:700">${c0.d} / ${ids.length} ${esc(labels.done || '완독')} · 보는 중 ${c0.r}</span>
              <span class="legend"><span>${WT.icon.starSmall}관리자 강추</span><span>${WT.icon.flame}오늘 폭주</span></span>
            </div>
          </div>
        </div>
        ${WT.topRight()}
      </div>
      <main class="tree-main">
        <div class="stage-wrap stage-anim" id="wrap">
          <div class="stage" id="stage">
            ${T.links.map(linkHTML).join('')}
            ${ids.map((id) => {
              const [x, y] = T.nodes[id];
              return `<div class="node-wrap" data-wrap="${id}" style="left:${x - 75}px; top:${y - sizeOf(id) / 2}px"></div>`;
            }).join('')}
            ${hasChar ? `<div class="char" id="char" aria-hidden="true"><div class="hop" id="hop"><div class="flip" id="flip"><div class="bob">${WT.charSVG(WT.currentLook(), 56)}</div></div></div><span class="bubble" id="bubble">어디로 갈까?</span></div>` : ''}
          </div>
        </div>
        <div id="panel-slot"></div>
      </main>
      ${WT.band(gid)}
    </div>`;

    const stage = document.getElementById('stage');
    const wrap = document.getElementById('wrap');
    const slot = document.getElementById('panel-slot');

    function refreshNodes(force) {
      ids.forEach((id) => {
        const sig = [status(id), ep(id), sel === id, WT.isHot(id)].join('|');
        if (!force && sigs[id] === sig) return;
        sigs[id] = sig;
        stage.querySelector(`[data-wrap="${id}"]`).innerHTML = nodeInner(id);
      });
      T.links.forEach((l, i) => {
        const both = isDone(l.from) && isDone(l.to);
        const one = isDone(l.from) || isDone(l.to);
        const cls = both ? 'lit' : one ? 'half' : '';
        const ln = stage.querySelector(`[data-link="${i}"]`);
        const dt = stage.querySelector(`[data-dot="${i}"]`);
        if (ln) { ln.classList.remove('lit', 'half'); if (cls) ln.classList.add(cls); }
        if (dt) { dt.classList.remove('lit', 'half'); if (cls) dt.classList.add(cls); }
      });
      const c = counts();
      document.getElementById('prog-bar').style.width = `${c.d / ids.length * 100}%`;
      document.getElementById('prog-text').textContent = `${c.d} / ${ids.length} ${labels.done || '완독'} · 보는 중 ${c.r}`;
    }

    function fit() {
      const w = wrap.clientWidth || STAGE_W;
      const sc = Math.min(1, w / STAGE_W);
      stage.style.transform = `scale(${sc})`;
      wrap.style.height = `${STAGE_H * sc}px`;
    }

    function animateNode(id, extra) {
      const btn = stage.querySelector(`[data-node="${id}"]`);
      if (!btn) return;
      btn.classList.remove('pop', 'gold', 'burst');
      void btn.offsetWidth;
      btn.classList.add('pop');
      if (extra) btn.classList.add(extra);
      const box = btn.parentElement;
      const rp = document.createElement('span');
      rp.className = 'ripple';
      rp.style.cssText = `width:${sizeOf(id)}px; height:${sizeOf(id)}px; inset:auto; left:0; top:0; border-color:${extra === 'gold' ? '#FFE29A' : g.color}`;
      box.insertBefore(rp, btn);
      setTimeout(() => rp.remove(), 750);
    }

    function flashLinks(id) {
      T.links.forEach((l, i) => {
        if (l.from !== id && l.to !== id) return;
        const ln = stage.querySelector(`[data-link="${i}"]`);
        if (!ln) return;
        ln.classList.remove('flash'); void ln.offsetWidth;
        ln.style.animationDelay = l.from === id ? '.25s' : '0s';
        ln.classList.add('flash');
      });
    }

    function bubbleText(id) {
      if (!id) return '어디로 갈까?';
      const st = status(id);
      return st === 'locked' ? '잠겨 있어!' : st === 'done' ? '다 봤다!' : st === 'reading' ? '이어서 보자!' : '이거 볼래?';
    }

    function moveChar(id, jump) {
      if (!hasChar) return;
      const el = document.getElementById('char');
      const [x, y] = T.nodes[id] || T.nodes[T.start];
      const prev = T.nodes[charAt] || T.nodes[T.start];
      if (x !== prev[0]) facing = x < prev[0] ? -1 : 1;
      charAt = id;
      el.style.left = `${x + 24}px`;
      el.style.top = `${y - sizeOf(id) / 2 - 40}px`;
      document.getElementById('flip').style.transform = `scaleX(${facing})`;
      const hop = document.getElementById('hop');
      if (jump) { hop.classList.remove('go'); void hop.offsetWidth; hop.classList.add('go'); }
      const b = document.getElementById('bubble');
      b.textContent = bubbleText(sel);
      b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    }

    // ---------- 상세 창 ----------
    function panelHTML(id) {
      const w = WT.toon(id);
      const st = status(id);
      const e = ep(id), t = total(id), p = pct(id);
      const done = isDone(id);
      const my = S.ratings[id] || 0;
      const list = S.comments[id] || [];
      const nexts = T.links.filter((l) => l.from === id && WT.toon(l.to));
      const genreNames = (w.genres || []).map((x) => (WT.genre(x) || {}).name).filter(Boolean).join(' · ');
      const goLabel = done ? '다시 보러 가기' : e > 0 ? `${e + 1}화 이어 보기` : '1화 보러 가기';
      const tone = w.color || WT.color.cached(w.cover);
      return `<aside class="panel rpg anim${tone ? ' toned' : ''}" style="${tone ? WT.color.styleOf(tone) : ''}" aria-label="${esc(w.title)} 정보"><span class="tone" aria-hidden="true"></span><span class="bloom" aria-hidden="true"></span><span class="corner-b" aria-hidden="true"></span>
        <div class="cover-rect${w.cover ? '' : ' empty'}">
          ${w.cover ? `<img src="${esc(w.cover)}" alt="${esc(w.title)} 표지" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('empty', 'broken'); this.remove()">` : ''}
          <span class="cover-letter${w.cover ? ' fallback' : ''}" aria-hidden="true">${esc(w.title[0] || '?')}</span>
          <button type="button" class="icon-btn press cover-close" data-act="close" aria-label="창 닫기">${WT.icon.close}</button>
        </div>
        <div class="panel-head">
          <div style="display:flex; flex-direction:column; gap:6px; min-width:0">
            <div class="chips">
              ${w.recommended ? '<span class="chip chip-rec">★ 관리자 강추</span>' : ''}
              ${WT.isHot(id) ? '<span class="chip chip-hot">오늘 폭주 중</span>' : ''}
              <span class="chip chip-${st}">${statusText[st]}</span>
              ${newEps(id) ? `<span class="chip chip-new">새 화 ${newEps(id)}개</span>` : ''}
              ${WT.schedule.status(w) === 'hiatus' ? '<span class="chip chip-hiatus">휴재 중</span>' : ''}
            </div>
            <h2>${esc(w.title)}</h2>
            <span style="font-size:13px; color:var(--soft)">${server ? (social[id] ? (social[id].count ? `평균 별점 ★ ${social[id].avg} · ${social[id].count}명` : '아직 별점이 없어요') : '별점 불러오는 중…') : (my ? `내 별점 ${my}점` : '아직 별점을 주지 않았어요')}</span>
          </div>
        </div>
        <div class="divider"></div>
        <dl class="meta">
          <dt>작가</dt><dd>${esc(w.author)}</dd>
          <dt>플랫폼</dt><dd>${esc(w.platform)}</dd>
          <dt>연재</dt><dd><span class="node-tag tag-${WT.schedule.status(w)}" style="font-size:13px">${esc(WT.schedule.label(w))}</span></dd>
          <dt>장르</dt><dd>${esc(genreNames)}</dd>
          ${(w.tags || []).length ? `<dt>태그</dt><dd style="color:${g.color}">${w.tags.map((x) => '#' + esc(x)).join(' ')}</dd>` : ''}
        </dl>
        <p class="desc">${esc(w.desc)}</p>
        ${st === 'locked' ? `<div class="box box-warn">
          <p class="warn">이어진 이전 웹툰을 먼저 보면 더 재미있게 볼 수 있어요. 건너뛰고 싶다면 잠금을 풀 수 있어요.</p>
          <button type="button" class="btn btn-soft press" data-act="unlock">잠금 해제하기</button>
        </div>` : ''}
        <section class="box" aria-label="감상 진행">
          <div style="display:flex; justify-content:space-between; align-items:baseline">
            <span class="box-title">감상 진행</span>
            <span style="font-size:13px"><b style="font-size:18px">${e}</b>화 / ${t}화 · ${p}%</span>
          </div>
          <div class="bar" role="progressbar" aria-label="감상 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><div style="width:${p}%"></div></div>
          <div class="stepper">
            <button type="button" class="press" data-act="minus" aria-label="한 화 빼기">−</button>
            <label for="ep-in" class="sr">본 화수</label>
            <input id="ep-in" class="fld" type="number" inputmode="numeric" min="0" max="${t}" value="${e}">
            <button type="button" class="press" data-act="plus" aria-label="한 화 더하기">+</button>
          </div>
          ${WT.canEarn() ? `<span class="hint">1화 기록할 때마다 코인 +${rules.perEpisode} (하루 ${rules.dailyEpisodeCap}개까지) · ${esc(labels.done || '완독')}하면 +${rules.completeBonus}</span>` : '<span class="hint">닉네임으로 시작하면 기록할 때마다 코인을 받아요</span>'}
          <div class="row2">
            <a class="btn btn-line press" href="${esc(w.url)}" target="_blank" rel="noopener">${goLabel}</a>
            <button type="button" class="btn ${done ? 'btn-soft' : 'btn-gold'} press" data-act="done">${done ? `${esc(labels.done || '완독')} · 취소` : esc(labels.doneButton || '다 봤어요')}</button>
          </div>
          ${server && WT.schedule.status(w) !== 'completed' ? '<button type="button" class="btn press" data-act="report" style="min-height:40px; font-size:13px; font-weight:500">플랫폼에 새 화가 나왔는데 여기 화수가 적어요</button>' : ''}
        </section>
        <div class="box box-gold">
          <span class="box-title">내 별점</span>
          ${S.profile ? `<div class="stars" role="radiogroup" aria-label="별점 주기">
            ${[1, 2, 3, 4, 5].map((v) => `<button type="button" role="radio" aria-checked="${v <= my}" aria-label="${v}점" class="${v <= my ? 'on' : ''}" data-rate="${v}">★</button>`).join('')}
            <span style="margin-left:8px; font-size:13px; color:var(--soft)">${my ? `${my}점을 줬어요` : '별을 눌러 평가해요'}</span>
          </div>
          ${server ? '' : '<span class="hint">평균 별점은 회원 기능이 열리면 함께 보여요</span>'}` : `<a href="#/login" class="btn press">${server ? '로그인하고 별점 남기기' : '닉네임으로 시작하고 별점 남기기'}</a>`}
        </div>
        ${nexts.length ? `<div style="display:flex; flex-direction:column; gap:8px">
          <span style="font-size:13px; color:var(--muted); font-weight:700">${esc(labels.nextList || '다음으로 이어지는 웹툰')}</span>
          ${nexts.map((l) => `<button type="button" class="next-btn" data-next="${l.to}"><b>${esc(WT.toon(l.to).title)}</b><span>${esc(l.why || '')}</span></button>`).join('')}
        </div>` : ''}
        <div class="comments">
          ${(() => {
            const sc = server ? social[id] : null;
            const items = server ? (sc ? sc.comments : null) : list.map((c) => ({ nickname: S.profile ? S.profile.nick : '', text: c.text, createdAt: c.at, mine: true, local: true }));
            const count = items ? items.length : 0;
            const form = S.profile ? `<form style="display:flex; gap:8px" data-form="comment">
              <label for="cmt" class="sr">댓글 쓰기</label>
              <input id="cmt" class="fld" maxlength="200" placeholder="한 줄 감상을 남겨 보세요">
              <button type="submit" class="btn press" style="background:${g.color}; color:#07122E; border:none; flex:0 0 auto">등록</button>
            </form>${server ? '' : '<span class="hint">지금은 이 기기에만 저장돼요. 회원 기능이 열리면 다른 사람과 함께 보여요.</span>'}`
              : `<a href="#/login" class="btn press">${server ? '로그인하고 댓글 쓰기' : '닉네임으로 시작하고 댓글 쓰기'}</a>`;
            const when = (t) => { const m = String(t).match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${Number(m[1])}월 ${Number(m[2])}일` : esc(t); };
            const rows = items === null ? '<span class="hint">댓글 불러오는 중…</span>'
              : count ? items.map((c) => `<div class="cm"><span class="avatar" style="width:28px; height:28px; font-size:12px" aria-hidden="true">${esc((c.nickname || '?')[0])}</span>
                <div style="flex:1 1 auto; min-width:0"><div class="who"><b>${esc(c.nickname)}</b> · ${c.local ? esc(c.createdAt) : when(c.createdAt)}</div><div class="txt">${esc(c.text)}</div></div>
                ${c.mine && !c.local ? `<button type="button" class="icon-btn" data-delc="${esc(c.commentId)}" aria-label="내 댓글 지우기" style="width:36px; height:36px; background:transparent; flex:0 0 auto">${WT.icon.close}</button>` : ''}</div>`).join('')
              : (S.profile ? '<span style="font-size:13px; color:#7F8BB0">아직 댓글이 없어요. 첫 감상을 남겨 주세요.</span>' : '<span style="font-size:13px; color:#7F8BB0">아직 댓글이 없어요.</span>');
            return `<span style="font-size:13px; color:var(--muted); font-weight:700">댓글 ${items === null ? '' : count}</span>${form}${rows}`;
          })()}
        </div>
      </aside>`;
    }

    // 표지 색이 상세 창에 번져요: 저장된 색(관리자 화면에서 자동으로 뽑힘)이 없으면 여기서 뽑아요
    function bloom(panel) {
      panel.classList.remove('blooming');
      void panel.offsetWidth;
      panel.classList.add('blooming');
    }
    function renderPanel(animate) {
      if (!sel) { slot.innerHTML = ''; fit(); return; }
      slot.innerHTML = panelHTML(sel);
      const panel = slot.querySelector('.panel');
      if (!animate) panel.classList.remove('anim');
      else if (panel.classList.contains('toned')) bloom(panel);
      const w = WT.toon(sel);
      if (!panel.classList.contains('toned') && w.cover) {
        const id = sel;
        WT.color.extract(w.cover).then((c) => {
          const p = slot.querySelector('.panel');
          if (!c || sel !== id || !p || p.classList.contains('toned')) return;
          p.setAttribute('style', WT.color.styleOf(c));
          p.classList.add('toned');
          bloom(p);
        });
      }
      fit();
    }

    function select(id, opts) {
      const o = opts || {};
      if (!WT.toon(id) || !T.nodes[id]) return;
      sel = id;
      refreshNodes();
      animateNode(id);
      WT.api.fire('view', { webtoonId: id, viewerId: WT.api.viewerId() });
      if (server) loadSocial(id);
      moveChar(id, true);
      renderPanel(true);
      if (!o.keepHash) history.replaceState(null, '', `#/tree/${gid}/${id}`);
      if (window.innerWidth <= 900) {
        const p = slot.querySelector('.panel');
        if (p) p.scrollTop = 0;
      }
    }

    function close() {
      sel = null;
      refreshNodes();
      renderPanel(false);
      moveChar(charAt, false);
      history.replaceState(null, '', `#/tree/${gid}`);
    }

    async function loadSocial(id) {
      try {
        const r = await WT.api.call('social', { webtoonId: id, token: S.token || '' });
        social[id] = r.social;
      } catch (e) { social[id] = { avg: 0, count: 0, comments: [] }; }
      if (sel === id) renderPanel(false);
    }

    function setEp(id, value) {
      const useServer = server && !!S.token;
      const r = WT.store.recordEpisodes(id, value, total(id), rules, WT.canEarn() && !useServer);
      if (useServer) {
        WT.api.authed('progress', { webtoonId: id, value: S.progress[id] }).then((x) => {
          WT.api.applyMe(x.me);
          if (x.label) WT.popCoin(x.label); else WT.popCoin('');
          if (sel === id) renderPanel(false);
        }).catch((e) => { if (!e.auth) WT.toast(e.message); });
      }
      refreshNodes();
      renderPanel(false);
      if (r.label) WT.popCoin(r.label);
      if (r.completed) {
        animateNode(id, 'gold');
        flashLinks(id);
        if (!WT.canEarn()) WT.toast(`${WT.toon(id).title} ${labels.done || '완독'}!`);
      }
      moveChar(charAt, false);
    }

    function openUnlock(id) {
      const price = rules.unlockPrice;
      const canPay = WT.canEarn() && S.coins >= price;
      const coinLabel = !WT.canEarn() ? '닉네임으로 시작하면 코인을 쓸 수 있어요' : canPay ? `코인 ${price}개로 잠금 해제 (보유 ${S.coins})` : `코인이 부족해요 (${price}개 필요 · 보유 ${S.coins})`;
      WT.modal(`<div class="modal rpg" role="dialog" aria-modal="true" aria-labelledby="ul-title"><span class="corner-b" aria-hidden="true"></span>
        <div style="display:flex; align-items:center; gap:12px">
          <span style="width:48px; height:48px; border-radius:50%; background:#2A3456; display:flex; align-items:center; justify-content:center">${WT.icon.lockBig}</span>
          <div style="display:flex; flex-direction:column; gap:2px"><h3 id="ul-title">잠금 해제</h3><span class="hint">${esc(WT.toon(id).title)}의 잠금을 풉니다</span></div>
        </div>
        <button type="button" class="btn ${canPay ? 'btn-coin' : ''} press" data-m="coin" ${canPay ? '' : 'disabled'} style="min-height:52px"><span class="coin" aria-hidden="true" style="width:26px; height:26px">C</span>${coinLabel}</button>
        <div class="or">또는 관리자</div>
        <div class="field">
          ${server && S.role === 'admin' && S.token ? `<input id="admin-pw" type="hidden" value=""><button type="button" class="btn btn-gold press" data-m="admin">관리자 권한으로 해제</button>
          <p class="err" id="admin-err" role="alert" hidden></p>` : server ? `<label for="admin-pw">관리자 비밀번호</label><div style="display:flex; gap:8px"><input id="admin-pw" class="fld" type="password" autocomplete="off"><button type="button" class="btn btn-gold press" data-m="admin" style="flex:0 0 auto">해제</button></div>
          <p class="err" id="admin-err" role="alert" hidden></p>` : `<label for="admin-pw">관리자 비밀번호</label><input id="admin-pw" class="fld" type="password" disabled placeholder="서버 연결 후 사용할 수 있어요">
          <span class="hint">비밀번호 확인은 보안을 위해 Apps Script(서버)에서 해요. 연결하면 열립니다.</span>`}
        </div>
        <button type="button" class="btn press" data-m="cancel">닫기</button>
      </div>`, (bg, closeModal) => {
        bg.querySelector('[data-m="cancel"]').addEventListener('click', closeModal);
        const cb = bg.querySelector('[data-m="coin"]');
        const done = (label) => {
          closeModal();
          refreshNodes();
          renderPanel(false);
          if (label) WT.popCoin(label);
          animateNode(id, 'burst');
          moveChar(charAt, false);
        };
        const ab = bg.querySelector('[data-m="admin"]');
        if (ab) {
          const go = async () => {
            const err = bg.querySelector('#admin-err');
            ab.disabled = true;
            try {
              const r = await WT.api.call('unlockAdmin', { adminPassword: bg.querySelector('#admin-pw').value, webtoonId: id, token: S.token || '' });
              if (r.me) WT.api.applyMe(r.me); else { S.unlocked[id] = true; WT.store.save(); }
              done('');
            } catch (x) {
              err.hidden = false; err.textContent = x.message; ab.disabled = false;
              const m = bg.querySelector('.modal'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
            }
          };
          ab.addEventListener('click', go);
          bg.querySelector('#admin-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        }
        if (cb) cb.addEventListener('click', async () => {
          if (!(WT.canEarn() && S.coins >= price)) return;
          if (server && S.token) {
            cb.disabled = true;
            try { const r = await WT.api.authed('unlockCoin', { webtoonId: id }); WT.api.applyMe(r.me); done(`-${price} 코인 · 잠금 해제`); }
            catch (x) { cb.disabled = false; if (!x.auth) WT.toast(x.message); }
            return;
          }
          S.coins -= price;
          S.unlocked[id] = true;
          WT.store.save();
          closeModal();
          refreshNodes();
          renderPanel(false);
          WT.popCoin(`-${price} 코인 · 잠금 해제`);
          animateNode(id, 'burst');
          moveChar(charAt, false);
        });
      });
    }

    // ---------- 이벤트 ----------
    stage.addEventListener('click', (e) => {
      const b = e.target.closest('[data-node]');
      if (b) select(b.dataset.node);
    });
    slot.addEventListener('click', (e) => {
      const dc = e.target.closest('[data-delc]');
      if (dc && sel) {
        const id = sel;
        WT.api.authed('deleteComment', { commentId: dc.dataset.delc }).then((x) => { social[id] = x.social; if (sel === id) renderPanel(false); }).catch((er) => { if (!er.auth) WT.toast(er.message); });
        return;
      }
      const t = e.target.closest('[data-act], [data-rate], [data-next]');
      if (!t || !sel) return;
      if (t.dataset.next) return select(t.dataset.next);
      if (t.dataset.rate) {
        const v = Number(t.dataset.rate);
        S.ratings[sel] = v; WT.store.save(); renderPanel(false);
        if (server && S.token) {
          const id = sel;
          WT.api.authed('rate', { webtoonId: id, score: v }).then((x) => { WT.api.applyMe(x.me); social[id] = x.social; if (sel === id) renderPanel(false); }).catch((e) => { if (!e.auth) WT.toast(e.message); });
        }
        return;
      }
      const a = t.dataset.act;
      if (a === 'close') close();
      else if (a === 'minus') setEp(sel, ep(sel) - 1);
      else if (a === 'plus') setEp(sel, ep(sel) + 1);
      else if (a === 'done') setEp(sel, isDone(sel) ? 0 : total(sel));
      else if (a === 'unlock') openUnlock(sel);
      else if (a === 'report') {
        t.disabled = true;
        WT.api.call('report', { webtoonId: sel, viewerId: WT.api.viewerId() })
          .then((x) => { WT.toast(x.already ? '이미 알려 줬어요. 고마워요!' : '관리자에게 알렸어요. 고마워요!'); })
          .catch((e) => { WT.toast(e.message); t.disabled = false; });
      }
    });
    slot.addEventListener('change', (e) => {
      if (e.target.id === 'ep-in' && sel) setEp(sel, e.target.value);
    });
    slot.addEventListener('submit', (e) => {
      if (e.target.dataset.form !== 'comment' || !sel) return;
      e.preventDefault();
      const input = e.target.querySelector('#cmt');
      const text = input.value.trim().slice(0, 200);
      if (!text) return;
      if (server && S.token) {
        const id = sel;
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        WT.api.authed('comment', { webtoonId: id, text }).then((x) => { social[id] = x.social; if (sel === id) renderPanel(false); })
          .catch((er) => { btn.disabled = false; if (!er.auth) WT.toast(er.message); });
        return;
      }
      const d = new Date(Date.now() + 9 * 3600 * 1000);
      const at = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
      S.comments[sel] = [{ text, at }].concat(S.comments[sel] || []);
      WT.store.save();
      renderPanel(false);
    });

    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    WT.leaveView = () => {
      window.removeEventListener('resize', onResize);
      WT.onHashChange = null;
    };
    WT.onHashChange = () => {
      const parts = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
      if (parts[0] === 'tree' && parts[1] === gid) {
        if (parts[2] && parts[2] !== sel) select(parts[2], { keepHash: true });
        else if (!parts[2] && sel) close();
        return true;
      }
      return false;
    };

    refreshNodes(true);
    fit();
    if (hasChar) {
      const el = document.getElementById('char');
      el.style.transition = 'none';
      moveChar(charAt, false);
      void el.offsetWidth;
      el.style.transition = '';
    }
    if (params[1] && T.nodes[params[1]]) select(params[1], { keepHash: true });
  }

  WT.views.tree = view;
})();
