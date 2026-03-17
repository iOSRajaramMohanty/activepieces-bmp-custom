/**
 * Entry point for browser bundle - sets locales path before loading SDK.
 * When loaded via script tag, i18next fetches translations from
 * {script-base-path}/locales/{{lng}}/{{ns}}.json
 *
 * Import SDK isolation styles FIRST to reset host framework styles (Bootstrap, etc.)
 * Then import web global styles (Tailwind, fonts, theme) so the SDK has proper styling
 * when embedded in host apps. The main web app loads these via HTML link; the SDK
 * must import them into the bundle.
 *
 * @license MIT
 */

// Import SDK isolation styles FIRST - resets Bootstrap/Foundation/Bulma styles
// This must come before styles.css so Tailwind utilities are applied on top
import './styles/sdk-isolation.css';

// Import web global styles (Tailwind, fonts, theme)
import '../../../web/src/styles.css';

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
