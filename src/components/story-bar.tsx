'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, where, Timestamp, getDocs } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Plus, Loader2, X, Play } from 'lucide-react';
import type { UserProfile } from '@/models/user';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface StoryItem {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: any;
  overlayText?: string;
  overlayColor?: string;
  overlayPosition?: number;
  overlayX?: number;
}

interface ActiveUserStory {
  id: string; // userId
  userId: string;
  username: string;
  profileImageUrl: string;
  updatedAt: any;
}

export function StoryBar() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  
  const [selectedStoryUser, setSelectedStoryUser] = useState<ActiveUserStory | null>(null);
  const [viewingItems, setViewingItems] = useState<StoryItem[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Fetch active stories (updated within last 24h)
  const storiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return query(
      collection(firestore, 'active_stories'),
      where('updatedAt', '>', Timestamp.fromDate(oneDayAgo)),
      orderBy('updatedAt', 'desc')
    );
  }, [firestore]);

  const { data: activeStories, isLoading } = useCollection<ActiveUserStory>(storiesQuery);

  const { data: currentUserProfile } = useDoc<UserProfile>(useMemoFirebase(() => 
    (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]));

  const handleAddStory = () => {
    // Redirect to unified uploader with mode=story
    router.push('/create?mode=story');
  };

  const handleViewStory = async (storyUser: ActiveUserStory) => {
    if (!firestore) return;
    setSelectedStoryUser(storyUser);
    
    try {
      const itemsQuery = query(
        collection(firestore, 'active_stories', storyUser.userId, 'items'),
        orderBy('createdAt', 'asc')
      );
      
      const snapshot = await getDocs(itemsQuery);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StoryItem));
      
      if (items.length > 0) {
        setViewingItems(items);
        setIsViewerOpen(true);
      }
    } catch (e) {
      console.error("View Story Error:", e);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full bg-background border-b border-border/50 py-4">
      <div className="flex items-center gap-4 px-4 overflow-x-auto scrollbar-hide">
        {/* Your Story Button - Now links to unified uploader */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="relative" onClick={handleAddStory}>
            <button className="w-16 h-16 rounded-full p-[2px] bg-secondary border border-border overflow-hidden active:scale-95 transition-transform">
              <Avatar className="w-full h-full border-2 border-background">
                <AvatarImage src={currentUserProfile?.profileImageUrl} className="object-cover" />
                <AvatarFallback className="bg-secondary text-xs">{currentUserProfile?.username?.[0]}</AvatarFallback>
              </Avatar>
            </button>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center pointer-events-none">
              <Plus className="w-3 h-3 text-white" strokeWidth={4} />
            </div>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Your story</span>
        </div>

        {/* Other Users' Stories */}
        {!isLoading && activeStories?.filter(s => s.userId !== user.uid).map((s) => (
            <div key={s.id} onClick={() => handleViewStory(s)} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-transform">
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                <div className="w-full h-full rounded-full p-[2px] bg-background">
                    <Avatar className="w-full h-full">
                        <AvatarImage src={s.profileImageUrl} className="object-cover" />
                        <AvatarFallback className="bg-secondary text-xs">{s.username?.[0]}</AvatarFallback>
                    </Avatar>
                </div>
              </div>
              <span className="text-[10px] font-medium truncate w-16 text-center">{s.username}</span>
            </div>
        ))}
      </div>

      {/* Story Viewer Dialog (Mimics Reels Player as requested) */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="p-0 border-0 bg-black w-full max-w-lg h-screen flex items-center justify-center overflow-hidden z-[2000]">
            <DialogHeader className="sr-only"><DialogTitle>Story Viewer</DialogTitle></DialogHeader>
            {selectedStoryUser && viewingItems.length > 0 && (
                <div className="relative w-full h-full flex flex-col bg-black">
                    {/* Progress Bar Top */}
                    <div className="absolute top-10 left-0 right-0 px-2 flex gap-1 z-[100]">
                        {viewingItems.map((_, i) => (
                            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                <div className={cn("h-full bg-white transition-all duration-[5000ms] ease-linear", i === 0 ? "w-full" : "w-0")} />
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 w-full h-full flex items-center justify-center relative bg-black">
                        {viewingItems[0].mediaType === 'video' ? (
                            <video 
                              src={viewingItems[0].mediaUrl} 
                              className="w-full h-full object-contain" 
                              autoPlay 
                              playsInline 
                              muted={false} 
                              loop
                              onWaiting={() => setIsBuffering(true)}
                              onPlaying={() => setIsBuffering(false)}
                            />
                        ) : (
                            <img src={viewingItems[0].mediaUrl} className="w-full h-full object-contain" alt="story" />
                        )}

                        {isBuffering && (
                            <div className="absolute inset-0 flex items-center justify-center z-[110]">
                                <Loader2 className="w-10 h-10 text-primary animate-spin opacity-50" />
                            </div>
                        )}

                        {/* Reels Style Overlay Text from Post Database */}
                        {viewingItems[0].overlayText && (
                            <div 
                              className="absolute px-6 text-center pointer-events-none z-20 w-full" 
                              style={{ 
                                top: `${viewingItems[0].overlayPosition ?? 50}%`, 
                                left: `${viewingItems[0].overlayX ?? 50}%`, 
                                transform: 'translate(-50%, -50%)', 
                                color: viewingItems[0].overlayColor || '#ffffff', 
                                textShadow: '0 2px 25px rgba(0,0,0,0.9)' 
                              }}
                            >
                                <p className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
                                    {viewingItems[0].overlayText}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Reels Style Profile Header */}
                    <div className="absolute top-0 left-0 right-0 p-6 z-[150] bg-gradient-to-b from-black/80 via-black/20 to-transparent pt-14">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-white/20 shadow-xl">
                                    <AvatarImage src={selectedStoryUser.profileImageUrl} className="object-cover" />
                                    <AvatarFallback>{selectedStoryUser.username?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-white font-black text-sm drop-shadow-md">@{selectedStoryUser.username}</span>
                                    <span className="text-[8px] text-white/60 font-bold uppercase tracking-widest">A.snap Story</span>
                                </div>
                            </div>
                            <button onClick={() => setIsViewerOpen(false)} className="text-white bg-black/20 backdrop-blur-md p-2 rounded-full border border-white/10">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
