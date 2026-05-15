'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import { SponsoredCard } from '@/components/sponsored-card';
import { Loader2, MessageCircle, Bell } from 'lucide-react';
import type { Post } from '@/models/post';
import { BottomNav } from "@/components/bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';

export default function HomePage() {
  const { firestore } = useFirebase();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(40));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  const items = useMemo(() => {
    if (!posts || !isClient) return [];

    // Create a copy and shuffle the posts array for random feed every visit
    const shuffledPosts = [...posts].sort(() => Math.random() - 0.5);
    
    const displayItems: { type: 'post' | 'ad'; data: any }[] = [];

    shuffledPosts.forEach((post, index) => {
      displayItems.push({ type: 'post', data: post });
      
      // Insert an ad every 2 posts as requested for better earning
      if ((index + 1) % 2 === 0) {
        displayItems.push({
          type: 'ad',
          data: {
            id: `ad-${index}-${post.id}`,
            brandName: "A.snap Premium",
            brandLogo: "/logo.svg",
            mediaUrl: `https://picsum.photos/seed/ad-${index}/600/1000`,
            caption: "Experience the world in full screen. Join the A.snap community today for an ad-free premium experience!",
            ctaText: "Unlock Now",
            ctaUrl: "/signup",
            adUnitId: '286ef4dc1c3c9afc429b42567c2d2b99'
          }
        });
      }
    });

    return displayItems;
  }, [posts, isClient]);

  return (
    <div className="h-screen bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative">
      {/* Top Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <h1 className="text-2xl font-black text-primary italic tracking-tighter drop-shadow-[0_2px_10px_rgba(var(--primary),0.5)] pointer-events-auto">
          A.snap
        </h1>
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link href="/notifications" className="p-2.5 bg-black/30 backdrop-blur-xl rounded-full border border-white/10 hover:bg-black/50 transition-all active:scale-90">
            <Bell className="w-6 h-6 text-white" />
          </Link>
          <Link href="/messages" className="p-2.5 bg-black/30 backdrop-blur-xl rounded-full border border-white/10 hover:bg-black/50 transition-all active:scale-90">
            <MessageCircle className="w-6 h-6 text-white" />
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="flex h-full items-center justify-center text-white">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
      ) : items.length > 0 ? (
        items.map((item, idx) => (
          <div key={`${item.type}-${item.data.id || idx}`} className="h-screen w-full snap-start snap-always">
            {item.type === 'post' ? (
              <PostCard post={item.data} />
            ) : (
              <SponsoredCard ad={item.data} />
            )}
          </div>
        )
      )) : !isLoading && (
        <div className="flex h-full items-center justify-center text-white p-10 text-center">
            <p className="text-muted-foreground font-bold uppercase tracking-widest opacity-30">No posts yet. Share your world!</p>
        </div>
      )}
      <PwaInstallPrompt />
      <BottomNav />
    </div>
  );
}
