
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirecting to root to avoid conflict with the main feed.
 * This file was causing the "divergent branches" and build errors.
 */
export default function LegacyFeedPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
