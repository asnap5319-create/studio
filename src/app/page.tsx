
'use client';

import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collectionGroup, query, orderBy, collection, where } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import { SponsoredCard } from '@/components/sponsored-card';
import type { Post } from '@/models/post';
import type { Notification } from '@/models/notification';
import type { Message } from '@/models/message';
import Link from 'next/link';
import { Heart, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useEffect } from 'react';
import { BottomNav } from "@/components/bottom-nav";

const MOCK_ADS = [
  {
    id: 'ad_286ef4dc',
    brandName: 'A.snap Premium',
    brandLogo: 'https://picsum.photos/seed/asnap_logo/100/100',
    mediaUrl: '',
    caption: 'Be the star of A.snap! Upgrade to Premium today and unlock exclusive AI filters and 4K uploads. #AsnapPremium',
    ctaText: 'Upgrade Now',
    ctaUrl: '/profile',
    adUnitId: '286ef4dc1c3c9afc429b42567c2d2b99'
  }
];

export default function RootFeedPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [shuffledPosts, setShuffledPosts] = useState<Post[] | null>(null);

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  useEffect(() => {
    if (posts && !shuffledPosts) {
      const shuffled = [...posts].sort(() => Math.random() - 0.5);
      setShuffledPosts(shuffled);
    }
  }, [posts, shuffledPosts]);

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const unreadNotificationsCount = notifications?.filter(n => !n.read).length || 0;

  const unreadMessagesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collectionGroup(firestore, 'messages'),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );
  }, [firestore, user]);

  const { data: unreadMessages } = useCollection<Message>(unreadMessagesQuery);
  const unreadMessagesCount = unreadMessages?.length || 0;

  const feedItems = useMemo(() => {
    if (!shuffledPosts) return [];
    const items = [];
    let adIndex = 0;
    shuffledPosts.forEach((post, index) => {
      items.push({ type: 'post' as const, data: post });
      if ((index + 1) % 3 === 0) {
        items.push({ type: 'ad' as const, data: MOCK_ADS[adIndex] });
        adIndex = (adIndex + 1) % MOCK_ADS.length;
      }
    });
    return items;
  }, [shuffledPosts]);

  if (isLoading || (posts && !shuffledPosts)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-white bg-black">
        <div className="relative">
             <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full"></div>
             <h1 className="text-4xl font-black text-primary italic relative z-10">A.snap</h1>
        </div>
        <p className="mt-6 font-bold tracking-widest uppercase text-[10px] text-primary/60 animate-pulse">Loading Feed...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-screen flex flex-col text-white bg-black overflow-hidden">
       <header className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md absolute top-0 left-0 right-0 z-50 shrink-0 border-b border-white/5">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-primary italic tracking-tighter" style={{filter: 'drop-shadow(0 0 8px hsl(var(--primary)))'}}>
                  A.snap
              </h1>
            </div>
            <div className="flex items-center gap-5">
                {user ? (
                  <>
                    <Link href="/notifications" className="relative hover:scale-110 transition-transform">
                        <Heart className="h-7 w-7 text-white" />
                        {unreadNotificationsCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold">
                            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                          </span>
                        )}
                    </Link>
                    <Link href="/messages" className="relative hover:scale-110 transition-transform">
                        <Send className="h-7 w-7 text-white -rotate-12" />
                        {unreadMessagesCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold">
                            {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                          </span>
                        )}
                    </Link>
                  </>
                ) : (
                  <Button asChild variant="ghost" size="sm" className="bg-primary/20 hover:bg-primary text-white font-bold rounded-full px-4 border border-primary/30">
                    <Link href="/login?auth=true">Log In</Link>
                  </Button>
                )}
            </div>
      </header>

      <div className="flex-1 w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide">
        {feedItems.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center p-10 bg-black">
                <Sparkles className="h-16 w-16 text-primary mb-6 animate-bounce" />
                <h2 className="text-3xl font-black italic tracking-tighter text-white mb-3 uppercase">Welcome to A.snap</h2>
                <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed mb-10">
                    Share your first video and go viral!
                </p>
                <Button asChild className="px-10 py-7 text-lg font-black uppercase rounded-2xl bg-primary shadow-lg shadow-primary/30" variant="default">
                  <Link href="/create">Upload Now</Link>
                </Button>
            </div>
        )}
        
        {feedItems.map((item, idx) => (
            <div key={`${item.type}-${item.data.id}-${idx}`} className="h-full w-full snap-start flex items-center justify-center bg-black overflow-hidden relative">
                {item.type === 'post' ? (
                  <PostCard post={item.data} />
                ) : (
                  <SponsoredCard ad={item.data} />
                )}
            </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
