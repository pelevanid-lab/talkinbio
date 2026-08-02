import type { SauleCueKey } from './core';

export const SAULE_CUE_TEXTS: Record<SauleCueKey, Record<'tr' | 'en' | 'ru', string>> = {
  welcome: {
    tr: 'Merhaba. Buradayım, nasıl yardımcı olabilirim?',
    en: 'Hello. I am here, how can I help?',
    ru: 'Здравствуйте. Я здесь, чем могу помочь?',
  },
  opening_section: {
    tr: 'İlgili yeri açıyorum.',
    en: 'Opening the right place.',
    ru: 'Открываю нужный раздел.',
  },
  showing_item: {
    tr: 'Tam olarak ilgili detayı gösteriyorum.',
    en: 'Showing the exact detail.',
    ru: 'Показываю нужную деталь.',
  },
  showing_written_answer: {
    tr: 'Bunu sana yazılı olarak iletiyorum.',
    en: 'I am writing this out for you.',
    ru: 'Я передаю это письменно.',
  },
  showing_contact: {
    tr: 'Ulaşabileceğin yeri gösteriyorum.',
    en: 'Showing where you can reach them.',
    ru: 'Показываю, где можно связаться.',
  },
  opening_lead_form: {
    tr: 'Bilgilerini bırakabileceğin alanı açıyorum.',
    en: 'Opening the place where you can leave your details.',
    ru: 'Открываю форму для ваших данных.',
  },
  information_unavailable: {
    tr: 'Bu bilgi sayfada yok, seni doğru kanala yönlendiriyorum.',
    en: 'This information is not on the page, I am pointing you to the right channel.',
    ru: 'Этой информации нет на странице, я направлю вас в нужный канал.',
  },
  voice_limit_reached: {
    tr: 'Sesli görüşme sınırına ulaştık.',
    en: 'We reached the voice message limit.',
    ru: 'Мы достигли лимита голосового общения.',
  },
  session_limit_reached: {
    tr: 'Bu oturumun mesaj sınırına ulaştık.',
    en: 'This session has reached its message limit.',
    ru: 'Этот сеанс достиг лимита сообщений.',
  },
  thank_you: {
    tr: 'Teşekkürler, kaydettim.',
    en: 'Thank you, I saved it.',
    ru: 'Спасибо, я сохранила.',
  },
};

export function getSauleCueText(cueKey: SauleCueKey, locale: 'tr' | 'en' | 'ru'): string {
  return SAULE_CUE_TEXTS[cueKey][locale];
}
