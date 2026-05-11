
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redundant route removed to fix Next.js build conflict with src/app/page.tsx.
 * Redirects to the root feed page.
 */
export default function MainRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
