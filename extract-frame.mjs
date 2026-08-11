// Extract a frame from the hero video using ffmpeg via child_process
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Extract 4 frames at different timestamps so we can pick the best one
const timestamps = [0.5, 1.5, 2.5, 3.5];

for (const t of timestamps) {
  const outFile = `public/cicada-frame-${String(t).replace('.', 's')}.jpg`;
  // Use mjpeg codec directly without image2 muxer to avoid the pattern issue
  const cmd = `ffmpeg -y -ss ${t} -i "public/videos/cicada-hero-mobile.mp4" -frames:v 1 -f mjpeg "${outFile}"`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✓ Frame at ${t}s: ${outFile} (${existsSync(outFile) ? 'exists' : 'missing'})`);
  } catch (e) {
    console.log(`✗ Failed at ${t}s: ${e.stderr?.toString().slice(-100)}`);
  }
}
