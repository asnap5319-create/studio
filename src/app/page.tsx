'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import { Loader2, MessageCircle, Bell, RefreshCw } from 'lucide-react';
import type { Post } from '@/models/post';
import { BottomNav } from "@/components/bottom-nav";
import Link from 'next/link';
import { useState, useEffect, useCallback, memo } from 'react';

const MemoizedPostCard = memo(PostCard);

export default function HomePage() {
  const { firestore } = useFirebase();
  const [displayItems, setDisplayItems] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(100));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  // Shuffle algorithm for dynamic feed - Fisher-Yates
  const shuffleFeed = useCallback((items: Post[]) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const buildFeed = useCallback(() => {
    if (!posts || posts.length === 0) return;
    setIsRefreshing(true);
    
    // Smooth transition effect
    setTimeout(() => {
      const shuffled = shuffleFeed(posts);
      setDisplayItems(shuffled);
      setIsRefreshing(false);
      // Scroll to top on refresh
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 400);
  }, [posts, shuffleFeed]);

  useEffect(() => {
    if (hasMounted && posts && posts.length > 0 && displayItems.length === 0) {
      // Randomize initial load only after mounting
      setDisplayItems(shuffleFeed(posts));
    }
  }, [hasMounted, posts, displayItems.length, shuffleFeed]);

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
            className="p-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 active:rotate-180 transition-transform duration-500 hover:bg-white/10"
          >
            <RefreshCw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="flex items-center gap-4 pointer-events-auto">
          <Link href="/notifications" className="p-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-lg hover:bg-black/60 transition-colors">
            <Bell className="w-6 h-6 text-white" />
          </Link>
          <Link href="/messages" className="p-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-lg hover:bg-black/60 transition-colors">
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
        displayItems.map((post) => (
          <div key={post.id} className="h-screen w-full snap-start snap-always overflow-hidden flex flex-col">
            <MemoizedPostCard post={post} />
          </div>
        ))
      ) : !isLoading && (
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
