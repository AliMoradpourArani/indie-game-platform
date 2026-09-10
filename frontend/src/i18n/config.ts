import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en/common.json';
import fa from './fa/common.json';

export type Locale = 'en' | 'fa';

const stored = (localStorage.getItem('locale') as Locale | null) ?? 'en';

void i18n.use(initReactI18next).init({
  resources: { en: { common: en }, fa: { common: fa } },
  lng: stored,
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
  localStorage.setItem('locale', locale);
}

applyLocale(stored);

export default i18n;
