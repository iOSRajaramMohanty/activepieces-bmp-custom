/**
 * Entry point for browser bundle - sets locales path before loading SDK.
 * When loaded via script tag, i18next fetches translations from
 * {script-base-path}/locales/{{lng}}/{{ns}}.json
 *
 * @license MIT
 */
if (typeof document !== 'undefined' && document.currentScript) {
  try {
    const el = document.currentScript as HTMLScriptElement;
    const url = new URL(el.src);
    const path = url.pathname.replace(/\/[^/]*$/, '/');
    (window as unknown as { __ACTIVEPIECES_SDK_LOCALES_PATH__?: string }).__ACTIVEPIECES_SDK_LOCALES_PATH__ =
      path + 'locales/{{lng}}/{{ns}}.json';
  } catch {
    /* ignore */
  }
}

export * from './index.browser';
