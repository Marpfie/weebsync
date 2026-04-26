import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'

export const i18nReady = i18n.use(initReactI18next).init({
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    lng: 'en',
    resources: { en: { translation: en } },
})

export { default } from 'i18next'
