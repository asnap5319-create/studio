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
import { Heart, MessageCircle, Send, Volume2, VolumeX } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';


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

  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted by default
  const [showVolumeIcon, setShowVolumeIcon] = useState(false);

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

  const isVideo = post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.mov') || post.mediaUrl.includes('video');

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

    if (isFollowing) { // Action: Unfollow
        batch.delete(followerDocRef);
        batch.delete(followingDocRef);
    } else { // Action: Follow
        batch.set(followerDocRef, { createdAt: serverTimestamp() });
        batch.set(followingDocRef, { createdAt: serverTimestamp() });
        
        // Add notification to the batch
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
            // Autoplay was prevented.
            // This can happen if the user hasn't interacted with the page yet.
            // We'll mute the video and try playing again.
            if (error.name === "NotAllowedError") {
              console.log("Autoplay with sound was prevented. Muting and retrying.");
              videoElement.muted = true;
              setIsMuted(true);
              videoElement.play().catch(console.error);
            } else {
              console.error("Video play failed:", error);
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
      }).catch((error) => {
          console.error("Error updating view count: ", error);
          viewCounted.current = false;
      });
    }

  }, [isInView, firestore, post.id, post.userId, isMuted]);

  return (
    <div ref={cardRef} className="relative w-full h-full bg-black rounded-lg overflow-hidden" onClick={toggleMute}>
      
      {isVideo ? (
        <video
          ref={videoRef}
          src={post.mediaUrl}
          className="object-cover w-full h-full"
          loop
          playsInline
        />
      ) : (
        <Image
          src={post.mediaUrl}
          alt={post.caption || 'User post'}
          fill
          className="object-cover"
          priority
        />
      )}

      {showVolumeIcon && isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="p-4 rounded-full bg-black/50">
            {isMuted ? <VolumeX size={48} className="text-white" /> : <Volume2 size={48} className="text-white" />}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white" onClick={(e) => e.stopPropagation()}>
        {isAuthorLoading ? (
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-24" />
            </div>
        ) : (
          author && (
            <div className="flex items-center gap-2 mb-2">
              <Link href={`/profile/${author.id}`} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Avatar className="h-10 w-10 border-2 border-primary">
                  <AvatarImage src={author.profileImageUrl} />
                  <AvatarFallback>{author.name?.[0]}</AvatarFallback>
                </Avatar>
                <p className="font-bold text-sm">{author.username}</p>
              </Link>
              {!isOwnPost && (
                <>
                  <span className="text-muted-foreground mx-1">·</span>
                  <Button variant="link" className="p-0 h-auto text-primary font-bold text-sm" onClick={handleFollowToggle}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </>
              )}
            </div>
          )
        )}
        <p className="text-sm mt-2">{post.caption}</p>
      </div>
      
      <div className="absolute right-2 bottom-24 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="text-white h-12 w-12 flex flex-col">
                <Heart className="h-8 w-8" />
                <span className="text-xs">{post.likeCount}</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-white h-12 w-12 flex flex-col">
                <MessageCircle className="h-8 w-8" />
                <span className="text-xs">{post.commentCount}</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-white h-12 w-12">
                <Send className="h-8 w-8" />
            </Button>
      </div>
    </div>
  );
}
