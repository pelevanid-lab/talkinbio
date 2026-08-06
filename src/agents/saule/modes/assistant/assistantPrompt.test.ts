import { describe, it, expect } from 'vitest';
import { buildSaulePrompt, parseContactInfo } from './assistantPrompt';

const baseParams = {
  business: {
    name: 'Test Kuaför',
    category: 'beauty_salon',
    contact_method: null,
    contact_value: null,
    saule_settings: {},
  },
  blocks: [{ title: 'İletişim', type: 'contact', content: { email: 'info@test.com' } }],
  knowledge: [],
  locale: 'tr',
  isDemoBusiness: false,
  directLinks: [],
  contactValues: {},
};

describe('buildSaulePrompt — iletişim bölümü', () => {
  // Regresyon: eskiden contact_value ham JSON olarak gömülüyor ve alan boşken
  // "İletişim Tercihi: Belirtilmedi (Belirtilmedi)" yazılıyordu. Bu kesin olumsuz
  // iddia, prompt'un ilerisindeki İletişim bloğuyla çelişiyor ve Saule sayfada
  // e-posta dururken "iletişim bilgim yok" diyebiliyordu.
  it('boş iletişim verisinde "Belirtilmedi" iddiasında bulunmaz', () => {
    const prompt = buildSaulePrompt(baseParams);
    expect(prompt).not.toMatch(/İletişim Tercihi/);
    expect(prompt).not.toMatch(/Belirtilmedi \(Belirtilmedi\)/);
  });

  it('iletişim verisi varsa okunabilir biçimde yazar, ham JSON gömmez', () => {
    const prompt = buildSaulePrompt({
      ...baseParams,
      contactValues: { email: 'info@test.com', whatsapp: '+905551112233' },
    });
    expect(prompt).toContain('E-posta: info@test.com');
    expect(prompt).toContain('WhatsApp: +905551112233');
    expect(prompt).not.toContain('{"email"');
  });

  it('boş string değerleri iletişim bilgisi saymaz', () => {
    const prompt = buildSaulePrompt({ ...baseParams, contactValues: { email: '   ' } });
    expect(prompt).not.toMatch(/İşletmenin iletişim bilgileri/);
  });

  it('blok verisi her durumda prompt\'a girer', () => {
    const prompt = buildSaulePrompt(baseParams);
    expect(prompt).toContain('info@test.com');
  });
});

describe('parseContactInfo', () => {
  it('bozuk JSON geldiğinde çökmez, boş döner', () => {
    expect(parseContactInfo('not json')).toEqual({ contactValues: {}, directLinks: [] });
  });

  it('instagram/whatsapp/telegram için doğrudan link üretir', () => {
    const { directLinks } = parseContactInfo(
      JSON.stringify({ instagram: '@testkuafor', whatsapp: '+90 555 111 22 33', email: 'info@test.com' }),
    );
    expect(directLinks).toContain('Instagram: https://ig.me/m/testkuafor');
    expect(directLinks).toContain('WhatsApp: https://wa.me/905551112233');
    // E-posta tıklanabilir bir devir linki değil — directLinks'e girmemeli.
    expect(directLinks.some((l) => l.includes('info@test.com'))).toBe(false);
  });
});
