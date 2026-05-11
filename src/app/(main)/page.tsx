
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Empty redirect to fix Next.js route conflict between /page.tsx and /(main)/page.tsx
 * All content moved to root /page.tsx
 */
export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
