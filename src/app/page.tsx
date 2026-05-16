
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

// Instagram Style Ad Variety
const AD_VARIETY = [
  {
    brandName: "Lucky Games Pro",
    brandLogo: "https://picsum.photos/seed/lucky/100/100",
    ctaText: "PLAY NOW",
    adUnitId: "fd68cb6250942c8fd08d481733648461",
    adScriptDomain: "pl29453913.profitablecpmratenetwork.com",
    caption: "WIN EXCITING REWARDS TODAY! Join the ultimate lucky draw challenge and start winning now. 🎮💰✨"
  },
  {
    brandName: "Epic Store",
    brandLogo: "https://picsum.photos/seed/epic/100/100",
    ctaText: "INSTALL NOW",
    adUnitId: "fd68cb6250942c8fd08d481733648461",
    adScriptDomain: "pl29453913.profitablecpmratenetwork.com",
    caption: "Exclusive deals on premium gaming tools. Get limited edition skins and power-ups for free! 🛍️🔥🚀"
  },
  {
    brandName: "Snap Visuals",
    brandLogo: "https://picsum.photos/seed/camera/100/100",
    ctaText: "LEARN MORE",
    adUnitId: "fd68cb6250942c8fd08d481733648461",
    adScriptDomain: "pl29453913.profitablecpmratenetwork.com",
    caption: "Edit your stories like a pro with our AI-powered visual effects. Try it for free today! 🎬✨📸"
  }
];

export default function HomePage() {
  const { firestore } = useFirebase();
  const [displayItems, setDisplayItems] = useState<{ type: 'post' | 'ad'; data: any }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  const shuffleArray = useCallback((array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }, []);

  const buildFeed = useCallback(() => {
    if (!posts || posts.length === 0) return;

    setIsRefreshing(true);
    const shuffledPosts = shuffleArray(posts);
    const items: { type: 'post' | 'ad'; data: any }[] = [];

    shuffledPosts.forEach((post, index) => {
      items.push({ type: 'post', data: post });
      
      // Instagram Style: Insert Ad after every 2nd post
      if ((index + 1) % 2 === 0) {
        const adTemplate = AD_VARIETY[index % AD_VARIETY.length];
        const adId = `ad-${index}-${Math.random().toString(36).substring(7)}`;
        
        items.push({
          type: 'ad',
          data: {
            ...adTemplate,
            id: adId,
            // Direct Link logic to prevent code dumping
            ctaUrl: `https://${adTemplate.adScriptDomain}/fd/68/cb/${adTemplate.adUnitId}` 
          }
        });
      }
    });

    setDisplayItems(items);
    setTimeout(() => setIsRefreshing(false), 800);
  }, [posts, shuffleArray]);

  useEffect(() => {
    if (posts && posts.length > 0 && displayItems.length === 0) {
      buildFeed();
    }
  }, [posts, buildFeed, displayItems.length]);

  return (
    <div className="h-screen bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative touch-pan-y">
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

      {isLoading && displayItems.length === 0 ? (
        <div className="flex h-screen items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
             <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse rounded-full"></div>
                <Loader2 className="animate-spin h-12 w-12 text-primary relative z-10" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80 animate-pulse">Building Feed...</p>
          </div>
        </div>
      ) : displayItems.length > 0 ? (
        displayItems.map((item) => (
          <div key={`${item.type}-${item.data.id}`} className="h-screen w-full snap-start snap-always overflow-hidden flex flex-col">
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
