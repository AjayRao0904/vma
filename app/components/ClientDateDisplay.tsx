'use client';

import { useState, useEffect } from 'react';

interface ClientDateDisplayProps {
  date: string | Date;
  className?: string;
  format?: 'date' | 'time' | 'datetime';
}

export default function ClientDateDisplay({ date, className, format = 'date' }: ClientDateDisplayProps) {
  const [dateString, setDateString] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const formatDate = () => {
      const dateObj = new Date(date);
      
      switch (format) {
        case 'time':
          return dateObj.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
        case 'datetime':
          return dateObj.toLocaleString();
        case 'date':
        default:
          return dateObj.toLocaleDateString();
      }
    };

    setDateString(formatDate());
  }, [date, format]);

  // Return empty during server-side rendering
  if (!mounted) {
    return <span className={className}></span>;
  }

  return <span className={className}>{dateString}</span>;
}