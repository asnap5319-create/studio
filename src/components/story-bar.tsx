'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, serverTimestamp, addDoc, where, Timestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Plus, Loader2, X, ChevronLeft, ChevronRight, Type, Palette, SendHorizontal, Check } from 'lucide-react';
import type { UserProfile } from '@/models/user';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface StoryItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: any;
  overlayText?: string;
  overlayColor?: string;
  overlayY?: number;
  overlayX?: number;
}

interface ActiveUserStory {
  id: string; // userId
  userId: string;
  username: string;
  profileImageUrl: string;
  updatedAt: any;
}

const COLORS = [
    { name: 'White', value: '#ffffff' },
    { name: 'Pink', value: '#ff3366' },
    { name: 'Yellow', value: '#fbbf24' },
    { name: 'Cyan', value: '#22d3ee' },
    { name: 'Green', value: '#4ade80' },
    { name: 'Orange', value: '#f97316' }
];

export function StoryBar() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStoryUser, setSelectedStoryUser] = useState<ActiveUserStory | null>(null);
  const [viewingItems, setViewingItems] = useState<StoryItem[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMedia, setEditorMedia] = useState<File | null>(null);
  const [editorPreview, setEditorPreview] = useState<string | null>(null);
  const [editorMediaType, setEditorMediaType] = useState<'image' | 'video' | null>(null);
  
  // Editor Text State
  const [overlayText, setOverlayText] = useState('');
  const [overlayColor, setOverlayColor] = useState('#ffffff');
  const [overlayY, setOverlayY] = useState(50);
  const [overlayX, setOverlayX] = useState(50);
  const [showTextTools, setShowTextTools] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditorMedia(file);
    setEditorPreview(URL.createObjectURL(file));
    setEditorMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    setIsEditorOpen(true);
    
    // Reset editor tools
    setOverlayText('');
    setOverlayColor('#ffffff');
    setOverlayY(50);
    setOverlayX(50);
    setShowTextTools(false);
  };

  const handleUploadStory = async () => {
    if (!editorMedia || !user || !firestore || !currentUserProfile) return;

    setIsUploading(true);
    const cloudName = "dipz5jsls";
    const uploadPreset = "video_upload";
    const resourceType = editorMediaType === 'video' ? 'video' : 'image';

    try {
        const formData = new FormData();
        formData.append('file', editorMedia);
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
            overlayText: overlayText.trim() || null,
            overlayColor,
            overlayY,
            overlayX
        });

        toast({ title: "Story Live! ✨", description: "Your story is now visible to friends." });
        setIsEditorOpen(false);
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
              className="w-16 h-16 rounded-full p-[2px] bg-secondary border border-border overflow-hidden active:scale-95 transition-transform"
            >
              <Avatar className="w-full h-full border-2 border-background">
                <AvatarImage src={currentUserProfile?.profileImageUrl} className="object-cover" />
                <AvatarFallback className="bg-secondary text-xs">{currentUserProfile?.username?.[0]}</AvatarFallback>
              </Avatar>
            </button>
            <div 
                className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center cursor-pointer pointer-events-none"
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

      {/* STORY EDITOR MODAL */}
      <Dialog open={isEditorOpen} onOpenChange={(open) => !isUploading && setIsEditorOpen(open)}>
        <DialogContent className="p-0 border-0 bg-black w-full max-w-lg h-screen sm:h-[90vh] flex flex-col items-center justify-center overflow-hidden z-[600]">
            <DialogHeader className="sr-only"><DialogTitle>Edit Story</DialogTitle></DialogHeader>
            
            <div className="relative w-full h-full flex flex-col">
                {/* Media Preview */}
                <div className="flex-1 relative bg-black flex items-center justify-center">
                    {editorMediaType === 'video' ? (
                        <video src={editorPreview!} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                    ) : (
                        <img src={editorPreview!} className="w-full h-full object-cover" alt="Editor Preview" />
                    )}

                    {/* Text Overlay Preview */}
                    {overlayText && (
                        <div 
                            className="absolute px-4 text-center pointer-events-none z-20"
                            style={{ 
                                top: `${overlayY}%`, 
                                left: `${overlayX}%`,
                                transform: 'translate(-50%, -50%)',
                                color: overlayColor,
                                textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                            }}
                        >
                            <p className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                {overlayText}
                            </p>
                        </div>
                    )}

                    {/* Editor Toolbar */}
                    <div className="absolute top-10 right-6 flex flex-col gap-4 z-50">
                        <button 
                            onClick={() => setShowTextTools(!showTextTools)}
                            className={cn("p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 transition-all", showTextTools && "bg-white text-black")}
                        >
                            <Type className="h-6 w-6" />
                        </button>
                    </div>

                    <button 
                        onClick={() => setIsEditorOpen(false)}
                        className="absolute top-10 left-6 p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white z-50"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Bottom Action Bar */}
                <div className="absolute bottom-10 left-0 right-0 px-6 flex items-center justify-between z-50">
                    <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarImage src={currentUserProfile?.profileImageUrl} /></Avatar>
                        <span className="text-[10px] font-bold uppercase text-white tracking-widest">Your Story</span>
                    </div>

                    <button 
                        onClick={handleUploadStory}
                        disabled={isUploading}
                        className="h-14 px-8 bg-white text-black font-black uppercase text-xs rounded-full flex items-center gap-3 shadow-2xl active:scale-95 transition-all"
                    >
                        {isUploading ? <Loader2 className="animate-spin" /> : <>Share <SendHorizontal size={18} /></>}
                    </button>
                </div>

                {/* Text Editing Tools Overlay */}
                {showTextTools && (
                    <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-white font-black uppercase text-xs tracking-widest italic">Edit Content</h3>
                            <button onClick={() => setShowTextTools(false)} className="text-primary font-black uppercase text-xs">Done</button>
                        </div>

                        <div className="space-y-8 flex-1 flex flex-col justify-center">
                            <Input 
                                placeholder="Type something..."
                                value={overlayText}
                                onChange={(e) => setOverlayText(e.target.value)}
                                className="h-16 bg-white/5 border-white/10 rounded-2xl text-center text-xl font-black text-white"
                                autoFocus
                                maxLength={80}
                            />

                            {overlayText && (
                                <div className="space-y-10 animate-in zoom-in duration-500">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <span className="text-[9px] font-black uppercase text-white/50 tracking-widest">Vertical Position</span>
                                            <Slider value={[overlayY]} onValueChange={(v) => setOverlayY(v[0])} max={100} />
                                        </div>
                                        <div className="space-y-4">
                                            <span className="text-[9px] font-black uppercase text-white/50 tracking-widest">Horizontal Position</span>
                                            <Slider value={[overlayX]} onValueChange={(v) => setOverlayX(v[0])} max={100} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <span className="text-[9px] font-black uppercase text-white/50 tracking-widest flex items-center gap-2"><Palette size={10} /> Color Theme</span>
                                        <div className="flex justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
                                            {COLORS.map((c) => (
                                                <button 
                                                    key={c.name}
                                                    onClick={() => setOverlayColor(c.value)}
                                                    className={cn(
                                                        "w-10 h-10 rounded-full border-2 transition-all transform active:scale-75",
                                                        overlayColor === c.value ? "border-white scale-110 shadow-lg shadow-white/20" : "border-transparent opacity-60"
                                                    )}
                                                    style={{ backgroundColor: c.value }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>

      {/* STORY VIEWER MODAL */}
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
                            <div key={i} className="h-0.5 flex-1 bg-white/30 overflow-hidden rounded-full">
                                <div className="h-full bg-white w-full" />
                            </div>
                        ))}
                    </div>

                    {/* Media Content */}
                    <div className="w-full h-full flex items-center justify-center relative">
                        {viewingItems[0].mediaType === 'video' ? (
                            <video src={viewingItems[0].mediaUrl} className="w-full h-full object-cover" autoPlay playsInline muted loop />
                        ) : (
                            <img src={viewingItems[0].mediaUrl} className="w-full h-full object-cover" alt="story" />
                        )}

                        {/* Story Overlay Text Display */}
                        {viewingItems[0].overlayText && (
                            <div 
                                className="absolute px-4 text-center pointer-events-none z-20 w-full"
                                style={{ 
                                    top: `${viewingItems[0].overlayY ?? 50}%`, 
                                    left: `${viewingItems[0].overlayX ?? 50}%`,
                                    transform: 'translate(-50%, -50%)',
                                    color: viewingItems[0].overlayColor || '#ffffff',
                                    textShadow: '0 2px 20px rgba(0,0,0,0.9)'
                                }}
                            >
                                <p className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
                                    {viewingItems[0].overlayText}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
