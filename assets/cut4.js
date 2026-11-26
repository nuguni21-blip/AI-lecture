/* 1교시 4컷 이미지 프롬프트 — 복사 버튼 (prompts.html 맨 앞 섹션 전용)
   <pre id="..."> 안의 글자를 그대로 복사합니다. */
(function () {
  var btns = [].slice.call(document.querySelectorAll('.cutlab [data-copy]'));
  if (!btns.length) return;

  var toastEl = document.getElementById('toast');
  var timer = null;
  function toast(msg, warn) {
    if (!toastEl) return;
    toastEl.className = 'toast' + (warn ? ' warn' : '');
    toastEl.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      (warn ? '<path d="M12 8v5M12 16.2v.3"/><circle cx="12" cy="12" r="9"/>'
            : '<path d="M20 6 9 17l-5-5"/>') + '</svg><span></span>';
    toastEl.querySelector('span').textContent = msg;
    void toastEl.offsetWidth;
    toastEl.classList.add('on');
    clearTimeout(timer);
    timer = setTimeout(function () { toastEl.classList.remove('on'); }, 3200);
  }

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

  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = document.getElementById(btn.getAttribute('data-copy'));
      if (!pre) return;
      var text = pre.textContent.replace(/\u00a0/g, ' ').trim();
      var label = btn.textContent;
      copy(text).then(function (ok) {
        if (!ok) {
          toast('복사가 막혔습니다. 프롬프트를 길게 눌러 직접 선택해 주세요.', true);
          return;
        }
        btn.classList.add('done');
        btn.textContent = '복사됨';
        setTimeout(function () {
          btn.classList.remove('done');
          btn.textContent = label;
        }, 1800);
        var cut = btn.closest('.cut');
        var name = cut ? cut.querySelector('.cn').textContent + ' ' + cut.querySelector('b').textContent : '';
        toast(name + ' 프롬프트를 복사했습니다. 피클 입력창에 붙여넣기 해 주세요.');
      });
    });
  });
})();
