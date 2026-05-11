
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirecting root to the main feed to avoid duplicate route conflicts.
 * This fixes the Vercel build error.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
