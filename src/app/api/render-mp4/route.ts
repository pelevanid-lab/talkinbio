import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { NextResponse } from 'next/server';
import os from 'os';

// Force node runtime for Remotion bundling
export const maxDuration = 300; // Allow up to 5 minutes to render

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Path to the Remotion entry point
    const entry = path.join(process.cwd(), 'src/remotion/Root.tsx');
    
    // Bundle the composition using Webpack
    const bundleLocation = await bundle({
      entryPoint: entry,
      webpackOverride: (config) => config,
    });

    // Select the composition based on ID
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: data.compositionId || 'TalkinbioReels',
      inputProps: data.inputProps || {},
    });

    const fileName = `render-${Date.now()}.mp4`;
    const outPath = path.join(process.cwd(), 'public', 'videos', fileName);

    // Render it!
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outPath,
      inputProps: data.inputProps || {},
    });

    return NextResponse.json({ success: true, url: `/videos/${fileName}` });
  } catch (error) {
    console.error('Render error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
