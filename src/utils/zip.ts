// Minimal ZIP yazıcı (Node runtime).
//
// `fal.ts`'teki gerekçenin aynısı: kod dondurma döneminde (Faz T) yeni bir runtime
// bağımlılığı eklememek için jszip/adm-zip/archiver kurulmadı. Tek ihtiyacımız
// fal-ai/flux-lora-fast-training'in beklediği eğitim arşivini üretmek — görseller +
// yanlarındaki .txt caption dosyaları.
//
// STORE (sıkıştırmasız) yöntemi kullanılıyor: arşivin içeriği zaten sıkıştırılmış JPEG,
// üstüne deflate uygulamak ölçülebilir bir kazanç sağlamadan CPU yakardı. Bu sayede
// `zlib`e de gerek kalmıyor ve format tamamen senkron/deterministik oluyor.
//
// Sözleşme: APPNOTE.TXT 6.3.x, bölüm 4.3.6-4.3.16. Zip64 YOK — 4 GB üstü arşiv veya
// 65535'ten fazla dosya desteklenmez; LoRA veri seti (≤30 fotoğraf) bunun çok altında.

/** CRC-32/ISO-HDLC — ZIP'in zorunlu kıldığı sağlama. Tablo ilk çağrıda kurulur. */
let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  crcTable = table;
  return table;
}

export function crc32(buf: Buffer): number {
  const table = getCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** JS Date → MS-DOS tarih/saat çifti (APPNOTE 4.4.6). 1980 öncesi temsil edilemez. */
function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(d.getFullYear(), 1980);
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export interface ZipEntry {
  /** Arşiv içindeki yol. Ayraç olarak '/' kullanılmalı (APPNOTE 4.4.17.1). */
  name: string;
  data: Buffer;
}

/**
 * Verilen dosyalardan tek parça bir ZIP arşivi kurar.
 *
 * Dosya adları UTF-8 olarak yazılır ve genel amaç bayrağının 11. biti (EFS) set edilir,
 * böylece ASCII dışı adlar da doğru çözülür.
 */
export function createZip(entries: ZipEntry[], now: Date = new Date()): Buffer {
  const { time, date } = dosDateTime(now);
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header imzası
    local.writeUInt16LE(20, 4); // çıkarmak için gereken sürüm (2.0)
    local.writeUInt16LE(0x0800, 6); // genel amaç bayrağı: bit 11 = UTF-8 ad
    local.writeUInt16LE(0, 8); // yöntem: 0 = store
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18); // sıkıştırılmış boyut (= store olduğu için ham boyut)
    local.writeUInt32LE(size, 22); // ham boyut
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra alanı yok
    localParts.push(local, nameBuf, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // central directory header imzası
    central.writeUInt16LE(20, 4); // üreten sürüm
    central.writeUInt16LE(20, 6); // çıkarmak için gereken sürüm
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // yorum
    central.writeUInt16LE(0, 34); // başlangıç disk numarası
    central.writeUInt16LE(0, 36); // dahili öznitelikler
    central.writeUInt32LE(0, 38); // harici öznitelikler
    central.writeUInt32LE(offset, 42); // local header'ın arşiv başından ofseti
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + entry.data.length;
  }

  const centralDir = Buffer.concat(centralParts);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory imzası
  end.writeUInt16LE(0, 4); // bu disk
  end.writeUInt16LE(0, 6); // central directory'nin başladığı disk
  end.writeUInt16LE(entries.length, 8); // bu diskteki kayıt sayısı
  end.writeUInt16LE(entries.length, 10); // toplam kayıt sayısı
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16); // central directory ofseti
  end.writeUInt16LE(0, 20); // arşiv yorumu yok

  return Buffer.concat([...localParts, centralDir, end]);
}
