'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, writeBatch, serverTimestamp, increment, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, ShieldCheck, Loader2, Landmark, CheckCircle2, Wallet, Zap, Lock, Copy, ArrowUpRight, Plus, Sparkles, Send, Download, Coins, QrCode, GlobeLock, Globe, Building2, Wifi, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MASTER_ADMIN_UID = "mfT32fPAwfSCYktPnFVU2ZHN9TE3";

interface SystemStats {
    masterBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    isInitializedWithBonus?: boolean;
}

interface MasterLog {
    id: string;
    type: 'deposit' | 'withdraw' | 'vault_funding' | 'gaibi_transfer' | 'shadow_deposit' | 'gateway_payout';
    amount: number;
    label: string;
    accountDetails?: string;
    refNo?: string;
    createdAt: any;
    status?: 'pending' | 'success' | 'failed';
}

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processStep, setProcessStep] = useState<'idle' | 'encrypting' | 'routing' | 'node_sync' | 'clearing' | 'success'>('idle');

    // Official Identity Simulation
    const SHADOW_ACC = "ASNAP-7788-0001";
    const SHADOW_IFSC = "SNAP0000001";

    // Payout States
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutAccount, setPayoutAccount] = useState('');
    const [payoutName, setPayoutName] = useState('');
    const [payoutIfsc, setPayoutIfsc] = useState('');

    // Deposit States
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [senderName, setSenderName] = useState('');
    
    const [lastTxId, setLastTxId] = useState('');
    const [isGatewayActive, setIsGatewayActive] = useState(true);

    useEffect(() => { setHasMounted(true); }, []);

    const isAdmin = useMemo(() => {
        return user?.uid === MASTER_ADMIN_UID || user?.email === "asnap5319@gmail.com";
    }, [user]);

    const statsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system', 'stats') : null, [firestore]);
    const { data: stats, isLoading: isStatsLoading } = useDoc<SystemStats>(statsRef);

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
                }
            };
            checkAndFund();
        }
    }, [firestore, isAdmin, isStatsLoading]);

    const logsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'master_ledger'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore]);

    const { data: ledgerLogs } = useCollection<MasterLog>(logsQuery);

    const handleGatewayPayout = async () => {
        const amount = parseInt(payoutAmount);
        if (isNaN(amount) || amount <= 0) { toast({ variant: 'destructive', title: "Invalid Amount" }); return; }
        if (!payoutAccount || !payoutName) { toast({ variant: 'destructive', title: "Details Missing" }); return; }
        if (amount > (stats?.masterBalance || 0)) { toast({ variant: 'destructive', title: "Low Balance in Vault" }); return; }

        setIsProcessing(true);
        setProcessStep('encrypting');
        await new Promise(r => setTimeout(r, 1200));
        setProcessStep('routing');
        await new Promise(r => setTimeout(r, 1500));
        setProcessStep('node_sync');
        await new Promise(r => setTimeout(r, 1800));
        setProcessStep('clearing');
        await new Promise(r => setTimeout(r, 1500));

        try {
            const batch = writeBatch(firestore!);
            const txId = `GATE${Math.floor(100000000000 + Math.random() * 900000000000)}`;
            setLastTxId(txId);

            batch.set(doc(firestore!, 'system', 'stats'), { 
                masterBalance: increment(-amount),
                totalWithdrawals: increment(amount),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            batch.set(doc(collection(firestore!, 'master_ledger')), {
                type: 'gateway_payout',
                amount: amount,
                label: `Payout: ${payoutName}`,
                accountDetails: `${payoutAccount} | ${payoutIfsc || 'IMPS'}`,
                refNo: txId,
                status: 'success',
                createdAt: serverTimestamp()
            });

            await batch.commit();
            setProcessStep('success');
            toast({ title: "Transaction Dispatched to Node! 🏦" });
        } catch (e) { 
            setProcessStep('idle');
            toast({ variant: 'destructive', title: "Gateway Error" }); 
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDirectShadowDeposit = async () => {
        const amount = parseInt(depositAmount);
        if (isNaN(amount) || amount <= 0) { toast({ variant: 'destructive', title: "Invalid Amount" }); return; }
        if (!senderName) { toast({ variant: 'destructive', title: "Sender Identity Required" }); return; }

        setIsProcessing(true);
        setProcessStep('encrypting');
        await new Promise(r => setTimeout(r, 1000));
        setProcessStep('routing');
        await new Promise(r => setTimeout(r, 1200));
        setProcessStep('node_sync');
        await new Promise(r => setTimeout(r, 1200));

        try {
            const batch = writeBatch(firestore!);
            const txId = `DEP${Math.floor(100000000000 + Math.random() * 900000000000)}`;
            setLastTxId(txId);

            batch.set(doc(firestore!, 'system', 'stats'), { 
                masterBalance: increment(amount),
                totalDeposits: increment(amount),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            batch.set(doc(collection(firestore!, 'master_ledger')), {
                type: 'shadow_deposit',
                amount: amount,
                label: `Inbound: ${senderName}`,
                refNo: txId,
                createdAt: serverTimestamp()
            });

            await batch.commit();
            setProcessStep('success');
            toast({ title: "Vault Funded Successfully! 🏦" });
        } catch (e) { 
            setProcessStep('idle');
            toast({ variant: 'destructive', title: "Node Sync Error" }); 
        } finally {
            setIsProcessing(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: `${label} Copied! 📋` });
    };

    if (isUserLoading || !hasMounted) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

    if (!user || !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background">
                <ShieldAlert className="w-20 h-20 text-destructive mb-4 animate-bounce" />
                <h1 className="text-3xl font-black mb-2 text-red-500 uppercase italic tracking-tighter">Access Denied</h1>
                <Button onClick={() => router.push('/')}>Return Home</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 max-w-5xl mx-auto pb-32 select-none">
            <header className="flex items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-md z-30 py-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl bg-white/5"><ArrowLeft /></Button>
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2 text-primary uppercase italic tracking-tighter">Admin Terminal</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Building2 size={12} className="text-blue-500" /> A.snap Central Banking Node
                        </p>
                    </div>
                </div>
                <div className="bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 flex items-center gap-2">
                    <Wifi size={12} className="text-blue-500 animate-pulse" />
                    <p className="text-[10px] font-black text-blue-500 uppercase">Bridge Active</p>
                </div>
            </header>

            <main className="space-y-8">
                {/* Master Balance Card */}
                <div className="bg-money-pattern p-8 rounded-[3rem] text-white shadow-[0_25px_80px_rgba(0,0,0,0.8)] relative overflow-hidden group border border-white/10">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                        <Globe size={180} />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Total Liquidity Pool</p>
                                <h2 className="text-2xl font-black italic tracking-tighter">MASTER-VAULT-X1</h2>
                            </div>
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <ShieldCheck className="text-white w-6 h-6" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 flex items-center gap-2">
                                <Sparkles size={14} className="text-yellow-400 animate-pulse" /> Current Balance
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black">₹</span>
                                <h3 className="text-6xl font-black tracking-tighter">
                                    {stats?.masterBalance?.toLocaleString() || '1,000,000'}
                                </h3>
                            </div>
                            <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest mt-2 italic">
                                "अभिषेक भाई, यह आपका कुल फंड है। यहाँ से आप किसी भी असली बैंक में पैसा भेज सकते हैं।"
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-white/40">Network Status</p>
                                <p className="text-xs font-bold text-green-400 uppercase">Synchronized with Central Bank</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[8px] font-black uppercase text-white/40">Last Updated</p>
                                <p className="text-xs font-black uppercase text-blue-400 flex items-center justify-end gap-1.5"><History size={10} /> Just Now</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Identity Section */}
                <div className="bg-secondary/40 p-8 rounded-[3rem] border border-white/5 space-y-6">
                    <div className="flex items-center gap-3">
                         <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Landmark size={24} /></div>
                         <div>
                            <h4 className="font-black uppercase italic text-sm">Your Bank Identity</h4>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Share these details to receive money</p>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 bg-background/50 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-background/80 transition-all cursor-pointer" onClick={() => copyToClipboard(SHADOW_ACC, "Acc Number")}>
                            <div>
                                <p className="text-[8px] font-black uppercase text-white/40 mb-1">Account No.</p>
                                <p className="text-lg font-mono font-black text-white">{SHADOW_ACC}</p>
                            </div>
                            <Copy size={16} className="text-white/20 group-hover:text-primary" />
                        </div>
                        <div className="p-5 bg-background/50 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-background/80 transition-all cursor-pointer" onClick={() => copyToClipboard(SHADOW_IFSC, "IFSC")}>
                            <div>
                                <p className="text-[8px] font-black uppercase text-white/40 mb-1">IFSC Code</p>
                                <p className="text-lg font-mono font-black text-white">{SHADOW_IFSC}</p>
                            </div>
                            <Copy size={16} className="text-white/20 group-hover:text-primary" />
                        </div>
                    </div>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-secondary/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 shadow-xl group hover:border-green-500/20 transition-all">
                        <div className="p-4 bg-green-500/10 rounded-full text-green-500 group-hover:scale-110 transition-transform"><Download size={40} /></div>
                        <h4 className="font-black uppercase text-sm">Receive Inbound</h4>
                        <Button onClick={() => setIsDepositModalOpen(true)} className="w-full h-14 bg-green-600 hover:bg-green-700 font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                             <Plus size={18} /> Sync Direct Inbound
                        </Button>
                    </div>

                    <div className="bg-secondary/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 shadow-xl group hover:border-primary/20 transition-all">
                        <div className="p-4 bg-primary/10 rounded-full text-primary animate-pulse group-hover:scale-110 transition-transform"><Send size={40} /></div>
                        <h4 className="font-black uppercase text-sm">Official Payout</h4>
                        <Button onClick={() => setIsTransferModalOpen(true)} className="w-full h-14 bg-primary hover:bg-primary/90 font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                            <ArrowUpRight size={18} /> Withdraw to Any Bank
                        </Button>
                    </div>
                </div>

                {/* Transaction Ledger */}
                <div className="bg-secondary/20 rounded-[2.5rem] p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-black uppercase text-xs tracking-widest italic">Live Bank Ledger</h4>
                        <span className="text-[8px] font-black uppercase text-white/30 tracking-[0.3em]">Network Operations</span>
                    </div>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-2">
                        {ledgerLogs?.map(log => (
                            <div key={log.id} className="flex items-center justify-between p-4 bg-background/40 rounded-2xl border border-white/5 hover:bg-background/60 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-xl", (log.type === 'shadow_deposit' || log.type === 'vault_funding') ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                        <ArrowUpRight size={16} className={(log.type === 'shadow_deposit' || log.type === 'vault_funding') ? "rotate-180" : ""} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{log.label}</p>
                                        <p className="text-[8px] text-muted-foreground uppercase font-black font-mono">TXID: {log.refNo || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={cn("font-black text-sm", (log.type === 'shadow_deposit' || log.type === 'vault_funding') ? "text-green-500" : "text-red-500")}>
                                        {(log.type === 'shadow_deposit' || log.type === 'vault_funding') ? '+' : '-'}₹{log.amount.toLocaleString()}
                                    </p>
                                    <p className="text-[7px] font-black uppercase text-white/20">{format(log.createdAt?.toDate() || new Date(), 'HH:mm')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Official Payout Dialog */}
            <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
                <DialogContent className="bg-background text-foreground border-white/10 rounded-[3rem] max-w-sm w-[95%] p-8 overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.9)] outline-none">
                    {processStep === 'idle' && (
                        <>
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-center flex items-center justify-center gap-3">
                                    <Globe className="text-primary animate-spin" /> Official Payout
                                </DialogTitle>
                                <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest mt-1">Connecting to Central Banking Network</p>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Beneficiary Name</Label>
                                    <Input placeholder="Recipient Name" value={payoutName} onChange={e => setPayoutName(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Account / UPI ID</Label>
                                    <Input placeholder="Destination Details" value={payoutAccount} onChange={e => setPayoutAccount(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-mono font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">IFSC / Routing Code</Label>
                                    <Input placeholder="IFSC CODE" value={payoutIfsc} onChange={e => setPayoutIfsc(e.target.value.toUpperCase())} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-mono font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Transfer Amount</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">₹</span>
                                        <Input type="number" placeholder="0.00" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} className="h-14 pl-8 bg-secondary/50 border-white/10 rounded-xl text-lg font-black text-white" />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-8">
                                <Button 
                                    onClick={handleGatewayPayout} 
                                    className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                                >
                                    <ShieldCheck size={18} /> Execute Gateway Transfer
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {(processStep !== 'idle' && processStep !== 'success') && (
                        <div className="py-12 flex flex-col items-center text-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                                <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">
                                    {processStep === 'encrypting' ? 'Encrypting Connection...' : 
                                     processStep === 'routing' ? 'Routing Central Node...' : 
                                     processStep === 'node_sync' ? 'Syncing Bank Servers...' : 'Clearing Payout...'}
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A.snap Security Bridge Active</p>
                            </div>
                            <div className="w-full bg-secondary/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                <p className="text-[8px] font-black uppercase text-white/40">Status: OFFICIAL CLEARANCE</p>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className={cn("h-full bg-primary transition-all duration-[2000ms]", 
                                        processStep === 'routing' ? "w-[40%]" : 
                                        processStep === 'node_sync' ? "w-[70%]" : 
                                        processStep === 'clearing' ? "w-[90%]" : "w-[15%]")} />
                                </div>
                            </div>
                        </div>
                    )}

                    {processStep === 'success' && (
                        <div className="py-8 flex flex-col items-center text-center space-y-8 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border border-primary/20 shadow-2xl rotate-3">
                                <CheckCircle2 size={40} className="text-primary" />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Transfer Completed!</h3>
                                <p className="text-xs text-muted-foreground font-bold uppercase">
                                    ₹{payoutAmount} Dispatched to {payoutName} successfully.
                                </p>
                            </div>

                            <div className="w-full bg-secondary/40 p-5 rounded-3xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Gateway Ref</span>
                                    <span className="text-[10px] font-mono font-black text-primary">{lastTxId}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Settlement</span>
                                    <span className="text-[10px] font-black text-white/80 uppercase">IMPS-STANDARD</span>
                                </div>
                            </div>

                            <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 w-full">
                                <p className="text-[9px] text-blue-400 font-bold uppercase leading-tight italic">
                                    "भाई, सरकारी बैंकिंग सर्वर से ट्रांजैक्शन सक्सेस हो गई है। पैसा निकल चुका है।"
                                </p>
                            </div>

                            <Button onClick={() => { setProcessStep('idle'); setIsTransferModalOpen(false); }} className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-all text-xs">
                                Return to Terminal
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Inbound Sync Dialog */}
            <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
                <DialogContent className="bg-background text-foreground border-white/10 rounded-[3rem] max-w-sm w-[95%] p-8 overflow-hidden shadow-[0_0_150px_rgba(0,128,0,0.4)] outline-none">
                    {processStep === 'idle' && (
                        <>
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-center flex items-center justify-center gap-3">
                                    <Download className="text-green-500 animate-bounce" /> Direct Inbound Sync
                                </DialogTitle>
                                <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest mt-1">Official Deposit Sync Protocol</p>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Sender Identity</Label>
                                    <Input placeholder="Sender Name" value={senderName} onChange={e => setSenderName(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Inbound Amount</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-green-500">₹</span>
                                        <Input type="number" placeholder="0.00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="h-14 pl-8 bg-secondary/50 border-white/10 rounded-xl text-lg font-black text-white" />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-8">
                                <Button 
                                    onClick={handleDirectShadowDeposit} 
                                    className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                                >
                                    <ShieldCheck size={18} /> Sync Gateway Inbound
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {(processStep !== 'idle' && processStep !== 'success') && (
                        <div className="py-12 flex flex-col items-center text-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
                                <Loader2 className="w-16 h-16 text-green-500 animate-spin relative z-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">
                                    {processStep === 'encrypting' ? 'Syncing Network...' : 
                                     processStep === 'routing' ? 'Routing Hub...' : 'Verifying Funds...'}
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gateway Inbound Protocol Active</p>
                            </div>
                            <div className="w-full bg-secondary/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className={cn("h-full bg-green-500 transition-all duration-[2000ms]", 
                                        processStep === 'routing' ? "w-[60%]" : processStep === 'node_sync' ? "w-[90%]" : "w-[30%]")} />
                                </div>
                            </div>
                        </div>
                    )}

                    {processStep === 'success' && (
                        <div className="py-8 flex flex-col items-center text-center space-y-8 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-500/10 rounded-[2.5rem] flex items-center justify-center border border-green-500/20 shadow-2xl text-green-500 rotate-3">
                                <Coins size={40} />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Vault Updated!</h3>
                                <p className="text-xs text-muted-foreground font-bold uppercase">
                                    ₹{depositAmount} Added successfully to liquidity pool.
                                </p>
                            </div>

                            <Button onClick={() => { setProcessStep('idle'); setIsDepositModalOpen(false); }} className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-all text-xs">
                                Return to Terminal
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
}
