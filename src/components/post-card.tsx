'use client';

import { useState, useRef, useEffect } from 'react';
import type { Post } from '@/models/post';
import type { UserProfile } from '@/models/user';
import { useDoc, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc, increment, writeBatch, serverTimestamp, collection, deleteDoc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, Share2, BadgeCheck, Loader2, MoreVertical, Trash2, Bookmark, Music } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CommentSection } from './comment-section';
import { ShareSheet } from './share-sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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

  const saveRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid, 'saved_posts', post.id);
  }, [firestore, user?.uid, post.id]);
  const { data: saveData } = useDoc(saveRef);
  const isSaved = !!saveData;

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
    if (!videoRef.current) return;
    const newMuteState = !isMuted;
    globalMuted = newMuteState;
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => { v.muted = newMuteState; });
    setIsMuted(newMuteState);
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
      console.error("Error toggling like:", e);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSavePost = async () => {
    if (!firestore || !user) return;
    const sRef = doc(firestore, 'users', user.uid, 'saved_posts', post.id);
    try {
      if (isSaved) {
        await deleteDoc(sRef);
        toast({ title: "Removed from Saved" });
      } else {
        await setDoc(sRef, { ...post, savedAt: serverTimestamp() }, { merge: true });
        toast({ title: "Saved to Collection! ✅" });
      }
    } catch (e) {
      console.error("Save error:", e);
      toast({ variant: 'destructive', title: 'Save Failed' });
    }
  };

  const handleSaveAudio = async () => {
    if (!firestore || !user) return;
    const audioName = post.caption?.split('#')[0] || "Original Audio";
    const aRef = doc(firestore, 'users', user.uid, 'saved_audios', post.id);
    try {
      await setDoc(aRef, { title: audioName, postId: post.id, savedAt: serverTimestamp() }, { merge: true });
      toast({ title: "Audio Saved! 🎵" });
    } catch (e) {
      console.error("Audio save error:", e);
      toast({ variant: 'destructive', title: 'Save Failed' });
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
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
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
      video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
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

      {/* Branding Watermark - Top Left */}
      <div className="absolute top-8 left-6 z-30 flex items-center gap-2 pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
        <Logo className="w-8 h-8" />
        <span className="text-lg font-black italic tracking-tighter text-white uppercase">A.snap</span>
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

      <div className="absolute bottom-0 left-0 right-0 p-6 pb-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white z-10" onClick={(e) => e.stopPropagation()}>
        {author && (
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/profile/${author.id}`} className="flex items-center gap-3 group">
              <Avatar className="h-12 w-12 border-2 border-primary group-active:scale-95 transition-transform shadow-lg">
                <AvatarImage src={author.profileImageUrl} className="object-cover" />
                <AvatarFallback className="font-bold">{author.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <p className="font-black text-sm drop-shadow-lg">{author.username}</p>
                    {isProfileAdmin && <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20 shadow-lg" />}
                </div>
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest drop-shadow-lg">A.snap Creator</span>
              </div>
            </Link>
            {!isOwnPost && (
              <Button 
                onClick={handleFollowToggle} 
                variant={isFollowing ? "secondary" : "default"} 
                className={cn(
                  "h-8 px-5 text-[11px] font-black uppercase rounded-full border border-white/20 transition-all active:scale-95 shadow-xl ml-2",
                  !isFollowing && "bg-primary text-white"
                )}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>
        )}
        <p className="text-sm line-clamp-2 mb-3 font-medium drop-shadow-lg max-w-[85%]">{post.caption}</p>
        <div className="flex items-center gap-2 text-xs opacity-90 cursor-pointer bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-xl border border-white/5" onClick={handleSaveAudio}>
          <Music className="h-3 w-3 animate-pulse text-primary" />
          <span className="truncate max-w-[150px] font-bold">{post.caption?.split('#')[0] || "Original Audio"}</span>
        </div>
      </div>

      <div className="absolute right-4 bottom-28 flex flex-col gap-7 z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
                <button className="text-white transition-transform active:scale-150" onClick={handleLikeToggle}>
                    <Heart className={cn("h-9 w-9 drop-shadow-2xl transition-all", isLiked ? "fill-primary text-primary scale-110" : "text-white")} />
                </button>
                <span className="text-xs font-black mt-1.5 drop-shadow-lg">{localLikeCount}</span>
            </div>
            
            <div className="flex flex-col items-center">
                <Sheet open={isCommentSheetOpen} onOpenChange={setIsCommentSheetOpen}>
                  <SheetTrigger asChild>
                    <button className="text-white active:scale-110 transition-transform"><MessageCircle className="h-9 w-9 drop-shadow-2xl" /></button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-[2.5rem] overflow-hidden bg-background border-t-0 shadow-2xl">
                    <SheetHeader className="sr-only"><SheetTitle>Comments</SheetTitle></SheetHeader>
                    <CommentSection postId={post.id} postOwnerId={post.userId} />
                  </SheetContent>
                </Sheet>
                <span className="text-xs font-black mt-1.5 drop-shadow-lg">{post.commentCount}</span>
            </div>
            
            <button className="text-white transition-transform active:scale-125" onClick={handleSavePost}>
                <Bookmark className={cn("h-9 w-9 drop-shadow-2xl transition-all", isSaved ? "fill-white text-white" : "text-white")} />
            </button>

            <div className="flex flex-col items-center">
                <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
                  <SheetTrigger asChild>
                    <button className="text-white active:scale-110 transition-transform"><Share2 className="h-9 w-9 drop-shadow-2xl" /></button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-[2.5rem] overflow-hidden bg-background border-t-0 shadow-2xl">
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
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-md">
                        <MoreVertical className="h-6 w-6" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl p-2 shadow-2xl">
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive font-black p-4 rounded-xl cursor-pointer focus:bg-destructive/10">
                        <Trash2 className="h-5 w-5 mr-2" /> Delete Post
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#121212] text-white rounded-[2.5rem] border-white/10">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center font-black uppercase italic tracking-wider">Delete Post?</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-muted-foreground text-xs font-bold uppercase">This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-3 sm:flex-row mt-6">
                <AlertDialogCancel className="rounded-2xl bg-secondary/50 h-14 font-black border-none uppercase text-xs">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={async () => { if(firestore) { await deleteDoc(doc(firestore, 'users', post.userId, 'posts', post.id)); window.location.reload(); } }} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-14 font-black uppercase text-xs shadow-lg shadow-destructive/20">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}