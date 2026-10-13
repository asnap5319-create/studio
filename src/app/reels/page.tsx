
'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import { Loader2, Clapperboard, Sparkles } from 'lucide-react';
import type { Post } from '@/models/post';
import { BottomNav } from '@/components/bottom-nav';

/**
 * Reels Feed Page
 * Displays a full-screen vertical scroll of short videos.
 * Perfect for the user's Ramayan/Religious edits.
 */
export default function ReelsPage() {
  const { firestore } = useFirebase();

  const reelsQuery = useMemoFirebase(() => 
    firestore ? query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore]
  );

  const { data: posts, isLoading } = useCollection<Post>(reelsQuery);

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <Loader2 className="animate-spin text-primary h-12 w-12 relative z-10" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary animate-pulse">A.snap Reels</p>
            <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Loading Premium Content...</p>
          </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black overflow-hidden relative">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 pt-10 flex justify-center items-center pointer-events-none">
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
             <Sparkles size={12} className="text-primary fill-primary" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Following</span>
             <div className="w-1 h-1 bg-white/30 rounded-full mx-1" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">For You</span>
          </div>
      </div>

      <div className="h-full w-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="h-full w-full snap-start snap-always">
              <PostCard post={post} />
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 gap-6">
            <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10">
                <Clapperboard className="w-12 h-12 text-muted-foreground opacity-20" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-black uppercase italic text-white/40 tracking-tight">Feed is Empty</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest max-w-[200px] mx-auto leading-relaxed">
                    अभिषेक भाई, रामायण की पहली वीडियो अपलोड करो और जलवा दिखाओ! 🎬
                </p>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
