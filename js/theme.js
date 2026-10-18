// ScrollStudio family theme: light or dark, written on <html data-theme>.
// Load it synchronously in <head>, after <meta name="theme-color"> and before the stylesheets,
// so a dark page never flashes light. The choice is shared with the hub through the same key;
// with no choice the page follows the system and keeps following it until the user picks one.
// JS that draws with interface colours: read window.ssTheme() and re-render on the "ss:theme" event.
(() => {
  'use strict';

  const THEME_KEY = 'scrollstudio-theme';
  // --wall-top of tokens.css, used for <meta name="theme-color"> while the stylesheets are not loaded yet
  const WALL_TOP = { light: '#E9E9E8', dark: '#2C2C2B' };
  const root = document.documentElement;
  const system = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let theme = 'light';
  let chosen = false;

  function saved() {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null; // storage blocked: follow the system
    }
  }

  function systemTheme() {
    return system && system.matches ? 'dark' : 'light';
  }

  // Browser bar colour and the pressed state of every switch on the page
  function sync() {
    const wall = getComputedStyle(root).getPropertyValue('--wall-top').trim() || WALL_TOP[theme];
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', wall));
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });
  }

  function apply(next, silent) {
    theme = next === 'dark' ? 'dark' : 'light';
    root.dataset.theme = theme;
    sync();
    if (!silent) document.dispatchEvent(new CustomEvent('ss:theme', { detail: { theme } }));
  }

  function setTheme(next) {
    chosen = true;
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // storage blocked: the choice lasts for this visit only
    }
  }

  const initial = saved();
  chosen = initial !== null;
  apply(initial || systemTheme(), true);

  // No choice yet: follow the system when it switches
  if (system) {
    const follow = () => {
      if (!chosen) apply(systemTheme());
    };
    if (system.addEventListener) system.addEventListener('change', follow);
    else if (system.addListener) system.addListener(follow);
  }

  // Another tab of the family (same origin) changed the theme
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    const value = saved();
    chosen = value !== null;
    apply(value || systemTheme());
  });

  // One listener for every switch, also those created later (a modal)
  document.addEventListener('click', (event) => {
    const button = event.target.closest ? event.target.closest('[data-theme-choice]') : null;
    if (button) setTheme(button.dataset.themeChoice);
  });

  // The switches in the HTML exist only once the document is parsed
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();

  window.ssTheme = () => theme;
  window.ssSetTheme = setTheme;
})();
