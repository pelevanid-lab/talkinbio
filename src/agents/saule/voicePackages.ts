import { SAULE_CUE_KEYS, type SauleCueKey } from './core';
import { supabaseAdmin } from '@/utils/supabase/admin';

export type SauleCueManifest = Partial<Record<SauleCueKey, Partial<Record<'tr' | 'en' | 'ru', string>>>>;

export function emptySauleCueManifest(): SauleCueManifest {
  return Object.fromEntries(SAULE_CUE_KEYS.map((cueKey) => [cueKey, {}])) as SauleCueManifest;
}

export async function getActiveSauleCueManifest(packageSlug = 'standard'): Promise<SauleCueManifest | null> {
  try {
    const { data: voicePackage, error: packageError } = await supabaseAdmin
      .from('saule_voice_packages')
      .select('id')
      .eq('slug', packageSlug)
      .eq('status', 'active')
      .maybeSingle();

    if (packageError || !voicePackage) return null;

    const { data: cues, error: cuesError } = await supabaseAdmin
      .from('saule_voice_cues')
      .select('cue_key, locale, audio_url')
      .eq('package_id', voicePackage.id)
      .eq('status', 'approved');

    if (cuesError || !cues?.length) return null;

    const manifest = emptySauleCueManifest();
    for (const cue of cues) {
      if (!SAULE_CUE_KEYS.includes(cue.cue_key as SauleCueKey)) continue;
      if (cue.locale !== 'tr' && cue.locale !== 'en' && cue.locale !== 'ru') continue;
      manifest[cue.cue_key as SauleCueKey] = {
        ...(manifest[cue.cue_key as SauleCueKey] || {}),
        [cue.locale]: cue.audio_url,
      };
    }
    return manifest;
  } catch {
    return null;
  }
}
