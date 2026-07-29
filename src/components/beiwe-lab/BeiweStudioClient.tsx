'use client';

import { useState } from 'react';
import type { CharacterClip } from '@/config/clips';
import StudioSection from '@/components/StudioSection';

// Beiwe Studio — Karakter Odası'ndaki StudioSection'ın birebir aynısı, yalnızca Beiwe
// Lab'a taşınmış hâli. `StudioSection` kendi asset/proje verisini API'den çekiyor
// (bkz. bileşenin kendi useEffect'i); burada tutulan tek state ortak klip havuzu.
type Props = {
  characterId: string;
  initialClips: CharacterClip[];
};

export default function BeiweStudioClient({ characterId, initialClips }: Props) {
  const [clips, setClips] = useState<CharacterClip[]>(initialClips);

  return (
    <StudioSection
      characterId={characterId}
      clips={clips}
      onClipUploaded={(clip) => setClips((prev) => [clip, ...prev])}
    />
  );
}
