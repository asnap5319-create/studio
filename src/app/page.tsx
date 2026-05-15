
'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import { SponsoredCard } from '@/components/sponsored-card';
import { Loader2, MessageCircle, Bell, RefreshCw } from 'lucide-react';
import type { Post } from '@/models/post';
import { BottomNav } from "@/components/bottom-nav";
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

export default function HomePage() {
  const { firestore } = useFirebase();
  const [displayItems, setDisplayItems] = useState<{ type: 'post' | 'ad'; data: any }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch pool of posts - limit 50 for good randomization coverage
  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  /**
   * Fisher-Yates Shuffle Algorithm for high-performance randomization
   */
  const shuffleArray = useCallback((array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }, []);

  /**
   * Build the feed with shuffled posts and ads interleaved every 2nd post
   */
  const buildFeed = useCallback(() => {
    if (!posts || posts.length === 0) return;

    setIsRefreshing(true);
    
    // Shuffle the current posts for a unique feeling every refresh
    const shuffledPosts = shuffleArray(posts);
    
    const items: { type: 'post' | 'ad'; data: any }[] = [];

    shuffledPosts.forEach((post, index) => {
      items.push({ type: 'post', data: post });
      
      // INSERT ADS EVERY 2nd POST FOR MAX EARNINGS
      if ((index + 1) % 2 === 0) {
        items.push({
          type: 'ad',
          data: {
            id: `ad-${index}-${Math.random().toString(36).substring(7)}`,
            brandName: "A.snap Premium",
            brandLogo: "/logo.svg",
            mediaUrl: `https://picsum.photos/seed/ad-${index}/1080/1920`,
            caption: "Get the best visual experience and exclusive rewards! Upgrade to A.snap Premium today. #asnap #premium",
            ctaText: "Shop Now",
            ctaUrl: "https://pl29411112.profitablecpmratenetwork.com/286ef4dc1c3c9afc429b42567c2d2b99/invoke.js",
            adUnitId: '286ef4dc1c3c9afc429b42567c2d2b99'
          }
        });
      }
    });

    setDisplayItems(items);
    // Smooth transition for refreshing feel
    setTimeout(() => setIsRefreshing(false), 800);
  }, [posts, shuffleArray]);

  // Initial feed build on mount
  useEffect(() => {
    if (posts && posts.length > 0 && displayItems.length === 0) {
      buildFeed();
    }
  }, [posts, buildFeed, displayItems.length]);

  return (
    <div className="h-screen bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative">
      {/* Dynamic Header Overlay */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <h1 className="text-3xl font-black text-primary italic tracking-tighter drop-shadow-[0_2px_15px_rgba(var(--primary),0.6)]">
            A.snap
          </h1>
          <button 
            onClick={buildFeed}
            className="p-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 active:rotate-180 transition-transform duration-500"
          >
            <RefreshCw className={`w-4 h-4 text-white/50 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="flex items-center gap-4 pointer-events-auto">
          <Link href="/notifications" className="p-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-lg">
            <Bell className="w-6 h-6 text-white" />
          </Link>
          <Link href="/messages" className="p-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-lg">
            <MessageCircle className="w-6 h-6 text-white" />
          </Link>
        </div>
      </header>

      {/* Main Reels Feed */}
      {isLoading && displayItems.length === 0 ? (
        <div className="flex h-screen items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
             <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse rounded-full"></div>
                <Loader2 className="animate-spin h-12 w-12 text-primary relative z-10" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 animate-pulse">Building Feed...</p>
          </div>
        </div>
      ) : displayItems.length > 0 ? (
        displayItems.map((item) => (
          <div key={`${item.type}-${item.data.id}`} className="h-screen w-full snap-start snap-always">
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
                <p className="text-muted-foreground font-black uppercase tracking-[0.2em] opacity-30 text-sm">No videos found</p>
                <Link href="/create">
                    <button className="bg-primary px-6 py-3 text-white font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-transform">Start Sharing</button>
                </Link>
            </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  );
}
