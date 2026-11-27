/* 프롬프트 라이브러리 — 렌더 · 필터 · 검색 · 복사 · 보내기
   1회차(prompts-day1.js)와 2회차(prompts.js)가 함께 씁니다.
   데이터 파일이 window.PROMPTS 와 window.CAT_ORDER 를 정의합니다. */
(function () {
  var DATA = window.PROMPTS || [];
  var CATS = window.CAT_ORDER || [
    { key: 'setup',  name: '설정 · 질문법' },
    { key: 'target', name: '타깃 · 프로젝트 · 대본' },
    { key: 'media',  name: '이미지 · Flow · 음원' },
    { key: 'wrap',   name: '마무리' },
    { key: 'bonus',  name: '보너스 · 이미지 · 바이브 코딩' }
  ];

  /* ---------- 유틸 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function rich(s) {                       /* **굵게** + [ ] 강조 */
    var out = esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\[([^\]\n]{1,120})\]/g, '<span class="var">[$1]</span>');
    return out;
  }
  function isLong(t) { return encodeURIComponent(t).length > 7000; }
  function gptHref(t) {
    return isLong(t) ? 'https://chatgpt.com/' : 'https://chatgpt.com/?q=' + encodeURIComponent(t);
  }

  /* ---------- 도구별 '보내기' 버튼 ---------- */
  var TARGETS = {
    chatgpt: { cls: 'gpt',   label: 'ChatGPT로 보내기', icon: 'gpt' },
    gemini:  { cls: 'gem',   label: 'Gemini로 보내기',  icon: 'gem',  url: 'https://gemini.google.com/app' },
    notebook:{ cls: 'gem',   label: '제미나이 노트북 열기', icon: 'gem', url: 'https://notebook.google.com' },
    claude:  { cls: 'claude', label: '클로드 열기',      icon: 'gem',  url: 'https://claude.ai/new' },
    vstory:  { cls: 'vstory', label: 'vStory 열기',      icon: 'flow', url: 'https://vstory.io' },
    flow:    { cls: 'flow',  label: '복사 후 Google Flow 열기', icon: 'flow', url: 'https://labs.google/fx/tools/flow' }
  };

  /* ---------- 토스트 ---------- */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function toast(msg, warn) {
    if (!toastEl) return;
    toastEl.className = 'toast' + (warn ? ' warn' : '');
    toastEl.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      (warn ? '<path d="M12 8v5M12 16.2v.3"/><circle cx="12" cy="12" r="9"/>'
            : '<path d="M20 6 9 17l-5-5"/>') + '</svg><span></span>';
    toastEl.querySelector('span').textContent = msg;
    void toastEl.offsetWidth;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 3200);
  }

  /* ---------- 클립보드 ---------- */
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; })
        .catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  /* ---------- 렌더 ---------- */
  var listEl = document.getElementById('list');
  var emptyEl = document.getElementById('empty');

  var ICON = {
    copy: '<path d="M9 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    gpt:  '<path d="M21 12a9 9 0 1 1-4.2-7.6"/><path d="M21 5v5h-5"/>',
    gem:  '<path d="M12 3l2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4z"/>',
    flow: '<path d="M12 3v18"/><path d="M3 12h18"/><path d="m6.4 6.4 11.2 11.2"/><path d="m17.6 6.4-11.2 11.2"/>',
    clip: '<path d="M21 11.5 12.5 20a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9"/>'
  };

  var BADGE = {
    '필수': 'must', '시연': 'demo', '보너스': 'bonus',
    '선택': 'opt', '대응': 'fix', '검수': 'chk'
  };
  var BADGE_TEXT = { demo: '시연·참고', bonus: '보너스', must: '필수', opt: '선택', fix: '대응', chk: '검수' };

  function badgeHTML(b) {
    var k = BADGE[b] || 'must';
    return '<span class="bdg ' + k + '">' + BADGE_TEXT[k] + '</span>';
  }

  function targetBtn(p) {
    if (!p.target || !TARGETS[p.target]) return '';
    var t = TARGETS[p.target];
    var href = p.target === 'chatgpt'
      ? 'https://chatgpt.com/' + (isLong(p.prompt) ? '' : '?q=' + encodeURIComponent(p.prompt))
      : t.url;
    return '<a class="abtn ' + t.cls + '" data-act="' + p.target + '" data-id="' + p.id + '" href="' + href +
      '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[t.icon] + '</svg>' +
      esc(t.label) + '</a>';
  }

  function cardHTML(p) {
    var tool = (p.tool === true || /^[GFM]/.test(p.id)) ? ' pid tool' : ' pid';

    var h = '<article class="pcard" id="' + p.id + '" data-id="' + p.id + '" data-cat="' + p.cat + '"' +
      (p.badge && p.badge !== '필수' ? ' data-opt="1"' : '') + '>' +
      '<div class="pcard-h">' +
        '<div class="pcard-top">' +
          '<span class="' + tool.trim() + '">' + esc(p.id) + '</span>' +
          '<span class="ppart">' + esc(p.part) + '</span>' + badgeHTML(p.badge) +
        '</div>' +
        '<h3>' + esc(p.title) + '</h3>' +
        (p.when ? '<div class="pwhen"><span class="lb">언제</span><span>' + rich(p.when) + '</span></div>' : '') +
        (p.success && p.success !== 'undefined' && p.success !== 'null'
          ? '<div class="succ"><span class="lb">성공</span><span>' + rich(p.success) + '</span></div>' : '') +
      '</div>' +

      (p.attach ? '<div class="patt"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.clip + '</svg>' +
        '<span>' + rich(p.attach) + '</span></div>' : '') +

      '<div class="pbox">' +
        '<div class="pbox-bar"><span class="tt">프롬프트 원문</span>' +
          '<button class="mini" data-mini="' + p.id + '">복사</button></div>' +
        '<pre tabindex="0">' + rich(p.prompt) + '</pre>' +
      '</div>';

    (p.variants || []).forEach(function (v, i) {
      h += '<div class="pvar"><div class="vl">' + esc(v.label || ('변형 ' + (i + 1))) + '</div>' +
        '<div class="pbox">' +
          '<div class="pbox-bar"><span class="tt">추가 프롬프트</span>' +
            '<button class="mini" data-var="' + p.id + ':' + i + '">복사</button></div>' +
          '<pre tabindex="0">' + rich(v.text) + '</pre>' +
        '</div></div>';
    });

    h += '<div class="ptip"><span><b>치환 팁</b> ' + rich(p.tip) + '</span></div>' +
      '<div class="pacts">' +
        '<button class="abtn copy" data-act="copy" data-id="' + p.id + '">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.copy + '</svg>전체 복사</button>' +
        (p.id === 'F1'
          ? '<a class="abtn flow" data-act="flow" data-id="' + p.id + '" href="https://labs.google/fx/tools/flow" target="_blank" rel="noopener">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.flow + '</svg>복사 후 Google Flow 열기</a>'
          : '') +
        targetBtn(p) +
        (!p.target
          ? '<a class="abtn gpt" data-act="gpt" data-id="' + p.id + '" href="' + gptHref(p.prompt) + '" target="_blank" rel="noopener">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.gpt + '</svg>ChatGPT로 보내기</a>' +
            '<a class="abtn gem" data-act="gem" data-id="' + p.id + '" href="https://gemini.google.com/app" target="_blank" rel="noopener">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.gem + '</svg>Gemini로 보내기</a>'
          : '') +
      '</div></article>';
    return h;
  }

  /* 4교시(제미나이 노트북) 섹션 머리 — 화면 3단 구조 안내 */
  var P4_NOTICE =
    '<div class="notice p4n">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>' +
      '<div><b>제미나이 노트북은 화면이 세 칸입니다 — 왼쪽 → 가운데 → 오른쪽 순서로만 진행합니다.</b><br>' +
        '<b>①</b> 왼쪽 [소스]에 회사 자료(PDF·웹주소) 먼저 추가 → ' +
        '<b>②</b> 가운데 [채팅]에서 요약 확인·질문 → ' +
        '<b>③</b> 오른쪽 [스튜디오]에서 N1·N2 실행' +
        '<span class="p4warn">소스 없이 오른쪽 [스튜디오]만 먼저 쓰면 작동하지 않습니다.</span></div>' +
    '</div>';

  /* 4교시 — 노트북에 먼저 넣을 '실습용 샘플 소스' 카드 */
  var ICON_DL = '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>';
  var ICON_OUT = '<path d="M14 4h5v5"/><path d="M19 4 11 12"/><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>';
  var P4_SOURCE =
    '<div class="psrc" id="p4src">' +
      '<div class="psrc-h">' +
        '<span class="psrc-badge">4교시 준비물</span>' +
        '<div><h3>실습용 샘플 소스 — 노트북 왼쪽 [+ 소스 추가]에 먼저 넣으세요</h3>' +
          '<p>우리 회사 자료가 없어도 그대로 실습할 수 있게 준비했습니다. 아래 <b>1번 PDF</b>나 <b>2번 웹주소</b> 중 하나만 넣어도 소스가 됩니다(2~5개 권장).' +
          ' 우리 회사 소개서·브로슈어가 있으면 그것을 쓰세요.</p></div>' +
      '</div>' +
      '<ol class="psrc-list">' +
        '<li class="psrc-item">' +
          '<span class="psrc-n">1</span>' +
          '<div class="psrc-t"><b>샘플 회사소개서 PDF (2쪽)</b>' +
            '<span>순창 바른발효농장 — 회사 개요 · 제품 3종 · 제조 공정 · 인증 · 연락처 (교육용 가상 기업)</span></div>' +
          '<div class="psrc-acts">' +
            '<a class="cpbtn pdf" href="files/%EC%88%9C%EC%B0%BD_%EB%B0%94%EB%A5%B8%EB%B0%9C%ED%9A%A8%EB%86%8D%EC%9E%A5_%ED%9A%8C%EC%82%AC%EC%86%8C%EA%B0%9C%EC%84%9C.pdf" download>' +
              '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON_DL + '</svg>PDF 내려받기</a>' +
            '<a class="cpbtn ghost" href="files/%EC%88%9C%EC%B0%BD_%EB%B0%94%EB%A5%B8%EB%B0%9C%ED%9A%A8%EB%86%8D%EC%9E%A5_%ED%9A%8C%EC%82%AC%EC%86%8C%EA%B0%9C%EC%84%9C.pdf" target="_blank" rel="noopener">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON_OUT + '</svg>미리 보기</a>' +
          '</div>' +
        '</li>' +
        '<li class="psrc-item">' +
          '<span class="psrc-n">2</span>' +
          '<div class="psrc-t"><b>웹사이트 주소 넣기</b>' +
            '<span>노트북 [소스 추가] → [웹사이트]에서 주소를 붙여넣습니다. 주소를 복사해 두고 쓰세요.</span></div>' +
          '<div class="psrc-acts">' +
            '<button class="cpbtn" data-cp="https://earnest-choux-e0530c.netlify.app/" data-cp-name="하이에듀 예시 사이트 주소">' +
              '하이에듀 예시 주소 복사</button>' +
            '<button class="cpbtn" data-cp="https://www.koat.or.kr" data-cp-name="한국농업기술진흥원 주소">' +
              '농진원 주소 복사</button>' +
          '</div>' +
        '</li>' +
        '<li class="psrc-item">' +
          '<span class="psrc-n">3</span>' +
          '<div class="psrc-t"><b>웹에서 검색(Discover) 키워드</b>' +
            '<span>노트북 [소스 추가] → [웹에서 검색]에 붙여넣으면 관련 자료를 찾아 소스로 넣습니다.</span></div>' +
          '<div class="psrc-acts">' +
            '<button class="cpbtn" data-cp="전북 그린바이오 산업 현황 농식품부 농진원" data-cp-name="검색 키워드">' +
              '키워드 복사</button>' +
          '</div>' +
        '</li>' +
      '</ol>' +
      '<p class="psrc-foot">소스를 넣으면 가운데 [채팅]에 요약이 생깁니다. 요약이 나온 뒤 오른쪽 [스튜디오]에서 <b>N1 동영상 개요</b>·<b>N2 슬라이드</b>를 실행하세요.</p>' +
    '</div>';

  var html = '';
  CATS.forEach(function (c) {
    var items = DATA.filter(function (p) { return p.cat === c.key; });
    if (!items.length) return;
    html += '<section class="pgroup" id="grp-' + esc(c.key) + '" data-group="' + c.key + '">' +
      '<div class="pgroup-h"><h2>' + esc(c.name) + '</h2><span class="rule"></span>' +
      '<span class="c">' + items.length + '종</span></div>' +
      (c.key === 'p4' ? P4_NOTICE + P4_SOURCE : '') +
      items.map(cardHTML).join('') + '</section>';
  });
  if (listEl) listEl.innerHTML = html;

  /* ---------- 필터 + 검색 ---------- */
  var tabs = [].slice.call(document.querySelectorAll('.tab'));
  var q = document.getElementById('q');
  var qBox = document.getElementById('searchBox');
  var qClear = document.getElementById('qClear');
  var state = { cat: 'all', q: '' };

  /* 탭 숫자를 데이터에서 다시 계산 */
  tabs.forEach(function (t) {
    var cat = t.getAttribute('data-cat');
    var n = DATA.filter(function (p) {
      if (cat === 'all') return true;
      if (cat === 'opt') return p.badge && p.badge !== '필수';
      return p.cat === cat;
    }).length;
    var cnt = t.querySelector('.cnt');
    if (cnt) cnt.textContent = n;
  });

  function apply() {
    var kw = state.q.trim().toLowerCase();
    var shown = 0;
    [].slice.call(listEl.querySelectorAll('.pgroup')).forEach(function (g) {
      var groupCat = g.getAttribute('data-group');
      var catOk = (state.cat === 'all' || state.cat === 'opt' || groupCat === state.cat);
      if (state.cat === 'opt') catOk = true;
      var visibleInGroup = 0;
      [].slice.call(g.querySelectorAll('.pcard')).forEach(function (card) {
        var p = DATA.filter(function (x) { return x.id === card.getAttribute('data-id'); })[0] || {};
        var hay = [p.id, p.title, p.part, p.when, p.tip, p.prompt, p.attach, (p.variants || []).map(function (v) { return v.label + ' ' + v.text; }).join(' ')]
          .join(' ').toLowerCase();
        var okCat = (state.cat === 'all') ? true
          : (state.cat === 'opt') ? (p.badge && p.badge !== '필수')
          : (groupCat === state.cat);
        var ok = okCat && (!kw || hay.indexOf(kw) !== -1);
        card.style.display = ok ? '' : 'none';
        if (ok) { visibleInGroup++; shown++; }
      });
      g.style.display = visibleInGroup ? '' : 'none';
      var cnt = g.querySelector('.pgroup-h .c');
      if (cnt) cnt.textContent = visibleInGroup + '종';
    });
    if (emptyEl) emptyEl.classList.toggle('on', shown === 0);
    if (qBox) qBox.classList.toggle('has', !!state.q);
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (o) { o.classList.remove('on'); o.setAttribute('aria-selected', 'false'); });
      t.classList.add('on'); t.setAttribute('aria-selected', 'true');
      state.cat = t.getAttribute('data-cat');
      apply();
    });
  });

  var deb = null;
  if (q) {
    q.addEventListener('input', function () {
      clearTimeout(deb);
      deb = setTimeout(function () { state.q = q.value; apply(); }, 120);
    });
  }
  if (qClear) {
    qClear.addEventListener('click', function () {
      q.value = ''; state.q = ''; apply(); q.focus();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!q) return;
    if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); }
    if (e.key === 'Escape' && document.activeElement === q) { q.value = ''; state.q = ''; apply(); q.blur(); }
  });

  /* ---------- 동작 ---------- */
  function get(id) { return DATA.filter(function (p) { return p.id === id; })[0]; }

  function flash(btn, label) {
    var old = btn.innerHTML;
    btn.classList.add('done');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' + (label || '복사됨');
    setTimeout(function () { btn.classList.remove('done'); btn.innerHTML = old; }, 1800);
  }

  var MSG = {
    chatgpt: '프롬프트를 복사했습니다. ChatGPT 창에 붙여넣기(Ctrl+V) 해 주세요.',
    gem: '복사되었습니다. Gemini 입력창에 붙여넣기(Ctrl+V) 해 주세요.',
    gemini: '복사되었습니다. Gemini 입력창에 붙여넣기(Ctrl+V) 해 주세요.',
    notebook: '복사되었습니다. 제미나이 노트북에서 왼쪽 소스를 먼저 추가한 뒤, 오른쪽 스튜디오 칸에 붙여넣기(Ctrl+V) 해 주세요.',
    claude: '복사되었습니다. 클로드 입력창에 붙여넣기(Ctrl+V) 해 주세요.',
    vstory: '복사되었습니다. vStory 요청 사항 칸에 붙여넣기(Ctrl+V) 해 주세요.',
    flow: '복사되었습니다. Google Flow가 열리면 프롬프트 칸에 붙여넣기(Ctrl+V) 해 주세요.'
  };

  if (listEl) listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button, a.abtn');
    if (!btn) return;

    /* 실습 소스 카드 — 주소·키워드 복사 */
    if (btn.hasAttribute('data-cp')) {
      var cpt = btn.getAttribute('data-cp');
      var cpn = btn.getAttribute('data-cp-name') || '주소';
      copy(cpt).then(function (ok) {
        if (ok) {
          flash(btn, '복사됨');
          toast(cpn + '를 복사했습니다. 제미나이 노트북 소스 칸에 붙여넣기(Ctrl+V) 하세요.');
        } else {
          toast('복사가 막혔습니다. 주소를 길게 눌러 직접 선택해 주세요.', true);
        }
      });
      return;
    }

    /* 카드 안 작은 복사 (원문 / 변형) */
    if (btn.hasAttribute('data-mini')) {
      var mp = get(btn.getAttribute('data-mini'));
      if (!mp) return;
      copy(mp.prompt).then(function (ok) {
        if (ok) { flash(btn, '복사됨'); toast(mp.id + ' 프롬프트를 복사했습니다.'); }
        else toast('복사가 막혔습니다. 원문을 길게 눌러 직접 선택해 주세요.', true);
      });
      return;
    }
    if (btn.hasAttribute('data-var')) {
      var ref = btn.getAttribute('data-var').split(':');
      var vp = get(ref[0]);
      if (!vp || !vp.variants[+ref[1]]) return;
      var vt = vp.variants[+ref[1]].text;
      copy(vt).then(function (ok) {
        if (ok) { flash(btn, '복사됨'); toast(vp.id + ' 추가 프롬프트를 복사했습니다.'); }
        else toast('복사가 막혔습니다. 원문을 길게 눌러 직접 선택해 주세요.', true);
      });
      return;
    }

    var act = btn.getAttribute('data-act');
    if (!act) return;
    var p = get(btn.getAttribute('data-id'));
    if (!p) return;
    var text = p.prompt;

    if (act === 'copy') {
      copy(text).then(function (ok) {
        if (ok) {
          flash(btn, '전체 복사됨');
          toast(p.id + ' 프롬프트를 복사했습니다. 입력창에 붙여넣기(Ctrl+V) 해 주세요.');
        } else {
          toast('복사가 막혔습니다. 원문을 길게 눌러 직접 선택해 주세요.', true);
        }
      });
      return;
    }

    if (act === 'gpt' || act === 'chatgpt') {
      var long = isLong(text);
      copy(text);
      toast(long
        ? '프롬프트가 길어 ChatGPT만 열었습니다. 복사된 내용을 입력창에 붙여넣기(Ctrl+V) 해 주세요.'
        : MSG.chatgpt);
      return;
    }

    if (MSG[act]) { copy(text); toast(MSG[act]); return; }
  });

  apply();

  /* ---------- 교시 바로가기 바 ---------- */
  /* 화면 위에 붙어 있는 바(헤더·바로가기·도구 바)의 높이를 더해 목표물이 가리지 않게 한다 */
  function stickyStack() {
    var off = 0;
    ['.site-head', '.jumpbar', '.toolbar'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      if (window.getComputedStyle(el).position === 'sticky') off += el.getBoundingClientRect().height;
    });
    return off + 14;
  }
  function smoothTo(el) {
    var y = el.getBoundingClientRect().top + window.pageYOffset - stickyStack();
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  var jbLinks = [].slice.call(document.querySelectorAll('.jumpbar .jb[href^="#"]'));
  var jbTargets = jbLinks.map(function (a) {
    return { a: a, el: document.getElementById(a.getAttribute('href').slice(1)) };
  }).filter(function (o) { return !!o.el; });

  function showAll() {
    state.cat = 'all';
    if (q) q.value = '';
    state.q = '';
    tabs.forEach(function (t, i) {
      var on = t.getAttribute('data-cat') === 'all';
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    apply();
  }

  jbLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      userMoved = true;
      if (target.classList.contains('pgroup') && target.style.display === 'none') showAll();
      if (target.classList.contains('pcard') && target.style.display === 'none') showAll();
      smoothTo(target);
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      else location.hash = id;
    });
  });

  /* 지금 보고 있는 교시를 바로가기 바에 표시 */
  var jbRaf = false;
  function syncJb() {
    jbRaf = false;
    var line = stickyStack() + 56, cur = null;
    jbTargets.forEach(function (o) {
      if (o.el.style.display === 'none') return;
      if (o.el.getBoundingClientRect().top <= line) cur = o.a;
    });
    if (window.pageYOffset < 40) cur = null;
    jbLinks.forEach(function (a) { a.classList.toggle('on', a === cur); });
  }
  window.addEventListener('scroll', function () {
    if (!jbRaf) { jbRaf = true; window.requestAnimationFrame(syncJb); }
  }, { passive: true });
  window.addEventListener('resize', syncJb);
  syncJb();

  /* #K4 처럼 해시로 들어오면 카드가 그려진 뒤 그 자리로 이동
     (카드가 스크립트로 그려지므로 브라우저 기본 앵커 이동이 실패한다) */
  function jumpToHash(smooth) {
    if (!location.hash || location.hash.length < 2) return;
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    var off = stickyStack();
    var y = target.getBoundingClientRect().top + window.pageYOffset - off;
    var root = document.documentElement;
    var prev = root.style.scrollBehavior;
    if (!smooth) root.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.max(0, y));
    if (!smooth) root.style.scrollBehavior = prev;
  }
  jumpToHash(false);
  /* 사진·영상이 늦게 자리를 잡아 목표가 밀리는 경우를 한 번 더 맞춘다 */
  var userMoved = false;
  ['wheel', 'touchmove', 'pointerdown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { userMoved = true; }, { passive: true, once: true });
  });
  function ensureHash() {
    if (userMoved || !location.hash || location.hash.length < 2) return;
    var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!t) return;
    if (Math.abs(t.getBoundingClientRect().top - stickyStack()) > 24) jumpToHash(false);
  }
  window.addEventListener('load', function () {
    setTimeout(function () { jumpToHash(false); }, 60);
    setTimeout(function () { jumpToHash(false); }, 320);
    setTimeout(ensureHash, 700);
    setTimeout(ensureHash, 1400);
    setTimeout(ensureHash, 2400);
  });
  window.addEventListener('hashchange', function () { setTimeout(function () { jumpToHash(true); }, 40); });

  /* 모바일 메뉴 */
  var toggle = document.getElementById('navToggle');
  var mnav = document.getElementById('mobileNav');
  if (toggle && mnav) {
    toggle.addEventListener('click', function () {
      var open = mnav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
  }
})();
