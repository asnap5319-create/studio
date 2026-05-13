'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

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
    <div className="flex h-screen flex-col items-center justify-center bg-background text-white">
      <p>Loading profile...</p>
    </div>
  );
}
