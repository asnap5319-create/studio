
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FeedRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to root if someone somehow lands here
    router.replace('/');
  }, [router]);

  return null;
}
