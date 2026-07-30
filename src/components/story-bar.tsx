'use client';

import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Loader2, Plus, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import type { Post } from '@/models/post';
import type { UserProfile } from '@/models/user';
import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const ADMIN_EMAIL = "asnap5319@gmail.com";

function StoryItem({ userId, latestPostId, isMe = false }: { userId: string; latestPostId: string; isMe?: boolean }) {
    const { firestore } = useFirebase();
    const userRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);

    if (!profile) return null;

    const isAdmin = profile.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    return (
        <Link 
            href={`/?postId=${latestPostId}`} 
            className="flex flex-col items-center gap-1.5 shrink-0 animate-in fade-in zoom-in duration-500"
        >
            <div className="relative group">
                <div className="absolute -inset-[3px] bg-gradient-to-tr from-yellow-400 via-primary to-purple-600 rounded-full animate-pulse opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-[68px] w-[68px] rounded-full border-[3px] border-background overflow-hidden bg-secondary">
                    <Avatar className="h-full w-full">
                        <AvatarImage src={profile.profileImageUrl} className="object-cover" />
                        <AvatarFallback className="font-bold">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>
                {isMe && (
                    <div className="absolute bottom-0 right-0 h-5 w-5 bg-blue-500 rounded-full border-2 border-background flex items-center justify-center text-white">
                        <Plus size={12} strokeWidth={4} />
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1 max-w-[75px]">
                <p className="text-[10px] font-bold truncate text-foreground/90">
                    {isMe ? 'Your Reel' : profile.username}
                </p>
                {isAdmin && <BadgeCheck className="h-2.5 w-2.5 text-blue-500" />}
            </div>
        </Link>
    );
}

export function StoryBar() {
    const { firestore } = useFirebase();
    const { user } = useUser();

    // Fetch latest posts to show as "Stories"
    const recentPostsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(40));
    }, [firestore]);

    const { data: posts, isLoading } = useCollection<Post>(recentPostsQuery);

    // Filter posts to show one per unique user
    const uniqueUserPosts = posts?.reduce((acc: Post[], current) => {
        const x = acc.find(item => item.userId === current.userId);
        if (!x) return acc.concat([current]);
        return acc;
    }, []) || [];

    return (
        <div className="w-full bg-background/50 border-b border-border/40 py-4 overflow-hidden">
            <div className="flex items-center gap-4 px-4 overflow-x-auto scrollbar-hide">
                {/* Always show Current User first if they have a reel */}
                {user && uniqueUserPosts.find(p => p.userId === user.uid) ? (
                    <StoryItem 
                        userId={user.uid} 
                        latestPostId={uniqueUserPosts.find(p => p.userId === user.uid)!.id} 
                        isMe 
                    />
                ) : user && (
                    <Link href="/create" className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="relative h-[68px] w-[68px] rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-secondary/30">
                            <Plus className="text-muted-foreground" />
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Add Reel</p>
                    </Link>
                )}

                {uniqueUserPosts.filter(p => p.userId !== user?.uid).map((post) => (
                    <StoryItem 
                        key={post.id} 
                        userId={post.userId} 
                        latestPostId={post.id} 
                    />
                ))}

                {isLoading && (
                    <div className="flex items-center gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[68px] w-[68px] rounded-full bg-secondary animate-pulse" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
