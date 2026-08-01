'use client';

import { useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Loader2, Plus, X } from 'lucide-react';
import { ESTIMATED_COST_PER_IMAGE_USD } from '@/config/characters';
import { creditsForCost } from '@/config/pricing';

export type CastCharacterSummary = {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
};

const DEFAULT_BASE_PATH = '/admin/beiwe-lab/cast';

/**
 * "Yardımcı Oyuncular" sekme şeridi — CharacterRoomTabs'ten (eski Karakter Odası)
 * kasıtlı olarak ayrı: buradaki karakterler `CHARACTERS` sabitinde değil, kısmen
 * DB'de (`character_profiles.is_cast`) yaşıyor, ve "+" ile admin panelinden serbestçe
 * eklenebiliyor — tarif yaz, bir avatar üretilsin, kimlik doğrulaması/yüz tanıma yok.
 *
 * Beiwe Voice gibi başka Lab sayfaları da aynı karakter listesini (Twin + Yardımcı
 * Oyuncular) seçtirmek için bu şeridi kullanıyor — `basePath` hangi sayfada olduğunu,
 * `showAdd={false}` ekleme butonunun yalnızca asıl Yardımcı Oyuncular sayfasında
 * görünmesini sağlıyor (yeni karakter orada, sahne üretimiyle birlikte doğuyor).
 */
export default function CastRoomTabs({
  characters,
  basePath = DEFAULT_BASE_PATH,
  showAdd = true,
}: {
  characters: CastCharacterSummary[];
  basePath?: string;
  showAdd?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCharacter = async () => {
    if (!name.trim() || !persona.trim()) {
      setError('İsim ve tarif gerekli.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/beiwe-lab/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), persona: persona.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Karakter oluşturulamadı.');

      setShowAddModal(false);
      setName('');
      setPersona('');
      router.push(`${basePath}/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Karakter oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="border-b border-slate-200 mb-6">
        <div className="flex items-center gap-1">
          {characters.map((character) => {
            const isActive = pathname.endsWith(`${basePath}/${character.id}`);

            return (
              <Link
                key={character.id}
                href={`${basePath}/${character.id}`}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {character.avatarUrl ? (
                  <Image
                    src={character.avatarUrl}
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

          {showAdd && (
            <button
              onClick={() => setShowAddModal(true)}
              title="Yeni yardımcı oyuncu ekle"
              className="flex items-center justify-center w-9 h-9 mb-1 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Yeni Yardımcı Oyuncu</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Sanal, kurgusal bir karakter — gerçek bir yüze kilitlenmez, yalnızca tarifle üretilir.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">İsim</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ör. Deniz"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tarif (görünüş + kişilik)</label>
              <textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                rows={4}
                placeholder="ör. Otuzlu yaşlarda, kısa siyah saçlı, enerjik bir spor koçu. Sıcak ve motive edici bir tavrı var."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                onClick={createCharacter}
                disabled={creating}
                className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? 'Üretiliyor… (~20sn)' : `Oluştur (≈${creditsForCost(ESTIMATED_COST_PER_IMAGE_USD)} kredi)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
