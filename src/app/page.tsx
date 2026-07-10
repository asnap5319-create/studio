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

  // Speed Fix: Limit initial fetch to 30 posts for 4G speed
  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(30));
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
      if ((index + 1) % 4 === 0) {
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

  if (!hasMounted) return <div className="h-screen bg-background" />;

  return (
    <div className="h-screen bg-background overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-background/90 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-money-pattern rounded-xl flex items-center justify-center border border-black/5 shadow-lg overflow-hidden">
              <Logo className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-primary italic tracking-tighter drop-shadow-sm">
              A.snap
            </h1>
          </div>
          <button 
            onClick={handleRefresh} 
            className={`p-2.5 bg-secondary/50 backdrop-blur-md rounded-full border border-border active:scale-90 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-4 h-4 text-foreground" />
          </button>
        </div>
        
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link href={user ? "/notifications" : "/login?auth=true"} className="relative p-2.5 bg-background/80 backdrop-blur-2xl rounded-full border border-border shadow-lg">
            <Bell className="w-5 h-5 text-foreground" />
            {hasUnreadNotifications && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-600 rounded-full border border-background animate-pulse" />
            )}
          </Link>
          <Link href={user ? "/messages" : "/login?auth=true"} className="relative p-2.5 bg-background/80 backdrop-blur-2xl rounded-full border border-border shadow-lg">
            <MessageCircle className="w-5 h-5 text-foreground" />
            {hasUnreadMessages && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-600 rounded-full border border-background animate-pulse" />
            )}
          </Link>
        </div>
      </header>

      {isLoading && displayItems.length === 0 ? (
        <div className="flex h-screen items-center justify-center bg-background" />
      ) : displayItems.length > 0 ? (
        displayItems.map((item) => {
          if ('type' in item && item.type === 'ad') {
            return (
              <div key={item.id} className="h-screen w-full snap-start snap-always overflow-hidden flex flex-col shrink-0 will-change-transform">
                <NativeAdCard />
              </div>
            );
          }
          const post = item as Post;
          return (
            <div key={post.id} className="h-screen w-full snap-start snap-always overflow-hidden flex flex-col shrink-0 will-change-transform">
              <MemoizedPostCard post={post} />
            </div>
          );
        })
      ) : !isLoading && (
        <div className="flex h-full items-center justify-center text-foreground p-10 text-center">
            <div className="flex flex-col gap-6 items-center">
              <div className="w-24 h-24 bg-money-pattern rounded-3xl flex items-center justify-center border border-green-600/30 overflow-hidden">
                <Logo className="w-16 h-16 opacity-40" />
              </div>
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
    <Suspense fallback={<div className="h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
