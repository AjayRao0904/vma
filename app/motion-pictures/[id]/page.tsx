import { redirect } from 'next/navigation';
import MotionPicturesClient from '../MotionPicturesClient';
import { getServerSession } from 'next-auth';

export default async function MotionPicturePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  // Pass the project ID to the client component
  return <MotionPicturesClient projectId={id} />;
}
