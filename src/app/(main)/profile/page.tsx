'use client';
import Image from "next/image";
import { ProfileHeader } from "@/components/profile-header";
import { ProfileMenu } from "@/components/profile-menu";
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Post, UserProfile } from "@/lib/types";
import { collection, query, doc, Timestamp, orderBy } from "firebase/firestore";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const userPostsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return query(collection(firestore, 'users', authUser.uid, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore, authUser]);

  const { data: userPosts, isLoading: postsLoading } = useCollection<Post>(userPostsQuery);

  const activePosts = useMemo(() => {
    if (!userPosts) return [];
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    return userPosts.filter(post => {
      if (!post.createdAt) return false;
        const postDate = (post.createdAt as Timestamp).toDate();
        const expiryDate = new Date(postDate.getTime() + 48 * 60 * 60 * 1000);
        return new Date() < expiryDate;
    });
  }, [userPosts]);
  
  if (isUserLoading || profileLoading || postsLoading) {
      return (
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex flex-1 items-center justify-around">
              <div className="text-center space-y-1">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-4 w-12" />
              </div>
               <div className="text-center space-y-1">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-4 w-16" />
              </div>
               <div className="text-center space-y-1">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
           <div className="grid grid-cols-3 gap-0.5">
            <Skeleton className="aspect-square" />
            <Skeleton className="aspect-square" />
            <Skeleton className="aspect-square" />
          </div>
        </div>
      );
  }
  
  if (!authUser || !userProfile) {
      return <div className="flex justify-center items-center h-screen">Please log in to see your profile.</div>
  }

  return (
    <div>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm">
        <h1 className="text-lg font-semibold font-headline">@{userProfile.username}</h1>
        <ProfileMenu />
      </header>
      <ProfileHeader user={userProfile} postCount={activePosts.length} />
      <main>
        <div className="grid grid-cols-3 gap-0.5">
          {activePosts.map((post) => (
            <div key={post.id} className="relative aspect-square">
              <Image
                src={post.mediaUrl}
                alt={post.caption || 'user post'}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {activePosts.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-lg font-semibold">No active posts</p>
            <p className="text-muted-foreground">Your posts disappear after 48 hours.</p>
          </div>
        )}
      </main>
    </div>
  );
}
