
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root page redirect to ensure (main) layout handles the feed properly.
 * This avoids Vercel build conflicts with multiple root pages.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center text-white bg-black">
      <h1 className="text-4xl font-black text-primary italic animate-pulse">A.snap</h1>
    </div>
  );
}
