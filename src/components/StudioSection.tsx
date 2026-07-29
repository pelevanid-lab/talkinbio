'use client';

import { useEffect, useRef, useState } from 'react';
import { Clapperboard, FolderOpen, Loader2, Plus, Upload } from 'lucide-react';
import type { CharacterClip, ClipRoom } from '@/config/clips';
import type { StudioAsset, StudioProject } from '@/config/studio';
import StudioEditor from '@/components/studio/StudioEditor';

type Props = {
  characterId: string;
  clips: CharacterClip[];
  onClipUploaded: (clip: CharacterClip) => void;
};

const ROOM_LABEL: Record<ClipRoom, string> = { podcast: 'Podcast', action: 'Action', external: 'Harici' };
const ROOM_BADGE_CLASS: Record<ClipRoom, string> = {
  podcast: 'bg-blue-50 text-blue-600',
  action: 'bg-amber-50 text-amber-600',
  external: 'bg-slate-100 text-slate-500',
};

/**
 * 3. katman: ortak klip havuzundan (Podcast/Action Room çıktısı + harici yüklemeler) bir
 * klip alıp cutaway/overlay/müzik ekleyip formatlı export üreten post-prodüksiyon stüdyosu.
 * Bu bileşen sadece "hangi klip, hangi proje" seçimini yapıyor; asıl düzenleme mantığı
 * StudioEditor'da. `motion_id` alan adı (DB'de ve StudioProject tipinde) BİLEREK
 * değiştirilmedi — artık character_clips'i referans ediyor (bkz. migration 00050).
 */
export default function StudioSection({ characterId, clips, onClipUploaded }: Props) {
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<StudioProject | null>(null);
  const [uploadRoom, setUploadRoom] = useState<ClipRoom>('external');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [assetsRes, projectsRes] = await Promise.all([
          fetch(`/api/admin/characters/${characterId}/studio-asset`),
          fetch(`/api/admin/characters/${characterId}/studio`),
        ]);
        const assetsData = await assetsRes.json().catch(() => ({}));
        const projectsData = await projectsRes.json().catch(() => ({}));
        if (!cancelled) {
          setAssets(assetsData.assets || []);
          setProjects(projectsData.projects || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;
  const activeClip = activeProject ? clips.find((c) => c.id === activeProject.motion_id) || null : selectedClip;

  const handleAssetUploaded = (asset: StudioAsset) => setAssets((prev) => [asset, ...prev]);
  const handleAssetDeleted = (assetId: string) => setAssets((prev) => prev.filter((a) => a.id !== assetId));

  const handleProjectSaved = (project: StudioProject) => {
    setActiveProject(project);
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      return exists ? prev.map((p) => (p.id === project.id ? project : p)) : [project, ...prev];
    });
  };

  const backToPicker = () => {
    setSelectedClipId(null);
    setActiveProject(null);
  };

  const handleClipUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('room', uploadRoom);
      const res = await fetch(`/api/admin/characters/${characterId}/clips`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi.');
      onClipUploaded(data.clip);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Yüklenemedi.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-6">
      <div className="flex items-center gap-2 mb-6">
        <Clapperboard className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-slate-900">Post-Prodüksiyon Stüdyosu</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Yükleniyor…
        </div>
      ) : activeClip ? (
        <StudioEditor
          // Bilerek sadece clip.id — proje id'si "Projeyi Kaydet" ile null'dan gerçek bir
          // id'ye geçtiğinde remount OLMASIN diye (editördeki canlı state kaybolmasın).
          // Farklı bir projeye geçiş zaten "Geri" ekranından geçtiği için ayrıca remount olur.
          key={activeClip.id}
          characterId={characterId}
          motion={activeClip}
          project={activeProject}
          assets={assets}
          onAssetUploaded={handleAssetUploaded}
          onAssetDeleted={handleAssetDeleted}
          onProjectSaved={handleProjectSaved}
          onBack={backToPicker}
        />
      ) : (
        <div className="space-y-6">
          {projects.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-slate-400" />
                Kayıtlı projeler
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {projects.map((project) => {
                  const clipExists = clips.some((c) => c.id === project.motion_id);
                  return (
                    <button
                      key={project.id}
                      onClick={() => clipExists && setActiveProject(project)}
                      disabled={!clipExists}
                      className="text-left rounded-lg border border-slate-200 p-3 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-800 truncate">{project.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {clipExists
                          ? new Date(project.updated_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
                          : 'Kaynak klip silinmiş'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-slate-400" />
                Yeni proje — ortak klip havuzundan seç
              </h3>
              <div className="flex items-center gap-1.5">
                <select
                  value={uploadRoom}
                  onChange={(e) => setUploadRoom(e.target.value as ClipRoom)}
                  className="rounded border border-slate-300 px-1.5 py-1 text-xs"
                >
                  <option value="external">Genel</option>
                  <option value="podcast">Podcast</option>
                  <option value="action">Action</option>
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-50 shrink-0"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Harici video yükle
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleClipUpload(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            {uploadError && <p className="text-xs text-red-600 font-medium mb-2">{uploadError}</p>}

            {clips.length === 0 ? (
              <p className="text-sm text-slate-500">
                Önce Podcast Room&apos;da bir klip üret ya da yukarıdan harici bir video yükle — stüdyo onun üzerine kurulur.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {clips.map((clip) => (
                  <button
                    key={clip.id}
                    onClick={() => setSelectedClipId(clip.id)}
                    className="rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                  >
                    <video src={clip.video_url} className="w-full aspect-[4/5] object-cover bg-black" muted />
                    <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROOM_BADGE_CLASS[clip.room]}`}>
                        {ROOM_LABEL[clip.room]}
                      </span>
                      <p className="text-[11px] text-slate-500 truncate">
                        {new Date(clip.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
