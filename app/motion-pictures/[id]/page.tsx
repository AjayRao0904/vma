import { redirect } from 'next/navigation';
import StudioClient from '../StudioClient';
import { getServerSession } from 'next-auth';

export default async function MotionPicturePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  // Pass the project ID to the NEW Studio client (Phase 1 refactored UI)
  return <StudioClient projectId={id} />;
}
