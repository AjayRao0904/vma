import { useState, useEffect } from 'react';
import { logger } from '../lib/logger';

/**
 * Custom hook to fetch pre-signed URLs for S3 keys
 * @param s3Keys - Array of S3 keys to fetch URLs for
 * @returns Object with URLs mapped by S3 key, loading state, and error
 */
export function usePresignedUrls(s3Keys: string[]) {
  const [urls, setUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!s3Keys || s3Keys.length === 0) {
      setUrls({});
      return;
    }

    // Filter out empty keys
    const validKeys = s3Keys.filter(key => key && key.trim().length > 0);
    if (validKeys.length === 0) {
      setUrls({});
      return;
    }

    let isCancelled = false;

    const fetchUrls = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Keys: validKeys })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch pre-signed URLs: ${response.statusText}`);
        }

        const data = await response.json();

        if (!isCancelled) {
          setUrls(data.urls || {});
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          logger.error('Error fetching pre-signed URLs', err);
        }
      } finally{
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchUrls();

    return () => {
      isCancelled = true;
    };
  }, [JSON.stringify(s3Keys)]); // Stringify for stable comparison

  return { urls, loading, error };
}
