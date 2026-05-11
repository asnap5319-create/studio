
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
import { BadgeCheck } from 'lucide-react';

const ADMIN_EMAIL = "asnap5319@gmail.com";

export function NotificationItem({ notification }: { notification: Notification }) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();

    const senderRef = useMemoFirebase(() => {
        if (!firestore || !notification.senderId) return null;
        return doc(firestore, 'users', notification.senderId);
    }, [firestore, notification.senderId]);

    const { data: sender, isLoading } = useDoc<UserProfile>(senderRef);

    const followCheckRef = useMemoFirebase(() => {
        if (!firestore || !user || !notification.senderId) return null;
        return doc(firestore, 'user_followers', notification.senderId, 'followers', user.uid);
    }, [firestore, user, notification.senderId]);

    const { data: followCheck } = useDoc(followCheckRef);
    const isFollowing = !!followCheck;

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!firestore || !user || !notification.senderId) return;

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
            toast({ title: isFollowing ? `Unfollowed ${sender?.username}` : `Following ${sender?.username}` });
        } catch (error) {
            console.error("Error toggling follow:", error);
        }
    };
    
    if (isLoading) return <div className="p-4 border-b border-border"><Skeleton className="h-12 w-12 rounded-full" /></div>;
    if (!sender) return null;

    const isSenderAdmin = sender.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    let message = '';
    switch (notification.type) {
        case 'follow': message = 'started following you.'; break;
        case 'like': message = 'liked your post.'; break;
        case 'comment': message = 'commented on your post.'; break;
    }

    const timeAgo = notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : '';

    return (
        <div className="flex items-center gap-3 p-4 border-b border-border last:border-b-0 hover:bg-secondary/20 transition-colors">
            <Link href={`/profile/${sender.id}`}>
                <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={sender.profileImageUrl} />
                    <AvatarFallback>{sender.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
                <div className="flex flex-col">
                    <div className="text-sm">
                        <div className="flex items-center gap-1 inline-flex">
                            <Link href={`/profile/${sender.id}`} className="font-bold">{sender.username}</Link>
                            {isSenderAdmin && <BadgeCheck className="h-3 w-3 text-blue-400 fill-blue-400/20" />}
                        </div>
                        {' '}{message}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">{timeAgo}</span>
                </div>
            </div>
            {notification.type === 'follow' && (
                <Button size="sm" variant={isFollowing ? "secondary" : "default"} onClick={handleFollowToggle} className="h-8 font-bold">
                    {isFollowing ? 'Following' : 'Follow Back'}
                </Button>
            )}
        </div>
    );
}
