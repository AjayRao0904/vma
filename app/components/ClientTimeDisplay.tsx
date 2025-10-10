'use client';

import { useState, useEffect } from 'react';
import { logger } from '../lib/logger';

interface ClientTimeDisplayProps {
  createdAt: string;
  className?: string;
}

export default function ClientTimeDisplay({ createdAt, className }: ClientTimeDisplayProps) {
  const [timeString, setTimeString] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const formatTime = () => {
      if (!createdAt) {
        return 'Unknown';
      }

      const date = new Date(createdAt);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        logger.error('Invalid date', null, { createdAt });
        return 'Unknown';
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);

      if (diffSeconds < 10) {
        return 'Just now';
      } else if (diffSeconds < 60) {
        return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`;
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffDays < 30) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else if (diffMonths < 12) {
        return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
      } else {
        return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
      }
    };

    setTimeString(formatTime());
  }, [createdAt]);

  // Return empty during server-side rendering
  if (!mounted) {
    return <span className={className}></span>;
  }

  return <span className={className}>{timeString}</span>;
}