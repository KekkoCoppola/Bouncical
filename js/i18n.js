// ScrollStudio family i18n: Italian is written in the HTML, English sits next to it in
// data-en (text) and data-en-<attribute>. The choice is shared with the hub through the same key.
// Text built in JS: read window.ssLang() and re-render on the "ss:lang" event.
(() => {
  'use strict';

  const LANG_KEY = 'scrollstudio-lang';
  const TRANSLATED_ATTRS = ['aria-label', 'aria-roledescription', 'content', 'placeholder', 'title'];
  let lang = 'it';

  function setLanguage(next) {
    lang = next === 'en' ? 'en' : 'it';
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en]').forEach((el) => {
      if (el.dataset.it === undefined) el.dataset.it = el.textContent;
      el.textContent = el.dataset[lang];
    });
    TRANSLATED_ATTRS.forEach((attr) => {
      document.querySelectorAll(`[data-en-${attr}]`).forEach((el) => {
        if (!el.hasAttribute(`data-it-${attr}`)) el.setAttribute(`data-it-${attr}`, el.getAttribute(attr) ?? '');
        el.setAttribute(attr, el.getAttribute(`data-${lang}-${attr}`));
      });
    });
    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    });
    document.dispatchEvent(new CustomEvent('ss:lang', { detail: { lang } }));
  }

  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      setLanguage(button.dataset.lang);
      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch (e) {
        // storage blocked: the choice lasts for this visit only
      }
    });
  });

  let saved = null;
  try {
    saved = localStorage.getItem(LANG_KEY);
  } catch (e) {
    // storage blocked: stay on Italian
  }
  if (saved === 'en') setLanguage('en');

  window.ssLang = () => lang;
  window.ssSetLanguage = setLanguage;
})();
