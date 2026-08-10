// Profil başlığının altındaki kısayol butonları. Sıfırdan içerik DEĞİL — sayfada zaten var olan
// bir Bağlantı (links bloğu öğesi) veya Hizmet (services/pricing bloğu öğesi) tekrar yüzeye çıkar.
//
// Saklama: settings bloğunun content.shortcuts alanı (migration yok). Öğeler id taşımadığından
// blockId+itemIndex yerine gerekli veri snapshot'lanır — böylece öğe sırası değişse de kısayol
// yanlış öğeyi göstermez:
//  - link:    { kind:'link', label, url }              (kendi kendine yeter)
//  - service: { kind:'service', blockId, label }        (bölüme atlamak için blok id'si + etiket)

export type Shortcut =
  | { kind: 'link'; label: string; url: string }
  | { kind: 'service'; blockId: string; label: string }
  | { kind: 'contact'; channel: 'email' | 'whatsapp' | 'instagram' | 'telegram'; label: string; value: string };

function serviceItemLabel(item: any, locale: string): string {
  return (item?.[locale]?.title || item?.title || '').trim();
}

// Settings bloğundan ham kısayol listesini okur.
export function getShortcuts(blocks: any[] | null | undefined): Shortcut[] {
  const settings = blocks?.find((b) => b?.type === 'settings');
  const list = settings?.content?.shortcuts;
  return Array.isArray(list) ? list : [];
}

// Render için geçerli kısayolları döner: hizmet kısayolunun işaret ettiği blok artık yoksa elenir,
// bozuk/eksik kayıtlar atılır, en fazla 4 döner.
export function resolveShortcuts(blocks: any[] | null | undefined): Shortcut[] {
  const blockIds = new Set((blocks || []).map((b) => b?.id));
  return getShortcuts(blocks)
    .filter((s) => {
      if (!s || !s.label) return false;
      if (s.kind === 'link') return !!s.url;
      if (s.kind === 'service') return !!s.blockId && blockIds.has(s.blockId);
      return false;
    })
    .slice(0, 4);
}

// Editör açılır listesi için seçilebilir adaylar: tüm links öğeleri + tüm services/pricing öğeleri + iletişim yöntemleri.
export function collectShortcutCandidates(
  blocks: any[] | null | undefined,
  business: any,
  locale: string
): Shortcut[] {
  const out: Shortcut[] = [];
  for (const block of blocks || []) {
    const items: any[] = block?.content?.items || [];
    if (block?.type === 'links') {
      for (const item of items) {
        const label = (item?.label || '').trim();
        if (label && item?.url) out.push({ kind: 'link', label, url: item.url });
      }
    } else if (block?.type === 'services' || block?.type === 'pricing') {
      for (const item of items) {
        const label = serviceItemLabel(item, locale);
        if (label) out.push({ kind: 'service', blockId: block.id, label });
      }
    }
  }

  // İletişim yöntemlerini ekle
  const contactMethod = business?.contact_method || '';
  const contactValueStr = business?.contact_value || '{}';
  let contactValues: Record<string, string> = {};
  try {
    contactValues = JSON.parse(contactValueStr);
  } catch {
    contactValues = {};
  }

  const contactLabels: Record<string, Record<string, string>> = {
    whatsapp: { tr: 'Telefon & WhatsApp', en: 'Phone & WhatsApp', ru: 'Телефон и WhatsApp' },
    instagram: { tr: 'Instagram', en: 'Instagram', ru: 'Instagram' },
    email: { tr: 'E-posta', en: 'Email', ru: 'Email' },
    telegram: { tr: 'Telegram', en: 'Telegram', ru: 'Telegram' },
  };

  const methods = contactMethod.split(',').map((m: string) => m.trim()).filter(Boolean);
  for (const channel of methods as Array<'email' | 'whatsapp' | 'instagram' | 'telegram'>) {
    const value = contactValues[channel]?.trim();
    if (value) {
      const labels = contactLabels[channel] || {};
      const label = labels[locale] || labels.tr || channel;
      out.push({ kind: 'contact', channel, label, value });
    }
  }

  return out;
}

// İki kısayolun aynı hedefi gösterip göstermediği (editörde tekrar eklemeyi/kaldırmayı eşlemek için).
export function shortcutsEqual(a: Shortcut, b: Shortcut): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'link' && b.kind === 'link') return a.url === b.url && a.label === b.label;
  if (a.kind === 'service' && b.kind === 'service') return a.blockId === b.blockId && a.label === b.label;
  if (a.kind === 'contact' && b.kind === 'contact') return a.channel === b.channel && a.value === b.value;
  return false;
}
