'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, orderBy, doc, limit, deleteDoc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2, Users, FileVideo, ArrowLeft, Search, ShieldCheck, Loader2, Play, MoreVertical, Eye, CreditCard, CheckCircle, XCircle, Clock, Banknote, UserPlus, Activity, ExternalLink, Fingerprint, MessageSquare, Sparkles, Mail, Landmark, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import type { Post } from '@/models/post';
import type { PayoutRequest } from '@/models/payout';
import type { SupportTicket } from '@/models/support';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';

const ADMIN_EMAIL = "asnap5319@gmail.com";

export default function AdminPage() {
    const { user, isUserLoading } = user ? useUser() : { user: null, isUserLoading: false }; // Simplified for safety
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

    const isAdmin = useMemo(() => {
        if (!user?.email) return false;
        return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    }, [user]);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore]);

    const postsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore]);

    const payoutsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'payout_requests'), orderBy('createdAt', 'desc'), limit(50));
    }, [firestore]);

    const supportQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'support_tickets'), orderBy('createdAt', 'desc'), limit(50));
    }, [firestore]);

    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);
    const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(postsQuery);
    const { data: payouts, isLoading: isPayoutsLoading } = useCollection<PayoutRequest>(payoutsQuery);
    const { data: supportTickets, isLoading: isSupportLoading } = useCollection<SupportTicket>(supportQuery);

    const financialStats = useMemo(() => {
        if (!posts || !payouts) return { totalRevenue: 0, paidOut: 0, pending: 0 };
        const totalRevenue = posts.reduce((sum, p) => sum + (p.estimatedEarnings || 0), 0);
        const paidOut = payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
        const pending = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
        return { totalRevenue, paidOut, pending };
    }, [posts, payouts]);

    const filteredUsers = users?.filter(u => 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteUser = async (userId: string, username: string) => {
        if (!firestore || !isAdmin) return;
        if (!confirm(`🚨 चेतावनी 🚨\n\nक्या आप वाकई "${username}" की आईडी डिलीट करना चाहते हैं?`)) return;

        setIsActionLoading(userId);
        const userDocRef = doc(firestore, 'users', userId);

        try {
            await deleteDoc(userDocRef);
            toast({ title: "सफलता ✅", description: "यूजर डिलीट हो गया।" });
        } catch (error: any) {
            const permissionError = new FirestorePermissionError({ path: userDocRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsActionLoading(null);
        }
    };

    if (isUserLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

    if (!user || !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background text-white">
                <ShieldAlert className="w-20 h-20 text-destructive mb-4 animate-bounce" />
                <h1 className="text-3xl font-black mb-2 text-red-500 uppercase">ACCESS DENIED</h1>
                <p className="text-muted-foreground mb-8">This panel is restricted to admin.</p>
                <Button onClick={() => router.push('/')}>Return to Feed</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-white p-4 max-w-5xl mx-auto pb-24">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-md z-30 py-4 gap-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl"><ArrowLeft /></Button>
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2 text-primary uppercase italic"><ShieldCheck /> Master Panel</h1>
                        <p className="text-[10px] text-green-500 font-bold mt-1">Admin Mode Active</p>
                    </div>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search Users/Payouts/IDs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary/50 border-white/10 rounded-xl" />
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {/* Users Count */}
                <div className="bg-secondary/30 p-5 rounded-[2rem] border border-white/5 flex flex-col items-center text-center">
                    <Users className="text-blue-400 mb-2 h-6 w-6" />
                    <p className="text-2xl font-black">{users?.length || 0}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total Users</p>
                </div>

                {/* Total Revenue - Answer to "Kitna Bill/Money" */}
                <div className="bg-primary/10 p-5 rounded-[2rem] border border-primary/20 flex flex-col items-center text-center shadow-[0_0_20px_rgba(255,51,102,0.1)]">
                    <TrendingUp className="text-primary mb-2 h-6 w-6" />
                    <p className="text-2xl font-black text-primary">₹{financialStats.totalRevenue.toFixed(0)}</p>
                    <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Total Bill/Revenue</p>
                </div>

                {/* Live Activity */}
                <div className="bg-green-500/10 p-5 rounded-[2rem] border border-green-500/20 flex flex-col items-center text-center">
                    <Activity className="text-green-500 mb-2 h-6 w-6 animate-pulse" />
                    <p className="text-2xl font-black text-green-500">{users?.filter(u => !!u.fcmToken).length || 0}</p>
                    <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Online Now</p>
                </div>

                {/* Unpaid Bills */}
                <div className="bg-yellow-500/10 p-5 rounded-[2rem] border border-yellow-500/20 flex flex-col items-center text-center">
                    <Landmark className="text-yellow-500 mb-2 h-6 w-6" />
                    <p className="text-2xl font-black text-yellow-500">₹{financialStats.pending.toFixed(0)}</p>
                    <p className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">Pending Payouts</p>
                </div>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-secondary/50 p-1 rounded-2xl mb-8 border border-white/5 h-14">
                    <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary font-bold text-[10px] uppercase">Users</TabsTrigger>
                    <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-primary font-bold text-[10px] uppercase">Videos</TabsTrigger>
                    <TabsTrigger value="payouts" className="rounded-xl data-[state=active]:bg-primary font-bold text-[10px] uppercase">Payouts</TabsTrigger>
                    <TabsTrigger value="support" className="rounded-xl data-[state=active]:bg-primary font-bold text-[10px] uppercase">Support</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredUsers?.map(u => (
                            <div key={u.id} className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                u.fcmToken ? "bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-secondary/40 border-white/5"
                            )}>
                                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                    <Link href={`/profile/${u.id}`} className="shrink-0 relative">
                                        <Avatar className="h-14 w-14 border border-white/10">
                                            <AvatarImage src={u.profileImageUrl} className="object-cover" />
                                            <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                        </Avatar>
                                        {u.fcmToken && <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />}
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/profile/${u.id}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                            <p className="font-bold text-sm truncate">{u.username}</p>
                                            {u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && <ShieldCheck className="h-3 w-3 text-blue-400" />}
                                        </Link>
                                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id, u.username)} className="text-destructive hover:bg-destructive/10 rounded-full"><Trash2 size={18} /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
                
                <TabsContent value="posts">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {posts?.map(post => (
                            <div key={post.id} className="bg-secondary/40 rounded-2xl overflow-hidden border border-white/5 group">
                                <div className="aspect-[9/16] relative">
                                    <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                        <p className="text-xs font-black text-white drop-shadow-md">₹{(post.estimatedEarnings || 0).toFixed(2)}</p>
                                        <Button size="sm" variant="destructive" onClick={() => { if(confirm('Delete video?')) deleteDoc(doc(firestore!, 'users', post.userId, 'posts', post.id)) }} className="h-7 text-[8px] uppercase font-black rounded-lg">Delete</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="payouts">
                    <div className="space-y-3">
                        {payouts?.length === 0 && (
                            <div className="text-center py-20 text-muted-foreground italic">No payout requests yet.</div>
                        )}
                        {payouts?.map(p => (
                            <div key={p.id} className="bg-secondary/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-green-500/20 rounded-xl text-green-500"><Banknote /></div>
                                    <div>
                                        <p className="font-black text-lg">₹{p.amount}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">@{p.username}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {p.status === 'pending' && (
                                        <Button size="sm" onClick={() => updateDoc(doc(firestore!, 'payout_requests', p.id), { status: 'paid', updatedAt: serverTimestamp() })} className="bg-green-600 font-bold h-8 rounded-lg">Pay</Button>
                                    )}
                                    <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase", p.status === 'paid' ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500")}>{p.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="support">
                    <div className="space-y-4">
                        {supportTickets?.length === 0 && (
                            <div className="text-center py-20 text-muted-foreground">
                                <MessageSquare className="mx-auto mb-4 opacity-20 h-12 w-12" />
                                <p className="font-bold uppercase text-[10px]">No support tickets found</p>
                            </div>
                        )}
                        {supportTickets?.map(ticket => (
                            <div key={ticket.id} className="bg-secondary/30 p-6 rounded-[2rem] border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10"><AvatarFallback>{ticket.userName?.[0] || 'U'}</AvatarFallback></Avatar>
                                        <div>
                                            <p className="font-black text-sm">@{ticket.userName}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Mail size={10} className="text-muted-foreground" />
                                                <p className="text-[8px] text-muted-foreground font-bold uppercase">{ticket.userEmail}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-[8px] font-black uppercase">
                                        {ticket.createdAt ? format(ticket.createdAt.toDate(), 'HH:mm dd MMM') : 'Just now'}
                                    </div>
                                </div>
                                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black text-primary uppercase mb-2">User Question:</p>
                                    <p className="text-sm font-medium">{ticket.query}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold text-muted-foreground uppercase pt-2 border-t border-white/5">
                                    <span className="flex items-center gap-1"><Users size={10} /> {ticket.statsAtTime?.followers || 0} Followers</span>
                                    <span className="flex items-center gap-1"><FileVideo size={10} /> {ticket.statsAtTime?.posts || 0} Posts</span>
                                    <span className="flex items-center gap-1"><Eye size={10} /> {ticket.statsAtTime?.views || 0} Views</span>
                                    <span className="flex items-center gap-1 text-green-500"><Banknote size={10} /> ₹{ticket.statsAtTime?.earnings || 0}</span>
                                </div>
                                <div className="pt-2">
                                    <Link href={`/messages/${[user!.uid, ticket.userId].sort().join('_')}`}>
                                        <Button className="w-full h-10 bg-primary font-black uppercase text-[10px] rounded-xl">Reply in Chat</Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
            <BottomNav />
        </div>
    );
}