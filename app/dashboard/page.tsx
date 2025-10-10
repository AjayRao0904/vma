import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

// Server Component for SEO and initial rendering
export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-bg flex items-center justify-center" suppressHydrationWarning>
        <div className="text-white text-xl" suppressHydrationWarning>Loading Dashboard...</div>
      </div>
    }>
      <DashboardClient />
    </Suspense>
  );
}

// Metadata for SEO
export const metadata = {
  title: 'VMA Studio - Dashboard',
  description: 'Manage your motion picture projects and generate AI-powered music',
  keywords: ['music generation', 'AI', 'motion pictures', 'studio', 'projects'],
};
