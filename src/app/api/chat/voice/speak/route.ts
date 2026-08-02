export const maxDuration = 30;

export async function POST() {
  return Response.json(
    {
      error: 'dynamic_tts_disabled',
      message: 'Saule voice playback now uses approved cue packs instead of per-answer TTS.',
    },
    { status: 410 }
  );
}
