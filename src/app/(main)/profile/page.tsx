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
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm">
        <h1 className="text-lg font-semibold font-headline">@{userProfile.username.replace(/\s+/g, '').toLowerCase()}</h1>
        <ProfileMenu onLogout={handleLogout} />
      </header>
      <main className="flex-1 overflow-y-auto">
        <ProfileHeader user={userProfile} postCount={userPosts?.length || 0} />
        
        <div className="grid grid-cols-2 gap-2 px-4 py-2">
          <Button variant="secondary" className="w-full font-semibold">Edit Profile</Button>
          <Button variant="secondary" className="w-full font-semibold">Share Profile</Button>
        </div>

        {userPosts && userPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5 pt-2">
            {userPosts.map((post) => (
              <Link href="#" key={post.id} className="relative block aspect-square">
                <Image
                  src={post.thumbnailUrl}
                  alt={post.caption || 'user post'}
                  fill
                  className="object-cover"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-20 flex flex-col items-center justify-center text-center">
             <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-foreground">
                <Camera className="h-10 w-10" />
            </div>
            <p className="mt-4 text-xl font-bold">Share your first video</p>
            <p className="mt-2 text-muted-foreground">When you share videos, they'll appear on your profile.</p>
            <Button asChild className="mt-6">
                <Link href="/create">Share a video</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
