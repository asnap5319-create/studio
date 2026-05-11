
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root redirect to the main feed group.
 * This prevents route conflicts and ensures Vercel builds succeed.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
