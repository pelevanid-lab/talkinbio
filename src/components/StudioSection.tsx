'use client';

import { useEffect, useState } from 'react';
import { Clapperboard, FolderOpen, Loader2, Plus } from 'lucide-react';
import type { CharacterMotion } from '@/config/characters';
import type { StudioAsset, StudioProject } from '@/config/studio';
import StudioEditor from '@/components/studio/StudioEditor';

type Props = {
  characterId: string;
  motions: CharacterMotion[];
};

/**
 * 3. katman: Motion videosunu alıp cutaway/overlay/müzik ekleyip formatlı export üreten
 * post-prodüksiyon stüdyosu. Bu bileşen sadece "hangi video, hangi proje" seçimini yapıyor;
 * asıl düzenleme mantığı StudioEditor'da.
 */
export default function StudioSection({ characterId, motions }: Props) {
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMotionId, setSelectedMotionId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<StudioProject | null>(null);

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

  const selectedMotion = motions.find((m) => m.id === selectedMotionId) || null;
  const activeMotion = activeProject ? motions.find((m) => m.id === activeProject.motion_id) || null : selectedMotion;

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
    setSelectedMotionId(null);
    setActiveProject(null);
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
      ) : activeMotion ? (
        <StudioEditor
          // Bilerek sadece motion.id — proje id'si "Projeyi Kaydet" ile null'dan gerçek bir
          // id'ye geçtiğinde remount OLMASIN diye (editördeki canlı state kaybolmasın).
          // Farklı bir projeye geçiş zaten "Geri" ekranından geçtiği için ayrıca remount olur.
          key={activeMotion.id}
          characterId={characterId}
          motion={activeMotion}
          project={activeProject}
          assets={assets}
          onAssetUploaded={handleAssetUploaded}
          onAssetDeleted={handleAssetDeleted}
          onProjectSaved={handleProjectSaved}
          onBack={backToPicker}
        />
      ) : motions.length === 0 ? (
        <p className="text-sm text-slate-500">
          Önce yukarıdan Motion&apos;da bir video üretmelisin — stüdyo onun üzerine kurulur.
        </p>
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
                  const motionExists = motions.some((m) => m.id === project.motion_id);
                  return (
                    <button
                      key={project.id}
                      onClick={() => motionExists && setActiveProject(project)}
                      disabled={!motionExists}
                      className="text-left rounded-lg border border-slate-200 p-3 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-800 truncate">{project.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {motionExists
                          ? new Date(project.updated_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
                          : 'Kaynak video silinmiş'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-slate-400" />
              Yeni proje — bir Motion videosu seç
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {motions.map((motion) => (
                <button
                  key={motion.id}
                  onClick={() => setSelectedMotionId(motion.id)}
                  className="rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                >
                  <video src={motion.video_url} className="w-full aspect-[4/5] object-cover bg-black" muted />
                  <p className="text-[11px] text-slate-500 px-2 py-1.5 truncate">
                    {new Date(motion.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
