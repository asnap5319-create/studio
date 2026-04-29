'use client';

import { useDoc, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import type { Comment } from '@/models/comment';
import type { UserProfile } from '@/models/user';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart } from 'lucide-react';
import { doc, updateDoc, increment, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CommentItemProps {
  comment: Comment;
  postOwnerId: string;
}

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
          <div>
            <p className="text-sm">
              <span className="font-bold mr-2">{author.username}</span>
              {comment.content}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate()) : 'just now'}</span>
              {comment.likeCount && comment.likeCount > 0 && (
                <span className="font-semibold">{comment.likeCount} like{comment.likeCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
          <button onClick={handleLike} className="pt-1">
            <Heart 
              className={cn("h-3 w-3", isLiked ? "fill-primary text-primary" : "text-muted-foreground")} 
            />
          </button>
        </div>
      </div>
    </div>
  );
}
