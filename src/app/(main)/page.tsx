
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Resolved routing conflict by redirecting to root.
 * Main content is now in src/app/page.tsx
 */
export default function LegacyFeedPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
