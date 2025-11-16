import { redirect } from 'next/navigation';

// Server Component - redirect to dashboard
export default function MotionPictures() {
  // This route is deprecated - users should create/select projects from the dashboard
  redirect('/dashboard');
}

// Metadata for SEO
export const metadata = {
  title: 'Motion Pictures Studio - VMA',
  description: 'Professional video editing and music generation workspace for motion pictures',
  keywords: ['video editing', 'motion pictures', 'AI music', 'video production', 'studio'],
};