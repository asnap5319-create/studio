
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

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <div className="animate-pulse font-black italic text-primary">A.snap...</div>
    </div>
  );
}
