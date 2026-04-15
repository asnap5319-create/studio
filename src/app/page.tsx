import Link from 'next/link';
import { AsnapLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <AsnapLogo className="h-16 w-16 mb-4" />
      <h1 className="text-4xl font-bold font-headline text-primary mb-2">
        Welcome to Asnap
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        Your app has been reset. You can start fresh from here.
      </p>
      <Link href="/feed">
        <Button>Go to Feed</Button>
      </Link>
    </div>
  );
}
