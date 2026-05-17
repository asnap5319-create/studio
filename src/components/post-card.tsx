'use client';

import { useState, useRef, useEffect } from 'react';
import type { Post } from '@/models/post';
import type { UserProfile } from '@/models/user';
import { useDoc, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc, increment, writeBatch, serverTimestamp, collection, deleteDoc } from 'firebase/firestore';
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
import { Logo } from '@/components/pwa-install-prompt';

interface PostCardProps {
  post: Post;
  isFocused?: boolean; 
}

const ADMIN_EMAIL = "asnap5319@gmail.com";
let globalMuted = true;

export function PostCard({ post, isFocused = false }: PostCardProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewCounted = useRef(false);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isInView, setIsInView] = useState(isFocused);
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

  useEffect(() => {
    setLocalLikeCount(post.likeCount || 0);
  }, [post.likeCount]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const newMuteState = !isMuted;
    globalMuted = newMuteState;
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => { v.muted = newMuteState; });
    setIsMuted(newMuteState);
    setShowMuteIndicator(true);
    setTimeout(() => setShowMuteIndicator(false), 1000);
  };

  const handleLikeToggle = async () => {
    if (!firestore || !user || isLiking) return;
    setIsLiking(true);
    const wasLiked = isLiked;
    setLocalLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
    if (!wasLiked) {
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 800);
    }
    try {
      const batch = writeBatch(firestore);
      const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);
      const likeDocRef = doc(firestore, 'users', post.userId, 'posts', post.id, 'likes', user.uid);
      if (wasLiked) {
        batch.update(postRef, { likeCount: increment(-1) });
        batch.delete(likeDocRef);
      } else {
        batch.update(postRef, { likeCount: increment(1) });
        batch.set(likeDocRef, { userId: user.uid, createdAt: serverTimestamp() });
        if (post.userId !== user.uid) {
            const notificationRef = doc(collection(firestore, 'users', post.userId, 'notifications'));
            batch.set(notificationRef, {
                type: 'like', senderId: user.uid, recipientId: post.userId, postId: post.id, read: false, createdAt: serverTimestamp(),
            });
        }
      }
      await batch.commit(); 
    } catch (e) { 
      setLocalLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
    } finally {
      setIsLiking(false);
    }
  };

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firestore || !user || !post.userId || isOwnPost) return;
    const batch = writeBatch(firestore);
    const followedUserId = post.userId;
    const followerUserId = user.uid;
    const followerDocRef = doc(firestore, 'user_followers', followedUserId, 'followers', followerUserId);
    const followingDocRef = doc(firestore, 'user_following', followerUserId, 'following', followedUserId);
    if (isFollowing) {
      batch.delete(followerDocRef);
      batch.delete(followingDocRef);
    } else {
      batch.set(followerDocRef, { createdAt: serverTimestamp() });
      batch.set(followingDocRef, { createdAt: serverTimestamp() });
      const notificationRef = doc(collection(firestore, 'users', followedUserId, 'notifications'));
      batch.set(notificationRef, {
        type: 'follow', senderId: followerUserId, recipientId: followedUserId, read: false, createdAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      toast({ title: isFollowing ? `Unfollowed` : `Following` });
    } catch (error) {}
  };

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { 
        setIsInView(entry.isIntersecting); 
    }, { threshold: 0.6 });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isInView) {
      video.muted = globalMuted;
      setIsMuted(globalMuted);
      video.play().catch(() => { 
        video.muted = true; 
        setIsMuted(true);
        video.play().catch(() => {}); 
      });
      if (firestore && !viewCounted.current) {
        viewCounted.current = true; 
        updateDoc(doc(firestore, 'users', post.userId, 'posts', post.id), { viewCount: increment(1) });
      }
    } else {
      video.pause();
    }
  }, [isInView, firestore, post.id, post.userId]);

  return (
    <div ref={cardRef} className="relative w-full h-full bg-black overflow-hidden select-none" onClick={(e) => {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
        if (!isLiked) handleLikeToggle();
      } else {
        tapTimerRef.current = setTimeout(() => {
          toggleMute();
          tapTimerRef.current = null;
        }, 250);
      }
    }}>
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
      />

      <div className="absolute top-10 left-6 z-40 flex items-center gap-2 pointer-events-none drop-shadow-[0_2px_12px_rgba(0,0,0,1)]">
        <Logo className="w-10 h-10 drop-shadow-[0_0_15px_rgba(255,51,102,0.8)]" />
        <span className="text-xl font-black italic tracking-tighter text-white uppercase">A.snap</span>
      </div>

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}

      {showBigHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-32 h-32 text-primary fill-primary animate-heart-pop" />
        </div>
      )}

      {showMuteIndicator && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="bg-black/60 p-5 rounded-full animate-in fade-in zoom-in duration-300">
            {isMuted ? <VolumeX className="w-12 h-12 text-white" /> : <Volume2 className="w-12 h-12 text-white" />}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-16 p-6 pb-28 bg-gradient-to-t from-black/90 via-transparent text-white z-30" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          {author ? (
            <Link href={`/profile/${author.id}`} className="flex items-center gap-3 group">
              <Avatar className="h-14 w-14 border-2 border-primary shadow-2xl">
                <AvatarImage src={author.profileImageUrl} className="object-cover" />
                <AvatarFallback className="font-black bg-secondary">{author.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <p className="font-black text-base drop-shadow-md">{author.username}</p>
                    {isProfileAdmin && <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />}
                </div>
                <span className="text-[10px] text-primary font-black uppercase tracking-widest">Creator</span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="h-14 w-14 rounded-full bg-white/10" />
              <div className="h-4 w-24 bg-white/10 rounded" />
            </div>
          )}
          
          {!isOwnPost && author && (
            <Button 
              onClick={handleFollowToggle} 
              variant={isFollowing ? "secondary" : "default"} 
              className={cn(
                "h-8 px-6 text-[11px] font-black uppercase rounded-full border border-white/20 transition-all active:scale-95",
                !isFollowing && "bg-primary text-white border-none"
              )}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>
        
        <p className="text-sm line-clamp-2 font-bold drop-shadow-md leading-relaxed">{post.caption}</p>
      </div>

      <div className="absolute right-4 bottom-28 flex flex-col gap-10 z-30" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
                <button className="text-white transition-all active:scale-150" onClick={handleLikeToggle}>
                    <Heart className={cn("h-10 w-10 drop-shadow-2xl transition-all", isLiked ? "fill-primary text-primary scale-110" : "text-white")} />
                </button>
                <span className="text-xs font-black mt-2 drop-shadow-md">{localLikeCount}</span>
            </div>
            
            <div className="flex flex-col items-center">
                <Sheet open={isCommentSheetOpen} onOpenChange={setIsCommentSheetOpen}>
                  <SheetTrigger asChild>
                    <button className="text-white active:scale-125 transition-all"><MessageCircle className="h-10 w-10 drop-shadow-2xl" /></button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-[3rem] overflow-hidden bg-background border-t-0 shadow-2xl">
                    <SheetHeader className="sr-only"><SheetTitle>Comments</SheetTitle></SheetHeader>
                    <CommentSection postId={post.id} postOwnerId={post.userId} />
                  </SheetContent>
                </Sheet>
                <span className="text-xs font-black mt-2 drop-shadow-md">{post.commentCount}</span>
            </div>

            <div className="flex flex-col items-center">
                <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
                  <SheetTrigger asChild>
                    <button className="text-white active:scale-125 transition-all"><Share2 className="h-10 w-10 drop-shadow-2xl" /></button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-[3rem] overflow-hidden bg-background border-t-0 shadow-2xl">
                    <SheetHeader className="sr-only"><SheetTitle>Share</SheetTitle></SheetHeader>
                    <ShareSheet postId={post.id} postOwnerId={post.userId} mediaUrl={post.mediaUrl} onClose={() => setIsShareSheetOpen(false)} />
                  </SheetContent>
                </Sheet>
            </div>
      </div>

      {(isOwnPost || isCurrentUserAdmin) && (
        <div className="absolute top-8 right-6 z-50" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-md">
                        <MoreVertical className="h-7 w-7" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl p-2 min-w-[200px]">
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive font-black p-4 rounded-xl cursor-pointer">
                        <Trash2 className="h-5 w-5 mr-3" /> Delete Post
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#121212] text-white rounded-[2.5rem] border-white/10">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center font-black uppercase italic tracking-wider text-xl">Delete Post?</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2">
                    This action cannot be undone.
                </AlertDialogDescription>
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