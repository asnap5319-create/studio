
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MainRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <p className="animate-pulse">Loading feed...</p>
    </div>
  );
}
