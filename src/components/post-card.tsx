
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Post } from '@/models/post';
import type { UserProfile } from '@/models/user';
import { useDoc, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc, increment, writeBatch, serverTimestamp, collection, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, Share2, BadgeCheck, Loader2, MoreVertical, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CommentSection } from './comment-section';
import { ShareSheet } from './share-sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface PostCardProps {
  post: Post;
  isFocused?: boolean; 
}

const ADMIN_EMAIL = "asnap5319@gmail.com";
let globalMuted = true; // Maintains mute state across reels
const REVENUE_PER_VIEW = 0.008;

export function PostCard({ post, isFocused = false }: PostCardProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewCounted = useRef(false);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(globalMuted); 
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [showMuteIndicator, setShowMuteIndicator] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount || 0);

  const isOwnPost = user?.uid === post.userId;
  const isCurrentUserAdmin = user?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const authorRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'users', post.userId);
  }, [firestore, post.userId]);

  const { data: author } = useDoc<UserProfile>(authorRef);
  const isProfileAdmin = author?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const likeRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', post.userId, 'posts', post.id, 'likes', user.uid);
  }, [firestore, user?.uid, post.userId, post.id]);

  const { data: likeData } = useDoc(likeRef);
  const isLiked = !!likeData;

  const followCheckRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !post.userId) return null;
    return doc(firestore, 'user_followers', post.userId, 'followers', user.uid);
  }, [firestore, user?.uid, post.userId]);
  const { data: followData } = useDoc(followCheckRef);
  const isFollowing = !!followData;

  // Sync like count when post data updates
  useEffect(() => {
    setLocalLikeCount(post.likeCount || 0);
  }, [post.likeCount]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newMuteState = !isMuted;
    globalMuted = newMuteState;
    
    // Applying to all videos to ensure sync
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => { (v as HTMLVideoElement).muted = newMuteState; });
    
    setIsMuted(newMuteState);
    setShowMuteIndicator(true);
    setTimeout(() => setShowMuteIndicator(false), 1000);
  }, [isMuted]);

  const handleLikeToggle = async () => {
    if (!user) {
      router.push('/login?auth=true');
      return;
    }
    if (!firestore || isLiking) return;
    
    setIsLiking(true);
    const wasLiked = isLiked;
    
    // Optimistic UI update
    setLocalLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
    if (!wasLiked) {
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 800);
    }
    
    try {
      const batch = writeBatch(firestore!);
      const postRef = doc(firestore!, 'users', post.userId, 'posts', post.id);
      const likeDocRef = doc(firestore!, 'users', post.userId, 'posts', post.id, 'likes', user!.uid);
      
      if (wasLiked) {
        batch.update(postRef, { likeCount: increment(-1) });
        batch.delete(likeDocRef);
      } else {
        batch.update(postRef, { likeCount: increment(1) });
        batch.set(likeDocRef, { userId: user!.uid, createdAt: serverTimestamp() });
        
        if (post.userId !== user!.uid) {
            const notificationRef = doc(collection(firestore!, 'users', post.userId, 'notifications'));
            batch.set(notificationRef, {
                type: 'like', senderId: user!.uid, recipientId: post.userId, postId: post.id, read: false, createdAt: serverTimestamp(),
            });
        }
      }
      await batch.commit(); 
    } catch (e) { 
      // Rollback on error
      setLocalLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
    } finally {
      setIsLiking(false);
    }
  };

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push('/login?auth=true');
      return;
    }
    if (!firestore || !post.userId || isOwnPost) return;
    
    const batch = writeBatch(firestore!);
    const followedUserId = post.userId;
    const followerUserId = user!.uid;
    const followerDocRef = doc(firestore!, 'user_followers', followedUserId, 'followers', followerUserId);
    const followingDocRef = doc(firestore!, 'user_following', followerUserId, 'following', followedUserId);
    
    if (isFollowing) {
      batch.delete(followerDocRef);
      batch.delete(followingDocRef);
    } else {
      batch.set(followerDocRef, { createdAt: serverTimestamp() });
      batch.set(followingDocRef, { createdAt: serverTimestamp() });
      const notificationRef = doc(collection(firestore!, 'users', followedUserId, 'notifications'));
      batch.set(notificationRef, {
        type: 'follow', senderId: followerUserId, recipientId: followedUserId, read: false, createdAt: serverTimestamp(),
      });
    }
    
    try {
      await batch.commit();
      toast({ title: isFollowing ? `Unfollowed` : `Following` });
    } catch (error) {}
  };

  // Intersection Observer for autoplay/pause logic
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { 
        setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.6); 
    }, { threshold: [0, 0.6, 1.0] });
    
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Sync video play state with view visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isInView) {
      video.muted = globalMuted;
      setIsMuted(globalMuted);
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If interaction required, start muted
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }

      // Track view only once per focused impression
      if (firestore && !viewCounted.current) {
        viewCounted.current = true;
        const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);
        const newViewCount = (post.viewCount || 0) + 1;
        const newEarnings = newViewCount * REVENUE_PER_VIEW;
        
        updateDoc(postRef, { 
          viewCount: increment(1),
          adImpressions: increment(1),
          estimatedEarnings: Number(newEarnings.toFixed(4))
        }).catch(() => {});
      }
    } else {
      video.pause();
      // Reset view counted if we want to count multiple views in one session (optional)
      // viewCounted.current = false;
    }
  }, [isInView, firestore, post.id, post.userId, post.viewCount]);

  const forceUnlockUI = () => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
    }
  };

  return (
    <div ref={cardRef} className="relative w-full h-full bg-black overflow-hidden select-none" 
      onClick={(e) => {
        if (tapTimerRef.current) {
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
          handleLikeToggle();
        } else {
          tapTimerRef.current = setTimeout(() => {
            toggleMute();
            tapTimerRef.current = null;
          }, 250);
        }
      }}
    >
      {/* High-performance Video Component */}
      <video 
        ref={videoRef} 
        src={post.mediaUrl} 
        className="object-contain w-full h-full" 
        loop 
        playsInline 
        muted={isMuted} 
        preload="auto"
        onWaiting={() => setIsBuffering(true)} 
        onPlaying={() => setIsBuffering(false)}
        onLoadedData={() => setIsBuffering(false)}
      />
      
      {/* Visual Overlay Text */}
      {post.overlayText && (
          <div 
            className="absolute px-8 text-center pointer-events-none z-20" 
            style={{ 
              top: `${post.overlayPosition ?? 50}%`, 
              left: `${post.overlayX ?? 50}%`, 
              transform: 'translate(-50%, -50%)', 
              color: post.overlayColor || '#ffffff', 
              textShadow: '0 2px 20px rgba(0,0,0,0.9)' 
            }}
          >
              <p className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
                {post.overlayText}
              </p>
          </div>
      )}

      {/* Buffering State */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin opacity-50" />
        </div>
      )}

      {/* Big Heart Animation */}
      {showBigHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-32 h-32 text-primary fill-primary animate-heart-pop" />
        </div>
      )}

      {/* Mute/Unmute Indicator */}
      {showMuteIndicator && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="bg-black/50 backdrop-blur-md p-5 rounded-full">
            {isMuted ? <VolumeX className="w-10 h-10 text-white" /> : <Volume2 className="w-10 h-10 text-white" />}
          </div>
        </div>
      )}
      
      {/* Bottom Info Section */}
      <div className="absolute bottom-0 left-0 right-16 p-6 pb-28 bg-gradient-to-t from-black/90 via-black/20 to-transparent text-white z-30" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          {author && (
            <Link href={`/profile/${author.id}`} onClick={(e) => { if(!user) { e.preventDefault(); router.push('/login?auth=true'); } }} className="flex items-center gap-3 group">
              <Avatar className="h-12 w-12 border-2 border-primary shadow-2xl">
                <AvatarImage src={author.profileImageUrl} className="object-cover" />
                <AvatarFallback className="font-black bg-secondary">{author.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <p className="font-black text-sm drop-shadow-md">{author.username}</p>
                    {isProfileAdmin && <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />}
                </div>
                <span className="text-[9px] text-primary/80 font-black uppercase tracking-widest">Premium Creator</span>
              </div>
            </Link>
          )}
          {author && !isOwnPost && (
            <Button onClick={handleFollowToggle} variant={isFollowing ? "secondary" : "default"} className={cn("h-7 px-4 text-[10px] font-black uppercase rounded-full border border-white/10", !isFollowing && "bg-primary text-white border-none")}>
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>
        <p className="text-sm line-clamp-2 font-medium drop-shadow-md leading-relaxed pr-4">{post.caption}</p>
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-28 flex flex-col gap-8 z-30" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center group">
                <button className="text-white transition-all active:scale-150 group-hover:scale-110" onClick={handleLikeToggle}>
                    <Heart className={cn("h-9 w-9 drop-shadow-2xl transition-all", isLiked ? "fill-primary text-primary scale-110" : "text-white")} />
                </button>
                <span className="text-[10px] font-black mt-1.5 drop-shadow-md">{localLikeCount}</span>
            </div>
            <div className="flex flex-col items-center group">
                <Sheet open={isCommentSheetOpen} onOpenChange={(open) => { if (open && !user) { router.push('/login?auth=true'); return; } setIsCommentSheetOpen(open); forceUnlockUI(); }}>
                  <SheetTrigger asChild>
                      <button className="text-white active:scale-125 transition-all group-hover:scale-110">
                          <MessageCircle className="h-9 w-9 drop-shadow-2xl" />
                      </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-[3rem] overflow-hidden bg-background border-t-0 shadow-2xl z-[100]">
                      <SheetHeader className="sr-only"><SheetTitle>Comments</SheetTitle></SheetHeader>
                      <CommentSection postId={post.id} postOwnerId={post.userId} />
                  </SheetContent>
                </Sheet>
                <span className="text-[10px] font-black mt-1.5 drop-shadow-md">{post.commentCount}</span>
            </div>
            <div className="flex flex-col items-center group">
                <Sheet open={isShareSheetOpen} onOpenChange={(open) => { if (open && !user) { router.push('/login?auth=true'); return; } setIsShareSheetOpen(open); forceUnlockUI(); }}>
                  <SheetTrigger asChild>
                      <button className="text-white active:scale-125 transition-all group-hover:scale-110">
                          <Share2 className="h-9 w-9 drop-shadow-2xl" />
                      </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-[3rem] overflow-hidden bg-background border-t-0 shadow-2xl z-[100]">
                      <SheetHeader className="sr-only"><SheetTitle>Share</SheetTitle></SheetHeader>
                      <ShareSheet postId={post.id} postOwnerId={post.userId} mediaUrl={post.mediaUrl} onClose={() => setIsShareSheetOpen(false)} />
                  </SheetContent>
                </Sheet>
            </div>
      </div>

      {/* Admin/Owner Menu */}
      {(isOwnPost || isCurrentUserAdmin) && (
        <div className="absolute top-8 right-6 z-50" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu onOpenChange={() => forceUnlockUI()}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/30 border border-white/5 text-white backdrop-blur-md">
                        <MoreVertical className="h-6 w-6" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl p-2 min-w-[180px]">
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive font-black p-3 rounded-xl cursor-pointer">
                        <Trash2 className="h-4 w-4 mr-3" /> Delete Post
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { setIsDeleteDialogOpen(open); forceUnlockUI(); }}>
        <AlertDialogContent className="bg-[#121212] text-white rounded-[2.5rem] border-white/10 z-[300]">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center font-black uppercase italic tracking-wider text-xl">Delete Post?</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-2">This reel will be removed from your profile.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-3 sm:flex-row mt-8">
                <AlertDialogCancel className="rounded-2xl bg-secondary/50 h-14 font-black border-none uppercase text-xs flex-1">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={async () => { 
                        if(firestore) { 
                            await deleteDoc(doc(firestore, 'users', post.userId, 'posts', post.id)); 
                            window.location.reload(); 
                        } 
                    }} 
                    className="bg-destructive hover:bg-destructive/90 rounded-2xl h-14 font-black uppercase text-xs flex-1"
                >
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
