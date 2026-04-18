'use client';

import { Post } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import Image from 'next/image';

interface VideoCardProps {
  post: Post;
}

export function VideoCard({ post }: VideoCardProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = React.useState(true);
  const [showHeart, setShowHeart] = React.useState(false);

  const handleVideoPress = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const handleLike = () => {
    setShowHeart(true);
    setTimeout(() => {
      setShowHeart(false);
    }, 1000);
    // Here you would also update the like count in Firestore
  };

  // For now, we use an image as a placeholder for the video
  // In a real app, you would use a <video> element
  const isVideo = post.videoUrl?.includes('.mp4');

  return (
    <div className="relative h-full w-full bg-black">
      {/* Using Image as a placeholder for now */}
      <Image 
        src={post.videoUrl}
        alt={post.caption || 'Video post'}
        fill
        className="object-cover"
        priority
      />

      {/* Video Player overlay UI */}
      <div className="absolute inset-0 flex flex-col justify-between p-4 text-white">
        {/* Header - empty for now */}
        <div></div>

        {/* Footer */}
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarImage src={post.user?.profilePictureUrl} />
                <AvatarFallback>{post.user?.username?.[0]}</AvatarFallback>
              </Avatar>
              <p className="font-bold text-shadow">{post.user?.username}</p>
               <button className="ml-2 rounded-md border border-primary px-3 py-1 text-sm font-semibold text-primary">Follow</button>
            </div>
            <p className="text-shadow-md">{post.caption}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-center gap-4">
            <button onClick={handleLike} className="flex flex-col items-center gap-1">
              <div className="rounded-full bg-black/50 p-3">
                <Heart className="h-7 w-7" />
              </div>
              <span className="text-sm font-semibold">{post.likeCount}</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <div className="rounded-full bg-black/50 p-3">
                <MessageCircle className="h-7 w-7" />
              </div>
              <span className="text-sm font-semibold">{post.commentCount}</span>
            </button>
             <button className="flex flex-col items-center gap-1">
              <div className="rounded-full bg-black/50 p-3">
                <Bookmark className="h-7 w-7" />
              </div>
              <span className="text-sm font-semibold">Save</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <div className="rounded-full bg-black/50 p-3">
                <Send className="h-7 w-7" />
              </div>
              <span className="text-sm font-semibold">Share</span>
            </button>
            <button>
              <Avatar className="h-12 w-12 border-2 border-white">
                <AvatarImage src={post.user?.profilePictureUrl} />
                <AvatarFallback>{post.user?.username?.[0]}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>

       {/* Like animation */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Heart className="h-24 w-24 text-red-500" fill="currentColor" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
