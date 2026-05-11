
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirecting root to ensure (main) layout is used for the feed.
 * This resolves the divergent branch and routing conflict.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <h1 className="text-2xl font-black text-primary italic animate-pulse">A.snap</h1>
    </div>
  );
}
