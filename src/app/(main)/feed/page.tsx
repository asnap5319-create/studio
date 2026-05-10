
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FeedRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-black text-white">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
    </div>
  );
}
