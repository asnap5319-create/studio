
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Next.js 15 Build Fix:
 * Redirects the legacy /main route to the root level feed.
 * This helps resolve the 'page_client-reference-manifest.js' ENOENT error.
 */
export default function MainRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
