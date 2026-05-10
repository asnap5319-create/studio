
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redundant page inside (main) group.
 * Redirects to the root feed to avoid build-time route collision.
 */
export default function MainGroupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
