import { OG_IMAGE_SIZE, renderProfileOgImage } from './_ogImage';

export const alt = 'Talkinbio';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return renderProfileOgImage(username);
}
