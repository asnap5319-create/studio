'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, writeBatch, serverTimestamp, increment, updateDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Users, ArrowLeft, Search, ShieldCheck, Loader2, Play, Banknote, CheckCircle2, XCircle, Clock, Wallet, Zap, Lock, Copy, Landmark, ArrowUpRight, TrendingUp, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

interface WithdrawRequest {
    id: string;
    userId: string;
    username: string;
    holderName: string;
    amount: number;
    upiId: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
}

interface SystemStats {
    masterBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
}

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => { setHasMounted(true); }, []);

    const isAdmin = useMemo(() => {
        if (!user?.email) return false;
        return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    }, [user]);

    // System Stats (Master Bank Balance)
    const statsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system', 'stats') : null, [firestore]);
    const { data: stats } = useDoc<SystemStats>(statsRef);

    const depositsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'deposit_requests'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore]);

    const withdrawsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'withdraw_requests'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore]);

    const usersQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(1000)) : null, 
    [firestore]);

    const { data: deposits } = useCollection<DepositRequest>(depositsQuery);
    const { data: withdraws } = useCollection<WithdrawRequest>(withdrawsQuery);
    const { data: users } = useCollection<UserProfile & { virtualBalance?: number }>(usersQuery);

    const handleApproveDeposit = async (req: DepositRequest) => {
        if (!firestore || !isAdmin || isProcessing) return;
        if (!confirm(`Approve ₹${req.amount} for @${req.username}?`)) return;

        setIsProcessing(true);
        try {
            const batch = writeBatch(firestore);
            const userRef = doc(firestore, 'users', req.userId);
            
            // 1. Add to user balance
            batch.update(userRef, { 
                virtualBalance: increment(req.amount),
                hasDeposited: true,
                updatedAt: serverTimestamp() 
            });

            // 2. Update request status
            const reqRef = doc(firestore, 'deposit_requests', req.id);
            batch.update(reqRef, { status: 'approved' });

            // 3. Update Master Bank Balance
            const sRef = doc(firestore, 'system', 'stats');
            batch.set(sRef, { 
                masterBalance: increment(req.amount),
                totalDeposits: increment(req.amount),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            await batch.commit();
            toast({ title: "Approved! ✅", description: `₹${req.amount} added to user and Master Bank.` });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectDeposit = async (req: DepositRequest) => {
        if (!firestore || !isAdmin) return;
        if (!confirm(`Reject this deposit of ₹${req.amount}? It will show as FAILED to user.`)) return;

        try {
            const reqRef = doc(firestore, 'deposit_requests', req.id);
            await updateDoc(reqRef, { status: 'rejected' });
            toast({ title: "Rejected ❌", description: "Status set to Failed." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error" });
        }
    };

    const handleApproveWithdraw = async (req: WithdrawRequest) => {
        if (!firestore || !isAdmin || isProcessing) return;
        if (!confirm(`Mark ₹${req.amount} as PAID to ${req.holderName}? Money will be deducted from Master Bank.`)) return;

        setIsProcessing(true);
        try {
            const batch = writeBatch(firestore);
            const reqRef = doc(firestore, 'withdraw_requests', req.id);
            
            // 1. Update status
            batch.update(reqRef, { status: 'approved', updatedAt: serverTimestamp() });

            // 2. Deduct from Master Bank Balance
            const sRef = doc(firestore, 'system', 'stats');
            batch.set(sRef, { 
                masterBalance: increment(-req.amount),
                totalWithdrawals: increment(req.amount),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            await batch.commit();
            toast({ title: "Success! 💸", description: "Withdraw marked as PAID and deducted from Bank." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectWithdraw = async (req: WithdrawRequest) => {
        if (!firestore || !isAdmin) return;
        if (!confirm(`Reject this withdraw of ₹${req.amount}? Money will be REFUNDED to user's balance.`)) return;

        try {
            const batch = writeBatch(firestore);
            const reqRef = doc(firestore, 'withdraw_requests', req.id);
            batch.update(reqRef, { status: 'rejected', updatedAt: serverTimestamp() });

            const userRef = doc(firestore, 'users', req.userId);
            batch.update(userRef, { 
                virtualBalance: increment(req.amount),
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            toast({ title: "Rejected & Refunded! ❌", description: "Money sent back to user's game wallet." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error" });
        }
    };

    const handleMasterWithdraw = async () => {
        const amt = prompt("How much do you want to withdraw from Master Bank for yourself?");
        if (!amt || isNaN(parseInt(amt))) return;
        
        const amount = parseInt(amt);
        if (amount > (stats?.masterBalance || 0)) {
            alert("Insufficient Bank Balance!");
            return;
        }

        try {
            const sRef = doc(firestore!, 'system', 'stats');
            await setDoc(sRef, { 
                masterBalance: increment(-amount),
                lastWithdrawal: amount,
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // Add a log entry
            await setDoc(doc(collection(firestore!, 'system_logs')), {
                type: 'admin_withdrawal',
                amount: amount,
                createdAt: serverTimestamp()
            });

            toast({ title: "Bank Updated! 🏦", description: `₹${amount} recorded as withdrawn by Admin.` });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error" });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied! 📋", description: "Copied to clipboard." });
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
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2 text-primary uppercase italic"><ShieldCheck /> Master Panel</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Users size={12} className="text-blue-500" /> Total IDs: <span className="text-white">{users?.length || 0}</span>
                        </p>
                    </div>
                </div>
            </header>

            <Tabs defaultValue="bank" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-secondary p-1 rounded-2xl mb-8 h-14">
                    <TabsTrigger value="bank" className="rounded-xl font-bold text-[9px] uppercase">Master Bank</TabsTrigger>
                    <TabsTrigger value="deposits" className="rounded-xl font-bold text-[9px] uppercase">Deposits</TabsTrigger>
                    <TabsTrigger value="withdraws" className="rounded-xl font-bold text-[9px] uppercase">Withdrawals</TabsTrigger>
                    <TabsTrigger value="users" className="rounded-xl font-bold text-[9px] uppercase">Users</TabsTrigger>
                </TabsList>

                {/* --- Master Bank Tab --- */}
                <TabsContent value="bank" className="animate-in fade-in duration-500">
                    <div className="space-y-6">
                        {/* Virtual Bank Card */}
                        <div className="bg-money-pattern p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-white/10">
                            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                                <Landmark size={150} />
                            </div>
                            <div className="relative z-10 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Official A.snap Treasury</p>
                                        <h2 className="text-2xl font-black italic tracking-tighter">AS-MASTER-BANK</h2>
                                    </div>
                                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                        <ShieldCheck className="text-white w-6 h-6" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Total Platform Liquidity</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black">₹</span>
                                        <h3 className="text-5xl font-black tracking-tighter" style={{ fontStyle: 'normal' }}>
                                            {stats?.masterBalance?.toLocaleString() || '0.0'}
                                        </h3>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black uppercase text-white/40">Account No.</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold font-mono">9876 5432 1010 001</p>
                                            <button onClick={() => copyToClipboard('987654321010001')} className="opacity-40 hover:opacity-100"><Copy size={10} /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black uppercase text-white/40">IFSC Code</p>
                                        <p className="text-xs font-bold font-mono uppercase">ASNP000786</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bank Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-secondary/40 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-xl text-green-500"><TrendingUp size={20} /></div>
                                    <h4 className="font-black uppercase text-xs">Revenue Flow</h4>
                                </div>
                                <div className="flex justify-between items-center bg-background/50 p-4 rounded-2xl">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Total In:</span>
                                    <span className="font-black text-green-500">+₹{stats?.totalDeposits?.toLocaleString() || '0'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-background/50 p-4 rounded-2xl">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Out:</span>
                                    <span className="font-black text-red-500">-₹{stats?.totalWithdrawals?.toLocaleString() || '0'}</span>
                                </div>
                            </div>

                            <div className="bg-secondary/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4">
                                <div className="p-4 bg-primary/10 rounded-full text-primary animate-pulse"><Banknote size={40} /></div>
                                <div className="space-y-1">
                                    <h4 className="font-black uppercase text-sm">Withdraw to Personal Bank</h4>
                                    <p className="text-[10px] text-muted-foreground uppercase leading-tight font-bold">Transfer platform profits to your real bank account.</p>
                                </div>
                                <Button onClick={handleMasterWithdraw} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-2">
                                    <ArrowUpRight size={18} /> Transfer Now
                                </Button>
                            </div>
                        </div>

                        {/* Recent Bank Logs */}
                        <div className="bg-secondary/20 rounded-[2.5rem] p-6 border border-white/5">
                            <div className="flex items-center gap-3 mb-6">
                                <History className="text-muted-foreground" size={18} />
                                <h4 className="font-black uppercase text-xs tracking-widest">Master Logs</h4>
                            </div>
                            <div className="space-y-3">
                                <p className="text-center py-10 text-[10px] font-bold text-muted-foreground uppercase italic opacity-40">Banking ledger is automated. No manual logs yet.</p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="deposits">
                    <div className="space-y-4">
                        {deposits?.map(req => (
                            <div key={req.id} className={cn("p-6 rounded-[2rem] border flex items-center justify-between gap-4", req.status === 'approved' ? "bg-green-500/5 opacity-60" : req.status === 'rejected' ? "bg-red-500/5 opacity-60" : "bg-secondary/40")}>
                                <div className="flex-1 space-y-1">
                                    <p className="text-2xl font-black text-white">₹{req.amount}</p>
                                    <p className="text-sm font-bold text-primary">@{req.username}</p>
                                    <p className="text-[10px] font-black uppercase text-white/40">UTR: {req.utr}</p>
                                    {req.status !== 'pending' && (
                                        <p className={cn("text-[9px] font-black uppercase", req.status === 'approved' ? "text-green-500" : "text-red-500")}>
                                            Status: {req.status}
                                        </p>
                                    )}
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex flex-col gap-2">
                                        <Button onClick={() => handleApproveDeposit(req)} disabled={isProcessing} className="bg-green-600 text-white font-black uppercase text-[10px] h-10 px-6 rounded-xl">Approve</Button>
                                        <Button onClick={() => handleRejectDeposit(req)} variant="destructive" className="font-black uppercase text-[10px] h-10 px-6 rounded-xl">Reject</Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {deposits?.length === 0 && <div className="text-center py-20 text-muted-foreground italic">No deposits yet.</div>}
                    </div>
                </TabsContent>

                <TabsContent value="withdraws">
                    <div className="space-y-4">
                        {withdraws?.map(req => (
                            <div key={req.id} className={cn("p-6 rounded-[2rem] border flex flex-col md:flex-row md:items-center justify-between gap-4", req.status === 'approved' ? "bg-blue-500/5 opacity-60" : req.status === 'rejected' ? "bg-red-500/5 opacity-60" : "bg-secondary/40")}>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <p className="text-3xl font-black text-red-500">₹{req.amount}</p>
                                        {req.status === 'approved' && <CheckCircle2 size={20} className="text-blue-500" />}
                                        {req.status === 'rejected' && <XCircle size={20} className="text-red-500" />}
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <p className="text-lg font-black text-white uppercase italic tracking-tight">{req.holderName}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-black text-primary uppercase tracking-widest">{req.upiId}</p>
                                            <button onClick={() => copyToClipboard(req.upiId)} className="p-1 hover:bg-white/10 rounded"><Copy size={12} /></button>
                                        </div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Username: @{req.username}</p>
                                    </div>

                                    {req.status !== 'pending' && (
                                        <p className={cn("text-[9px] font-black uppercase", req.status === 'approved' ? "text-blue-500" : "text-red-500")}>
                                            Request {req.status}
                                        </p>
                                    )}
                                </div>
                                
                                {req.status === 'pending' && (
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <Button 
                                            onClick={() => handleApproveWithdraw(req)} 
                                            disabled={isProcessing}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] h-12 px-8 rounded-xl shadow-lg"
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm & Mark Paid
                                        </Button>
                                        <Button 
                                            onClick={() => handleRejectWithdraw(req)} 
                                            variant="destructive" 
                                            className="font-black uppercase text-[10px] h-12 px-8 rounded-xl"
                                        >
                                            <XCircle className="mr-2 h-4 w-4" /> Reject & Refund
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {withdraws?.length === 0 && <div className="text-center py-20 text-muted-foreground italic">No withdraw requests.</div>}
                    </div>
                </TabsContent>

                <TabsContent value="users">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {users?.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl border bg-secondary/40">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12 border border-border">
                                        <AvatarImage src={u.profileImageUrl} className="object-cover" />
                                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{u.username}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">₹{u.virtualBalance?.toFixed(1) || '0.0'}</p>
                                            {(u as any).hasDeposited ? (
                                                <Zap size={10} className="text-yellow-400 fill-yellow-400" />
                                            ) : (
                                                <Lock size={10} className="text-white/30" />
                                            )}
                                        </div>
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
