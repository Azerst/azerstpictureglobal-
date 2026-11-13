/* GUARD — Phát hiện vi phạm, hiện cảnh báo 3s rồi reload */
(function () {
  'use strict';

  const RELOAD_DELAY = 3;
  const LONG_PRESS_MS = 800;

  const GUARD_MESSAGES = {
    longpress: { code: 'ERR 800 // LONG-PRESS DETECTED', title: 'PHÁT HIỆN GIỮ MÀN HÌNH', subtitle: '▸ HÀNH VI ĐÁNG NGỜ ◂', desc: 'Bạn đã giữ màn hình quá lâu. Đây là hành vi bị nghi ngờ. Trang sẽ tự tải lại sau:' },
    devtools:  { code: 'ERR 403 // DEVTOOLS DETECTED',   title: 'PHÁT HIỆN DEVTOOLS',       subtitle: '▸ CÔNG CỤ NHÀ PHÁT TRIỂN ◂', desc: 'DevTools đang mở. Vui lòng đóng để tiếp tục sử dụng trang web.' },
    f12:       { code: 'ERR 403 // F12 BLOCKED',         title: 'PHÍM F12 BỊ CHẶN',         subtitle: '▸ PHÍM TẮT BỊ VÔ HIỆU ◂', desc: 'Phím F12 đã bị vô hiệu hóa trên trang này. Trang sẽ tự tải lại sau:' },
    shortcut:  { code: 'ERR 403 // HOTKEY BLOCKED',      title: 'PHÍM TẮT BỊ CHẶN',         subtitle: '▸ PHÍM TẮT BỊ VÔ HIỆU ◂', desc: 'Tổ hợp phím này đã bị chặn trên trang. Trang sẽ tự tải lại sau:' },
    source:    { code: 'ERR 403 // VIEW-SOURCE BLOCKED', title: 'XEM MÃ NGUỒN BỊ CHẶN',      subtitle: '▸ HÀNH VI SAO CHÉP ◂',   desc: 'Không thể xem mã nguồn trang. Trang sẽ tự tải lại sau:' },
    copy:      { code: 'ERR 403 // COPY BLOCKED',        title: 'SAO CHÉP BỊ CHẶN',          subtitle: '▸ BẢO VỆ NỘI DUNG ◂',   desc: 'Hành động sao chép đã bị chặn. Trang sẽ tự tải lại sau:' },
    default:   { code: 'ERR 403 // FORBIDDEN ACCESS',    title: 'TRUY CẬP TRÁI PHÉP',        subtitle: '▸ HỆ THỐNG BẢO VỆ ◂',   desc: 'Hệ thống đã phát hiện hành vi can thiệp. Vui lòng dừng lại.' }
  };

  let triggered = false;
  let countdownTimer = null;
  let overlayEl, countdownEl, secondsEl, codeEl, titleEl, subtitleEl, descEl;

  function ensureRefs() {
    if (overlayEl) return;
    overlayEl   = document.getElementById('guardOverlay');
    countdownEl = document.getElementById('guardCountdown');
    secondsEl   = document.getElementById('guardSeconds');
    codeEl      = document.getElementById('guardErrorCode');
    titleEl     = document.getElementById('guardTitle');
    subtitleEl  = document.getElementById('guardSubtitle');
    descEl      = document.getElementById('guardDesc');
  }

  function reloadPage() {
    try {
      const base = location.href.split('#')[0].split('?')[0];
      location.replace(base + '?_=' + Date.now());
    } catch (e) {
      location.reload();
    }
  }

  function triggerGuard(type) {
    if (triggered) return;
    triggered = true;
    ensureRefs();

    const key = GUARD_MESSAGES[type] ? type : 'default';
    const msg = GUARD_MESSAGES[key];

    if (overlayEl) {
      overlayEl.dataset.type = key;
      overlayEl.classList.add('is-show');
      overlayEl.setAttribute('aria-hidden', 'false');
    }
    if (codeEl)     codeEl.textContent = msg.code;
    if (titleEl) {
      titleEl.textContent = msg.title;
      titleEl.setAttribute('data-text', msg.title);
    }
    if (subtitleEl) subtitleEl.textContent = msg.subtitle;
    if (descEl)     descEl.textContent = msg.desc;

    let count = RELOAD_DELAY;
    if (countdownEl) countdownEl.textContent = count;
    if (secondsEl)   secondsEl.textContent   = count;

    countdownTimer = setInterval(() => {
      count--;
      if (countdownEl) countdownEl.textContent = count <= 0 ? 0 : count;
      if (secondsEl)   secondsEl.textContent   = count <= 0 ? 0 : count;
      if (count <= 0) {
        clearInterval(countdownTimer);
        reloadPage();
      }
    }, 1000);
  }

  /* Chặn phím tắt */
  document.addEventListener('keydown', (e) => {
    const k = (e.key || '').toLowerCase();
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    const inField = tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable);

    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault(); e.stopPropagation();
      triggerGuard('f12'); return false;
    }
    if (e.ctrlKey && e.shiftKey && ['i','j','c','k','e','m'].includes(k)) {
      e.preventDefault(); e.stopPropagation();
      triggerGuard('devtools'); return false;
    }
    if (e.metaKey && e.altKey && ['i','j','c'].includes(k)) {
      e.preventDefault(); e.stopPropagation();
      triggerGuard('devtools'); return false;
    }
    if ((e.ctrlKey || e.metaKey) && k === 'u') {
      e.preventDefault(); e.stopPropagation();
      triggerGuard('source'); return false;
    }
    if ((e.ctrlKey || e.metaKey) && k === 's') {
      e.preventDefault(); e.stopPropagation();
      triggerGuard('shortcut'); return false;
    }
    if ((e.ctrlKey || e.metaKey) && ['c','x','a'].includes(k) && !inField) {
      e.preventDefault();
    }
  }, true);

  /* Chặn menu chuột phải */
  document.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });

  /* Chặn copy/cut/drag */
  ['copy','cut','selectstart','dragstart'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
    }, { passive: false });
  });

  /* Long-press 800ms → vàng */
  (function initLongPress() {
    let pressTimer = null, startX = 0, startY = 0, isPressing = false;
    const MOVE_TOLERANCE = 12;

    const isInteractive = (el) => {
      if (!el) return false;
      let node = el;
      while (node && node !== document.body) {
        const tag = (node.tagName || '').toLowerCase();
        if (['button','a','img','svg','input','textarea','select'].includes(tag)) return true;
        if (node.isContentEditable) return true;
        if (node.classList && (
          node.classList.contains('modal') ||
          node.classList.contains('modal-inner') ||
          node.classList.contains('toast') ||
          node.classList.contains('tab') ||
          node.classList.contains('guard-overlay')
        )) return true;
        node = node.parentElement;
      }
      return false;
    };

    const clear = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      isPressing = false;
    };

    const start = (x, y, target) => {
      if (isInteractive(target)) return;
      clear();
      isPressing = true;
      startX = x; startY = y;
      pressTimer = setTimeout(() => {
        if (!isPressing) return;
        isPressing = false;
        try { if (navigator.vibrate) navigator.vibrate([40, 30, 40]); } catch (e) {}
        triggerGuard('longpress');
      }, LONG_PRESS_MS);
    };

    const move = (x, y) => {
      if (!isPressing) return;
      if (Math.abs(x - startX) > MOVE_TOLERANCE || Math.abs(y - startY) > MOVE_TOLERANCE) clear();
    };

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { clear(); return; }
      start(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1) { clear(); return; }
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    document.addEventListener('touchend',    clear, { passive: true });
    document.addEventListener('touchcancel', clear, { passive: true });

    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      start(e.clientX, e.clientY, e.target);
    });
    document.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    document.addEventListener('mouseup',    clear);
    document.addEventListener('mouseleave', clear);
  })();

  /* Detect DevTools */
  const isDesktop = window.matchMedia('(pointer:fine)').matches;
  if (isDesktop) {
    setInterval(() => {
      if (triggered) return;
      const wDiff = window.outerWidth  - window.innerWidth;
      const hDiff = window.outerHeight - window.innerHeight;
      if (wDiff > 260 || hDiff > 260) triggerGuard('devtools');
    }, 1000);

    setInterval(() => {
      if (triggered) return;
      const t0 = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const t1 = performance.now();
      if (t1 - t0 > 200) triggerGuard('devtools');
    }, 2500);

    try {
      const bait = /./;
      bait.toString = function () {
        if (!triggered) triggerGuard('devtools');
        return '';
      };
      setInterval(() => {
        if (triggered) return;
        // eslint-disable-next-line no-console
        console.log('%c', bait);
      }, 3000);
    } catch (e) { /* ignore */ }

    try {
      const trap = {};
      Object.defineProperty(trap, 'id', {
        get() {
          if (!triggered) triggerGuard('devtools');
          return '';
        }
      });
      setInterval(() => {
        if (triggered) return;
        // eslint-disable-next-line no-console
        console.log(trap);
      }, 4000);
    } catch (e) { /* ignore */ }
  }

  window.addEventListener('beforeunload', () => {
    if (countdownTimer) clearInterval(countdownTimer);
  });

})();
