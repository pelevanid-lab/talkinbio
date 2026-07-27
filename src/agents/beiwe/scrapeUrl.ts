import { tool, generateText } from 'ai';
import { z } from 'zod';
import { getModel } from '@/utils/ai';

export function scrapeUrlTool() {
  return tool({
    description: 'Kullanıcının verdiği web sitesini (veya Instagram profilini) okur ve içindeki bilgileri sentezleyerek kısa bir işletme özetine dönüştürür. URL verildiğinde bunu çağır.',
    inputSchema: z.object({
      url: z.string().url().describe('Okunacak web sitesi adresi (http/https ile)'),
    }),
    execute: async ({ url }) => {
      try {
        let rawText = '';
        
        if (url.includes('instagram.com')) {
          const token = process.env.APIFY_API_TOKEN;
          if (!token) {
             return `Error: Sunucuda APIFY_API_TOKEN ayarlı değil. Instagram verisi çekilemiyor, kullanıcıdan manuel iste.`;
          }
          
          const match = url.match(/instagram\.com\/([^\/?#]+)/);
          const username = match ? match[1] : null;
          if (!username) {
             return `Error: URL'den Instagram kullanıcı adı anlaşılamadı. Manuel iste.`;
          }
          
          const apifyUrl = `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}`;
          const apifyResponse = await fetch(apifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username] })
          });
          
          if (!apifyResponse.ok) {
             return `Error: Instagram verisi Apify'dan alınamadı (HTTP ${apifyResponse.status}). Kullanıcıdan manuel iste.`;
          }
          
          const data = await apifyResponse.json();
          if (Array.isArray(data) && data.length > 0) {
             rawText = JSON.stringify(data[0], null, 2);
          } else {
             return `Error: Instagram profili bulunamadı veya boş döndü. Manuel iste.`;
          }
        } else {
          const response = await fetch(`https://r.jina.ai/${url}`);
          if (!response.ok) {
            return `Error: URL okunamadı (HTTP ${response.status}). Kullanıcıdan bilgileri manuel olarak iste.`;
          }
          rawText = await response.text();
        }
        
        if (!rawText || rawText.trim().length === 0) {
           return `Error: Kaynaktan içerik bulunamadı. Kullanıcıdan bilgileri manuel olarak iste.`;
        }

        // Metni sentezle - çok uzun metinleri (100k+ karakter) korumak için kırpıyoruz
        const { text: summary } = await generateText({
          model: getModel('analysis'), // analysis = hızlı model
          system: 'Sen veri sentezleyici bir asistansın. Sana verilen karmaşık web sayfası, JSON API verisi veya döküman metnini okuyup, işletme için gereken en temel bilgileri özetlemelisin.',
          prompt: `Lütfen şu kaynağı incele ve işletmenin ne yaptığını, hangi hizmetleri/ürünleri sunduğunu, fiyatlarını (varsa), çalışma saatlerini ve iletişim bilgilerini net, yapılandırılmış bir formatta özetle. Bilgi yoksa 'Belirtilmemiş' yaz.\n\nKAYNAK METİN/VERİ:\n${rawText.slice(0, 100000)}` 
        });

        return `İşte kaynaktan çıkarılan işletme özeti:\n${summary}`;
      } catch (err: any) {
         return `Error: Kaynak okunurken teknik bir hata oluştu: ${err.message}. Kullanıcıya durumu bildir ve bilgileri manuel iste.`;
      }
    }
  });
}
