import { ref } from 'vue'

export type Language = 'vi' | 'en'

const currentLanguage = ref<Language>((localStorage.getItem('lang') as Language) || 'vi')

export function useLanguage() {
  function setLanguage(lang: Language) {
    currentLanguage.value = lang
    localStorage.setItem('lang', lang)
  }
  
  function t(vi: string, en: string): string {
    return currentLanguage.value === 'vi' ? vi : en
  }

  return {
    currentLanguage,
    setLanguage,
    t,
  }
}

export { currentLanguage }
