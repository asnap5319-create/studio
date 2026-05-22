'use client';

import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collectionGroup, query, orderBy, limit, where } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import { NativeAdCard } from '@/components/native-ad-card';
import { Loader2, MessageCircle, Bell, RefreshCw } from 'lucide-react';
import type { Post } from '@/models/post';
import type { Notification } from '@/models/notification';
import type { Message } from '@/models/message';
import { BottomNav } from "@/components/bottom-nav";
import Link from 'next/link';
import { useState, useEffect, useCallback, memo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Logo } from '@/components/pwa-install-prompt';
import { useToast } from '@/hooks/use-toast';

const MemoizedPostCard = memo(PostCard);

function HomeContent() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get('postId');

  const [displayItems, setDisplayItems] = useState<(Post | { type: 'ad'; id: string })[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => { setHasMounted(true); }, []);

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(100));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  const unreadNotificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collectionGroup(firestore, 'notifications'),
      where('recipientId', '==', user.uid),
      where('read', '==', false),
      limit(1)
    );
  }, [firestore, user]);

  const unreadMessagesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collectionGroup(firestore, 'messages'),
      where('recipientId', '==', user.uid),
      where('read', '==', false),
      limit(1)
    );
  }, [firestore, user]);

  const { data: unreadNotifications } = useCollection<Notification>(unreadNotificationsQuery);
  const { data: unreadMessages } = useCollection<Message>(unreadMessagesQuery);

  const hasUnreadNotifications = !!(user && unreadNotifications && unreadNotifications.length > 0);
  const hasUnreadMessages = !!(user && unreadMessages && unreadMessages.length > 0);

  const buildItems = useCallback((items: Post[], focusId?: string | null) => {
    if (!items.length) return [];
    
    let list = [...items];
    
    if (focusId) {
      const focusIndex = list.findIndex(p => p.id === focusId);
      if (focusIndex > -1) {
        const [focusedPost] = list.splice(focusIndex, 1);
        list.sort(() => Math.random() - 0.5);
        list = [focusedPost, ...list];
      } else {
        list.sort(() => Math.random() - 0.5);
      }
    } else {
      list.sort(() => Math.random() - 0.5);
    }

    const result: (Post | { type: 'ad'; id: string })[] = [];
    list.forEach((post, index) => {
      result.push(post);
      if ((index + 1) % 4 === 0) { // Spread ads more to focus on reels
        result.push({ type: 'ad', id: `ad-${index}-${Date.now()}` });
      }
    });
    return result;
  }, []);

  useEffect(() => {
    if (hasMounted && posts && posts.length > 0) {
      if (displayItems.length === 0 || targetPostId) {
        setDisplayItems(buildItems(posts, targetPostId));
      }
    }
  }, [hasMounted, posts, buildItems, targetPostId, displayItems.length]);

  const handleRefresh = useCallback(() => {
    if (!posts || posts.length === 0) return;
    setIsRefreshing(true);
    
    setTimeout(() => {
      setDisplayItems(buildItems(posts));
      setIsRefreshing(false);
      toast({ title: "Feed Refreshed! ✨" });
    }, 600);
  }, [posts, buildItems, toast]);

  if (!hasMounted) return <div className="h-screen bg-black" />;

  return (
    <div className="h-screen bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Logo className="w-10 h-10 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
            <h1 className="text-2xl font-black text-primary italic tracking-tighter drop-shadow-[0_2px_15px_rgba(34,197,94,0.6)]">
              A.snap
            </h1>
          </div>
          <button 
            onClick={handleRefresh} 
            className={`p-2.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 active:scale-90 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        </div>
        
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link href={user ? "/notifications" : "/login?auth=true"} className="relative p-2.5 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-lg">
            <Bell className="w-5 h-5 text-white" />
            {hasUnreadNotifications && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-600 rounded-full border border-black animate-pulse" />
            )}
          </Link>
          <Link href={user ? "/messages" : "/login?auth=true"} className="relative p-2.5 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-lg">
            <MessageCircle className="w-5 h-5 text-white" />
            {hasUnreadMessages && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-600 rounded-full border border-black animate-pulse" />
            )}
          </Link>
        </div>
      </header>

      {isLoading && displayItems.length === 0 ? (
        <div className="flex h-screen items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
             <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-green-500/20 animate-pulse rounded-full"></div>
                <Logo className="w-20 h-20 animate-pulse relative z-10" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/80 animate-pulse mt-4">Loading Reels...</p>
          </div>
        </div>
      ) : displayItems.length > 0 ? (
        displayItems.map((item) => {
          if ('type' in item && item.type === 'ad') {
            return (
              <div key={item.id} className="h-screen w-full snap-start snap-always overflow-hidden flex flex-col shrink-0">
                <NativeAdCard />
              </div>
            );
          }
          const post = item as Post;
          return (
            <div key={post.id} className="h-screen w-full snap-start snap-always overflow-hidden flex flex-col shrink-0">
              <MemoizedPostCard post={post} />
            </div>
          );
        })
      ) : !isLoading && (
        <div className="flex h-full items-center justify-center text-white p-10 text-center">
            <div className="flex flex-col gap-6 items-center">
              <Logo className="w-24 h-24 text-primary opacity-20" />
              <Link href={user ? "/create" : "/login?auth=true"}>
                <button className="bg-primary px-8 py-4 text-white font-black uppercase rounded-2xl shadow-2xl">
                  Upload First Reel
                </button>
              </Link>
            </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
