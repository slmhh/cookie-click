(() => {
  'use strict';

  const ZH_KEYWORDS = ['接受', '同意', '允许', '我知道了', '确认', '好的'];
  const EN_KEYWORDS = ['accept', 'agree', 'got it', 'allow', 'understand', 'fine', 'sure', 'ok'];
  const NEGATIONS = ['不接受', '不同意', '拒绝', '不', 'reject', 'decline', 'deny', 'never', 'ignore', 'dismiss', 'no thanks'];
  const EN_NEGATIONS = ['don', 'won', 'do not'];
  const FOOD_KEYWORDS = ['曲奇饼', '曲奇', '饼干', '小甜饼', 'cookie', 'biscuit'];
  const BANNER_HINTS = ['cookie', 'consent', 'gdpr', 'modal', 'banner', 'dialog', 'notice', 'privacy', 'ccpa', 'cookie-banner', 'cookie-consent'];

  const COOKIE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48">' +
    '<circle cx="32" cy="32" r="26" fill="#D89B5F" stroke="#A96E2F" stroke-width="3"/>' +
    '<circle cx="24" cy="24" r="3.2" fill="#5C3A1E"/>' +
    '<circle cx="40" cy="20" r="3" fill="#5C3A1E"/>' +
    '<circle cx="34" cy="34" r="3.4" fill="#5C3A1E"/>' +
    '<circle cx="23" cy="38" r="2.8" fill="#5C3A1E"/>' +
    '<circle cx="42" cy="42" r="3" fill="#5C3A1E"/></svg>';

  let lastDrop = 0;

  function visibleText(el) {
    if (el.tagName === 'INPUT') {
      return ((el.value || '') + ' ' + (el.getAttribute('aria-label') || '')).trim();
    }
    return (el.textContent || '').trim();
  }

  function isNegated(text) {
    if (NEGATIONS.some(function (n) { return text.includes(n); })) return true;
    return EN_NEGATIONS.some(function (n) {
      return new RegExp('\\b' + n + '\\b').test(text);
    });
  }

  function matchesEn(text) {
    return EN_KEYWORDS.some(function (k) {
      var esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|[\\s,.;:!?()/&])' + esc + '($|[\\s,.;:!?()/&])').test(text);
    });
  }

  function matchesZh(text) {
    return ZH_KEYWORDS.some(function (k) { return text.includes(k); });
  }

  function isInBanner(el) {
    var node = el;
    while (node && node !== document.documentElement) {
      if (node.nodeType === 1) {
        var hint = (String(node.className || '') + ' ' + String(node.id || '')).toLowerCase();
        if (BANNER_HINTS.some(function (h) { return hint.includes(h); })) return true;
        if (window.getComputedStyle(node).position === 'fixed') {
          var r = node.getBoundingClientRect();
          if (r.width < window.innerWidth * 0.9 && r.height < window.innerHeight * 0.9) return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  function matchesAcceptButton(el) {
    if (!el || !el.closest) return false;
    var target = el.closest('button, a, input[type="button"], input[type="submit"], [role="button"]');
    if (!target || !target.isConnected) return false;
    var text = visibleText(target).toLowerCase();
    if (!text || text.length > 60) return false;
    if (isNegated(text)) return false;
    var zh = matchesZh(text);
    var en = matchesEn(text);
    if (!zh && !en) return false;
    if (isInBanner(target)) return true;
    return text.length <= 12;
  }

  function matchesFoodWord(el) {
    if (!el || el.nodeType !== 1) return false;
    var node = el;
    for (var depth = 0; node && node.nodeType === 1 && depth < 4; depth++) {
      var text = (node.textContent || '').trim().toLowerCase();
      if (text.length > 0 && text.length <= 100) {
        for (var i = 0; i < FOOD_KEYWORDS.length; i++) {
          if (text.includes(FOOD_KEYWORDS[i])) return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  function dropCookie(count) {
    try {
      var holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:2147483647;';
      var style = document.createElement('style');
      style.textContent = '@keyframes cc-fall{0%{transform:translateY(0) rotate(0deg);opacity:1}75%{opacity:1}100%{transform:translateY(calc(100vh - 55px)) rotate(400deg);opacity:0}}';
      holder.appendChild(style);
      var maxDelay = 0;
      for (var i = 0; i < count; i++) {
        var delay = Math.round(Math.random() * 900);
        if (delay > maxDelay) maxDelay = delay;
        var cookie = document.createElement('div');
        cookie.style.cssText = 'position:absolute;top:-60px;left:' + Math.min(window.innerWidth - 64, Math.random() * (window.innerWidth - 64)) + 'px;animation:cc-fall 1.2s ease-in ' + delay + 'ms forwards;';
        cookie.innerHTML = COOKIE_SVG;
        holder.appendChild(cookie);
      }
      document.documentElement.appendChild(holder);
      setTimeout(function () { holder.remove(); }, 1300 + maxDelay + 200);
    } catch (e) {}
  }

  function recordCookie(amount) {
    try {
      chrome.storage.local.get({ total: 0 }, function (data) {
        chrome.storage.local.set({ total: (data.total || 0) + amount }, function () {});
      });
    } catch (e) {}
  }

  document.addEventListener('click', function (event) {
    var now = Date.now();
    if (now - lastDrop < 500) return;
    var isAccept = matchesAcceptButton(event.target);
    var isFood = !isAccept && matchesFoodWord(event.target);
    if (!isAccept && !isFood) return;
    lastDrop = now;
    dropCookie(isAccept ? 15 : 1);
    recordCookie(isAccept ? 15 : 1);
  }, true);
})();
