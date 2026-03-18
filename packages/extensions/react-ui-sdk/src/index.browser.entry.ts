/**
 * Entry point for browser bundle - sets locales path before loading SDK.
 * When loaded via script tag, i18next fetches translations from
 * {script-base-path}/locales/{{lng}}/{{ns}}.json
 *
 * Import web global styles (Tailwind, fonts, theme) FIRST so the SDK has proper
 * styling when embedded in host apps. The main web app loads these via HTML link;
 * the SDK must import them into the bundle.
 *
 * Then import SDK isolation styles LAST to override both host framework styles
 * (Bootstrap, etc.) AND Tailwind utilities for proper embedded appearance.
 *
 * @license MIT
 */

// Import web global styles FIRST (Tailwind, fonts, theme)
import '../../../web/src/styles.css';

// Import SDK isolation styles LAST - overrides host frameworks AND Tailwind for SDK context
// This must come AFTER styles.css so our !important overrides take effect
import './styles/sdk-isolation.css';

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
