import { describe, expect, it } from 'vitest';

import { createZip, crc32 } from './zip';

/**
 * Arşivi central directory üzerinden geri okur — ZIP okuyucularının yaptığı gibi.
 * Yalnız testin ihtiyacı kadarını çözer (STORE, Zip64 yok, arşiv yorumu yok).
 */
function readZip(buf: Buffer) {
  const endOffset = buf.length - 22;
  expect(buf.readUInt32LE(endOffset)).toBe(0x06054b50);

  const count = buf.readUInt16LE(endOffset + 10);
  const cdSize = buf.readUInt32LE(endOffset + 12);
  const cdOffset = buf.readUInt32LE(endOffset + 16);
  expect(cdOffset + cdSize).toBe(endOffset);

  const entries: Array<{ name: string; data: Buffer; crc: number }> = [];
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    expect(buf.readUInt32LE(p)).toBe(0x02014b50);
    const crc = buf.readUInt32LE(p + 16);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');

    // Local header'a git ve gövdeyi oradan çek — ofsetin doğruluğunu da sınar.
    expect(buf.readUInt32LE(localOffset)).toBe(0x04034b50);
    expect(buf.readUInt16LE(localOffset + 8)).toBe(0); // store
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const extraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + extraLen;

    entries.push({ name, data: buf.subarray(dataStart, dataStart + size), crc });
    p += 46 + nameLen;
  }
  return entries;
}

describe('crc32', () => {
  // Referans değerler: CRC-32/ISO-HDLC (zlib, ZIP) standart test vektörleri.
  it('bilinen vektörleri doğru hesaplar', () => {
    expect(crc32(Buffer.from(''))).toBe(0);
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
    expect(crc32(Buffer.from('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
  });
});

describe('createZip', () => {
  it('her girdiyi bozulmadan geri verir', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
    const caption = Buffer.from('photo of beiweperson, natural lighting', 'utf8');

    const entries = readZip(createZip([
      { name: 'photo_000.jpg', data: jpeg },
      { name: 'photo_000.txt', data: caption },
    ]));

    expect(entries.map((e) => e.name)).toEqual(['photo_000.jpg', 'photo_000.txt']);
    expect(entries[0].data.equals(jpeg)).toBe(true);
    expect(entries[1].data.toString('utf8')).toBe('photo of beiweperson, natural lighting');
  });

  it('gövdelerin CRC değerlerini doğru yazar', () => {
    const data = Buffer.from('123456789');
    const [entry] = readZip(createZip([{ name: 'a.txt', data }]));
    expect(entry.crc).toBe(0xcbf43926);
  });

  it('boş dosyayı ve boş arşivi kabul eder', () => {
    const [entry] = readZip(createZip([{ name: 'empty.txt', data: Buffer.alloc(0) }]));
    expect(entry.data.length).toBe(0);
    expect(entry.crc).toBe(0);

    expect(readZip(createZip([]))).toEqual([]);
  });

  it('ASCII dışı dosya adlarını UTF-8 olarak saklar', () => {
    const [entry] = readZip(createZip([{ name: 'çekim_ğüş.txt', data: Buffer.from('x') }]));
    expect(entry.name).toBe('çekim_ğüş.txt');
  });

  it('1980 öncesi tarihlerde geçerli bir DOS tarihi yazar', () => {
    // DOS tarihi 1980'den önce temsil edilemez; yıl alanı taşarsa arşiv bozulur.
    const buf = createZip([{ name: 'a.txt', data: Buffer.from('x') }], new Date('1970-01-01T00:00:00Z'));
    const dosDate = buf.readUInt16LE(12);
    expect(dosDate >> 9).toBe(0); // 1980 + 0
    expect((dosDate >> 5) & 0x0f).toBeGreaterThan(0); // ay 1-12
    expect(dosDate & 0x1f).toBeGreaterThan(0); // gün 1-31
  });
});
