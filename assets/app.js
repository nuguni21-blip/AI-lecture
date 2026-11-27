/* 교육 자료실 — 메뉴 · 스크롤 표시 */
(function () {
  var toggle = document.getElementById('navToggle');
  var mnav = document.getElementById('mobileNav');

  if (toggle && mnav) {
    toggle.addEventListener('click', function () {
      var open = mnav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        mnav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 바로가기 바 — 지금 보고 있는 항목을 표시
  var jbLinks = [].slice.call(document.querySelectorAll('.jumpbar .jb[href^="#"]'));
  if (jbLinks.length) {
    var raf = false;
    var stackH = function () {
      var h = 0;
      ['.site-head', '.jumpbar'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el && window.getComputedStyle(el).position === 'sticky') h += el.getBoundingClientRect().height;
      });
      return h;
    };
    var syncJb = function () {
      raf = false;
      var line = stackH() + 60, cur = null;
      jbLinks.forEach(function (a) {
        var el = document.getElementById(a.getAttribute('href').slice(1));
        if (el && el.getBoundingClientRect().top <= line) cur = a;
      });
      if (window.pageYOffset < 40) cur = null;
      jbLinks.forEach(function (a) { a.classList.toggle('on', a === cur); });
    };
    window.addEventListener('scroll', function () {
      if (!raf) { raf = true; window.requestAnimationFrame(syncJb); }
    }, { passive: true });
    window.addEventListener('resize', syncJb);
    syncJb();
  }

  // 현재 보고 있는 섹션을 메뉴에 표시 (data-spy 목록에서 자동 수집)
  var links = [].slice.call(document.querySelectorAll('.nav-link[data-spy]'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  var map = {};
  var ids = [];
  links.forEach(function (a) {
    var id = a.getAttribute('data-spy');
    map[id] = a;
    if (ids.indexOf(id) === -1) ids.push(id);
  });

  var visible = {};
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      visible[en.target.id] = en.isIntersecting;
    });
    var current = null;
    ids.forEach(function (id) {
      if (visible[id] && !current) current = id;
    });
    links.forEach(function (a) { a.classList.remove('on'); a.removeAttribute('aria-current'); });
    if (current && map[current]) {
      map[current].classList.add('on');
      map[current].setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) io.observe(el);
  });
})();
