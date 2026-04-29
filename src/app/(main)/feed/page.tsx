'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import type { Post } from '@/models/post';
import Link from 'next/link';
import { Heart } from 'lucide-react';


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
      <div className="flex h-full flex-col items-center justify-center text-white">
        <p>Loading feed...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col text-white">
       <header className="flex items-center justify-between p-4 bg-background z-10 shrink-0">
            <h1 className="text-2xl font-bold text-primary font-sans" style={{filter: 'drop-shadow(0 0 5px hsl(var(--primary)))'}}>
                A.snap
            </h1>
            <Link href="/notifications" legacyBehavior>
                <a aria-label="Notifications" className="relative">
                    <Heart className="h-7 w-7 text-white" />
                </a>
            </Link>
      </header>

      <div className="flex-1 w-full h-full overflow-y-auto snap-y snap-mandatory">
        {error && (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <h2 className="text-xl font-bold text-destructive">Could not load feed</h2>
                <p className="text-muted-foreground">{error.message}</p>
            </div>
        )}
        {!isLoading && !error && (!posts || posts.length === 0) && (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <h2 className="text-2xl font-bold">Welcome to A.snap!</h2>
                <p className="text-muted-foreground">It's a bit quiet here. Be the first to create a post!</p>
            </div>
        )}
        {posts && posts.map((post) => (
            <div key={post.id} className="h-full w-full snap-start flex items-center justify-center">
                <PostCard post={post} />
            </div>
        ))}
      </div>
    </div>
  );
}
