
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Mirror the feed behavior to ensure root path always shows videos.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // We rely on the (main)/page.tsx to handle the root path in NextJS route groups
    // but if build conflicts occur, we can use this as a direct forwarder.
  }, []);

  return null;
}
