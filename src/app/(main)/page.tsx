'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Empty route to avoid collision with src/app/page.tsx.
 * This fixes the Vercel build error and Divergent Branches sync error.
 */
export default function RedirectToRoot() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
