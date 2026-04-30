'use client';

import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import type { Notification } from '@/models/notification';
import type { UserProfile } from '@/models/user';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { doc } from 'firebase/firestore';

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
        <div className="flex items-start gap-3 p-4 border-b border-border last:border-b-0 hover:bg-secondary/20 transition-colors">
            <Link href={`/profile/${sender.id}`} onClick={(e) => e.stopPropagation()}>
                <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={sender.profileImageUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary">{sender.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1">
                <div className="flex flex-col">
                    <p className="text-sm">
                        <Link href={`/profile/${sender.id}`} className="font-bold hover:underline">{sender.username}</Link>
                        {' '}{message}
                    </p>
                    {extraContent}
                    <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{timeAgo}</span>
                </div>
            </div>
            {notification.postId && (
                 <Link href={`/feed`} className="shrink-0">
                    <div className="h-12 w-12 bg-secondary rounded overflow-hidden flex items-center justify-center">
                         <Skeleton className="h-full w-full" />
                    </div>
                 </Link>
            )}
        </div>
    );
}
