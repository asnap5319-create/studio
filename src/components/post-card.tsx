'use client';

import type { Post } from '@/models/post';
import type { UserProfile } from '@/app/(main)/profile/page';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { firestore } = useFirebase();

  const authorRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'users', post.userId);
  }, [firestore, post.userId]);

  const { data: author, isLoading: isAuthorLoading } = useDoc<UserProfile>(authorRef);

  const isVideo = post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.mov') || post.mediaUrl.includes('video');

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Media Display */}
      {isVideo ? (
        <video
          src={post.mediaUrl}
          className="object-contain w-full h-full"
          autoPlay
          loop
          muted
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

      {/* Overlay with post info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
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
      <div className="absolute right-2 bottom-24 flex flex-col gap-4">
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
