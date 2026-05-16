
'use client';

import { useState, useRef, useEffect } from 'react';
import type { Post } from '@/models/post';
import type { UserProfile } from '@/models/user';
import { useDoc, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc, increment, writeBatch, serverTimestamp, collection, deleteDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, Share2, BadgeCheck, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { CommentSection } from './comment-section';
import { ShareSheet } from './share-sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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

  const isVideo = post.mediaUrl.toLowerCase().includes('.mp4') || 
                  post.mediaUrl.toLowerCase().includes('.mov') || 
                  post.mediaUrl.toLowerCase().includes('video') || 
                  post.mediaUrl.includes('res.cloudinary.com');

  const toggleMute = () => {
    if (!isVideo || !videoRef.current) return;
    const newMuteState = !isMuted;
    globalMuted = newMuteState;
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => { v.muted = newMuteState; });
    setIsMuted(newMuteState);
  };

  const handleLike = async () => {
    if (!firestore || !user) return;
    setShowBigHeart(true);
    setTimeout(() => setShowBigHeart(false), 1000);
    if (isLiked) return;
    const batch = writeBatch(firestore);
    const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);
    const likeDocRef = doc(firestore, 'users', post.userId, 'posts', post.id, 'likes', user.uid);
    batch.update(postRef, { likeCount: increment(1) });
    batch.set(likeDocRef, { userId: user.uid, createdAt: serverTimestamp() });
    if (post.userId !== user.uid) {
        const notificationRef = doc(collection(firestore, 'users', post.userId, 'notifications'));
        batch.set(notificationRef, {
            type: 'like', senderId: user.uid, recipientId: post.userId, postId: post.id, read: false, createdAt: serverTimestamp(),
        });
    }
    try { await batch.commit(); } catch (e) { console.error("Error liking post:", e); }
  };

  const handleUnlike = async () => {
    if (!firestore || !user || !isLiked) return;
    const batch = writeBatch(firestore);
    const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);
    const likeDocRef = doc(firestore, 'users', post.userId, 'posts', post.id, 'likes', user.uid);
    batch.update(postRef, { likeCount: increment(-1) });
    batch.delete(likeDocRef);
    try { await batch.commit(); } catch (e) { console.error("Error unliking post:", e); }
  };

  const handleTap = (e: React.MouseEvent) => {
    if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
        handleLike();
    } else {
        tapTimerRef.current = setTimeout(() => {
            toggleMute();
            tapTimerRef.current = null;
        }, 250);
    }
  };

  const confirmDeletePost = async () => {
    if (!firestore || !user) return;
    try {
        await deleteDoc(doc(firestore, 'users', post.userId, 'posts', post.id));
        toast({ title: "सफलता ✅", description: "वीडियो डिलीट हो गया।" });
        window.location.reload();
    } catch (error) {
        console.error("Delete error:", error);
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
      const playPromise = video.play();
      if (playPromise !== undefined) {
          playPromise.catch(() => { video.muted = true; video.play().catch(() => {}); });
      }
      if (firestore && !viewCounted.current) {
        viewCounted.current = true; 
        updateDoc(doc(firestore, 'users', post.userId, 'posts', post.id), { viewCount: increment(1) });
      }
    } else {
      video.pause();
    }
  }, [isInView, firestore, post.id, post.userId]);

  return (
    <div ref={cardRef} className="relative w-full h-full bg-black overflow-hidden select-none" onClick={handleTap}>
      {isVideo ? (
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
            onCanPlay={() => setIsBuffering(false)}
        />
      ) : (
        <Image src={post.mediaUrl} alt="Post" fill className="object-contain" priority />
      )}

      {isBuffering && isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}

      {showBigHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-32 h-32 text-primary fill-primary animate-heart-pop" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black via-black/40 to-transparent text-white z-10" onClick={(e) => e.stopPropagation()}>
        {author && (
          <div className="flex items-center gap-3 mb-3">
            <Link href={`/profile/${author.id}`} className="flex items-center gap-2">
              <Avatar className="h-11 w-11 border-2 border-primary">
                <AvatarImage src={author.profileImageUrl} className="object-cover" />
                <AvatarFallback>{author.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                  <p className="font-bold text-[15px]">{author.username}</p>
                  {isProfileAdmin && <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />}
              </div>
            </Link>
          </div>
        )}
        <p className="text-sm line-clamp-2 drop-shadow-md pr-12">{post.caption}</p>
      </div>

      {(isOwnPost || isCurrentUserAdmin) && (
        <div className="absolute top-10 right-4 z-50" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white">
                        <MoreVertical className="h-6 w-6" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl min-w-[180px] p-2">
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive font-black p-4 rounded-xl focus:bg-destructive/10 cursor-pointer flex items-center gap-3">
                        <Trash2 className="h-5 w-5" /> Delete Post
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )}

      <div className="absolute right-3 bottom-24 flex flex-col gap-6 z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
                <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-transparent" onClick={isLiked ? handleUnlike : handleLike}>
                    <Heart className={cn("h-9 w-9 transition-all active:scale-125", isLiked ? "fill-primary text-primary" : "text-white drop-shadow-md")} />
                </Button>
                <span className="text-xs font-bold mt-1 drop-shadow-md">{post.likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center">
                <Sheet open={isCommentSheetOpen} onOpenChange={setIsCommentSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-transparent">
                        <MessageCircle className="h-9 w-9 drop-shadow-md" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-2xl overflow-hidden border-border bg-background">
                    <CommentSection postId={post.id} postOwnerId={post.userId} />
                  </SheetContent>
                </Sheet>
                <span className="text-xs font-bold mt-1 drop-shadow-md">{post.commentCount}</span>
            </div>
            
            <div className="flex flex-col items-center">
                <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-transparent">
                        <Share2 className="h-9 w-9 drop-shadow-md" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-2xl overflow-hidden border-border bg-background">
                    <ShareSheet postId={post.id} postOwnerId={post.userId} mediaUrl={post.mediaUrl} onClose={() => setIsShareSheetOpen(false)} />
                  </SheetContent>
                </Sheet>
                <span className="text-xs font-bold mt-1 drop-shadow-md">Share</span>
            </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#121212] text-white rounded-[2.5rem] border-white/10 max-w-[90vw] sm:max-w-md">
            <AlertDialogHeader className="space-y-4">
              <AlertDialogTitle className="text-2xl font-black uppercase italic text-center">Delete Post?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-center">
                क्या आप वाकई इस वीडियो को डिलीट करना चाहते हैं?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-3 sm:flex-row mt-6">
                <AlertDialogCancel className="rounded-2xl border-white/10 bg-secondary/50 h-12">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
