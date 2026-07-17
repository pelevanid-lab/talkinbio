import { promises as fs } from 'fs';
import path from 'path';
import { requireAdmin } from '@/utils/adminAuth';
import RoadmapClient from './RoadmapClient';

// ROADMAP.md repo kökünde yaşamaya devam eder (kod incelemesi/versiyonlama için doğal yeri);
// bu sayfa onu Sürekli Gelişim sekmesinde salt-okunur gösterir — ikinci bir kopya tutulmaz.
export default async function RoadmapPage() {
  await requireAdmin();
  const content = await fs.readFile(path.join(process.cwd(), 'ROADMAP.md'), 'utf8');
  return <RoadmapClient content={content} />;
}
