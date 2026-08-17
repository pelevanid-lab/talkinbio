import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import styles from './hakkimda.module.css';

export const metadata: Metadata = {
  title: 'Enes Pehlivan | Pazarlama Okumaları',
  description: 'Enes Pehlivan’ın sahadaki sürtünmeden doğan pazarlama hikâyesi.',
};

const chapters = [
  {
    number: '01',
    title: 'Empatinin Çıraklığı: Değerin Nerede Kırıldığını Görmek',
    eyebrow: 'DHL Yılları',
    paragraphs: [
      'Pek çok pazarlamacı kariyerine ajans sunumlarıyla veya marka planlarıyla başlar. Ben ise pazarlamanın en saf hammaddesiyle başladım: müşterinin hayal kırıklığı ve çözülmeyi bekleyen acısı.',
      'DHL Express’te geçen 9 yıllık serüvenim; gümrük masalarından çağrı merkezine, şikâyet yönetiminden Türkiye’nin dev holdinglerinin kritik lojistik operasyonlarına uzanan bir okul oldu.',
      'Çağrı merkezinde saniyelerle yarışırken ve müşteri şikâyetlerini yönetirken öğrendiğim ilk ilke şuydu: müşteri hiçbir zaman haksız yere bağırmaz; süreçte görünmeyen bir sürtünme vardır.',
      'Özel Müşteriler Masası Şefliğim döneminde, İtalya’da farklı bir amaçla kullanılan bir sistemi keşfederek yerel IT ekipleriyle Türkiye operasyonuna uyarladığım KART takip sistemi ile sorunlu gönderileri kriz çıkmadan önce otomatik tespit eden kurallar geliştirdik.',
      'Bu dönem bana Kotler’in ilişki pazarlaması ilkesinin kalbini öğretti: bir markanın vaadi ile teslimatı arasındaki fark sıfırlandığında, gerçek sadakat başlar.',
    ],
  },
  {
    number: '02',
    title: 'Köprü Kurmak: Müşteri Deneyiminden Global Ürüne',
    eyebrow: 'TECNO CX',
    paragraphs: [
      '2021 yılında TECNO’ya adım attığımda önümde duran tablo, klasik bir satış odaklı büyüme sancısıydı: pazar payı artıyordu ancak kullanıcı deneyimi geriden geliyordu.',
      'Müşteri Deneyimi Müdürü olarak, 1 milyon kullanıcıya dokunan destek operasyonunu sıfırdan kurdum. Ancak müşteri hizmetleri sadece sorun çözen bir yangın söndürücü değildir; Ar-Ge’yi besleyen en stratejik istihbarat merkezidir.',
      'Biri Çin’den görevlendirilen mühendis olmak üzere 3 kişilik Kullanıcı Deneyimi Geliştirme Ekibini kurdum. Türkiye’deki kullanıcıların kamera, ses ve arayüz şikâyetlerini doğrudan global yazılım ve ürün ekiplerine entegre ettik.',
      'Yazılım hatalarının düzeltilme süresini 60 günden 20 güne indirdik. Ekibimin kurduğu erken uyarı mekanizması, Malezya kaynaklı küresel bir siber güvenlik açığı ihtimalini daha gerçekleşmeden Türkiye cihazlarına olası etkileri üzerinden tespit etti.',
      'Sonuçta markayı 18 ay gibi kısa bir sürede Şikâyetvar kategori sıralamasında son sıradan 1. sıraya taşıdık. Piyasa araştırmalarında kullanıcılarımızın 70%’i ürünlerimizi yakınlarının tavsiyesi ile edindiğini söylüyordu.',
    ],
  },
  {
    number: '03',
    title: 'Bütünsel Pazarlama ve Stratejik Büyüme',
    eyebrow: 'TECNO Direktörlüğü',
    paragraphs: [
      'Müşteri deneyimindeki bu radikal dönüşümün ardından, Şubat 2023’te TECNO Mobile Türkiye’nin Pazarlama Direktörlüğü görevini üstlendim.',
      'Markanın Türkiye’deki ilk fiziksel ürün lansmanını uçtan uca tasarlayıp hayata geçirdik. Hepsiburada ve Vodafone ile ortak pazarlama modelleri kurgulayarak pazar penetrasyonunu hızlandırdık.',
      'Türkiye’nin ilk sosyal medya hack organizasyonlarından birini kurgulayarak markayı Z kuşağının radarına soktuk.',
      'Pazarlama direktörlüğüm boyunca ajans yönetiminden medya planlamaya, dijital performanstan e-ticarete kadar tüm kanalları tek bir amaca kilitledim: müşteriye verilen söz ile ürünün yaşattığı deneyim arasındaki uyumu kusursuz kılmak.',
    ],
  },
  {
    number: '04',
    title: 'Meydan Okuyan Bir Kült Markanın Doğuşu',
    eyebrow: 'Nothing & Toprak Razgatlıoğlu',
    paragraphs: [
      'Aralık 2024’te Evofone çatısı altında, tüketici elektroniğinde küresel bir tasarım devrimi yaratan Nothing Technology’nin Türkiye pazarına giriş sürecini yönetmek üzere yola çıktım.',
      'PR ve kreatif ajansları yönetirken odağım çok netti: sermaye yoğun dev rakiplerin arasında bir challenger brand nasıl konumlandırılır?',
      'Dünya şampiyonu milli motosikletçimiz Toprak Razgatlıoğlu ile Nothing’in Türkiye lansmanını birleştiren, maliyet verimliliği yüksek stratejik bir marka iş birliğine imza attım.',
      'Reklam filminin stratejisinden yaratıcı konseptine, prodüksiyon yönetiminden sosyal medya yayılımına kadar her adımı bizzat kurguladım. Hız, cesaret, şeffaflık ve özgün tasarım kodlarını pazarla buluşturduk.',
    ],
  },
];

const principles = [
  'Ürün müşterinin masasında başlar, fabrikada değil.',
  'CX pazarlamanın görünmeyen omurgasıdır.',
  'Bütçe değil, anlam fark yaratır.',
  'Bütünsel bakış; operasyon, ürün, marka ve kreatif vizyonu aynı anda okumaktır.',
];

export default function AboutEnesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Image
          src="/enes-pehlivan-about.png"
          alt="Enes Pehlivan portresi"
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroScrim} aria-hidden="true" />
        <Link href="/" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" size={16} />
          Pazarlama okumalarına dön
        </Link>
        <div className={styles.heroCopy}>
          <span>DERLEYİCİ</span>
          <h1>Enes Pehlivan</h1>
          <p>Sahadaki sürtünmeden doğan pazarlama: müşterinin en çıplak gerçeğini dinleyerek, operasyonu optimize ederek ve bunun üzerine marka stratejileri inşa ederek geçen bir yolculuk.</p>
          <a
            href="https://www.linkedin.com/in/enes-pehlivan/"
            className={styles.linkedinLink}
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn <ArrowUpRight aria-hidden="true" size={15} />
          </a>
        </div>
      </section>

      <section className={styles.chapters} aria-label="Kariyer hikayesi">
        {chapters.map((chapter) => (
          <article key={chapter.number} className={styles.chapter}>
            <div className={styles.chapterHeading}>
              <span>{chapter.number}</span>
              <small>{chapter.eyebrow}</small>
              <h2>{chapter.title}</h2>
            </div>
            <div className={styles.chapterBody}>
              {chapter.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.principles} aria-labelledby="principles-title">
        <div>
          <span>PAZARLAMA PUSULAM</span>
          <h2 id="principles-title">Sahadan öğrenilen dört ilke</h2>
          <p>Ben pazarlamayı sadece yönetmiyorum; onu sahadaki her temas noktasında hissederek, ölçerek ve değere dönüştürerek yaşıyorum.</p>
        </div>
        <ol>
          {principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ol>
      </section>

      <footer className={styles.footer}>
        <Link href="/">
          Okumalara dön <ArrowUpRight aria-hidden="true" size={16} />
        </Link>
      </footer>
    </main>
  );
}
