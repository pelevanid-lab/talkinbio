import { redirect } from 'next/navigation';

export default async function CreativeStudioPage() {
  redirect('/dashboard/editor');
}
