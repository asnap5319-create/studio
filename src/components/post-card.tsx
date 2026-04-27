'use client';

import { useState, useRef, useEffect } from 'react';
import type { Post } from '@/models/post';
import type { UserProfile } from '@/app/(main)/profile/page';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, Send, Volume2, VolumeX } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { firestore } = useFirebase();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewCounted = useRef(false);

  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeIcon, setShowVolumeIcon] = useState(false);

  const authorRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'users', post.userId);
  }, [firestore, post.userId]);

  const { data: author, isLoading: isAuthorLoading } = useDoc<UserProfile>(authorRef);

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
  
  // Observer to check if the card is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // This component is considered "in view" if it's intersecting.
        // For the main feed, this is fine. For profile dialog, it's always intersecting.
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.7 } // At least 70% of the post needs to be visible
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

  // Effect for video playback and view counting
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      if (isInView) {
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name === "NotAllowedError") {
              console.log("Autoplay with sound was prevented. Playing muted.");
              videoElement.muted = true;
              setIsMuted(true);
              videoElement.play();
            } else {
              console.error("Video play failed:", error);
            }
          });
        }
      } else {
        videoElement.pause();
        videoElement.currentTime = 0; // Optional: Reset video on scroll away
      }
    }

    // Increment view count only once when it comes into view
    if (isInView && firestore && !viewCounted.current) {
      viewCounted.current = true; // Mark as attempting to count to prevent re-triggering
      const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);
      updateDoc(postRef, {
          viewCount: increment(1)
      }).catch((error) => {
          console.error("Error updating view count: ", error);
          viewCounted.current = false; // Allow retry if it fails
      });
    }

  }, [isInView, firestore, post.id, post.userId]);

  return (
    // The main container for the post, handles clicks for muting
    <div ref={cardRef} className="relative w-full h-full bg-black rounded-lg overflow-hidden" onClick={toggleMute}>
      
      {/* Media Display */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={post.mediaUrl}
          className="object-cover w-full h-full"
          loop
          playsInline
          muted={isMuted}
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

      {/* Mute/Unmute Icon Overlay */}
      {showVolumeIcon && isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="p-4 rounded-full bg-black/50">
            {isMuted ? <VolumeX size={48} className="text-white" /> : <Volume2 size={48} className="text-white" />}
          </div>
        </div>
      )}

      {/* Information and Actions Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white" onClick={(e) => e.stopPropagation()}>
        {isAuthorLoading ? (
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-24" />
            </div>
        ) : (
          author && (
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src={author.profileImageUrl} />
                <AvatarFallback>{author.name[0]}</AvatarFallback>
              </Avatar>
              <p className="font-bold text-sm">{author.username}</p>
            </div>
          )
        )}
        <p className="text-sm mt-2">{post.caption}</p>
      </div>
      
      {/* Side action buttons */}
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
