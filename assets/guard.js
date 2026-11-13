/* GUARD — Detect violations, show warning 3s then reload */
(function () {
  'use strict';

  const RELOAD_DELAY = 3;
  const LONG_PRESS_MS = 800;

  const GUARD_MESSAGES = {
    longpress: {
      code: 'WARNING',
      title: 'LONG PRESS DETECTED',
      subtitle: '▸ SUSPICIOUS ACTIVITY ◂',
      desc: 'Long-press has been detected on this page. The page will reload shortly.'
    },
    devtools: {
      code: 'ACCESS DENIED',
      title: 'DEVTOOLS DETECTED',
      subtitle: '▸ DEVELOPER TOOLS OPEN ◂',
      desc: 'Please close DevTools to continue browsing the page.'
    },
    f12: {
      code: 'BLOCKED',
      title: 'F12 KEY DISABLED',
      subtitle: '▸ HOTKEY RESTRICTED ◂',
      desc: 'F12 has been disabled on this page. The page will reload shortly.'
    },
    shortcut: {
      code: 'BLOCKED',
      title: 'SHORTCUT DISABLED',
      subtitle: '▸ HOTKEY RESTRICTED ◂',
      desc: 'This keyboard shortcut has been restricted. The page will reload shortly.'
    },
    source: {
      code: 'ACCESS DENIED',
      title: 'SOURCE CODE LOCKED',
      subtitle: '▸ PROTECTED CONTENT ◂',
      desc: 'The page source cannot be viewed. The page will reload shortly.'
    },
    copy: {
      code: 'PROTECTED',
      title: 'COPY RESTRICTED',
      subtitle: '▸ CONTENT PROTECTED ◂',
      desc: 'Copy action has been blocked. The page will reload shortly.'
    },
    default: {
      code: 'WARNING',
      title: 'ACCESS DENIED',
      subtitle: '▸ SECURITY SYSTEM ◂',
      desc: 'Unauthorized access has been detected. The page will reload shortly.'
    }
  };

  let triggered = false;
  let countdownTimer = null;
  let overlayEl, countdownEl, secondsEl, codeEl, titleEl, subtitleEl, descEl;

  const baseDPR = window.devicePixelRatio || 1;

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

  /* Block hotkeys */
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

  /* Block context menu */
  document.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });

  /* Block copy/cut/drag */
  ['copy','cut','selectstart','dragstart'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
    }, { passive: false });
  });

  /* Long-press 800ms */
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

  /* Detect DevTools — FIX ZOOM BUG */
  const isDesktop = window.matchMedia('(pointer:fine)').matches;

  if (isDesktop) {
    setInterval(() => {
      if (triggered) return;

      /* Bỏ qua nếu đang zoom (DPR khác giá trị ban đầu) */
      const currentDPR = window.devicePixelRatio || 1;
      if (Math.abs(currentDPR - baseDPR) > 0.05) return;

      const wDiff = window.outerWidth  - window.innerWidth;
      const hDiff = window.outerHeight - window.innerHeight;
      if (wDiff > 300 || hDiff > 300) triggerGuard('devtools');
    }, 1500);

    setInterval(() => {
      if (triggered) return;
      const t0 = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const t1 = performance.now();
      if (t1 - t0 > 300) triggerGuard('devtools');
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
