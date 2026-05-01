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

// Mock Ads Data (In a real app, this would come from an Ads Service or Firestore)
const MOCK_ADS = [
  {
    id: 'ad_1',
    brandName: 'A.snap Pro',
    brandLogo: 'https://picsum.photos/seed/adslogo/100/100',
    mediaUrl: 'https://res.cloudinary.com/demo/video/upload/w_1280,h_720,c_fill/dog.mp4',
    caption: 'Upgrade to A.snap Premium and get exclusive filters and longer videos! #AsnapPro #Premium',
    ctaText: 'Get Premium Now',
    ctaUrl: '/profile',
    isVideo: true,
  },
  {
    id: 'ad_2',
    brandName: 'Nike',
    brandLogo: 'https://picsum.photos/seed/nike/100/100',
    mediaUrl: 'https://picsum.photos/seed/nikead/1080/1920',
    caption: 'Just Do It. Check out the latest collection of sneakers designed for the next generation.',
    ctaText: 'Shop Now',
    ctaUrl: 'https://nike.com',
    isVideo: false,
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
  const hasUnread = notifications?.some(n => !n.read);

  // Logic to interleave Ads into the posts feed
  const feedItems = useMemo(() => {
    if (!posts) return [];
    
    const items = [];
    let adIndex = 0;

    posts.forEach((post, index) => {
      items.push({ type: 'post' as const, data: post });
      
      // Insert an ad every 3 posts
      if ((index + 1) % 3 === 0 && adIndex < MOCK_ADS.length) {
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
        <p className="font-medium">Loading your feed...</p>
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
    <div className="h-full w-full max-w-lg mx-auto flex flex-col text-white bg-black">
       <header className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-lg sticky top-0 z-20 shrink-0 border-b border-white/5">
            <h1 className="text-2xl font-black text-primary italic tracking-tighter" style={{filter: 'drop-shadow(0 0 8px hsl(var(--primary)))'}}>
                A.snap
            </h1>
            <div className="flex items-center gap-5">
                <Link href="/notifications" className="relative hover:scale-110 transition-transform">
                    <Heart className="h-7 w-7 text-white" />
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-600 rounded-full border-2 border-black animate-pulse" />
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
            <div key={item.type === 'post' ? item.data.id : item.data.id} className="h-full w-full snap-start flex items-center justify-center bg-black">
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
