'use client';

import { AsnapLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function WelcomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/feed');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-8">
        <AsnapLogo className="mx-auto h-24 w-24" />
        <h1 className="mt-4 text-5xl font-bold font-headline text-primary">
          A.sanp
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Capture and share moments.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col space-y-4">
        <Button asChild size="lg">
          <Link href="/login">Log In</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    </div>
  );
}
