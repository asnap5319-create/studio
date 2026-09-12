'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function ProfileRedirectPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;
    if (user) {
      router.replace(`/profile/${user.uid}`);
    } else {
      router.replace('/login?auth=true');
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
       <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
          <Loader2 className="animate-spin text-primary h-12 w-12 relative z-10" />
       </div>
       <p className="mt-4 font-black uppercase text-[10px] tracking-[0.3em] text-primary/80 animate-pulse">Syncing Account...</p>
    </div>
  );
}
