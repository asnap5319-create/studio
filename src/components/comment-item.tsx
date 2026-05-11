
'use client';

import { useDoc, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import type { Comment } from '@/models/comment';
import type { UserProfile } from '@/models/user';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, BadgeCheck } from 'lucide-react';
import { doc, updateDoc, increment, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CommentItemProps {
  comment: Comment;
  postOwnerId: string;
}

const ADMIN_EMAIL = "asnap5319@gmail.com";

export function CommentItem({ comment, postOwnerId }: CommentItemProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [isLiking, setIsLiking] = useState(false);

  const authorRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'users', comment.userId);
  }, [firestore, comment.userId]);

  const { data: author } = useDoc<UserProfile>(authorRef);

  const commentLikeRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', postOwnerId, 'posts', comment.postId, 'comments', comment.id, 'likes', user.uid);
  }, [firestore, user, postOwnerId, comment.postId, comment.id]);

  const { data: likeData } = useDoc(commentLikeRef);
  const isLiked = !!likeData;

  const isProfileAdmin = author?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleLike = async () => {
    if (!firestore || !user || isLiking) return;
    setIsLiking(true);

    const commentRef = doc(firestore, 'users', postOwnerId, 'posts', comment.postId, 'comments', comment.id);
    const likeRef = doc(firestore, 'users', postOwnerId, 'posts', comment.postId, 'comments', comment.id, 'likes', user.uid);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(commentRef, { likeCount: increment(-1) });
      } else {
        await setDoc(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
        await updateDoc(commentRef, { likeCount: increment(1) });
      }
    } catch (e) {
      console.error('Error liking comment:', e);
    } finally {
      setIsLiking(false);
    }
  };

  if (!author) return null;

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={author.profileImageUrl} />
        <AvatarFallback>{author.username[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-sm">{author.username}</span>
              {isProfileAdmin && <BadgeCheck className="h-3 w-3 text-blue-400 fill-blue-400/20 shrink-0" />}
              <span className="text-sm break-words">{comment.content}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate()) : 'just now'}</span>
              {comment.likeCount && comment.likeCount > 0 && (
                <span className="font-semibold">{comment.likeCount} like{comment.likeCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
          <button onClick={handleLike} className="pt-1 px-2">
            <Heart 
              className={cn("h-3 w-3 transition-colors", isLiked ? "fill-primary text-primary" : "text-muted-foreground")} 
            />
          </button>
        </div>
      </div>
    </div>
  );
}
