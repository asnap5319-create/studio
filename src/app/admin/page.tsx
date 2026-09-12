'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, orderBy, doc, limit, deleteDoc, updateDoc, serverTimestamp, where, increment, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2, Users, FileVideo, ArrowLeft, Search, ShieldCheck, Loader2, Play, Banknote, Landmark, TrendingUp, Flag, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import type { Post } from '@/models/post';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import Link from 'next/link';

const ADMIN_EMAIL = "asnap5319@gmail.com";

interface DepositRequest {
    id: string;
    userId: string;
    username: string;
    amount: number;
    utr: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
}

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => { setHasMounted(true); }, []);

    const isAdmin = useMemo(() => {
        if (!user?.email) return false;
        return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    }, [user]);

    const depositsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'deposit_requests'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore]);

    const usersQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(100)) : null, 
    [firestore]);

    const { data: deposits, isLoading: isDepositsLoading } = useCollection<DepositRequest>(depositsQuery);
    const { data: users } = useCollection<UserProfile>(usersQuery);

    const handleApproveDeposit = async (req: DepositRequest) => {
        if (!firestore || !isAdmin) return;
        if (!confirm(`Approve ₹${req.amount} for @${req.username}?`)) return;

        try {
            const batch = writeBatch(firestore);
            
            // 1. Update user balance
            const userRef = doc(firestore, 'users', req.userId);
            batch.update(userRef, { 
                virtualBalance: increment(req.amount),
                updatedAt: serverTimestamp() 
            });

            // 2. Mark request as approved
            const reqRef = doc(firestore, 'deposit_requests', req.id);
            batch.update(reqRef, { status: 'approved' });

            await batch.commit();
            toast({ title: "Approved! ✅", description: `₹${req.amount} added to @${req.username}` });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error" });
        }
    };

    if (isUserLoading || !hasMounted) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

    if (!user || !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background text-foreground">
                <ShieldAlert className="w-20 h-20 text-destructive mb-4 animate-bounce" />
                <h1 className="text-3xl font-black mb-2 text-red-500 uppercase">ACCESS DENIED</h1>
                <p className="text-muted-foreground mb-8">This panel is restricted to admin.</p>
                <Button onClick={() => router.push('/')}>Return to Feed</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 max-w-5xl mx-auto pb-24">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-md z-30 py-4 gap-4 border-b border-border">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl"><ArrowLeft /></Button>
                    <h1 className="text-2xl font-black flex items-center gap-2 text-primary uppercase italic"><ShieldCheck /> Master Panel</h1>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search Requests..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary border-none rounded-xl" />
                </div>
            </header>

            <Tabs defaultValue="deposits" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-secondary p-1 rounded-2xl mb-8 h-14">
                    <TabsTrigger value="deposits" className="rounded-xl font-bold text-[10px] uppercase">Deposits</TabsTrigger>
                    <TabsTrigger value="users" className="rounded-xl font-bold text-[10px] uppercase">Users</TabsTrigger>
                    <TabsTrigger value="payouts" className="rounded-xl font-bold text-[10px] uppercase">Withdrawals</TabsTrigger>
                </TabsList>

                <TabsContent value="deposits">
                    <div className="space-y-4">
                        {deposits?.length === 0 && <div className="text-center py-20 text-muted-foreground italic">No requests yet.</div>}
                        {deposits?.map(req => (
                            <div key={req.id} className={cn(
                                "p-6 rounded-[2rem] border flex items-center justify-between gap-4 transition-all",
                                req.status === 'approved' ? "bg-green-500/5 border-green-500/20 opacity-60" : "bg-secondary/40 border-border"
                            )}>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-2xl font-black text-white">₹{req.amount}</p>
                                        {req.status === 'approved' && <CheckCircle2 size={16} className="text-green-500" />}
                                    </div>
                                    <p className="text-sm font-bold text-primary">@{req.username}</p>
                                    <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg mt-2">
                                        <p className="text-[10px] font-black uppercase text-white/40">UTR:</p>
                                        <p className="text-xs font-black text-yellow-500 tracking-widest" style={{ fontStyle: 'normal' }}>{req.utr}</p>
                                    </div>
                                </div>
                                <div>
                                    {req.status === 'pending' && (
                                        <Button 
                                            onClick={() => handleApproveDeposit(req)}
                                            className="bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] h-12 px-6 rounded-xl shadow-lg"
                                        >
                                            Approve
                                        </Button>
                                    )}
                                    {req.status === 'approved' && (
                                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Completed</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="users">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {users?.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl border bg-secondary/40 border-border">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12 border border-border">
                                        <AvatarImage src={u.profileImageUrl} className="object-cover" />
                                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{u.username}</p>
                                        <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">₹{u.virtualBalance?.toFixed(1) || '0.0'}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => router.push(`/profile/${u.id}`)} className="rounded-full"><Play size={16} /></Button>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
            <BottomNav />
        </div>
    );
}
