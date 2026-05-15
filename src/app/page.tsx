
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
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  const items = useMemo(() => {
    if (!posts || !isClient) return [];

    // Shuffle posts for a fresh feel every time
    const shuffledPosts = [...posts].sort(() => Math.random() - 0.5);
    
    const displayItems: { type: 'post' | 'ad'; data: any }[] = [];

    shuffledPosts.forEach((post, index) => {
      displayItems.push({ type: 'post', data: post });
      
      // INSERT ADS EVERY 2 POSTS FOR MAXIMUM EARNING
      if ((index + 1) % 2 === 0) {
        displayItems.push({
          type: 'ad',
          data: {
            id: `ad-${index}-${post.id}`,
            brandName: "A.snap Premium",
            brandLogo: "/logo.svg",
            mediaUrl: `https://picsum.photos/seed/ad-${index}/600/1000`,
            caption: "Explore world-class products and exclusive offers! Upgrade your style today. #asnap #deals",
            ctaText: "Shop Collection",
            ctaUrl: "https://pl29411112.profitablecpmratenetwork.com/286ef4dc1c3c9afc429b42567c2d2b99/invoke.js",
            adUnitId: '286ef4dc1c3c9afc429b42567c2d2b99'
          }
        });
      }
    });

    return displayItems;
  }, [posts, isClient]);

  return (
    <div className="h-screen bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
        <h1 className="text-3xl font-black text-primary italic tracking-tighter drop-shadow-[0_2px_15px_rgba(var(--primary),0.6)] pointer-events-auto">
          A.snap
        </h1>
        <div className="flex items-center gap-4 pointer-events-auto">
          <Link href="/notifications" className="p-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-lg">
            <Bell className="w-6 h-6 text-white" />
          </Link>
          <Link href="/messages" className="p-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-lg">
            <MessageCircle className="w-6 h-6 text-white" />
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="flex h-screen items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
             <Loader2 className="animate-spin h-12 w-12 text-primary" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 animate-pulse">Loading Feed...</p>
          </div>
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
            <div className="space-y-4">
                <p className="text-muted-foreground font-black uppercase tracking-[0.2em] opacity-30 text-sm">Feed is empty</p>
                <Link href="/create">
                    <button className="bg-primary px-6 py-3 text-white font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-transform">Start Sharing</button>
                </Link>
            </div>
        </div>
      )}
      <PwaInstallPrompt />
      <BottomNav />
    </div>
  );
}
