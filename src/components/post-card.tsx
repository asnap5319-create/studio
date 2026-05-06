'use client';

import { useState, useRef, useEffect } from 'react';
import type { Post } from '@/models/post';
import type { UserProfile } from '@/models/user';
import { useDoc, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc, increment, writeBatch, serverTimestamp, collection } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, Send, Volume2, VolumeX, Share2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CommentSection } from './comment-section';
import { ShareSheet } from './share-sheet';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewCounted = useRef(false);
  const lastTapRef = useRef<number>(0);

  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeIcon, setShowVolumeIcon] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  const isOwnPost = user?.uid === post.userId;

  const authorRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'users', post.userId);
  }, [firestore, post.userId]);

  const { data: author, isLoading: isAuthorLoading } = useDoc<UserProfile>(authorRef);
  
  const followCheckRef = useMemoFirebase(() => {
      if (!firestore || !user || isOwnPost) return null;
      return doc(firestore, 'user_followers', post.userId, 'followers', user.uid);
  }, [firestore, user, isOwnPost, post.userId]);

  const { data: followCheck } = useDoc(followCheckRef);
  const isFollowing = !!followCheck;

  const likeRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', post.userId, 'posts', post.id, 'likes', user.uid);
  }, [firestore, user, post.userId, post.id]);

  const { data: likeData } = useDoc(likeRef);
  const isLiked = !!likeData;

  const isVideo = post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.mov') || post.mediaUrl.includes('video') || post.mediaUrl.includes('cloudinary');

  const toggleMute = () => {
    if (!isVideo || !videoRef.current) return;
    
    const currentlyMuted = !isMuted;
    videoRef.current.muted = currentlyMuted;
    setIsMuted(currentlyMuted);

    setShowVolumeIcon(true);
    setTimeout(() => {
      setShowVolumeIcon(false);
    }, 800);
  };

  const handleLike = async () => {
    if (!firestore || !user) {
        toast({ variant: "destructive", title: "Error", description: "Login to like posts." });
        return;
    }

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
            type: 'like',
            senderId: user.uid,
            recipientId: post.userId,
            postId: post.id,
            read: false,
            createdAt: serverTimestamp(),
        });
    }

    try {
        await batch.commit();
    } catch (e) {
        console.error("Error liking post:", e);
    }
  };

  const handleUnlike = async () => {
    if (!firestore || !user || !isLiked) return;

    const batch = writeBatch(firestore);
    const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);
    const likeDocRef = doc(firestore, 'users', post.userId, 'posts', post.id, 'likes', user.uid);

    batch.update(postRef, { likeCount: increment(-1) });
    batch.delete(likeDocRef);

    try {
        await batch.commit();
    } catch (e) {
        console.error("Error unliking post:", e);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleLike();
    } else {
      toggleMute();
    }
    lastTapRef.current = now;
  };
  
  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firestore || !user || isOwnPost) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to follow users."});
        return;
    };

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
            type: 'follow',
            senderId: followerUserId,
            recipientId: followedUserId,
            read: false,
            createdAt: serverTimestamp(),
        });
    }

    try {
        await batch.commit();
        toast({
            title: isFollowing ? `Unfollowed ${author?.username}` : `Following ${author?.username}`,
        });
    } catch (error) {
        console.error("Error toggling follow:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not complete the action.' });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.7 }
    );

    const currentCardRef = cardRef.current;
    if (currentCardRef) {
      observer.observe(currentCardRef);
    }

    return () => {
      if (currentCardRef) {
        observer.unobserve(currentCardRef);
      }
    };
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      if (isInView) {
        videoElement.muted = isMuted;
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name === "NotAllowedError") {
              videoElement.muted = true;
              setIsMuted(true);
              videoElement.play().catch(() => {});
            }
          });
        }
      } else {
        videoElement.pause();
        videoElement.currentTime = 0;
      }
    }

    if (isInView && firestore && !viewCounted.current) {
      viewCounted.current = true; 
      const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);
      updateDoc(postRef, {
          viewCount: increment(1)
      }).catch(() => {
          viewCounted.current = false;
      });
    }

  }, [isInView, firestore, post.id, post.userId, isMuted]);

  return (
    <div ref={cardRef} className="relative w-full h-full bg-black overflow-hidden" onClick={handleTap}>
      
      {isVideo ? (
        <video
          ref={videoRef}
          src={post.mediaUrl}
          className="object-contain w-full h-full"
          loop
          playsInline
        />
      ) : (
        <Image
          src={post.mediaUrl}
          alt={post.caption || 'User post'}
          fill
          className="object-contain"
          priority
        />
      )}

      {showBigHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-32 h-32 text-primary fill-primary animate-heart-pop" />
        </div>
      )}

      {showVolumeIcon && isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="p-5 rounded-full bg-black/40 backdrop-blur-sm">
            {isMuted ? <VolumeX size={40} className="text-white" /> : <Volume2 size={40} className="text-white" />}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white z-10" onClick={(e) => e.stopPropagation()}>
        {isAuthorLoading ? (
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-24" />
            </div>
        ) : (
          author && (
            <div className="flex items-center gap-3 mb-3">
              <Link href={`/profile/${author.id}`} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Avatar className="h-11 w-11 border-2 border-primary ring-2 ring-black/50">
                  <AvatarImage src={author.profileImageUrl} />
                  <AvatarFallback>{author.name?.[0]}</AvatarFallback>
                </Avatar>
                <p className="font-bold text-[15px] drop-shadow-lg">{author.username}</p>
              </Link>
              {!isOwnPost && (
                <button className="px-3 py-1 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-xs font-bold transition-colors" onClick={handleFollowToggle}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          )
        )}
        <p className="text-sm line-clamp-2 drop-shadow-md pr-12">{post.caption}</p>
      </div>
      
      <div className="absolute right-3 bottom-24 flex flex-col gap-6 z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white h-12 w-12 hover:bg-transparent"
                    onClick={isLiked ? handleUnlike : handleLike}
                >
                    <Heart className={cn("h-9 w-9 transition-all active:scale-125", isLiked ? "fill-primary text-primary" : "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]")} />
                </Button>
                <span className="text-xs font-bold mt-1 drop-shadow-md">{post.likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center">
                <Sheet open={isCommentSheetOpen} onOpenChange={setIsCommentSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-transparent">
                        <MessageCircle className="h-9 w-9 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-2xl overflow-hidden border-border bg-background">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Comments</SheetTitle>
                    </SheetHeader>
                    <CommentSection postId={post.id} postOwnerId={post.userId} />
                  </SheetContent>
                </Sheet>
                <span className="text-xs font-bold mt-1 drop-shadow-md">{post.commentCount}</span>
            </div>

            <div className="flex flex-col items-center">
                <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-transparent">
                        <Share2 className="h-9 w-9 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-2xl overflow-hidden border-border bg-background">
                    <SheetHeader className="p-4 border-b border-border">
                      <SheetTitle className="text-center font-bold">Share to</SheetTitle>
                    </SheetHeader>
                    <ShareSheet 
                      postId={post.id} 
                      postOwnerId={post.userId} 
                      mediaUrl={post.mediaUrl}
                      onClose={() => setIsShareSheetOpen(false)} 
                    />
                  </SheetContent>
                </Sheet>
                <span className="text-xs font-bold mt-1 drop-shadow-md">Share</span>
            </div>
      </div>
    </div>
  );
}