'use client';
import { AsnapLogo } from "@/components/icons";
import { PostCard } from "@/components/post-card";
import { StoriesBar } from "@/components/stories-bar";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { Post, UserProfile } from "@/lib/types";
import { collectionGroup, doc, getDoc, orderBy, query, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";


export default function FeedPage() {
  const firestore = useFirestore();
  const [postsWithUsers, setPostsWithUsers] = useState<Post[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);

  const postsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  useEffect(() => {
    if (isLoading) return;
    if (!posts || !firestore) {
      setIsPostsLoading(false);
      return;
    }

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const fetchPostUsers = async () => {
      const postsWithUserDetails = await Promise.all(
        posts
          .filter(post => {
            if (!post.createdAt) return false;
            const postDate = (post.createdAt as Timestamp).toDate();
            const expiryDate = new Date(postDate.getTime() + 48 * 60 * 60 * 1000);
            return new Date() < expiryDate;
          })
          .map(async (post) => {
            if (!post.userId) return { ...post, user: undefined };
            const userRef = doc(firestore, "users", post.userId);
            const userSnap = await getDoc(userRef);
            const user = userSnap.exists() ? { ...userSnap.data(), id: userSnap.id } as UserProfile : undefined;
            
            return { ...post, user };
          })
      );
      setPostsWithUsers(postsWithUserDetails);
      setIsPostsLoading(false);
    };

    fetchPostUsers();
  }, [posts, firestore, isLoading]);

  return (
    <div>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
        <h1 className="text-2xl font-bold font-headline text-primary">Asnap</h1>
        <AsnapLogo className="h-8 w-8" />
      </header>
      <main className="p-0">
        <StoriesBar />
        {isPostsLoading ? (
          <div className="space-y-4 p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="w-full aspect-square" />
          </div>
        ) : (
          <div className="space-y-4">
            {postsWithUsers.map((post: Post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
