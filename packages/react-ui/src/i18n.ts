import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';

import { LocalesEnum } from '@activepieces/shared';

// When embedded via SDK script tag, locales are loaded from the SDK path (e.g. /assets/sdk/locales/...)
const sdkLocalesPath =
  typeof window !== 'undefined' &&
  (window as unknown as { __ACTIVEPIECES_SDK_LOCALES_PATH__?: string })
    .__ACTIVEPIECES_SDK_LOCALES_PATH__;

i18n
  .use(ICU)
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    supportedLngs: Object.values(LocalesEnum),
    keySeparator: false,
    nsSeparator: false,
    returnEmptyString: false,
    backend: sdkLocalesPath ? { loadPath: sdkLocalesPath } : undefined,
  });
export default i18n;
