'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Post } from '@/models/post';
import type { UserProfile } from '@/models/user';
import { useDoc, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc, increment, writeBatch, serverTimestamp, collection, deleteDoc, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, BadgeCheck, Loader2, MoreVertical, Trash2, Volume2, VolumeX, Flag, Ban, Info, Link2 } from 'lucide-react';
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

function CustomShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

interface PostCardProps {
  post: Post;
  isFocused?: boolean; 
}

const ADMIN_EMAIL = "asnap5319@gmail.com";
let globalMuted = true; 
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

  const optimizedMediaUrl = useMemo(() => {
    if (post.mediaUrl.includes('res.cloudinary.com')) {
      return post.mediaUrl.replace('/upload/', '/upload/q_auto,f_auto,w_1080/');
    }
    return post.mediaUrl;
  }, [post.mediaUrl]);

  const isVideo = useMemo(() => {
    if (post.mediaType === 'video') return true;
    if (post.mediaType === 'image') return false;
    return post.mediaUrl.includes('/video/upload/') || post.mediaUrl.match(/\.(mp4|mov|webm|ogg)$/i) !== null;
  }, [post.mediaType, post.mediaUrl]);

  const isOwnPost = user?.uid === post.userId;
  const authorRef = useMemoFirebase(() => (firestore) ? doc(firestore, 'users', post.userId) : null, [firestore, post.userId]);
  const { data: author } = useDoc<UserProfile>(authorRef);
  const isProfileAdmin = author?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const likeRef = useMemoFirebase(() => (firestore && user?.uid) ? doc(firestore, 'users', post.userId, 'posts', post.id, 'likes', user.uid) : null, [firestore, user, post]);
  const { data: likeData } = useDoc(likeRef);
  const isLiked = !!likeData;

  useEffect(() => { setLocalLikeCount(post.likeCount || 0); }, [post.likeCount]);

  const toggleMute = useCallback(() => {
    if (!isVideo) return;
    const video = videoRef.current;
    if (!video) return;
    const newMuteState = !isMuted;
    globalMuted = newMuteState;
    video.muted = newMuteState;
    setIsMuted(newMuteState);
    setShowMuteIndicator(true);
    setTimeout(() => setShowMuteIndicator(false), 1000);
  }, [isMuted, isVideo]);

  const handleLikeToggle = async () => {
    if (!user) { router.push('/login?auth=true'); return; }
    if (!firestore || isLiking) return;
    setIsLiking(true);
    const wasLiked = isLiked;
    setLocalLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
    if (!wasLiked) { setShowBigHeart(true); setTimeout(() => setShowBigHeart(false), 800); }
    try {
      const batch = writeBatch(firestore);
      const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);
      const likeDocRef = doc(firestore, 'users', post.userId, 'posts', post.id, 'likes', user.uid);
      if (wasLiked) { batch.update(postRef, { likeCount: increment(-1) }); batch.delete(likeDocRef); }
      else {
        batch.update(postRef, { likeCount: increment(1) });
        batch.set(likeDocRef, { userId: user.uid, createdAt: serverTimestamp() });
        if (post.userId !== user.uid) {
            batch.set(doc(collection(firestore, 'users', post.userId, 'notifications')), {
                type: 'like', senderId: user.uid, recipientId: post.userId, postId: post.id, read: false, createdAt: serverTimestamp(),
            });
        }
      }
      await batch.commit(); 
    } catch (e) { setLocalLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1)); }
    finally { setIsLiking(false); }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { 
        setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.6); 
    }, { threshold: [0, 0.6, 1.0] });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || !firestore || viewCounted.current) return;

    const recordView = async () => {
        viewCounted.current = true;
        const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);
        try {
            await updateDoc(postRef, { 
                viewCount: increment(1),
                adImpressions: increment(1),
                estimatedEarnings: increment(REVENUE_PER_VIEW)
            });
        } catch (e) {
            console.error("View increment failed:", e);
        }
    };

    if (isVideo) {
        const video = videoRef.current;
        if (!video) return;
        video.muted = globalMuted;
        setIsMuted(globalMuted);
        video.play().then(() => recordView()).catch(() => { video.muted = true; video.play().catch(() => {}); });
    } else {
        recordView();
    }
  }, [isInView, firestore, post, isVideo]);

  return (
    <div ref={cardRef} className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-center select-none" 
      onClick={() => {
        if (tapTimerRef.current) { clearTimeout(tapTimerRef.current); tapTimerRef.current = null; handleLikeToggle(); }
        else { tapTimerRef.current = setTimeout(() => { if(isVideo) toggleMute(); tapTimerRef.current = null; }, 250); }
      }}
    >
      {isVideo ? (
          <video 
            ref={videoRef} 
            src={optimizedMediaUrl} 
            className="object-contain w-full h-full" 
            loop playsInline muted={isMuted} preload="auto"
            onWaiting={() => setIsBuffering(true)} 
            onPlaying={() => setIsBuffering(false)}
            onLoadedData={() => setIsBuffering(false)}
            onError={() => setIsBuffering(false)}
          />
      ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img 
                src={optimizedMediaUrl} 
                alt={post.caption}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setIsBuffering(false)}
                onError={() => setIsBuffering(false)}
              />
          </div>
      )}
      
      {post.overlayText && (
          <div className="absolute px-8 text-center pointer-events-none z-20" style={{ top: `${post.overlayPosition ?? 50}%`, left: `${post.overlayX ?? 50}%`, transform: 'translate(-50%, -50%)', color: post.overlayColor || '#ffffff', textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}>
              <p className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-2xl">{post.overlayText}</p>
          </div>
      )}

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin opacity-50" />
        </div>
      )}

      {showBigHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-32 h-32 text-primary fill-primary animate-heart-pop" />
        </div>
      )}

      {showMuteIndicator && isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="bg-black/50 backdrop-blur-md p-5 rounded-full">
            {isMuted ? <VolumeX className="w-10 h-10 text-white" /> : <Volume2 className="w-10 h-10 text-white" />}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-0 left-0 right-16 p-6 pb-28 bg-gradient-to-t from-black/95 via-black/30 to-transparent text-white z-30 pointer-events-none">
        <div className="flex items-center gap-3 mb-4 pointer-events-auto">
          {author && (
            <Link href={`/profile/${author.id}`} onClick={(e) => { if(!user) { e.preventDefault(); router.push('/login?auth=true'); } }} className="flex items-center gap-3 group">
              <Avatar className="h-11 w-11 border-2 border-primary shadow-2xl">
                <AvatarImage src={author.profileImageUrl} className="object-cover" />
                <AvatarFallback className="font-black bg-secondary">{author.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <p className="font-black text-sm drop-shadow-md text-white">{author.username}</p>
                    {isProfileAdmin && <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />}
                </div>
                <span className="text-[9px] text-primary/80 font-black uppercase tracking-widest">Premium Creator</span>
              </div>
            </Link>
          )}
        </div>
        <p className="text-sm line-clamp-2 font-medium drop-shadow-md leading-relaxed pr-4 pointer-events-auto text-white">{post.caption}</p>
      </div>

      <div className="absolute right-4 bottom-28 flex flex-col gap-7 z-30" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center group">
                <button className="text-white transition-all active:scale-150" onClick={handleLikeToggle}>
                    <Heart className={cn("h-8 w-8 drop-shadow-2xl transition-all", isLiked ? "fill-primary text-primary scale-110" : "text-white")} />
                </button>
                <span className="text-[10px] font-black mt-1 drop-shadow-md text-white">{localLikeCount}</span>
            </div>
            <div className="flex flex-col items-center group">
                <Sheet open={isCommentSheetOpen} onOpenChange={(open) => { if (open && !user) { router.push('/login?auth=true'); return; } setIsCommentSheetOpen(open); }}>
                  <SheetTrigger asChild>
                      <button className="text-white active:scale-125 transition-all">
                          <MessageCircle className="h-8 w-8 drop-shadow-2xl" />
                      </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-[3rem] overflow-hidden bg-background border-t-0 shadow-2xl z-[100]">
                      <SheetHeader className="sr-only"><SheetTitle>Comments</SheetTitle></SheetHeader>
                      <CommentSection postId={post.id} postOwnerId={post.userId} />
                  </SheetContent>
                </Sheet>
                <span className="text-[10px] font-black mt-1 drop-shadow-md text-white">{post.commentCount}</span>
            </div>
            <div className="flex flex-col items-center group">
                <Sheet open={isShareSheetOpen} onOpenChange={(open) => { if (open && !user) { router.push('/login?auth=true'); return; } setIsShareSheetOpen(open); }}>
                  <SheetTrigger asChild>
                      <button className="text-white active:scale-125 transition-all">
                          <CustomShareIcon className="h-8 w-8 drop-shadow-2xl" />
                      </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-[3rem] overflow-hidden bg-background border-t-0 shadow-2xl z-[100]">
                      <SheetHeader className="sr-only"><SheetTitle>Share</SheetTitle></SheetHeader>
                      <ShareSheet postId={post.id} postOwnerId={post.userId} mediaUrl={post.mediaUrl} onClose={() => setIsShareSheetOpen(false)} />
                  </SheetContent>
                </Sheet>
            </div>
            <div className="flex flex-col items-center">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="text-white active:scale-125 transition-all"><MoreVertical className="h-8 w-8 drop-shadow-2xl" /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl p-2 min-w-[200px] shadow-2xl z-[100]">
                        <DropdownMenuItem onClick={() => toast({ title: "Noted! 🤝", description: "We'll show you fewer reels like this." })} className="font-bold p-4 rounded-xl cursor-pointer">
                            <Ban className="h-4 w-4 mr-3 text-muted-foreground" /> Not Interested
                        </DropdownMenuItem>
                        {(isOwnPost || user?.email === ADMIN_EMAIL) && (
                            <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive font-black p-4 rounded-xl cursor-pointer">
                                <Trash2 className="h-4 w-4 mr-3" /> Delete Post
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#121212] text-white rounded-[2.5rem] border-white/10 z-[300]">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center font-black uppercase italic tracking-wider text-xl">Delete Post?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-3 sm:flex-row mt-8">
                <AlertDialogCancel className="rounded-2xl bg-secondary/50 h-14 font-black border-none uppercase text-xs flex-1">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={async () => { if(firestore) { await deleteDoc(doc(firestore, 'users', post.userId, 'posts', post.id)); window.location.reload(); } }} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-14 font-black uppercase text-xs flex-1">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}