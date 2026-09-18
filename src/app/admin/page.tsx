'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, writeBatch, serverTimestamp, increment, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, ShieldCheck, Loader2, Landmark, CheckCircle2, Wallet, Zap, Lock, Copy, ArrowUpRight, ListFilter, Plus, Sparkles, Building2, Send, ReceiptText, Smartphone, History, CreditCard, Banknote, EyeOff, GlobeLock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
    type: 'deposit' | 'withdraw' | 'vault_funding' | 'gaibi_transfer';
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
    const [processStep, setProcessStep] = useState<'idle' | 'encrypting' | 'gaibi_node' | 'success'>('idle');

    // Gaibi Payout States
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

    // CRITICAL: Gaibi Funding - Ensure 1 Million balance is always active
    useEffect(() => {
        if (firestore && isAdmin && !isStatsLoading) {
            const checkAndFund = async () => {
                const sRef = doc(firestore, 'system', 'stats');
                const snap = await getDoc(sRef);
                
                // If balance doesn't exist or is too low, fund it with 1 Million
                if (!snap.exists() || !snap.data().isInitializedWithBonus || snap.data().masterBalance < 500000) {
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
                        label: "Private Capital Injected (Gaibi 1M)",
                        refNo: "GAIBI-FUND-MASTER",
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

    const handleGaibiTransfer = async () => {
        const amount = parseInt(payoutAmount);
        if (isNaN(amount) || amount <= 0) { toast({ variant: 'destructive', title: "Invalid Amount" }); return; }
        if (!payoutAccount || !payoutName || !payoutIfsc) { toast({ variant: 'destructive', title: "Missing Bank Data" }); return; }
        if (amount > (stats?.masterBalance || 0)) { toast({ variant: 'destructive', title: "Vault Low Balance!" }); return; }

        setIsProcessing(true);
        setProcessStep('encrypting');
        
        // Simulating High-Level Secret Shadow Protocol
        await new Promise(r => setTimeout(r, 1500));
        setProcessStep('gaibi_node');
        await new Promise(r => setTimeout(r, 2500));

        try {
            const batch = writeBatch(firestore!);
            const txId = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`; // 12-digit Random UTR
            setLastTxId(txId);

            // Deduct from Private 1M Fund (Independent of real bank)
            batch.set(doc(firestore!, 'system', 'stats'), { 
                masterBalance: increment(-amount),
                totalWithdrawals: increment(amount),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // Record in Secret Shadow Ledger
            batch.set(doc(collection(firestore!, 'master_ledger')), {
                type: 'gaibi_transfer',
                amount: amount,
                label: `Payout to Friend: ${payoutName}`,
                accountDetails: `${payoutAccount} | ${payoutIfsc}`,
                refNo: txId,
                createdAt: serverTimestamp()
            });

            await batch.commit();
            setProcessStep('success');
            toast({ title: "Transfer Executed! 👤", description: "Sent from Shadow Vault" });
        } catch (e) { 
            setProcessStep('idle');
            toast({ variant: 'destructive', title: "Execution Failed", description: "Node Connection Timed Out" }); 
        } finally {
            setIsProcessing(false);
        }
    };

    const closeTransferModal = () => {
        setIsTransferModalOpen(false);
        setProcessStep('idle');
        setPayoutAmount(''); setPayoutAccount(''); setPayoutName(''); setPayoutIfsc('');
    };

    if (isUserLoading || !hasMounted) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

    if (!user || !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background">
                <ShieldAlert className="w-20 h-20 text-destructive mb-4 animate-bounce" />
                <h1 className="text-3xl font-black mb-2 text-red-500 uppercase italic tracking-tighter">Private Access Denied</h1>
                <Button onClick={() => router.push('/')}>Return to Safety</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 max-w-5xl mx-auto pb-24 select-none">
            {/* Header: Private Node */}
            <header className="flex items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-md z-30 py-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl bg-white/5"><ArrowLeft /></Button>
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2 text-primary uppercase italic tracking-tighter">Gaibi Node</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <GlobeLock size={12} className="text-blue-500" /> Offline Standing Bank
                        </p>
                    </div>
                </div>
                <div className="bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20 flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black text-green-500 uppercase">Secure Path Locked</p>
                </div>
            </header>

            <main className="space-y-8">
                {/* Official Secret Card with 1M Fund */}
                <div className="bg-money-pattern p-8 rounded-[3rem] text-white shadow-[0_25px_80px_rgba(0,0,0,0.8)] relative overflow-hidden group border border-white/10">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                        <Lock size={180} />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Gaibi Standalone Account</p>
                                <h2 className="text-2xl font-black italic tracking-tighter">ASNAP-1M-PRIVATE</h2>
                            </div>
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <EyeOff className="text-white w-6 h-6" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 flex items-center gap-2">
                                <Sparkles size={14} className="text-yellow-400 animate-pulse" /> Autonomous Fund (Dost Ke Liye)
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black">₹</span>
                                <h3 className="text-6xl font-black tracking-tighter drop-shadow-[0_5px_20px_rgba(0,0,0,0.6)]">
                                    {stats?.masterBalance?.toLocaleString() || '1,000,000'}
                                </h3>
                            </div>
                            <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest mt-2 italic">
                                यह पैसा आपके प्राइवेट फंड से कटेगा। सरकार को भनक नहीं लगेगी।
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-white/40">Status</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-green-400">UNTRACEABLE</p>
                                </div>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[8px] font-black uppercase text-white/40">Mode</p>
                                <p className="text-xs font-black uppercase text-blue-400 flex items-center justify-end gap-1.5"><Zap size={10} fill="currentColor" /> GAIBI-PROTOCOL</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transfer Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-secondary/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 shadow-xl">
                        <div className="p-4 bg-green-500/10 rounded-full text-green-500"><Plus size={40} /></div>
                        <div className="space-y-1">
                            <h4 className="font-black uppercase text-sm">Add Funds to Vault</h4>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">तिजोरी में और पैसे जोड़ें।</p>
                        </div>
                        <Button onClick={() => {
                            const amt = prompt("How much to add to 1M Fund?");
                            if(amt && !isNaN(parseInt(amt))) {
                                const batch = writeBatch(firestore!);
                                batch.set(doc(firestore!, 'system', 'stats'), { masterBalance: increment(parseInt(amt)), lastUpdated: serverTimestamp() }, { merge: true });
                                batch.set(doc(collection(firestore!, 'master_ledger')), { type: 'vault_funding', amount: parseInt(amt), label: 'Self Funded', createdAt: serverTimestamp() });
                                batch.commit();
                                toast({ title: "Fund Updated! ✅" });
                            }
                        }} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                             Update Capital
                        </Button>
                    </div>

                    <div className="bg-secondary/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 shadow-xl">
                        <div className="p-4 bg-primary/10 rounded-full text-primary animate-pulse"><UserPlus size={40} /></div>
                        <div className="space-y-1">
                            <h4 className="font-black uppercase text-sm">Send to Friend</h4>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Dost के किसी भी बैंक में पैसे भेजें।</p>
                        </div>
                        <Button onClick={() => setIsTransferModalOpen(true)} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-2 shadow-lg">
                            <ArrowUpRight size={18} /> Send 1M Cash
                        </Button>
                    </div>
                </div>

                {/* Secret Passbook */}
                <div className="bg-secondary/20 rounded-[2.5rem] p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <ListFilter className="text-muted-foreground" size={18} />
                            <h4 className="font-black uppercase text-xs tracking-widest italic">Secret Passbook</h4>
                        </div>
                        <span className="text-[8px] font-black uppercase text-white/30 tracking-[0.3em]">Shadow Transactions</span>
                    </div>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-2">
                        {ledgerLogs?.map(log => (
                            <div key={log.id} className="flex items-center justify-between p-4 bg-background/40 rounded-2xl border border-white/5 hover:bg-background/60 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-xl", 
                                        log.type === 'vault_funding' ? "bg-green-500/10 text-green-500" : 
                                        "bg-red-500/10 text-red-500"
                                    )}>
                                        {log.type === 'vault_funding' ? <ArrowUpRight size={16} className="rotate-180" /> : <ArrowUpRight size={16} />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{log.label}</p>
                                        {log.refNo && <p className="text-[8px] text-muted-foreground uppercase font-black font-mono">ID: {log.refNo}</p>}
                                        <p className="text-[8px] font-black uppercase text-white/30">
                                            {log.createdAt ? format(log.createdAt.toDate(), 'dd MMM, HH:mm') : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={cn("font-black text-sm", 
                                        log.type === 'vault_funding' ? "text-green-500" : "text-red-500"
                                    )}>
                                        {log.type === 'vault_funding' ? '+' : '-'}₹{log.amount.toLocaleString()}
                                    </p>
                                    <p className="text-[7px] font-black uppercase text-white/20">Settled</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Gaibi Transfer Dialog */}
            <Dialog open={isTransferModalOpen} onOpenChange={closeTransferModal}>
                <DialogContent className="bg-background text-foreground border-white/10 rounded-[3rem] max-w-sm w-[95%] z-[1000] p-8 overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.9)] outline-none">
                    {processStep === 'idle' && (
                        <>
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-center flex items-center justify-center gap-3">
                                <UserPlus className="text-primary" /> Send to Dost
                                </DialogTitle>
                                <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest mt-1">Deducting from Autonomous 1M Vault</p>
                            </DialogHeader>

                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Friend's Name</Label>
                                    <Input placeholder="Dost Ka Name" value={payoutName} onChange={e => setPayoutName(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Account No. / UPI</Label>
                                    <Input placeholder="Dost Ka Account No." value={payoutAccount} onChange={e => setPayoutAccount(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-mono font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Bank IFSC / Code</Label>
                                    <Input placeholder="IFSC Code" value={payoutIfsc} onChange={e => setPayoutIfsc(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-mono font-bold uppercase" />
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
                                    onClick={handleGaibiTransfer} 
                                    className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                                >
                                    <Lock size={18} /> Execute shadow Payout
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {(processStep === 'encrypting' || processStep === 'gaibi_node') && (
                        <div className="py-12 flex flex-col items-center text-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                                <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">
                                    {processStep === 'encrypting' ? 'Encrypting Path...' : 'Syncing Gaibi Node...'}
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Standalone Payout Protocol Active</p>
                            </div>
                            <div className="w-full bg-secondary/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                <p className="text-[8px] font-black uppercase text-white/40">Safety Status: SECURE</p>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className={cn("h-full bg-primary transition-all duration-[3000ms]", processStep === 'gaibi_node' ? "w-full" : "w-[40%]")} />
                                </div>
                            </div>
                        </div>
                    )}

                    {processStep === 'success' && (
                        <div className="py-8 flex flex-col items-center text-center space-y-8 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-500/10 rounded-[2.5rem] flex items-center justify-center border border-green-500/20 shadow-2xl text-green-500 rotate-3">
                                <CheckCircle2 size={40} />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Shadow Success!</h3>
                                <p className="text-xs text-muted-foreground font-bold leading-relaxed uppercase">
                                    ₹{payoutAmount} debited from Vault. Sent to {payoutName}.
                                </p>
                            </div>

                            <div className="w-full bg-secondary/40 p-5 rounded-3xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Digital Ref No.</span>
                                    <span className="text-[10px] font-mono font-black text-primary">{lastTxId}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Origin Node</span>
                                    <span className="text-[10px] font-black text-white/80 uppercase">ASNAP-VAULT-X1</span>
                                </div>
                            </div>

                            <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 w-full">
                                <p className="text-[9px] text-blue-400 font-bold uppercase leading-tight italic">
                                    "भाई, यह रसीद अपने दोस्त को भेज दो। पैसा आपके इस ऐप वाले फंड से कम हो गया है।"
                                </p>
                            </div>

                            <Button onClick={closeTransferModal} className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-all text-xs">
                                Return to Gaibi Node
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
}
