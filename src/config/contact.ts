// Centralized official WhatsApp contact configuration.
// EVERY public registration CTA must go through getWhatsAppRegistrationUrl —
// never hardcode wa.me links in components.
import type { Lang } from '@/i18n'

export const WHATSAPP_NUMBER = '212708818882' // +212 708 81 88 82
export const WHATSAPP_DISPLAY = '+212 708 818 882'

const registrationMessages: Record<Lang, string> = {
  ar: 'السلام عليكم، أرغب في إنشاء حساب على منصة Academic Profile.\nالمرجو التواصل معي لتوضيح المعلومات اللازمة وإنشاء موقعي الأكاديمي.',
  fr: 'Bonjour, je souhaite créer un compte Academic Profile.\nMerci de m’indiquer les informations nécessaires pour créer mon site web académique.',
  en: 'Hello, I would like to create an Academic Profile account.\nPlease provide me with the necessary information and help me set up my academic website.',
}

export function getWhatsAppRegistrationMessage(lang: Lang): string {
  return registrationMessages[lang] ?? registrationMessages.en
}

export function getWhatsAppRegistrationUrl(lang: Lang): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(getWhatsAppRegistrationMessage(lang))}`
}
