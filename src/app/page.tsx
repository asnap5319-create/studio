
'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import { SponsoredCard } from '@/components/sponsored-card';
import { Loader2 } from 'lucide-react';
import type { Post } from '@/models/post';
import { BottomNav } from "@/components/bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

export default function HomePage() {
  const { firestore } = useFirebase();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(20));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  const items: { type: 'post' | 'ad'; data: any }[] = [];

  if (posts) {
    posts.forEach((post, index) => {
      items.push({ type: 'post', data: post });
      if ((index + 1) % 4 === 0) {
        items.push({
          type: 'ad',
          data: {
            id: `ad-${index}`,
            brandName: "A.snap Premium",
            brandLogo: "/logo.svg",
            mediaUrl: "https://picsum.photos/seed/ad/600/1000",
            caption: "Experience the world in full screen. Join the community today!",
            ctaText: "Join Now",
            ctaUrl: "/signup"
          }
        });
      }
    });
  }

  return (
    <div className="h-screen bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
      {isLoading ? (
        <div className="flex h-full items-center justify-center text-white">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
      ) : items.length > 0 ? (
        items.map((item, idx) => (
          <div key={idx} className="h-screen w-full snap-start snap-always">
            {item.type === 'post' ? (
              <PostCard post={item.data} />
            ) : (
              <SponsoredCard ad={item.data} />
            )}
          </div>
        )
      )) : (
        <div className="flex h-full items-center justify-center text-white p-10 text-center">
            <p className="text-muted-foreground">No posts yet. Be the first to share your world!</p>
        </div>
      )}
      <PwaInstallPrompt />
      <BottomNav />
    </div>
  );
}
