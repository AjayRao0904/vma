import { Suspense } from 'react';
import MotionPicturesClient from './MotionPicturesClient';

// Server Component for SEO and initial rendering
export default function MotionPictures() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading Motion Pictures Studio...</div>
      </div>
    }>
      <MotionPicturesClient />
    </Suspense>
  );
}

// Metadata for SEO
export const metadata = {
  title: 'Motion Pictures Studio - VMA',
  description: 'Professional video editing and music generation workspace for motion pictures',
  keywords: ['video editing', 'motion pictures', 'AI music', 'video production', 'studio'],
};