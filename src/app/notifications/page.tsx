'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, writeBatch, doc } from 'firebase/firestore';
import type { Notification } from '@/models/notification';
import { NotificationItem } from '@/components/notification-item';
import { Skeleton } from '@/components/ui/skeleton';
import { HeartCrack, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { BottomNav } from "@/components/bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

export default function NotificationsPage() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();

    const notificationsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
    }, [firestore, user]);

    const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

    useEffect(() => {
        if (!firestore || !user || !notifications || notifications.length === 0) return;

        const unreadNotifications = notifications.filter(n => !n.read);
        if (unreadNotifications.length === 0) return;

        const batch = writeBatch(firestore);
        unreadNotifications.forEach(n => {
            const notificationRef = doc(firestore, 'users', user.uid, 'notifications', n.id);
            batch.update(notificationRef, { read: true });
        });

        batch.commit().catch(err => console.error("Error marking notifications as read:", err));
    }, [firestore, user, notifications]);

    const renderSkeleton = () => (
      <div className="flex items-center space-x-4 p-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
        </div>
      </div>
    );

    return (
        <div className="flex min-h-screen flex-col text-white bg-background pb-16">
             <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background z-10">
                <Link href="/" className='p-2 -ml-2'>
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
            <PwaInstallPrompt />
            <BottomNav />
        </div>
    );
}
