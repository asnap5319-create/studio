'use client';

import { useDoc, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import type { Notification } from '@/models/notification';
import type { UserProfile } from '@/models/user';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { doc, writeBatch, serverTimestamp, collection } from 'firebase/firestore';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, UserCheck } from 'lucide-react';

export function NotificationItem({ notification }: { notification: Notification }) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();

    const senderRef = useMemoFirebase(() => {
        if (!firestore || !notification.senderId) return null;
        return doc(firestore, 'users', notification.senderId);
    }, [firestore, notification.senderId]);

    const { data: sender, isLoading } = useDoc<UserProfile>(senderRef);

    // Check if current user is following the sender
    const followCheckRef = useMemoFirebase(() => {
        if (!firestore || !user || !notification.senderId) return null;
        return doc(firestore, 'user_followers', notification.senderId, 'followers', user.uid);
    }, [firestore, user, notification.senderId]);

    const { data: followCheck } = useDoc(followCheckRef);
    const isFollowing = !!followCheck;

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (!firestore || !user || !notification.senderId) {
            toast({ variant: "destructive", title: "Error", description: "Login to follow users." });
            return;
        }

        const batch = writeBatch(firestore);
        const followedUserId = notification.senderId;
        const followerUserId = user.uid;

        const followerDocRef = doc(firestore, 'user_followers', followedUserId, 'followers', followerUserId);
        const followingDocRef = doc(firestore, 'user_following', followerUserId, 'following', followedUserId);

        if (isFollowing) {
            batch.delete(followerDocRef);
            batch.delete(followingDocRef);
        } else {
            batch.set(followerDocRef, { createdAt: serverTimestamp() });
            batch.set(followingDocRef, { createdAt: serverTimestamp() });
            
            // Send a notification back to them
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
                title: isFollowing ? `Unfollowed ${sender?.username}` : `Following ${sender?.username}`,
            });
        } catch (error) {
            console.error("Error toggling follow from notification:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Action failed.' });
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center space-x-4 p-4 border-b border-border">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
        );
    }

    if (!sender) return null;

    let message = '';
    let extraContent = null;

    switch (notification.type) {
        case 'follow':
            message = 'started following you.';
            break;
        case 'like':
            message = 'liked your post.';
            break;
        case 'comment':
            message = 'commented on your post:';
            extraContent = notification.content ? (
                <p className="mt-1 p-2 bg-secondary/50 rounded-md text-sm italic text-muted-foreground border-l-2 border-primary">
                    "{notification.content}"
                </p>
            ) : null;
            break;
        default:
            break;
    }

    const timeAgo = notification.createdAt
        ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
        : '';


    return (
        <div className="flex items-center gap-3 p-4 border-b border-border last:border-b-0 hover:bg-secondary/20 transition-colors">
            <Link href={`/profile/${sender.id}`} onClick={(e) => e.stopPropagation()}>
                <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={sender.profileImageUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary">{sender.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
                <div className="flex flex-col">
                    <p className="text-sm truncate">
                        <Link href={`/profile/${sender.id}`} className="font-bold hover:underline">{sender.username}</Link>
                        {' '}{message}
                    </p>
                    {extraContent}
                    <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{timeAgo}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
                {notification.type === 'follow' ? (
                    <Button 
                        size="sm" 
                        variant={isFollowing ? "secondary" : "default"}
                        onClick={handleFollowToggle}
                        className="h-8 font-bold"
                    >
                        {isFollowing ? 'Following' : 'Follow Back'}
                    </Button>
                ) : (
                    notification.postId && (
                        <Link href={`/feed`} className="shrink-0">
                            <div className="h-11 w-11 bg-secondary rounded overflow-hidden flex items-center justify-center border border-border">
                                {sender.profileImageUrl && (
                                     <Skeleton className="h-full w-full" />
                                )}
                            </div>
                        </Link>
                    )
                )}
            </div>
        </div>
    );
}
