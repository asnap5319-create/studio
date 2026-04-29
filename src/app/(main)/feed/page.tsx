
'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import type { Post } from '@/models/post';
import Link from 'next/link';
import { Heart, Database } from 'lucide-react';


export default function FeedPage() {
  const { firestore } = useFirebase();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Query the 'posts' collection group to get posts from all users, ordered by creation date
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

  // Handle Index missing error specifically
  if (error && (error.message.includes('index') || error.message.includes('INDEX'))) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white bg-black p-6 text-center">
        <Database className="h-16 w-16 text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Database Index Required</h2>
        <p className="text-muted-foreground mb-6">
          Bhai, is app ko sahi se chalane ke liye ek 'Index' banana padega. 
          Browser console mein jo blue link hai, us par click karke 'Create Index' daba dein.
        </p>
        <div className="p-4 bg-secondary rounded-lg text-xs font-mono text-left overflow-auto max-w-full">
          {error.message}
        </div>
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
        {error && !error.message.includes('index') && (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <h2 className="text-xl font-bold text-destructive">Could not load feed</h2>
                <p className="text-muted-foreground">{error.message}</p>
            </div>
        )}
        {!isLoading && !error && (!posts || posts.length === 0) && (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <h2 className="text-2xl font-bold">Welcome to A.snap!</h2>
                <p className="text-muted-foreground mt-2">It's a bit quiet here. Be the first to create a post!</p>
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
