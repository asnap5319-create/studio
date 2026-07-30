'use client';

import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collectionGroup, query, orderBy, limit, where, doc, setDoc, serverTimestamp, collection, updateDoc, increment } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Plus, BadgeCheck, X, Play, Eye, ChevronLeft, ChevronRight, Heart, Users } from 'lucide-react';
import Link from 'next/link';
import type { Post } from '@/models/post';
import type { UserProfile } from '@/models/user';
import { useDoc } from '@/firebase';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const ADMIN_EMAIL = "asnap5319@gmail.com";
const REVENUE_PER_VIEW = 0.008;

// --- Activity List Sub-component ---
function ActivityList({ postId, postOwnerId, type }: { postId: string, postOwnerId: string, type: 'likes' | 'views' }) {
    const { firestore } = useFirebase();
    const activityQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users', postOwnerId, 'posts', postId, type), orderBy('createdAt', 'desc'));
    }, [firestore, postId, postOwnerId, type]);

    const { data: items, isLoading } = useCollection<any>(activityQuery);

    if (isLoading) return <div className="flex justify-center p-8"><Play className="animate-spin text-primary h-6 w-6" /></div>;

    return (
        <div className="space-y-4 py-4">
            {items?.map((item) => (
                <UserRow key={item.id} userId={item.userId || item.id} timestamp={item.createdAt} />
            ))}
            {(!items || items.length === 0) && (
                <div className="text-center py-10 opacity-40 italic text-sm">No {type} yet</div>
            )}
        </div>
    );
}

function UserRow({ userId, timestamp }: { userId: string, timestamp: any }) {
    const { firestore } = useFirebase();
    const { data: profile } = useDoc<UserProfile>(useMemoFirebase(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]));

    if (!profile) return null;

    return (
        <div className="flex items-center justify-between group px-2">
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={profile.profileImageUrl} className="object-cover" />
                    <AvatarFallback>{profile.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-sm">{profile.username}</span>
                        {profile.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && <BadgeCheck className="h-3 w-3 text-blue-400" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                        {timestamp ? formatDistanceToNow(timestamp.toDate(), { addSuffix: true }) : 'Recently'}
                    </span>
                </div>
            </div>
            <Link href={`/profile/${profile.id}`}>
                <button className="text-[10px] font-black uppercase text-primary border border-primary/20 px-3 py-1 rounded-lg">Profile</button>
            </Link>
        </div>
    );
}

// --- Story Viewer Component ---
function StoryViewer({ 
    posts, 
    initialIndex, 
    onClose 
}: { 
    posts: Post[]; 
    initialIndex: number; 
    onClose: () => void 
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [showActivity, setShowActivity] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const post = posts[currentIndex];
    const { firestore } = useFirebase();
    const { user } = useUser();
    
    const isMyStory = user?.uid === post.userId;
    const viewLoggedRef = useRef<string | null>(null);

    const userRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', post.userId) : null, [firestore, post.userId]);
    const { data: author } = useDoc<UserProfile>(userRef);

    // Auto-advance logic
    useEffect(() => {
        setProgress(0);
        const interval = setInterval(() => {
            if (!showActivity) {
                setProgress((prev) => {
                    if (prev >= 100) {
                        handleNext();
                        return 0;
                    }
                    return prev + 1;
                });
            }
        }, 50); // 5 seconds total (approx)
        return () => clearInterval(interval);
    }, [currentIndex, showActivity]);

    // Record individual view and increment counter
    useEffect(() => {
        if (firestore && user && user.uid !== post.userId && viewLoggedRef.current !== post.id) {
            viewLoggedRef.current = post.id;
            
            const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);
            const viewRef = doc(firestore, 'users', post.userId, 'posts', post.id, 'views', user.uid);
            
            // 1. Record individual person in subcollection
            setDoc(viewRef, {
                userId: user.uid,
                createdAt: serverTimestamp()
            }, { merge: true }).catch(() => {});

            // 2. Increment global counters correctly
            updateDoc(postRef, {
                viewCount: increment(1),
                adImpressions: increment(1),
                estimatedEarnings: increment(REVENUE_PER_VIEW)
            }).catch(() => {});
        }
    }, [currentIndex, firestore, user, post]);

    const handleNext = () => {
        if (currentIndex < posts.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else {
            setCurrentIndex(0);
        }
    };

    const isVideo = post.mediaType === 'video' || post.mediaUrl.includes('/video/upload/');

    return (
        <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Progress Bars */}
            <div className="absolute top-4 inset-x-4 z-[60] flex gap-1">
                {posts.map((_, i) => (
                    <div key={i} className="h-0.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-white transition-all duration-100 ease-linear"
                            style={{ 
                                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%' 
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 inset-x-4 z-[60] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-white/20 shadow-lg">
                        <AvatarImage src={author?.profileImageUrl} className="object-cover" />
                        <AvatarFallback>{author?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-white text-xs font-black uppercase italic drop-shadow-md">
                            {author?.username}
                        </p>
                        <p className="text-[8px] text-white/60 font-bold uppercase tracking-widest">A.snap Story</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40">
                    <X size={20} />
                </button>
            </div>

            {/* Media Content */}
            <div className="relative w-full h-full flex items-center justify-center">
                {isVideo ? (
                    <video 
                        ref={videoRef}
                        src={post.mediaUrl} 
                        className="w-full h-full object-contain" 
                        autoPlay 
                        muted 
                        playsInline 
                        loop
                    />
                ) : (
                    <img src={post.mediaUrl} className="w-full h-full object-contain" alt="" />
                )}

                {/* Navigation Taps */}
                {!showActivity && (
                    <div className="absolute inset-0 flex z-50">
                        <div className="w-[30%] h-full" onClick={handlePrev} />
                        <div className="w-[70%] h-full" onClick={handleNext} />
                    </div>
                )}
            </div>

            {/* Bottom UI / Activity Button */}
            <div className="absolute bottom-10 inset-x-0 z-[60] flex flex-col items-center gap-4">
                {isMyStory ? (
                    <Sheet open={showActivity} onOpenChange={setShowActivity}>
                        <SheetTrigger asChild>
                            <button className="bg-black/40 backdrop-blur-2xl py-3 px-8 rounded-full border border-white/10 flex items-center gap-3 shadow-2xl active:scale-95 transition-all animate-in slide-in-from-bottom-4">
                                <div className="flex -space-x-2 mr-1">
                                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-black"><Eye size={10} className="text-white" /></div>
                                    <div className="h-5 w-5 rounded-full bg-pink-500 flex items-center justify-center border-2 border-black"><Heart size={10} className="text-white fill-white" /></div>
                                </div>
                                <span className="text-[10px] font-black uppercase text-white tracking-widest italic">Activity & Viewers</span>
                            </button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[70vh] p-0 rounded-t-[3rem] bg-background border-none shadow-[0_-10px_50px_rgba(0,0,0,0.5)] z-[1100]">
                            <SheetHeader className="p-6 border-b border-border/50">
                                <SheetTitle className="text-center font-black uppercase italic tracking-tighter text-xl">Reel Activity</SheetTitle>
                            </SheetHeader>
                            <Tabs defaultValue="views" className="w-full h-full flex flex-col">
                                <TabsList className="grid w-full grid-cols-2 bg-secondary/50 rounded-none h-14">
                                    <TabsTrigger value="views" className="font-black uppercase text-[10px] tracking-widest gap-2">
                                        <Eye size={14} /> Viewers ({post.viewCount || 0})
                                    </TabsTrigger>
                                    <TabsTrigger value="likes" className="font-black uppercase text-[10px] tracking-widest gap-2">
                                        <Heart size={14} className="fill-current" /> Likers ({post.likeCount || 0})
                                    </TabsTrigger>
                                </TabsList>
                                <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-hide">
                                    <TabsContent value="views" className="mt-0">
                                        <ActivityList postId={post.id} postOwnerId={post.userId} type="views" />
                                    </TabsContent>
                                    <TabsContent value="likes" className="mt-0">
                                        <ActivityList postId={post.id} postOwnerId={post.userId} type="likes" />
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <div className="bg-black/40 backdrop-blur-xl py-3 px-6 rounded-3xl border border-white/10 inline-flex items-center gap-3 shadow-2xl">
                        <div className="flex items-center gap-1.5">
                            <Eye size={14} className="text-primary" />
                            <span className="text-xs font-black text-white">{post.viewCount || 0}</span>
                        </div>
                        <div className="w-px h-4 bg-white/20" />
                        <span className="text-[10px] font-black uppercase text-white/80 tracking-widest italic">Views</span>
                    </div>
                )}
                
                {post.caption && !showActivity && (
                    <p className="text-white text-[11px] font-medium drop-shadow-md line-clamp-1 opacity-70 px-8 text-center">{post.caption}</p>
                )}
            </div>
        </div>
    );
}

// --- Main Story Bar Component ---
function StoryItem({ 
    userId, 
    latestPostId, 
    onClick,
    isMe = false 
}: { 
    userId: string; 
    latestPostId: string; 
    onClick: () => void;
    isMe?: boolean 
}) {
    const { firestore } = useFirebase();
    const userRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);

    if (!profile) return null;

    const isAdmin = profile.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    return (
        <div 
            onClick={onClick} 
            className="flex flex-col items-center gap-1.5 shrink-0 animate-in fade-in zoom-in duration-500 cursor-pointer"
        >
            <div className="relative group">
                <div className="absolute -inset-[3.5px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-full animate-pulse opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-[68px] w-[68px] rounded-full border-[3px] border-background overflow-hidden bg-secondary">
                    <Avatar className="h-full w-full">
                        <AvatarImage src={profile.profileImageUrl} className="object-cover" />
                        <AvatarFallback className="font-bold">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>
                {isMe && (
                    <div className="absolute bottom-0 right-0 h-5 w-5 bg-blue-500 rounded-full border-2 border-background flex items-center justify-center text-white">
                        <Plus size={12} strokeWidth={4} />
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1 max-w-[75px]">
                <p className="text-[10px] font-bold truncate text-foreground/90">
                    {isMe ? 'Your Reel' : profile.username}
                </p>
                {isAdmin && <BadgeCheck className="h-2.5 w-2.5 text-blue-500" />}
            </div>
        </div>
    );
}

export function StoryBar() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);

    const recentPostsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collectionGroup(firestore, 'posts'), 
            orderBy('createdAt', 'desc'), 
            limit(60)
        );
    }, [firestore]);

    const { data: posts, isLoading } = useCollection<Post>(recentPostsQuery);

    const uniqueUserPosts = useMemo(() => {
        if (!posts) return [];
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        return posts.reduce((acc: Post[], current) => {
            const postTime = current.createdAt?.toMillis() || 0;
            if (now - postTime < twentyFourHours) {
                const alreadyAdded = acc.find(item => item.userId === current.userId);
                if (!alreadyAdded) {
                    return acc.concat([current]);
                }
            }
            return acc;
        }, []);
    }, [posts]);

    return (
        <div className="w-full bg-background/50 border-b border-border/40 py-4 overflow-hidden">
            <div className="flex items-center gap-4 px-4 overflow-x-auto scrollbar-hide">
                {user && !uniqueUserPosts.find(p => p.userId === user.uid) && (
                    <Link href="/create" className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="relative h-[68px] w-[68px] rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-secondary/30">
                            <Plus className="text-muted-foreground" />
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Add Reel</p>
                    </Link>
                )}

                {uniqueUserPosts.map((post, idx) => (
                    <StoryItem 
                        key={post.id} 
                        userId={post.userId} 
                        latestPostId={post.id} 
                        isMe={post.userId === user?.uid}
                        onClick={() => setSelectedStoryIndex(idx)}
                    />
                ))}

                {isLoading && (
                    <div className="flex items-center gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[68px] w-[68px] rounded-full bg-secondary animate-pulse" />
                        ))}
                    </div>
                )}
            </div>

            {/* Full Screen Instagram-style Story Viewer */}
            <Dialog open={selectedStoryIndex !== null} onOpenChange={() => setSelectedStoryIndex(null)}>
                <DialogContent className="p-0 border-0 bg-black w-full max-w-lg h-screen sm:h-[98vh] flex items-center justify-center overflow-hidden z-[1000]">
                    <DialogHeader className="sr-only"><DialogTitle>Story Preview</DialogTitle></DialogHeader>
                    {selectedStoryIndex !== null && (
                        <StoryViewer 
                            posts={uniqueUserPosts} 
                            initialIndex={selectedStoryIndex} 
                            onClose={() => setSelectedStoryIndex(null)} 
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}