'use client';

import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collectionGroup, query, orderBy, collection, where } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import { SponsoredCard } from '@/components/sponsored-card';
import type { Post } from '@/models/post';
import type { Notification } from '@/models/notification';
import type { Message } from '@/models/message';
import Link from 'next/link';
import { Heart, Database, RefreshCw, Send, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';

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
  const [shuffledPosts, setShuffledPosts] = useState<Post[] | null>(null);

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: posts, isLoading, error: postsError } = useCollection<Post>(postsQuery);

  // Shuffle posts once when they load
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

  const { data: unreadMessages, error: messagesError } = useCollection<Message>(unreadMessagesQuery);
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

  const handleRefresh = () => {
    window.location.reload();
  };

  const anyError = postsError || messagesError;
  const isIndexError = anyError?.message?.includes('index') || anyError?.message?.includes('INDEX');
  const indexLink = anyError?.message?.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];

  if (isLoading || (posts && !shuffledPosts)) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mb-4"></div>
        <p className="font-medium animate-pulse">Loading A.snap Feed...</p>
      </div>
    );
  }

  if (isIndexError) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white bg-black p-8 text-center max-w-lg mx-auto">
        <div className="p-4 bg-primary/10 rounded-full mb-6">
          <Database className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-4">इंडेक्स बनाना पड़ेगा भाई!</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Google को कुछ खास डेटा दिखाने के लिए "Index" की ज़रूरत है। नीचे दिए गए बटन पर क्लिक करें और 'Create Index' दबाएं।
        </p>
        <div className="flex flex-col gap-3 w-full">
            {indexLink && (
                <Button asChild className="w-full py-6 text-lg font-bold flex gap-2" variant="default">
                    <a href={indexLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-5 w-5" />
                        1. यहाँ क्लिक करें (Create Index)
                    </a>
                </Button>
            )}
            <Button onClick={handleRefresh} variant="outline" className="w-full py-6 text-lg font-bold flex gap-2">
                <RefreshCw className="h-5 w-5" />
                2. बनाने के बाद रिफ्रेश करें
            </Button>
        </div>
        <div className="mt-8 text-[10px] opacity-20 break-all font-mono text-left bg-zinc-900 p-2 rounded">
            {anyError?.message}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full flex flex-col text-white bg-black" data-ad-app-id={AD_APP_ID}>
       <header className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md absolute top-0 left-0 right-0 z-50 shrink-0 border-b border-white/5">
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
                  <Button asChild variant="ghost" size="sm" className="bg-primary/20 hover:bg-primary text-white font-bold rounded-full px-4 border border-primary/30 transition-all active:scale-95">
                    <Link href="/login">Log In</Link>
                  </Button>
                )}
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
            <div key={`${item.type}-${item.data.id}-${idx}`} className="h-full w-full snap-start flex items-center justify-center bg-black overflow-hidden">
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
