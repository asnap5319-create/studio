'use client';

import { useState } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import type { Comment } from '@/models/comment';
import { CommentItem } from './comment-item';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { MessageCircle } from 'lucide-react';

interface CommentSectionProps {
  postId: string;
  postOwnerId: string;
}

export function CommentSection({ postId, postOwnerId }: CommentSectionProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'users', postOwnerId, 'posts', postId, 'comments'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, postOwnerId, postId]);

  const { data: comments, isLoading } = useCollection<Comment>(commentsQuery);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !newComment.trim() || isSubmitting) return;

    const commentText = newComment.trim();
    setIsSubmitting(true);
    try {
      const commentData = {
        userId: user.uid,
        postId: postId,
        content: commentText,
        createdAt: serverTimestamp(),
        likeCount: 0,
      };

      const commentsRef = collection(firestore, 'users', postOwnerId, 'posts', postId, 'comments');
      await addDoc(commentsRef, commentData);

      const postRef = doc(firestore, 'users', postOwnerId, 'posts', postId);
      await updateDoc(postRef, { commentCount: increment(1) });

      if (user.uid !== postOwnerId) {
          await addDoc(collection(firestore, 'users', postOwnerId, 'notifications'), {
              type: 'comment',
              senderId: user.uid,
              recipientId: postOwnerId,
              postId: postId,
              content: commentText,
              read: false,
              createdAt: serverTimestamp(),
          });
      }

      setNewComment('');
    } catch (e) {
      console.error('Error adding comment:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="p-4 border-b border-border text-center">
        <h3 className="font-bold text-lg">Comments</h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} postOwnerId={postOwnerId} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mb-2 opacity-20" />
            <p>No comments yet. Start the conversation!</p>
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={handleAddComment} className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-secondary border-none focus-visible:ring-1"
            disabled={isSubmitting}
          />
          <Button 
            type="submit" 
            variant="ghost" 
            className="text-primary font-bold hover:bg-transparent"
            disabled={!newComment.trim() || isSubmitting}
          >
            Post
          </Button>
        </form>
      </div>
    </div>
  );
}
