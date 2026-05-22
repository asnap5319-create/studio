
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, orderBy, doc, limit, deleteDoc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2, Users, FileVideo, ArrowLeft, Search, ShieldCheck, Loader2, Play, MoreVertical, Eye, CreditCard, CheckCircle, XCircle, Clock, Banknote, UserPlus, Activity, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import type { Post } from '@/models/post';
import type { PayoutRequest } from '@/models/payout';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';

const ADMIN_EMAIL = "asnap5319@gmail.com";

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
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

    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);
    const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(postsQuery);
    const { data: payouts, isLoading: isPayoutsLoading } = useCollection<PayoutRequest>(payoutsQuery);

    const filteredUsers = users?.filter(u => 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeUsersCount = users?.filter(u => !!u.fcmToken).length || 0;

    const handleUpdatePayoutStatus = async (requestId: string, status: PayoutRequest['status']) => {
        if (!firestore || !isAdmin) return;
        setIsActionLoading(requestId);
        try {
            await updateDoc(doc(firestore, 'payout_requests', requestId), {
                status,
                updatedAt: serverTimestamp()
            });
            toast({ title: `Status updated to ${status}` });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to update status." });
        } finally {
            setIsActionLoading(null);
        }
    };

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

    const handleDeletePost = async (post: Post) => {
        if (!firestore || !isAdmin) return;
        if (!confirm("क्या आप इस वीडियो को डिलीट करना चाहते हैं?")) return;

        setIsActionLoading(post.id);
        const postDocRef = doc(firestore, 'users', post.userId, 'posts', post.id);

        try {
            await deleteDoc(postDocRef);
            toast({ title: "सफलता ✅", description: "वीडियो डिलीट हो गया।" });
        } catch (error: any) {
            const permissionError = new FirestorePermissionError({ path: postDocRef.path, operation: 'delete' });
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

    const filteredPayouts = payouts?.filter(p => p.username.toLowerCase().includes(searchTerm.toLowerCase()));

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
                    <Input placeholder="Search Users/Payouts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary/50 border-white/10 rounded-xl" />
                </div>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-secondary/30 p-4 rounded-3xl border border-white/5 flex flex-col items-center text-center">
                    <Users className="text-blue-400 mb-2 h-6 w-6" />
                    <p className="text-2xl font-black">{users?.length || 0}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Total Users</p>
                </div>
                <div className="bg-secondary/30 p-4 rounded-3xl border border-white/5 flex flex-col items-center text-center">
                    <Activity className="text-green-500 mb-2 h-6 w-6" />
                    <p className="text-2xl font-black">{activeUsersCount}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Active Users</p>
                </div>
                <div className="bg-secondary/30 p-4 rounded-3xl border border-white/5 flex flex-col items-center text-center">
                    <FileVideo className="text-primary mb-2 h-6 w-6" />
                    <p className="text-2xl font-black">{posts?.length || 0}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Reels Posted</p>
                </div>
                <div className="bg-secondary/30 p-4 rounded-3xl border border-white/5 flex flex-col items-center text-center">
                    <CreditCard className="text-yellow-500 mb-2 h-6 w-6" />
                    <p className="text-2xl font-black">{payouts?.length || 0}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Payout Requests</p>
                </div>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-secondary/50 p-1 rounded-2xl mb-8 border border-white/5 h-14">
                    <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary font-bold"><Users className="mr-2 h-4 w-4" /> Users</TabsTrigger>
                    <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-primary font-bold"><FileVideo className="mr-2 h-4 w-4" /> Videos</TabsTrigger>
                    <TabsTrigger value="payouts" className="rounded-xl data-[state=active]:bg-primary font-bold"><Banknote className="mr-2 h-4 w-4" /> Payouts</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredUsers?.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-4 bg-secondary/40 rounded-2xl border border-white/5 group hover:bg-secondary/60 transition-all">
                                <Link href={`/profile/${u.id}`} className="flex items-center gap-3 flex-1">
                                    <Avatar className="h-12 w-12 border border-white/10">
                                        <AvatarImage src={u.profileImageUrl} className="object-cover" />
                                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-bold text-sm">{u.username}</p>
                                            {u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && <ShieldCheck className="h-3 w-3 text-blue-400" />}
                                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                                        {/* Show Active Status Clearly */}
                                        {u.fcmToken ? (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                                                <p className="text-[8px] text-green-500 font-black uppercase">Device Active</p>
                                            </div>
                                        ) : (
                                            <p className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">Inactive</p>
                                        )}
                                    </div>
                                </Link>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id, u.username)} className="text-destructive hover:bg-destructive/10"><Trash2 size={18} /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="payouts">
                    <div className="space-y-4">
                        {isPayoutsLoading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div> : filteredPayouts?.map(p => (
                            <div key={p.id} className="bg-secondary/30 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-primary/10 rounded-2xl"><CreditCard className="text-primary" /></div>
                                        <div>
                                            <p className="text-xl font-black italic">₹{p.amount.toFixed(2)}</p>
                                            <Link href={`/profile/${p.userId}`} className="text-[10px] text-muted-foreground uppercase font-black hover:text-primary">Request by @{p.username}</Link>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 text-[11px]">
                                        <div>
                                            <p className="text-muted-foreground uppercase font-bold mb-1">Method</p>
                                            <p className="font-black text-white uppercase">{p.method}</p>
                                        </div>
                                        {p.method === 'bank' ? (
                                            <>
                                                <div><p className="text-muted-foreground uppercase font-bold mb-1">A/C Holder</p><p className="font-bold">{p.details.holderName}</p></div>
                                                <div><p className="text-muted-foreground uppercase font-bold mb-1">Account No</p><p className="font-mono">{p.details.accountNo}</p></div>
                                                <div><p className="text-muted-foreground uppercase font-bold mb-1">IFSC</p><p className="font-mono">{p.details.ifsc}</p></div>
                                            </>
                                        ) : (
                                            <div><p className="text-muted-foreground uppercase font-bold mb-1">PayPal Email</p><p className="font-bold">{p.details.paypalEmail}</p></div>
                                        )}
                                        <div>
                                            <p className="text-muted-foreground uppercase font-bold mb-1">Requested On</p>
                                            <p className="font-bold">{p.createdAt ? format(p.createdAt.toDate(), 'PPpp') : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <div className={cn(
                                        "px-4 py-2 rounded-xl text-center text-[10px] font-black uppercase tracking-widest mb-2",
                                        p.status === 'pending' ? "bg-yellow-500/20 text-yellow-500" :
                                        p.status === 'approved' ? "bg-blue-500/20 text-blue-400" :
                                        p.status === 'paid' ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"
                                    )}>
                                        {p.status}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        {p.status === 'pending' && (
                                            <>
                                                <Button size="sm" onClick={() => handleUpdatePayoutStatus(p.id, 'approved')} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl h-11"><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                                                <Button size="sm" onClick={() => handleUpdatePayoutStatus(p.id, 'rejected')} variant="destructive" className="flex-1 rounded-xl h-11"><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                                            </>
                                        )}
                                        {p.status === 'approved' && (
                                            <Button size="sm" onClick={() => handleUpdatePayoutStatus(p.id, 'paid')} className="w-full bg-green-600 hover:bg-green-700 rounded-xl h-11"><Banknote className="mr-2 h-4 w-4" /> Mark as Paid</Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredPayouts?.length === 0 && <div className="text-center py-20 opacity-30 italic">No payout requests found</div>}
                    </div>
                </TabsContent>

                <TabsContent value="posts">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {posts?.map(p => (
                            <div key={p.id} className="aspect-square bg-secondary/30 relative rounded-xl overflow-hidden group">
                                <video src={p.mediaUrl} className="w-full h-full object-cover" muted />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                    <div className="flex flex-col gap-2 items-center">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeletePost(p)} className="text-destructive"><Trash2 /></Button>
                                        <Button variant="ghost" size="sm" asChild className="text-[9px] uppercase font-black text-white">
                                            <Link href={`/profile/${p.userId}`}>View Owner</Link>
                                        </Button>
                                    </div>
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
