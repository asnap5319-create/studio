'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Ensures that even within the (main) group, the user is sent to the absolute root.
 */
export default function MainGroupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
