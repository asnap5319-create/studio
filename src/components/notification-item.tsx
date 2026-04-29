'use client';

import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import type { Notification } from '@/models/notification';
import type { UserProfile } from '@/models/user';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export function NotificationItem({ notification }: { notification: Notification }) {
    const { firestore } = useFirebase();

    const senderRef = useMemoFirebase(() => {
        if (!firestore || !notification.senderId) return null;
        return doc(firestore, 'users', notification.senderId);
    }, [firestore, notification.senderId]);

    const { data: sender, isLoading } = useDoc<UserProfile>(senderRef);
    
    if (isLoading) {
        return (
            <div className="flex items-center space-x-4 p-4 border-b border-border">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                </div>
            </div>
        );
    }

    if (!sender) return null; // Or some fallback UI

    let message = '';
    switch (notification.type) {
        case 'follow':
            message = 'started following you.';
            break;
        case 'like':
            message = 'liked your post.';
            break;
        case 'comment':
            message = 'commented on your post.';
            break;
        default:
            break;
    }

    const timeAgo = notification.createdAt
        ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
        : '';


    return (
        <div className="flex items-center gap-3 p-4 border-b border-border last:border-b-0">
            <Link href={`/profile/${sender.id}`}>
                <Avatar className="h-12 w-12">
                    <AvatarImage src={sender.profileImageUrl} />
                    <AvatarFallback>{sender.name?.[0]}</AvatarFallback>
                </Avatar>
            </Link>
            <p className="flex-1 text-sm">
                <Link href={`/profile/${sender.id}`} className="font-bold hover:underline">{sender.username}</Link>
                {' '}{message}
                <span className="text-xs text-muted-foreground ml-2">{timeAgo}</span>
            </p>
            {/* Can add post thumbnail here for like/comment */}
        </div>
    );
}
