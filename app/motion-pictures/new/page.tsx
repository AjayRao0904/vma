import { Suspense } from 'react';
import NewProjectClient from './NewProjectClient';

// Server Component for SEO and initial rendering
export default function NewProject() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading Project Creator...</div>
      </div>
    }>
      <NewProjectClient />
    </Suspense>
  );
}

// Metadata for SEO
export const metadata = {
  title: 'Create New Project - VMA Studio',
  description: 'Create a new motion picture project with AI-powered music generation',
  keywords: ['project creation', 'motion pictures', 'AI music', 'video production'],
};