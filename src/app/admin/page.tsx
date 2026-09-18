'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, writeBatch, serverTimestamp, increment, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, ShieldCheck, Loader2, Landmark, CheckCircle2, Wallet, Zap, Lock, Copy, ArrowUpRight, ListFilter, Plus, Sparkles, Building2, Send, ReceiptText, Smartphone, History, CreditCard } from 'lucide-react';
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

interface SystemStats {
    masterBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    isInitializedWithBonus?: boolean;
}

interface MasterLog {
    id: string;
    type: 'deposit' | 'withdraw' | 'vault_funding' | 'external_transfer';
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

    // CRITICAL: 1 Million Funding Logic - Sets standalone balance for this private bank
    useEffect(() => {
        if (firestore && isAdmin && !isStatsLoading) {
            const checkAndFund = async () => {
                const sRef = doc(firestore, 'system', 'stats');
                const snap = await getDoc(sRef);
                
                // If vault doesn't exist or balance is low, inject 1 Million Capital
                if (!snap.exists() || !snap.data().isInitializedWithBonus || snap.data().masterBalance < 1000000) {
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
                        label: "Standalone Capital Injection (1M)",
                        refNo: "ASN-FUND-1M-PRIMARY",
                        createdAt: serverTimestamp()
                    });
                }
            };
            checkAndFund();
        }
    }, [firestore, isAdmin, isStatsLoading]);

    const logsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'master_ledger'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore]);

    const { data: ledgerLogs } = useCollection<MasterLog>(logsQuery);

    const handleExternalTransfer = async () => {
        const amount = parseInt(payoutAmount);
        if (isNaN(amount) || amount <= 0) { toast({ variant: 'destructive', title: "Invalid Amount" }); return; }
        if (!payoutAccount || !payoutName || !payoutIfsc) { toast({ variant: 'destructive', title: "Fill Details" }); return; }
        if (amount > (stats?.masterBalance || 0)) { toast({ variant: 'destructive', title: "Insufficient Vault Fund!" }); return; }

        setIsProcessing(true);
        setProcessStep('linking');
        
        // IPPB Style Simulation
        await new Promise(r => setTimeout(r, 1800));
        setProcessStep('sending');
        await new Promise(r => setTimeout(r, 2200));

        try {
            const batch = writeBatch(firestore!);
            const txId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
            setLastTxId(txId);

            // Deduct ONLY from this Private Bank balance
            batch.set(doc(firestore!, 'system', 'stats'), { 
                masterBalance: increment(-amount),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // Log entry for IPPB-style statement
            batch.set(doc(collection(firestore!, 'master_ledger')), {
                type: 'external_transfer',
                amount: amount,
                label: `Payout to: ${payoutName}`,
                accountDetails: `${payoutAccount} | ${payoutIfsc}`,
                refNo: txId,
                createdAt: serverTimestamp()
            });

            await batch.commit();
            setProcessStep('success');
            toast({ title: "Transfer Done! ✅", description: `₹${amount} deducted from your Vault.` });
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
        toast({ title: "Acc No. Copied! 📋" });
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
                        <h1 className="text-2xl font-black flex items-center gap-2 text-primary uppercase italic"><Landmark size={24} /> Private Bank</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-blue-500" /> STANDALONE SECURE VAULT
                        </p>
                    </div>
                </div>
                <div className="bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 animate-pulse">
                    <p className="text-[9px] font-black text-primary uppercase">Direct Control Session</p>
                </div>
            </header>

            <main className="space-y-8">
                {/* Official Bank Card - Standalone Fund */}
                <div className="bg-money-pattern p-8 rounded-[3rem] text-white shadow-[0_25px_60px_rgba(255,51,102,0.3)] relative overflow-hidden group border border-white/10">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                        <Building2 size={180} />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">A.snap Digital Bank Account</p>
                                <h2 className="text-2xl font-black italic tracking-tighter">ASN-VAULT-2024-001</h2>
                            </div>
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <Landmark className="text-white w-6 h-6" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 flex items-center gap-2">
                                <Sparkles size={14} className="text-yellow-400 animate-pulse" /> Available Private Fund
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black">₹</span>
                                <h3 className="text-6xl font-black tracking-tighter drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                                    {stats?.masterBalance?.toLocaleString() || '1,000,000'}
                                </h3>
                            </div>
                            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-2 italic">
                                This balance is independent. No connection to GPay/PhonePe accounts.
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
                                <p className="text-[8px] font-black uppercase text-white/40">Digital Status</p>
                                <p className="text-xs font-black uppercase text-green-400 flex items-center justify-end gap-1.5 animate-pulse"><Zap size={10} fill="currentColor" /> BANK-ACTIVE</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transfer Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-secondary/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 shadow-xl">
                        <div className="p-4 bg-green-500/10 rounded-full text-green-500"><Plus size={40} /></div>
                        <div className="space-y-1">
                            <h4 className="font-black uppercase text-sm">Deposit to Bank</h4>
                            <p className="text-[10px] text-muted-foreground uppercase leading-tight font-bold">Add money to your standalone bank from outside.</p>
                        </div>
                        <Button onClick={() => {
                            const amt = prompt("Amount to add into this Digital Bank?");
                            if(amt && !isNaN(parseInt(amt))) {
                                const batch = writeBatch(firestore!);
                                batch.set(doc(firestore!, 'system', 'stats'), { masterBalance: increment(parseInt(amt)), lastUpdated: serverTimestamp() }, { merge: true });
                                batch.set(doc(collection(firestore!, 'master_ledger')), { type: 'vault_funding', amount: parseInt(amt), label: 'Manual Deposit', createdAt: serverTimestamp() });
                                batch.commit();
                                toast({ title: "Fund Added! 🏦" });
                            }
                        }} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                            <Smartphone size={18} /> Add Real Cash
                        </Button>
                    </div>

                    <div className="bg-secondary/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 shadow-xl">
                        <div className="p-4 bg-primary/10 rounded-full text-primary animate-pulse"><Send size={40} /></div>
                        <div className="space-y-1">
                            <h4 className="font-black uppercase text-sm">External Transfer</h4>
                            <p className="text-[10px] text-muted-foreground uppercase leading-tight font-bold">Send money from THIS bank to SBI/ICICI/Any account.</p>
                        </div>
                        <Button onClick={() => setIsTransferModalOpen(true)} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                            <ArrowUpRight size={18} /> Withdraw Money
                        </Button>
                    </div>
                </div>

                {/* Digital Statement */}
                <div className="bg-secondary/20 rounded-[2.5rem] p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <ListFilter className="text-muted-foreground" size={18} />
                            <h4 className="font-black uppercase text-xs tracking-widest">Bank Passbook Statement</h4>
                        </div>
                        <span className="text-[8px] font-black uppercase text-white/30">Official Ledger</span>
                    </div>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-2">
                        {ledgerLogs?.map(log => (
                            <div key={log.id} className="flex items-center justify-between p-4 bg-background/40 rounded-2xl border border-white/5 hover:bg-background/60 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-xl", 
                                        log.type === 'vault_funding' ? "bg-green-500/10 text-green-500" : 
                                        "bg-red-500/10 text-red-500"
                                    )}>
                                        {log.type === 'vault_funding' ? <ArrowUpRight size={16} className="rotate-180" /> : <ArrowUpRight size={16} />}
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
                                    log.type === 'vault_funding' ? "text-green-500" : "text-red-500"
                                )}>
                                    {log.type === 'vault_funding' ? '+' : '-'}₹{log.amount.toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* External Transfer Dialog - Standalone Banking Process */}
            <Dialog open={isTransferModalOpen} onOpenChange={closeTransferModal}>
                <DialogContent className="bg-background text-foreground border-white/10 rounded-[3rem] max-w-sm w-[95%] z-[1000] p-8 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                    {processStep === 'idle' && (
                        <>
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-center flex items-center justify-center gap-3">
                                <Landmark className="text-primary" /> Bank Withdrawal
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Account Holder Name</Label>
                                    <Input placeholder="Receiver Name" value={payoutName} onChange={e => setPayoutName(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Account Number</Label>
                                    <Input placeholder="Enter Acc No." value={payoutAccount} onChange={e => setPayoutAccount(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-mono font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Bank IFSC Code</Label>
                                    <Input placeholder="SBIN000XXXX" value={payoutIfsc} onChange={e => setPayoutIfsc(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-mono font-bold uppercase" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Amount to Transfer</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">₹</span>
                                        <Input type="number" placeholder="0.00" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} className="h-14 pl-8 bg-secondary/50 border-white/10 rounded-xl text-lg font-black text-white" />
                                    </div>
                                    <p className="text-[8px] text-muted-foreground uppercase text-center mt-1">Deduct from: ASN-VAULT (₹1M Fund)</p>
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
                                    {processStep === 'linking' ? 'Authenticating Acc...' : 'Executing Payout...'}
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Standalone Bank Security Active</p>
                            </div>
                        </div>
                    )}

                    {processStep === 'success' && (
                        <div className="py-8 flex flex-col items-center text-center space-y-8 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-500/10 rounded-[2rem] flex items-center justify-center border border-green-500/20 shadow-2xl text-green-500">
                                <CheckCircle2 size={40} />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Transfer Executed!</h3>
                                <p className="text-xs text-muted-foreground font-bold leading-relaxed uppercase">
                                    ₹{payoutAmount} removed from your Private Bank and sent to {payoutName}.
                                </p>
                            </div>

                            <div className="w-full bg-secondary/40 p-5 rounded-3xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Reference ID</span>
                                    <span className="text-[10px] font-mono font-black text-primary">{lastTxId}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Source Bank</span>
                                    <span className="text-[10px] font-black text-white/80 uppercase">A.SNAP VAULT</span>
                                </div>
                            </div>

                            <Button onClick={closeTransferModal} className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-all">
                                Return to Bank
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
}
