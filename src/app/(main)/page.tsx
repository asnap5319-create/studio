'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects to the actual root feed to avoid build-time route collisions
 * and ensure the "Video First" experience.
 */
export default function MainGroupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
