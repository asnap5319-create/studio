'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects to the root feed to prevent conflicts and ensure consistent routing.
 */
export default function MainGroupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <p className="animate-pulse">Loading Feed...</p>
    </div>
  );
}
