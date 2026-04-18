'use client';

import { AsnapLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center"
      >
        <AsnapLogo className="mx-auto h-24 w-24" />
        <h1
          className="mt-4 text-5xl font-bold text-primary"
          style={{ textShadow: '0 0 15px hsl(var(--primary))' }}
        >
          A.snap
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="mt-24 flex w-full max-w-xs flex-col space-y-4"
      >
        <Button asChild size="lg" className="font-bold">
          <Link href="/login">Log In</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <Link href="/signup">Sign Up</Link>
        </Button>
      </motion.div>
    </div>
  );
}
