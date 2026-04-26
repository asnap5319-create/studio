'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import type { Post } from '@/models/post';


export default function FeedPage() {
  const { firestore } = useFirebase();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Query the 'posts' collection group to get posts from all users
    // The orderBy clause has been removed as a diagnostic step to test if a missing
    // composite index was causing the permission errors.
    return collectionGroup(firestore, 'posts');
  }, [firestore]);

  const { data: posts, isLoading, error } = useCollection<Post>(postsQuery);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white">
        <p>Loading feed...</p>
      </div>
    );
  }

  if (error) {
    console.error("Feed error:", error);
    return (
      <div className="flex h-full flex-col items-center justify-center text-white p-4 text-center">
        <h2 className="text-xl font-bold text-destructive">Could not load feed</h2>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white text-center p-4">
        <h2 className="text-2xl font-bold">Welcome to A.snap!</h2>
        <p className="text-muted-foreground">It's a bit quiet here. Be the first to create a post!</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full max-w-lg mx-auto overflow-y-auto snap-y snap-mandatory">
      {posts.map((post) => (
        <div key={post.id} className="h-full w-full snap-start flex items-center justify-center">
          <PostCard post={post} />
        </div>
      ))}
    </div>
  );
}
