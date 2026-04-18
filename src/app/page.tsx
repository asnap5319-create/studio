"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function Splash() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (isUserLoading) {
      // Wait while firebase auth state is loading
      return;
    }

    const timer = setTimeout(() => {
      if (user) {
        router.push('/feed');
      } else {
        router.push('/login');
      }
    }, 2500); // 2.5 second delay

    return () => clearTimeout(timer);
  }, [user, isUserLoading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      <div className="animate-pulse">
        <h1 className="text-9xl font-bold text-primary [filter:drop-shadow(0_0_10px_hsl(var(--primary)))]">
          A
        </h1>
      </div>
      <p className="mt-4 text-4xl font-bold tracking-tight text-primary [filter:drop-shadow(0_0_5px_hsl(var(--primary)))]">
        A.snap
      </p>
    </main>
  );
}
