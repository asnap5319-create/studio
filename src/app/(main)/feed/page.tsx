
'use client';

import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collectionGroup, query, orderBy, collection } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import { SponsoredCard } from '@/components/sponsored-card';
import type { Post } from '@/models/post';
import type { Notification } from '@/models/notification';
import Link from 'next/link';
import { Heart, Database, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

const AD_UNIT_ID = process.env.NEXT_PUBLIC_ADMOB_UNIT_ID || 'ca-app-pub-6100214178274409/8382187974';
const AD_APP_ID = process.env.NEXT_PUBLIC_ADMOB_APP_ID || 'ca-app-pub-6100214178274409~7603458775';

const MOCK_ADS = [
  {
    id: 'ad_1',
    brandName: 'A.snap Premium',
    brandLogo: 'https://picsum.photos/seed/asnap_logo_final/100/100',
    mediaUrl: 'https://res.cloudinary.com/demo/video/upload/w_1280,h_720,c_fill/dog.mp4',
    caption: 'Be the star of A.snap! Upgrade to Premium today and unlock exclusive AI filters and 4K uploads. #AsnapPremium #ShortVideo',
    ctaText: 'Upgrade Now',
    ctaUrl: '/profile',
    isVideo: true,
    adUnitId: AD_UNIT_ID,
  }
];

export default function FeedPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: posts, isLoading, error } = useCollection<Post>(postsQuery);

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const feedItems = useMemo(() => {
    if (!posts) return [];
    const items = [];
    let adIndex = 0;
    posts.forEach((post, index) => {
      items.push({ type: 'post' as const, data: post });
      // Ads appear every 3 videos as requested (2 se 3 video ke baad)
      if ((index + 1) % 3 === 0) {
        items.push({ type: 'ad' as const, data: MOCK_ADS[adIndex] });
        adIndex = (adIndex + 1) % MOCK_ADS.length;
      }
    });
    return items;
  }, [posts]);

  const handleRefresh = () => {
    router.refresh();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mb-4"></div>
        <p className="font-medium animate-pulse">Loading A.snap Feed...</p>
      </div>
    );
  }

  if (error && (error.message.includes('index') || error.message.includes('INDEX'))) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white bg-black p-8 text-center max-w-lg mx-auto">
        <div className="p-4 bg-primary/10 rounded-full mb-6">
          <Database className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-4">बस थोड़ा सा इंतज़ार, भाई!</h2>
        <p className="text-muted-foreground mb-6 text-lg">
          Google के सर्वर इंडेक्स बना रहे हैं। इसमें 2 से 5 मिनट का समय लगता है।
        </p>
        <Button onClick={handleRefresh} className="w-full py-6 text-lg font-bold flex gap-2">
            <RefreshCw className="h-5 w-5" />
            रिफ्रेश करें
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col text-white bg-black" data-ad-app-id={AD_APP_ID}>
       <header className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-lg sticky top-0 z-20 shrink-0 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center bg-[#0a0a0a]">
                 <svg viewBox="0 0 512 512" className="w-7 h-7">
                    <defs>
                      <linearGradient id="headerGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ff0080" stopOpacity="1" />
                        <stop offset="50%" stopColor="#ff3366" stopOpacity="1" />
                        <stop offset="100%" stopColor="#ffcc33" stopOpacity="1" />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M150 400 L256 100 L362 400 M210 320 L302 320" 
                      stroke="url(#headerGrad)" 
                      strokeWidth="60" 
                      fill="none" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                    <circle cx="390" cy="120" r="35" fill="#ff0080" />
                 </svg>
              </div>
              <h1 className="text-2xl font-black text-primary italic tracking-tighter" style={{filter: 'drop-shadow(0 0 8px hsl(var(--primary)))'}}>
                  A.snap
              </h1>
            </div>
            <div className="flex items-center gap-5">
                <Link href="/notifications" className="relative hover:scale-110 transition-transform">
                    <Heart className="h-7 w-7 text-white" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                </Link>
                <Link href="/messages" className="hover:scale-110 transition-transform">
                    <Send className="h-7 w-7 text-white -rotate-12" />
                </Link>
            </div>
      </header>

      <div className="flex-1 w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide">
        {feedItems.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
                <h2 className="text-2xl font-bold">Welcome to A.snap!</h2>
                <p className="text-muted-foreground mt-2">बी द फर्स्ट टू क्रिएट ए पोस्ट!</p>
                <Button asChild className="mt-8 px-8 py-6 text-lg font-bold" variant="default">
                  <Link href="/create">Create First Post</Link>
                </Button>
            </div>
        )}
        
        {feedItems.map((item, idx) => (
            <div key={`${item.type}-${idx}`} className="h-full w-full snap-start flex items-center justify-center bg-black">
                {item.type === 'post' ? (
                  <PostCard post={item.data} />
                ) : (
                  <SponsoredCard ad={item.data} />
                )}
            </div>
        ))}
      </div>
    </div>
  );
}
