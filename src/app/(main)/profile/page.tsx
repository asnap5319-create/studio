'use client';
import Image from "next/image";
import { ProfileHeader } from "@/components/profile-header";
import { ProfileMenu } from "@/components/profile-menu";
import { Post, UserProfile } from "@/lib/types";
import { useCollection, useDoc, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAuth } from "firebase/auth";

export default function ProfilePage() {
  const { firestore, user, isUserLoading } = useFirebase();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const userPostsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'videos'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: userPosts, isLoading: isPostsLoading } = useCollection<Post>(userPostsQuery);

  const isLoading = isUserLoading || isProfileLoading || isPostsLoading;

  const handleLogout = () => {
    getAuth().signOut();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!userProfile) {
     return (
      <div className="mt-8 text-center text-white">
        <p className="text-lg font-semibold">Could not load profile.</p>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm">
        <h1 className="text-lg font-semibold font-headline">@{userProfile.username}</h1>
        <ProfileMenu onLogout={handleLogout} />
      </header>
      <ProfileHeader user={userProfile} postCount={userPosts?.length || 0} />
      <main>
        {userPosts && userPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {userPosts.map((post) => (
              <div key={post.id} className="relative aspect-square">
                <Image
                  src={post.videoUrl}
                  alt={post.caption || 'user post'}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-20 flex flex-col items-center justify-center text-center">
            <p className="text-xl font-bold">No posts yet</p>
            <p className="mt-2 text-muted-foreground">When you create posts, they'll appear here.</p>
            <Button asChild className="mt-6">
                <Link href="/create">Create your first post</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
