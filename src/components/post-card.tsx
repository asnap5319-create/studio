'use client';

import { useState, useRef, useEffect } from 'react';
import type { Post } from '@/models/post';
import type { UserProfile } from '@/app/(main)/profile/page';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, Send, Volume2, VolumeX } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface PostCardProps {
  post: Post;
  // This prop will be used later for scroll-based autoplay
  isInView?: boolean;
}

export function PostCard({ post, isInView = true }: PostCardProps) {
  const { firestore } = useFirebase();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isMuted, setIsMuted] = useState(true);
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

    // Show volume icon feedback
    setShowVolumeIcon(true);
    setTimeout(() => {
      setShowVolumeIcon(false);
    }, 800);
  };

  // Effect for scroll-based play/pause
   useEffect(() => {
    if (videoRef.current) {
      if (isInView) {
        videoRef.current.play().catch(error => console.log("Autoplay was prevented. User may need to interact first."));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isInView]);

  return (
    // The main container for the post, handles clicks for muting
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden" onClick={toggleMute}>
      
      {/* Media Display */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={post.mediaUrl}
          className="object-cover w-full h-full"
          autoPlay
          loop
          playsInline
          muted // Start muted, control via state
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
