'use client';

import { useEffect } from 'react';

export default function HydrationFixProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress hydration warnings for known issues
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const shouldSuppressMessage = (message: string) => {
      return message.includes('bis_skin_checked') ||
             message.includes('bis_register') ||
             message.includes('__processed_') ||
             message.includes('hydration') ||
             message.includes('Hydration') ||
             message.includes('Text content does not match') ||
             message.includes('expected server HTML to contain') ||
             message.includes('Warning: Text content did not match') ||
             message.includes('Warning: Expected server HTML') ||
             message.includes('chrome-extension') ||
             message.includes('moz-extension');
    };
    
    console.error = (...args) => {
      if (typeof args[0] === 'string' && shouldSuppressMessage(args[0])) {
        return;
      }
      originalError.call(console, ...args);
    };
    
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && shouldSuppressMessage(args[0])) {
        return;
      }
      originalWarn.call(console, ...args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return <>{children}</>;
}