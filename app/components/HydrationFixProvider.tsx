'use client';

import { useEffect } from 'react';

export default function HydrationFixProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress hydration warnings specifically for browser extension attributes
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('bis_skin_checked') ||
         args[0].includes('bis_register') ||
         args[0].includes('__processed_') ||
         args[0].includes('hydration'))
      ) {
        return;
      }
      originalError.call(console, ...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return <>{children}</>;
}