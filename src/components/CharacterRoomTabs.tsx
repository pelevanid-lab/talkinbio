'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '@/config/characters';

// ContinuousImprovementTabs ile aynı sekme deseni — buradaki fark, her sekmenin
// kanonik avatarı da göstermesi: hangi odada olduğun yüzden anlaşılsın.
export default function CharacterRoomTabs({
  ids = CHARACTER_IDS,
  basePath = '/admin/characters',
}: {
  /** Gösterilecek karakterlerin alt kümesi — varsayılan tüm Karakter Odası profilleri. */
  ids?: readonly CharacterId[];
  /** Sekme linklerinin kökü — bu sayfa hangi route altında kullanılıyorsa. */
  basePath?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 mb-6">
      <div className="flex items-center gap-1">
        {ids.map((id) => {
          const character = CHARACTERS[id];
          const isActive = pathname.endsWith(`${basePath}/${id}`);

          return (
            <Link
              key={id}
              href={`${basePath}/${id}`}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {character.referenceFile ? (
                <Image
                  src={character.referenceFile.startsWith('http') ? character.referenceFile : `/${character.referenceFile}`}
                  alt=""
                  width={24}
                  height={24}
                  className={`w-6 h-6 rounded-full object-cover ${isActive ? '' : 'grayscale opacity-70'}`}
                />
              ) : (
                <div className={`w-6 h-6 rounded-full bg-slate-200 border border-slate-300 ${isActive ? '' : 'grayscale opacity-70'}`} />
              )}
              {character.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
