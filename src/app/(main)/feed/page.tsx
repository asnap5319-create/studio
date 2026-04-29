
'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import type { Post } from '@/models/post';
import Link from 'next/link';
import { Heart, Database, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FeedPage() {
  const { firestore } = useFirebase();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: posts, isLoading, error } = useCollection<Post>(postsQuery);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mb-4"></div>
        <p>Loading your feed...</p>
      </div>
    );
  }

  // Handle Index missing error specifically in UI
  if (error && (error.message.includes('index') || error.message.includes('INDEX'))) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white bg-black p-8 text-center max-w-lg mx-auto">
        <div className="p-4 bg-primary/10 rounded-full mb-6">
          <Database className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-4">बधाई हो, आप वायरल होने वाले हैं!</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          Bhai, is app ko sabhi users ke video dikhane ke liye ek 'Index' chahiye. 
          Niche diye gaye link par click karein aur <strong>'Create Index'</strong> button daba dein.
        </p>
        
        <div className="w-full p-4 bg-secondary/50 rounded-xl border border-border text-xs font-mono text-left mb-8 break-all overflow-hidden">
          {error.message}
        </div>

        <Button asChild className="w-full py-6 text-lg font-bold">
           <Link href="https://console.firebase.google.com/v1/r/project/studio-8111746683-c1e57/firestore/indexes?create_exemption=Clxwcm9qZWN0cy9zdHVkaW8tODExMTc0NjY4My1jMWU1Ny9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcG9zdHMvZmllbGRzL2NyZWF0ZWRBdBACGg0KCWNyZWF0ZWRBdBAC" target="_blank">
            अभी इंडेक्स बनाएँ (Create Index Now)
           </Link>
        </Button>
        <p className="mt-4 text-sm text-muted-foreground italic">Index banne mein 2-3 minute lag sakte hain.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col text-white bg-black">
       <header className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md sticky top-0 z-20 shrink-0">
            <h1 className="text-2xl font-bold text-primary font-sans" style={{filter: 'drop-shadow(0 0 5px hsl(var(--primary)))'}}>
                A.snap
            </h1>
            <Link href="/notifications" aria-label="Notifications" className="relative hover:scale-110 transition-transform">
                <Heart className="h-7 w-7 text-white" />
            </Link>
      </header>

      <div className="flex-1 w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide">
        {error && (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-2" />
                <h2 className="text-xl font-bold text-destructive">Could not load feed</h2>
                <p className="text-muted-foreground">{error.message}</p>
            </div>
        )}
        {!isLoading && !error && (!posts || posts.length === 0) && (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <h2 className="text-2xl font-bold">Welcome to A.snap!</h2>
                <p className="text-muted-foreground mt-2">It's a bit quiet here. Be the first to create a post!</p>
                <Button asChild className="mt-6" variant="secondary">
                  <Link href="/create">Create First Post</Link>
                </Button>
            </div>
        )}
        {posts && posts.map((post) => (
            <div key={post.id} className="h-full w-full snap-start flex items-center justify-center bg-black">
                <PostCard post={post} />
            </div>
        ))}
      </div>
    </div>
  );
}
