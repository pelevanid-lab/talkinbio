'use client';

import { useState } from 'react';
import type { CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import ActionRoom, { type CastCharacterOption } from '@/components/rooms/ActionRoom';

// Beiwe Motion — "Action Room". Podcast'ten farkı: sesle ilişkilendirilmiyor, boydan
// görüntü öne çıkıyor ve kimlik zorunlu değil (Twin, Yardımcı Oyuncular ya da jenerik/
// rastgele karakter). Stil katmanı (anime/çizgi film/cinematic/fantastic) Post'un
// kilitli-şablon disipliniyle aynı mantıkla çalışıyor — bkz. `config/motionStyles.ts`.
type Props = {
  characterId: string;
  initialShots: CharacterShot[];
  initialClips: CharacterClip[];
  castCharacters: CastCharacterOption[];
};

export default function BeiweMotionClient({ characterId, initialShots, initialClips, castCharacters }: Props) {
  const [clips, setClips] = useState<CharacterClip[]>(initialClips);

  return (
    <ActionRoom
      characterId={characterId}
      shots={initialShots}
      clips={clips}
      castCharacters={castCharacters}
      onClipCreated={(clip) => setClips((prev) => [clip, ...prev])}
      onClipDeleted={(clipId) => setClips((prev) => prev.filter((c) => c.id !== clipId))}
    />
  );
}
