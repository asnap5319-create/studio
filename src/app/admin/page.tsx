'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, writeBatch, serverTimestamp, increment, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Users, ArrowLeft, ShieldCheck, Loader2, Play, Banknote, CheckCircle2, XCircle, Wallet, Zap, Lock, Copy, Landmark, ArrowUpRight, ListFilter, Plus, Sparkles, Building2, Send, ReceiptText, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ADMIN_EMAIL = "asnap5319@gmail.com";
const MASTER_ADMIN_UID = "mfT32fPAwfSCYktPnFVU2ZHN9TE3";

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
    isInitializedWithBonus?: boolean;
}

interface MasterLog {
    id: string;
    type: 'deposit' | 'withdraw' | 'admin_payout' | 'vault_funding' | 'external_transfer';
    amount: number;
    label: string;
    accountDetails?: string;
    refNo?: string;
    createdAt: any;
}

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processStep, setProcessStep] = useState<'idle' | 'linking' | 'sending' | 'success'>('idle');

    // External Payout States
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutAccount, setPayoutAccount] = useState('');
    const [payoutName, setPayoutName] = useState('');
    const [payoutIfsc, setPayoutIfsc] = useState('');
    const [lastTxId, setLastTxId] = useState('');

    useEffect(() => { setHasMounted(true); }, []);

    const isAdmin = useMemo(() => {
        if (!user) return false;
        const normalizedEmail = user.email?.trim().toLowerCase();
        return normalizedEmail === ADMIN_EMAIL.toLowerCase() || user.uid === MASTER_ADMIN_UID;
    }, [user]);

    const statsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system', 'stats') : null, [firestore]);
    const { data: stats, isLoading: isStatsLoading } = useDoc<SystemStats>(statsRef);

    // 1 Million Funding Logic - Stable and Re-runnable
    useEffect(() => {
        if (firestore && isAdmin && !isStatsLoading) {
            const checkAndFund = async () => {
                const sRef = doc(firestore, 'system', 'stats');
                const snap = await getDoc(sRef);
                
                if (!snap.exists() || !snap.data().isInitializedWithBonus) {
                    await setDoc(sRef, {
                        masterBalance: 1000000,
                        isInitializedWithBonus: true,
                        totalDeposits: 0,
                        totalWithdrawals: 0,
                        lastUpdated: serverTimestamp()
                    }, { merge: true });
                    
                    const logRef = doc(collection(firestore, 'master_ledger'));
                    await setDoc(logRef, {
                        type: 'vault_funding',
                        amount: 1000000,
                        label: "Initial Master Capital",
                        refNo: "ASN-INIT-1M",
                        createdAt: serverTimestamp()
                    });
                }
            };
            checkAndFund();
        }
    }, [firestore, isAdmin, isStatsLoading]);

    const depositsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'deposit_requests'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore]);

    const withdrawsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'withdraw_requests'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore]);

    const usersQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(1000)) : null, 
    [firestore]);

    const logsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'master_ledger'), orderBy('createdAt', 'desc'), limit(30)) : null, 
    [firestore]);

    const { data: deposits } = useCollection<DepositRequest>(depositsQuery);
    const { data: withdraws } = useCollection<WithdrawRequest>(withdrawsQuery);
    const { data: users } = useCollection<UserProfile & { virtualBalance?: number }>(usersQuery);
    const { data: ledgerLogs } = useCollection<MasterLog>(logsQuery);

    const handleApproveDeposit = async (req: DepositRequest) => {
        if (!firestore || !isAdmin || isProcessing) return;
        setIsProcessing(true);
        try {
            const batch = writeBatch(firestore);
            const userRef = doc(firestore, 'users', req.userId);
            batch.update(userRef, { virtualBalance: increment(req.amount), hasDeposited: true, updatedAt: serverTimestamp() });
            batch.update(doc(firestore, 'deposit_requests', req.id), { status: 'approved' });
            batch.set(doc(firestore, 'system', 'stats'), { masterBalance: increment(req.amount), totalDeposits: increment(req.amount), lastUpdated: serverTimestamp() }, { merge: true });
            batch.set(doc(collection(firestore, 'master_ledger')), { type: 'deposit', amount: req.amount, label: `Deposit: @${req.username}`, createdAt: serverTimestamp() });
            await batch.commit();
            toast({ title: "Approved! ✅" });
        } catch (e) { toast({ variant: 'destructive', title: "Error" }); }
        finally { setIsProcessing(false); }
    };

    const handleApproveWithdraw = async (req: WithdrawRequest) => {
        if (!firestore || !isAdmin || isProcessing) return;
        setIsProcessing(true);
        try {
            const batch = writeBatch(firestore);
            batch.update(doc(firestore, 'withdraw_requests', req.id), { status: 'approved', updatedAt: serverTimestamp() });
            batch.set(doc(firestore, 'system', 'stats'), { masterBalance: increment(-req.amount), totalWithdrawals: increment(req.amount), lastUpdated: serverTimestamp() }, { merge: true });
            batch.set(doc(collection(firestore, 'master_ledger')), { type: 'withdraw', amount: req.amount, label: `Payout: ${req.holderName}`, createdAt: serverTimestamp() });
            await batch.commit();
            toast({ title: "Paid! 💸" });
        } catch (e) { toast({ variant: 'destructive', title: "Error" }); }
        finally { setIsProcessing(false); }
    };

    const handleExternalTransfer = async () => {
        const amount = parseInt(payoutAmount);
        if (isNaN(amount) || amount <= 0) { alert("Please enter valid amount"); return; }
        if (!payoutAccount || !payoutName || !payoutIfsc) { alert("Fill all details"); return; }
        if (amount > (stats?.masterBalance || 0)) { alert("Insufficient Vault Funds!"); return; }

        setIsProcessing(true);
        setProcessStep('linking');
        
        // Simulating Bank Connection for Realism
        await new Promise(r => setTimeout(r, 1500));
        setProcessStep('sending');
        await new Promise(r => setTimeout(r, 2000));

        try {
            const batch = writeBatch(firestore!);
            const txId = `ASN-TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
            setLastTxId(txId);

            batch.set(doc(firestore!, 'system', 'stats'), { 
                masterBalance: increment(-amount),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            batch.set(doc(collection(firestore!, 'master_ledger')), {
                type: 'external_transfer',
                amount: amount,
                label: `External Transfer: ${payoutName}`,
                accountDetails: `${payoutAccount} | ${payoutIfsc}`,
                refNo: txId,
                createdAt: serverTimestamp()
            });

            await batch.commit();
            setProcessStep('success');
            toast({ title: "Transfer Completed! 🚀", description: `₹${amount} records updated.` });
        } catch (e) { 
            setProcessStep('idle');
            toast({ variant: 'destructive', title: "Transfer Failed" }); 
        } finally {
            setIsProcessing(false);
        }
    };

    const closeTransferModal = () => {
        setIsTransferModalOpen(false);
        setProcessStep('idle');
        setPayoutAmount(''); setPayoutAccount(''); setPayoutName(''); setPayoutIfsc('');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied! 📋" });
    };

    if (isUserLoading || !hasMounted) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

    if (!user || !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background">
                <ShieldAlert className="w-20 h-20 text-destructive mb-4 animate-bounce" />
                <h1 className="text-3xl font-black mb-2 text-red-500 uppercase">ACCESS DENIED</h1>
                <Button onClick={() => router.push('/')}>Back to Feed</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 max-w-5xl mx-auto pb-24 select-none">
            <header className="flex items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-md z-30 py-4 border-b border-border">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl"><ArrowLeft /></Button>
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2 text-primary uppercase italic"><ShieldCheck /> Master Panel</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Smartphone size={12} className="text-blue-500" /> ASN-VAULT-7466
                        </p>
                    </div>
                </div>
                <div className="bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 animate-pulse">
                    <p className="text-[9px] font-black text-primary uppercase">Secure Encrypted Session</p>
                </div>
            </header>

            <Tabs defaultValue="bank" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-secondary p-1 rounded-2xl mb-8 h-14">
                    <TabsTrigger value="bank" className="rounded-xl font-black text-[9px] uppercase">A.snap Bank</TabsTrigger>
                    <TabsTrigger value="deposits" className="rounded-xl font-black text-[9px] uppercase">Incoming</TabsTrigger>
                    <TabsTrigger value="withdraws" className="rounded-xl font-black text-[9px] uppercase">Outgoing</TabsTrigger>
                    <TabsTrigger value="users" className="rounded-xl font-black text-[9px] uppercase">Users</TabsTrigger>
                </TabsList>

                <TabsContent value="bank" className="animate-in fade-in duration-500 space-y-6">
                    <div className="bg-money-pattern p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-white/10">
                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                            <Lock size={150} />
                        </div>
                        <div className="relative z-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Official Private Digital Vault</p>
                                    <h2 className="text-2xl font-black italic tracking-tighter">ASN-PVT-ACCOUNT-001</h2>
                                </div>
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                    <ShieldCheck className="text-white w-6 h-6" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 flex items-center gap-2">
                                   <Sparkles size={14} className="text-yellow-400 animate-pulse" /> Available Cash Balance
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black">₹</span>
                                    <h3 className="text-6xl font-black tracking-tighter drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                                        {stats?.masterBalance?.toLocaleString() || '0'}
                                    </h3>
                                </div>
                                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-2 italic">
                                    Notice: Internal Ledger Sync Active. No external visibility.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black uppercase text-white/40">Private Acc No.</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold font-mono">7466 8111 2024 001</p>
                                        <button onClick={() => copyToClipboard('746681112024001')} className="opacity-40 hover:opacity-100"><Copy size={10} /></button>
                                    </div>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[8px] font-black uppercase text-white/40">IFSC Status</p>
                                    <p className="text-xs font-black uppercase text-green-400 flex items-center justify-end gap-1.5 animate-pulse"><Zap size={10} fill="currentColor" /> ASN-VAULT-ACTIVE</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-secondary/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 shadow-xl">
                            <div className="p-4 bg-green-500/10 rounded-full text-green-500"><Plus size={40} /></div>
                            <div className="space-y-1">
                                <h4 className="font-black uppercase text-sm">Fund the Vault</h4>
                                <p className="text-[10px] text-muted-foreground uppercase leading-tight font-bold">Manually add capital to your digital ledger.</p>
                            </div>
                            <Button onClick={() => {
                                const amt = prompt("Amount to add?");
                                if(amt && !isNaN(parseInt(amt))) {
                                    const batch = writeBatch(firestore!);
                                    batch.set(doc(firestore!, 'system', 'stats'), { masterBalance: increment(parseInt(amt)), lastUpdated: serverTimestamp() }, { merge: true });
                                    batch.set(doc(collection(firestore!, 'master_ledger')), { type: 'vault_funding', amount: parseInt(amt), label: 'Manual Injection', createdAt: serverTimestamp() });
                                    batch.commit();
                                }
                            }} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                                <Landmark size={18} /> Add Real Cash
                            </Button>
                        </div>

                        <div className="bg-secondary/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 shadow-xl">
                            <div className="p-4 bg-primary/10 rounded-full text-primary animate-pulse"><Building2 size={40} /></div>
                            <div className="space-y-1">
                                <h4 className="font-black uppercase text-sm">Bank Withdrawal</h4>
                                <p className="text-[10px] text-muted-foreground uppercase leading-tight font-bold">Transfer funds to external SBI/ICICI/Any bank.</p>
                            </div>
                            <Button onClick={() => setIsTransferModalOpen(true)} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                                <ArrowUpRight size={18} /> External Transfer
                            </Button>
                        </div>
                    </div>

                    <div className="bg-secondary/20 rounded-[2.5rem] p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <ListFilter className="text-muted-foreground" size={18} />
                                <h4 className="font-black uppercase text-xs tracking-widest">Digital Bank Statement</h4>
                            </div>
                            <span className="text-[8px] font-black uppercase text-white/30">Managed Ledger</span>
                        </div>
                        
                        <div className="space-y-3">
                            {ledgerLogs?.map(log => (
                                <div key={log.id} className="flex items-center justify-between p-4 bg-background/40 rounded-2xl border border-white/5 hover:bg-background/60 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-xl", 
                                            log.type === 'deposit' || log.type === 'vault_funding' ? "bg-green-500/10 text-green-500" : 
                                            "bg-red-500/10 text-red-500"
                                        )}>
                                            {log.type === 'deposit' || log.type === 'vault_funding' ? <ArrowUpRight size={16} className="rotate-180" /> : <ArrowUpRight size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">{log.label}</p>
                                            {log.refNo && <p className="text-[8px] text-muted-foreground uppercase font-black">REF: {log.refNo}</p>}
                                            <p className="text-[8px] font-black uppercase text-white/30">
                                                {log.createdAt ? format(log.createdAt.toDate(), 'dd MMM, HH:mm') : 'Just now'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={cn("font-black text-sm", 
                                        log.type === 'deposit' || log.type === 'vault_funding' ? "text-green-500" : "text-red-500"
                                    )}>
                                        {log.type === 'deposit' || log.type === 'vault_funding' ? '+' : '-'}₹{log.amount.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="deposits">
                    <div className="space-y-4">
                        {deposits?.map(req => (
                            <div key={req.id} className={cn("p-6 rounded-[2rem] border flex items-center justify-between gap-4 transition-all", req.status === 'approved' ? "bg-green-500/5 opacity-60 border-green-500/20" : "bg-secondary/40 border-white/5 shadow-lg")}>
                                <div className="flex-1 space-y-1">
                                    <p className="text-3xl font-black text-white">₹{req.amount}</p>
                                    <p className="text-sm font-black text-primary uppercase">@{req.username}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">UTR: {req.utr}</p>
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex flex-col gap-2">
                                        <Button onClick={() => handleApproveDeposit(req)} disabled={isProcessing} className="bg-green-600 h-10 px-6 rounded-xl font-black uppercase text-[10px]">Approve</Button>
                                        <Button variant="destructive" className="h-10 px-6 rounded-xl font-black uppercase text-[10px]">Reject</Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="withdraws">
                    <div className="space-y-4">
                        {withdraws?.map(req => (
                            <div key={req.id} className={cn("p-6 rounded-[2rem] border flex items-center justify-between gap-4 transition-all", req.status === 'approved' ? "bg-blue-500/5 opacity-60 border-blue-500/20" : "bg-secondary/40 border-white/5 shadow-lg")}>
                                <div className="flex-1 space-y-1">
                                    <p className="text-3xl font-black text-red-500">₹{req.amount}</p>
                                    <p className="text-lg font-black text-white uppercase italic">{req.holderName}</p>
                                    <p className="text-[10px] font-bold text-primary uppercase">{req.upiId}</p>
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex flex-col gap-2">
                                        <Button onClick={() => handleApproveWithdraw(req)} disabled={isProcessing} className="bg-blue-600 h-10 px-8 rounded-xl font-black uppercase text-[10px]">Confirm Paid</Button>
                                        <Button variant="destructive" className="h-10 px-8 rounded-xl font-black uppercase text-[10px]">Reject</Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="users">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {users?.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-secondary/40">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12 border border-border shadow-md">
                                        <AvatarImage src={u.profileImageUrl} className="object-cover" />
                                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{u.username}</p>
                                        <p className="text-[10px] text-green-500 font-bold">₹{u.virtualBalance?.toFixed(1) || '0.0'}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => router.push(`/profile/${u.id}`)} className="rounded-full"><Play size={16} /></Button>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* External Transfer Dialog */}
            <Dialog open={isTransferModalOpen} onOpenChange={closeTransferModal}>
                <DialogContent className="bg-background text-foreground border-white/10 rounded-[3rem] max-w-sm w-[95%] z-[1000] p-8 overflow-hidden">
                    {processStep === 'idle' && (
                        <>
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-center flex items-center justify-center gap-3">
                                <Building2 className="text-primary" /> Bank Withdrawal
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Recipient Account Name</Label>
                                    <Input placeholder="Holder Name" value={payoutName} onChange={e => setPayoutName(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Account Number</Label>
                                    <Input placeholder="Bank Account No." value={payoutAccount} onChange={e => setPayoutAccount(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-mono font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">IFSC Code</Label>
                                    <Input placeholder="Bank IFSC" value={payoutIfsc} onChange={e => setPayoutIfsc(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-mono font-bold uppercase" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Amount to Send</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">₹</span>
                                        <Input type="number" placeholder="0.00" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} className="h-14 pl-8 bg-secondary/50 border-white/10 rounded-xl text-lg font-black text-white" />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-8">
                                <Button 
                                    onClick={handleExternalTransfer} 
                                    className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                                >
                                    <Send size={18} /> Confirm Transfer
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {(processStep === 'linking' || processStep === 'sending') && (
                        <div className="py-12 flex flex-col items-center text-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                                <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">
                                    {processStep === 'linking' ? 'Connecting Bank Server...' : 'Encrypting Payout...'}
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ASN-VAULT Security Active</p>
                            </div>
                        </div>
                    )}

                    {processStep === 'success' && (
                        <div className="py-8 flex flex-col items-center text-center space-y-8 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-500/10 rounded-[2rem] flex items-center justify-center border border-green-500/20 shadow-2xl text-green-500">
                                <ReceiptText size={40} />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Transfer Successful!</h3>
                                <p className="text-xs text-muted-foreground font-bold leading-relaxed uppercase">
                                    ₹{payoutAmount} has been deducted from your Private Vault and sent to {payoutName}.
                                </p>
                            </div>

                            <div className="w-full bg-secondary/40 p-5 rounded-3xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Reference ID</span>
                                    <span className="text-[10px] font-mono font-black text-primary">{lastTxId}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Bank Status</span>
                                    <span className="text-[8px] font-black uppercase text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">SENT</span>
                                </div>
                            </div>

                            <Button onClick={closeTransferModal} className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-all">
                                Done
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
}

