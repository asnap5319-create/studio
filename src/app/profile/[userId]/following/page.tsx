
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCollection, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { ArrowLeft, Search, BadgeCheck, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import type { UserProfile } from '@/models/user';
import { BottomNav } from "@/components/bottom-nav";

const ADMIN_EMAIL = "asnap5319@gmail.com";

function UserListItem({ userId }: { userId: string }) {
    const { firestore } = useFirebase();
    const userRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: userProfile } = useDoc<UserProfile>(userRef);

    if (!userProfile) return null;

    const isAdmin = userProfile.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    return (
        <Link href={`/profile/${userProfile.id}`} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors rounded-2xl">
            <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-white/10">
                    <AvatarImage src={userProfile.profileImageUrl} className="object-cover" />
                    <AvatarFallback>{userProfile.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{userProfile.username}</span>
                        {isAdmin && <BadgeCheck className="h-3 w-3 text-blue-400 fill-blue-400/20" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{userProfile.name}</span>
                </div>
            </div>
        </Link>
    );
}

export default function FollowingPage() {
    const params = useParams();
    const userId = params?.userId as string;
    const router = useRouter();
    const { firestore } = useFirebase();
    const [searchTerm, setSearchTerm] = useState('');

    const followingQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'user_following', userId, 'following'));
    }, [firestore, userId]);

    const { data: following, isLoading } = useCollection(followingQuery);

    const userProfileRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userProfileRef);

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen bg-background text-white pb-24 max-w-lg mx-auto border-x border-white/5">
            <header className="p-4 flex items-center border-b border-white/5 sticky top-0 bg-background/80 backdrop-blur-md z-20">
                <button onClick={() => router.back()} className="p-2 -ml-2"><ArrowLeft /></button>
                <div className="ml-4">
                    <h1 className="text-lg font-bold">Following</h1>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">@{profile?.username}</p>
                </div>
            </header>

            <div className="p-4">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search following..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-12 bg-secondary/40 border-white/5 rounded-2xl focus:ring-primary"
                    />
                </div>

                <div className="space-y-1">
                    {following?.map((f: any) => (
                        <UserListItem key={f.id} userId={f.id} />
                    ))}
                    {following?.length === 0 && (
                        <div className="text-center py-20 opacity-30 italic">Not following anyone yet</div>
                    )}
                </div>
            </div>
            <BottomNav />
        </div>
    );
}
