/* nrupalakolkar.com — chakra theme runtime.
 * The pre-paint snippet in <head> sets data-theme before first paint (no
 * FOUC); this file wires the header toggle, persists the choice in
 * localStorage ('nrupalakolkar-theme'), and keeps the theme-color meta in
 * sync. With no saved choice the pre-paint snippet honors
 * prefers-color-scheme; afterwards the saved choice always wins.
 */
(function () {
  'use strict';
  var KEY = 'nrupalakolkar-theme';
  var THEMES = ['dark', 'bright', 'night'];

  function themeColor(t) {
    var cs = getComputedStyle(document.documentElement).getPropertyValue('--theme-color');
    return (cs && cs.trim()) || (t === 'bright' ? '#faf8ff' : t === 'night' ? '#171119' : '#140b28');
  }

  function apply(t, persist) {
    if (THEMES.indexOf(t) === -1) t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
    if (persist) {
      try { localStorage.setItem(KEY, t); } catch (e) { /* private mode */ }
    }
    var mc = document.querySelector('meta[name="theme-color"]');
    if (mc) mc.setAttribute('content', themeColor(t));
    var btns = document.querySelectorAll('.chakra-theme-toggle button[data-set-theme]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-set-theme') === t ? 'true' : 'false');
    }
  }

  function init() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    apply(current, false);
    var btns = document.querySelectorAll('.chakra-theme-toggle button[data-set-theme]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        apply(this.getAttribute('data-set-theme'), true);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__chakraTheme = { apply: apply, key: KEY };
})();
