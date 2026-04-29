'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Notification } from '@/models/notification';
import { NotificationItem } from '@/components/notification-item';
import { Skeleton } from '@/components/ui/skeleton';
import { HeartCrack, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();

    const notificationsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
    }, [firestore, user]);

    const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

    const renderSkeleton = () => (
      <div className="flex items-center space-x-4 p-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
        </div>
      </div>
    );

    return (
        <div className="flex h-full flex-col text-white bg-background">
             <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background z-10">
                <Link href="/feed" className='p-2 -ml-2'>
                    <ArrowLeft />
                </Link>
                <h1 className="text-xl font-bold mx-auto pr-8">Notifications</h1>
            </header>

            <div className="overflow-y-auto">
                {(isLoading || isUserLoading) && (
                    <div className='p-4 space-y-2'>
                        {renderSkeleton()}
                        {renderSkeleton()}
                        {renderSkeleton()}
                    </div>
                )}
                
                {!isLoading && !isUserLoading && (!notifications || notifications.length === 0) && (
                     <div className="flex flex-col items-center justify-center text-center p-10 mt-20">
                        <HeartCrack className="w-20 h-20 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-bold">No Notifications Yet</h3>
                        <p className="text-muted-foreground">When you get a new follower, you'll see it here.</p>
                    </div>
                )}
                
                {notifications && notifications.map(notification => (
                    <NotificationItem key={notification.id} notification={notification} />
                ))}
            </div>
        </div>
    );
}
