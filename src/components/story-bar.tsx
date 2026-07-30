'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, serverTimestamp, addDoc, where, Timestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Plus, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserProfile } from '@/models/user';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface StoryItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: any;
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
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStoryUser, setSelectedStoryUser] = useState<ActiveUserStory | null>(null);
  const [viewingItems, setViewingItems] = useState<StoryItem[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Fetch only users who have active stories (updated within last 24h)
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !firestore || !currentUserProfile) return;

    setIsUploading(true);
    const cloudName = "dipz5jsls";
    const uploadPreset = "video_upload";
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Upload failed');

        const mediaUrl = data.secure_url;
        const storyRef = doc(firestore, 'active_stories', user.uid);
        
        // Update main active story record for user
        await setDoc(storyRef, {
            id: user.uid,
            userId: user.uid,
            username: currentUserProfile.username,
            profileImageUrl: currentUserProfile.profileImageUrl,
            updatedAt: serverTimestamp(),
        }, { merge: true });

        // Add to items subcollection
        await addDoc(collection(firestore, 'active_stories', user.uid, 'items'), {
            mediaUrl,
            mediaType: resourceType,
            createdAt: serverTimestamp(),
        });

        toast({ title: "Story Live! ✨", description: "Your story is now visible to friends." });
    } catch (err: any) {
        toast({ variant: 'destructive', title: "Upload Failed", description: err.message });
    } finally {
        setIsUploading(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleViewStory = async (storyUser: ActiveUserStory) => {
    if (!firestore) return;
    setSelectedStoryUser(storyUser);
    
    // Fetch story items for this user
    const itemsQuery = query(
      collection(firestore, 'active_stories', storyUser.userId, 'items'),
      orderBy('createdAt', 'asc')
    );
    
    // Using simple fetch instead of hook for modal
    const { getDocs } = await import('firebase/firestore');
    const snapshot = await getDocs(itemsQuery);
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StoryItem));
    
    if (items.length > 0) {
      setViewingItems(items);
      setIsViewerOpen(true);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full bg-background border-b border-border/50 py-4">
      <div className="flex items-center gap-4 px-4 overflow-x-auto scrollbar-hide">
        {/* Your Story Button */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="relative">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-16 h-16 rounded-full p-[2px] bg-secondary border border-border overflow-hidden active:scale-95 transition-transform"
            >
              <Avatar className="w-full h-full border-2 border-background">
                <AvatarImage src={currentUserProfile?.profileImageUrl} className="object-cover" />
                <AvatarFallback className="bg-secondary text-xs">{currentUserProfile?.username?.[0]}</AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </button>
            <div 
                className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="w-3 h-3 text-white" strokeWidth={4} />
            </div>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Your story</span>
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" />
        </div>

        {/* Real Active Stories */}
        {isLoading ? (
            <div className="flex gap-4">
                {[1,2,3].map(i => <div key={i} className="w-16 h-16 rounded-full bg-secondary animate-pulse" />)}
            </div>
        ) : (
            activeStories?.filter(s => s.userId !== user.uid).map((s) => (
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
            ))
        )}
      </div>

      {/* Story Viewer Modal */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="p-0 border-0 bg-black w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center overflow-hidden z-[500]">
            <DialogHeader className="sr-only"><DialogTitle>Story Viewer</DialogTitle></DialogHeader>
            
            {selectedStoryUser && viewingItems.length > 0 && (
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Story Header */}
                    <div className="absolute top-10 left-0 right-0 p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/60 to-transparent">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-white/20">
                                <AvatarImage src={selectedStoryUser.profileImageUrl} />
                                <AvatarFallback>{selectedStoryUser.username[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-white font-bold text-sm drop-shadow-md">@{selectedStoryUser.username}</span>
                        </div>
                        <button onClick={() => setIsViewerOpen(false)} className="text-white p-2"><X /></button>
                    </div>

                    {/* Progress Bar (Mock) */}
                    <div className="absolute top-8 left-4 right-4 flex gap-1 z-50">
                        {viewingItems.map((_, i) => (
                            <div key={i} className="h-0.5 flex-1 bg-white/30 overflow-hidden">
                                <div className="h-full bg-white w-full" />
                            </div>
                        ))}
                    </div>

                    {/* Media Content */}
                    <div className="w-full h-full flex items-center justify-center">
                        {viewingItems[0].mediaType === 'video' ? (
                            <video src={viewingItems[0].mediaUrl} className="max-w-full max-h-full" autoPlay playsInline muted loop />
                        ) : (
                            <img src={viewingItems[0].mediaUrl} className="max-w-full max-h-full object-contain" alt="story" />
                        )}
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
