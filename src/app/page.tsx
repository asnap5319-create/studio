
'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import { SponsoredCard } from '@/components/sponsored-card';
import { Loader2, MessageCircle, Bell, RefreshCw } from 'lucide-react';
import type { Post } from '@/models/post';
import { BottomNav } from "@/components/bottom-nav";
import Link from 'next/link';
import { useState, useEffect, useCallback, memo } from 'react';

// Adsterra Variety with Real Vertical Video Layout
const AD_VARIETY = [
  {
    brandName: "Lucky Spin Master",
    brandLogo: "https://picsum.photos/seed/lucky/100/100",
    ctaText: "PLAY NOW",
    ctaUrl: "https://pl29453913.profitablecpmratenetwork.com/fd/68/cb/fd68cb6250942c8fd08d481733648461",
    videoUrl: "https://res.cloudinary.com/dipz5jsls/video/upload/v1715851234/ad_video_1.mp4", 
    caption: "JACKPOT! 🎰 You have 3 free spins waiting. Claim your reward and start winning now! 💰🔥✨"
  },
  {
    brandName: "Epic Games Pro",
    brandLogo: "https://picsum.photos/seed/epic/100/100",
    ctaText: "INSTALL NOW",
    ctaUrl: "https://pl29453913.profitablecpmratenetwork.com/fd/68/cb/fd68cb6250942c8fd08d481733648461",
    videoUrl: "https://res.cloudinary.com/dipz5jsls/video/upload/v1715851235/ad_video_2.mp4",
    caption: "Experience the most addictive game of 2024! Play for free and unlock exclusive rewards. 🎮🚀🏆"
  },
  {
    brandName: "Smart Visuals AI",
    brandLogo: "https://picsum.photos/seed/camera/100/100",
    ctaText: "LEARN MORE",
    ctaUrl: "https://pl29453913.profitablecpmratenetwork.com/fd/68/cb/fd68cb6250942c8fd08d481733648461",
    videoUrl: "https://res.cloudinary.com/dipz5jsls/video/upload/v1715851236/ad_video_3.mp4",
    caption: "Transform your reels with AI-powered effects. Get the pro version for free today! 🎬✨📸"
  }
];

const FALLBACK_VIDEO = "https://firebasestorage.googleapis.com/v0/b/studio-8111746683-c1e57.appspot.com/o/ad-fallback.mp4?alt=media";

const MemoizedPostCard = memo(PostCard);
const MemoizedSponsoredCard = memo(SponsoredCard);

export default function HomePage() {
  const { firestore } = useFirebase();
  const [displayItems, setDisplayItems] = useState<{ type: 'post' | 'ad'; data: any }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  const buildFeed = useCallback(() => {
    if (!posts || posts.length === 0) return;

    setIsRefreshing(true);
    
    const items: { type: 'post' | 'ad'; data: any }[] = [];
    posts.forEach((post, index) => {
      items.push({ type: 'post', data: post });
      
      // Insert Ad after every 3rd post
      if ((index + 1) % 3 === 0) {
        const adTemplate = AD_VARIETY[index % AD_VARIETY.length];
        items.push({
          type: 'ad',
          data: {
            ...adTemplate,
            id: `ad-${index}-${Date.now()}`,
            videoUrl: adTemplate.videoUrl || FALLBACK_VIDEO
          }
        });
      }
    });

    setDisplayItems(items);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [posts]);

  useEffect(() => {
    if (posts && posts.length > 0 && displayItems.length === 0) {
      buildFeed();
    }
  }, [posts, buildFeed, displayItems.length]);

  if (!hasMounted) return <div className="h-screen bg-black" />;

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
          <Link href="/notifications" className="p-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-lg">
            <Bell className="w-6 h-6 text-white" />
          </Link>
          <Link href="/messages" className="p-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-lg">
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
          <div key={item.data.id} className="h-screen w-full snap-start snap-always overflow-hidden flex flex-col">
            {item.type === 'post' ? (
              <MemoizedPostCard post={item.data} />
            ) : (
              <MemoizedSponsoredCard ad={item.data} />
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
