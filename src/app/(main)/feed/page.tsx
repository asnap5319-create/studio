
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy feed route. Redirects to root.
 */
export default function FeedRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
