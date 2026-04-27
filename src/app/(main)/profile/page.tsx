'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function ProfileRedirectPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      // Wait until user status is resolved
      return;
    }
    if (user) {
      // Use replace to avoid adding the redirect to the history stack
      router.replace(`/profile/${user.uid}`);
    } else {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-background text-white">
      <p>Loading profile...</p>
    </div>
  );
}
