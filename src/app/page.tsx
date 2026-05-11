
'use client';

/**
 * Empty redirect to handle routing conflicts during sync.
 * Root route is handled by src/app/(main)/page.tsx
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
