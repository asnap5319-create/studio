
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root page redirect to ensure the main feed in (main) layout is displayed.
 * This file is kept minimal to avoid conflicts with (main)/page.tsx.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Ensuring we don't have a conflict by explicitly pointing to the feed route if needed,
    // though (main)/page.tsx usually covers the root path.
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center text-white bg-black">
      <h1 className="text-4xl font-black text-primary italic animate-pulse">A.snap</h1>
    </div>
  );
}
