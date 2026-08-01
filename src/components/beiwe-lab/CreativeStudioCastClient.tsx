'use client';

import { useState } from 'react';
import { Loader2, Plus, Sparkles } from 'lucide-react';

export type CastCharacterSummary = { id: string; name: string; role: string; avatarUrl?: string };

/**
 * Müşteri dashboard'undaki Cast (Yardımcı Oyuncular) yönetim sayfası — admin'in
 * `CastRoomTabs.tsx`'inin sade bir karşılığı: liste + oluşturma formu, aynı
 * `POST /api/admin/beiwe-lab/cast` uç noktasını kullanır (artık business-owner
 * oturumuyla da çalışıyor, bkz. o route'taki authorizeCastCreation).
 *
 * Bu turda Voice/Podcast/Motion sayfalarına "hangi karakterle çalışacağım" seçici
 * eklenmedi (admin'deki CastRoomTabs karakter-değiştirme şeridi) — bu sayfa yalnızca
 * oluşturma/listeleme sağlıyor, diğer araçlara bağlanma sonraki bir tur.
 */
export default function CreativeStudioCastClient({ initialCharacters }: { initialCharacters: CastCharacterSummary[] }) {
  const [characters, setCharacters] = useState<CastCharacterSummary[]>(initialCharacters);
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

      setCharacters((prev) => [{ id: data.id, name: data.name, role: 'Yardımcı oyuncu — sanal karakter' }, ...prev]);
      setName('');
      setPersona('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Karakter oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-6">
        <h2 className="text-sm font-[800] text-[#14231F] font-['Bricolage_Grotesque'] mb-1">Yeni Yardımcı Oyuncu</h2>
        <p className="text-sm text-[#4B5A55] mb-4">
          Sanal, kurgusal bir karakter — gerçek bir yüze kilitlenmez, yalnızca tarifle üretilir.
        </p>
        <div className="space-y-3 max-w-lg">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="İsim — ör. Deniz"
            className="w-full p-2.5 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F] bg-white"
          />
          <textarea
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            rows={3}
            placeholder="Tarif (görünüş + kişilik) — ör. Otuzlu yaşlarda, kısa siyah saçlı, enerjik bir spor koçu. Sıcak ve motive edici bir tavrı var."
            className="w-full p-2.5 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F] bg-white resize-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={createCharacter}
            disabled={creating}
            className="flex items-center gap-2 bg-[#FF6A5C] text-white rounded-full px-5 py-2.5 text-sm font-[700] hover:opacity-90 transition disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {creating ? 'Üretiliyor… (~20sn)' : 'Oluştur'}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-[800] text-[#14231F] font-['Bricolage_Grotesque'] mb-3">
          Oyuncu Kadron {characters.length > 0 && <span className="font-normal text-[#8A8880]">({characters.length})</span>}
        </h2>
        {characters.length === 0 ? (
          <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-8 text-center">
            <Sparkles className="w-8 h-8 text-[#8A8880] mx-auto mb-2" />
            <p className="text-sm text-[#8A8880]">Henüz bir yardımcı oyuncu oluşturmadın.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {characters.map((c) => (
              <div key={c.id} className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-4 flex flex-col items-center text-center">
                {c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover mb-2" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#F4F2ED] mb-2" />
                )}
                <p className="text-sm font-semibold text-[#14231F]">{c.name}</p>
                <p className="text-xs text-[#8A8880]">{c.role}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
