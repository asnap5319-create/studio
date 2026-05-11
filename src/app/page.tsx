
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root forwarder to avoid Vercel build conflicts.
 * This ensures the (main) route group handles the feed.
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
