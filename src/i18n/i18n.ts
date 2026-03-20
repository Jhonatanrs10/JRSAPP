import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Importe seus arquivos JSON
import en from './locales/en.json';
import pt from './locales/pt.json';

const resources = {
  en: { translation: en },
  pt: { translation: pt },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    // Detecta o idioma do sistema (ex: pt-BR vira pt)
    lng: Localization.getLocales()[0].languageCode ?? 'en',
    fallbackLng: 'en', // Idioma padrão caso o do sistema não exista
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;