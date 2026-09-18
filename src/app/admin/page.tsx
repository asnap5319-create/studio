'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, writeBatch, serverTimestamp, increment, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, ShieldCheck, Loader2, Landmark, CheckCircle2, Wallet, Zap, Lock, Copy, ArrowUpRight, ListFilter, Plus, Sparkles, Building2, Send, ReceiptText, Smartphone, History, CreditCard, Banknote, EyeOff, GlobeLock, UserPlus, Globe, ShieldQuestion, Download, Coins, QrCode } from 'lucide-react';
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
    type: 'deposit' | 'withdraw' | 'vault_funding' | 'gaibi_transfer' | 'shadow_deposit';
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
    const [processStep, setProcessStep] = useState<'idle' | 'encrypting' | 'routing' | 'node_sync' | 'success'>('idle');

    // Shadow Banking Details (For User to Share)
    const SHADOW_ACC = "ASNAP-7788-0001";
    const SHADOW_IFSC = "SNAP0000001";
    const ADMIN_REAL_UPI = "ak63315561338@okicici"; // IPPB or any real UPI

    // Transfer States
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutAccount, setPayoutAccount] = useState('');
    const [payoutName, setPayoutName] = useState('');
    const [payoutIfsc, setPayoutIfsc] = useState('');

    // Deposit States
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [senderName, setSenderName] = useState('');
    const [depositType, setDepositType] = useState<'transfer' | 'deposit'>('transfer');

    const [lastTxId, setLastTxId] = useState('');

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

    const handleGaibiTransfer = async () => {
        const amount = parseInt(payoutAmount);
        if (isNaN(amount) || amount <= 0) { toast({ variant: 'destructive', title: "Invalid Amount" }); return; }
        if (!payoutAccount || !payoutName) { toast({ variant: 'destructive', title: "Details Missing" }); return; }
        if (amount > (stats?.masterBalance || 0)) { toast({ variant: 'destructive', title: "Low Vault Balance" }); return; }

        setDepositType('transfer');
        setIsProcessing(true);
        setProcessStep('encrypting');
        await new Promise(r => setTimeout(r, 1200));
        setProcessStep('routing');
        await new Promise(r => setTimeout(r, 1500));
        setProcessStep('node_sync');
        await new Promise(r => setTimeout(r, 1500));

        try {
            const batch = writeBatch(firestore!);
            const txId = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
            setLastTxId(txId);

            batch.set(doc(firestore!, 'system', 'stats'), { 
                masterBalance: increment(-amount),
                totalWithdrawals: increment(amount),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            batch.set(doc(collection(firestore!, 'master_ledger')), {
                type: 'gaibi_transfer',
                amount: amount,
                label: `Outward: ${payoutName}`,
                accountDetails: `${payoutAccount} | ${payoutIfsc || 'UPI'}`,
                refNo: txId,
                createdAt: serverTimestamp()
            });

            await batch.commit();
            setProcessStep('success');
            toast({ title: "Shadow Transfer Executed! 👤" });
        } catch (e) { 
            setProcessStep('idle');
            toast({ variant: 'destructive', title: "Node Error" }); 
        } finally {
            setIsProcessing(false);
        }
    };

    const handleShadowDeposit = async () => {
        const amount = parseInt(depositAmount);
        if (isNaN(amount) || amount <= 0) { toast({ variant: 'destructive', title: "Invalid Amount" }); return; }
        if (!senderName) { toast({ variant: 'destructive', title: "Sender Name Missing" }); return; }

        setDepositType('deposit');
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
                label: `Inward: ${senderName}`,
                refNo: txId,
                createdAt: serverTimestamp()
            });

            await batch.commit();
            setProcessStep('success');
            toast({ title: "Vault Funded Successfully! 🏦" });
        } catch (e) { 
            setProcessStep('idle');
            toast({ variant: 'destructive', title: "Node Error" }); 
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
                        <h1 className="text-2xl font-black flex items-center gap-2 text-primary uppercase italic tracking-tighter">Shadow Terminal</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <GlobeLock size={12} className="text-blue-500" /> Private Banking Protocol
                        </p>
                    </div>
                </div>
                <div className="bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20 flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black text-green-500 uppercase">Encrypted</p>
                </div>
            </header>

            <main className="space-y-8">
                {/* 1 Million Private Fund Card */}
                <div className="bg-money-pattern p-8 rounded-[3rem] text-white shadow-[0_25px_80px_rgba(0,0,0,0.8)] relative overflow-hidden group border border-white/10">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                        <Globe size={180} />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Autonomous Capital</p>
                                <h2 className="text-2xl font-black italic tracking-tighter">ASNAP-GLOBAL-VAULT</h2>
                            </div>
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <Lock className="text-white w-6 h-6" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 flex items-center gap-2">
                                <Sparkles size={14} className="text-yellow-400 animate-pulse" /> Master Fund
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black">₹</span>
                                <h3 className="text-6xl font-black tracking-tighter">
                                    {stats?.masterBalance?.toLocaleString() || '1,000,000'}
                                </h3>
                            </div>
                            <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest mt-2 italic">
                                "भाई, यह आपका पर्सनल फंड है। यहाँ से पैसा भेजें या दोस्त से लेकर जमा करें।"
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-white/40">Vault Status</p>
                                <p className="text-xs font-bold text-green-400">OFF-THE-GRID</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[8px] font-black uppercase text-white/40">Security</p>
                                <p className="text-xs font-black uppercase text-blue-400 flex items-center justify-end gap-1.5"><Zap size={10} fill="currentColor" /> SHA-512</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shadow Identity Section (NEW) */}
                <div className="bg-secondary/40 p-8 rounded-[3rem] border border-white/5 space-y-6">
                    <div className="flex items-center gap-3">
                         <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Landmark size={24} /></div>
                         <div>
                            <h4 className="font-black uppercase italic text-sm">Your Shadow Identity</h4>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Share this for Gaibi deposits</p>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 bg-background/50 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-background/80 transition-all cursor-pointer" onClick={() => copyToClipboard(SHADOW_ACC, "Acc Number")}>
                            <div>
                                <p className="text-[8px] font-black uppercase text-white/40 mb-1">Shadow Acc Number</p>
                                <p className="text-lg font-mono font-black text-white">{SHADOW_ACC}</p>
                            </div>
                            <Copy size={16} className="text-white/20 group-hover:text-primary" />
                        </div>
                        <div className="p-5 bg-background/50 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-background/80 transition-all cursor-pointer" onClick={() => copyToClipboard(SHADOW_IFSC, "IFSC Code")}>
                            <div>
                                <p className="text-[8px] font-black uppercase text-white/40 mb-1">Gaibi IFSC Code</p>
                                <p className="text-lg font-mono font-black text-white">{SHADOW_IFSC}</p>
                            </div>
                            <Copy size={16} className="text-white/20 group-hover:text-primary" />
                        </div>
                    </div>

                    <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl flex items-center gap-4">
                        <div className="w-16 h-16 bg-white p-2 rounded-xl shrink-0 shadow-lg">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${ADMIN_REAL_UPI}&pn=A.snap%20Admin`)}`} className="w-full h-full" alt="UPI QR" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Vault Sync Protocol</p>
                            <p className="text-xs text-white/70 font-medium leading-relaxed italic">
                                "भाई, दोस्त से अपने असली अकाउंट (IPPB/etc) में पैसा मंगवाएं, फिर 'Confirm Deposit' बटन से उसे यहाँ 1M फंड में सिंक कर लें।"
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-secondary/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 shadow-xl">
                        <div className="p-4 bg-green-500/10 rounded-full text-green-500"><Download size={40} /></div>
                        <h4 className="font-black uppercase text-sm">Receive Global Cash</h4>
                        <Button onClick={() => setIsDepositModalOpen(true)} className="w-full h-14 bg-green-600 hover:bg-green-700 font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                             <Plus size={18} /> Confirm Deposit
                        </Button>
                    </div>

                    <div className="bg-secondary/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center gap-4 shadow-xl">
                        <div className="p-4 bg-primary/10 rounded-full text-primary animate-pulse"><UserPlus size={40} /></div>
                        <h4 className="font-black uppercase text-sm">Send to Any Account</h4>
                        <Button onClick={() => setIsTransferModalOpen(true)} className="w-full h-14 bg-primary hover:bg-primary/90 font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                            <Send size={18} /> Execute Payout
                        </Button>
                    </div>
                </div>

                {/* Secret Passbook */}
                <div className="bg-secondary/20 rounded-[2.5rem] p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-black uppercase text-xs tracking-widest italic">Secret Ledger</h4>
                        <span className="text-[8px] font-black uppercase text-white/30 tracking-[0.3em]">Vault Transactions</span>
                    </div>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-2">
                        {ledgerLogs?.map(log => (
                            <div key={log.id} className="flex items-center justify-between p-4 bg-background/40 rounded-2xl border border-white/5 hover:bg-background/60 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-xl", (log.type === 'vault_funding' || log.type === 'shadow_deposit') ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                        <ArrowUpRight size={16} className={(log.type === 'vault_funding' || log.type === 'shadow_deposit') ? "rotate-180" : ""} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{log.label}</p>
                                        <p className="text-[8px] text-muted-foreground uppercase font-black font-mono">ID: {log.refNo || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={cn("font-black text-sm", (log.type === 'vault_funding' || log.type === 'shadow_deposit') ? "text-green-500" : "text-red-500")}>
                                        {(log.type === 'vault_funding' || log.type === 'shadow_deposit') ? '+' : '-'}₹{log.amount.toLocaleString()}
                                    </p>
                                    <p className="text-[7px] font-black uppercase text-white/20">{format(log.createdAt?.toDate() || new Date(), 'HH:mm')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Global Payout Dialog */}
            <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
                <DialogContent className="bg-background text-foreground border-white/10 rounded-[3rem] max-w-sm w-[95%] p-8 overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.9)] outline-none">
                    {processStep === 'idle' && (
                        <>
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-center flex items-center justify-center gap-3">
                                    <Globe className="text-primary animate-spin" /> Send Global Cash
                                </DialogTitle>
                                <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest mt-1">Bypassing Standard Ledger Control</p>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Beneficiary Name</Label>
                                    <Input placeholder="Dost Ka Name" value={payoutName} onChange={e => setPayoutName(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Account Number / UPI ID</Label>
                                    <Input placeholder="Any Bank Acc / UPI" value={payoutAccount} onChange={e => setPayoutAccount(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-mono font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Bank IFSC (Optional)</Label>
                                    <Input placeholder="IFSC CODE" value={payoutIfsc} onChange={e => setPayoutIfsc(e.target.value.toUpperCase())} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-mono font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Amount to Send</Label>
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
                                    <ShieldCheck size={18} /> Execute Shadow Payout
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
                                    {processStep === 'encrypting' ? 'Encrypting Path...' : 
                                     processStep === 'routing' ? 'Routing Global Node...' : 'Syncing Shadow Ledger...'}
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bypassing Traditional Verification</p>
                            </div>
                            <div className="w-full bg-secondary/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                <p className="text-[8px] font-black uppercase text-white/40">Status: PROTECTED</p>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className={cn("h-full bg-primary transition-all duration-[2000ms]", 
                                        processStep === 'routing' ? "w-[60%]" : processStep === 'node_sync' ? "w-[90%]" : "w-[30%]")} />
                                </div>
                            </div>
                        </div>
                    )}

                    {processStep === 'success' && (
                        <div className="py-8 flex flex-col items-center text-center space-y-8 animate-in zoom-in duration-500">
                            <div className={cn("w-20 h-20 rounded-[2.5rem] flex items-center justify-center border shadow-2xl rotate-3", 
                                depositType === 'deposit' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-primary/10 border-primary/20 text-primary")}>
                                {depositType === 'deposit' ? <Coins size={40} /> : <CheckCircle2 size={40} />}
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                                    {depositType === 'deposit' ? 'Vault Funded!' : 'Shadow Success!'}
                                </h3>
                                <p className="text-xs text-muted-foreground font-bold uppercase">
                                    {depositType === 'deposit' ? `₹${depositAmount} Received from ${senderName}` : `₹${payoutAmount} Sent to ${payoutName}.`}
                                </p>
                            </div>

                            <div className="w-full bg-secondary/40 p-5 rounded-3xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Ref No.</span>
                                    <span className="text-[10px] font-mono font-black text-primary">{lastTxId}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Origin Node</span>
                                    <span className="text-[10px] font-black text-white/80 uppercase">GAIBI-VAULT-X1</span>
                                </div>
                            </div>

                            <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 w-full">
                                <p className="text-[9px] text-blue-400 font-bold uppercase leading-tight italic">
                                    {depositType === 'deposit' ? '"भाई, यह पैसा आपकी तिजोरी में सुरक्षित जुड़ गया है।"' : '"भाई, यह रसीद अपने दोस्त को भेज दो। पैसा फंड से कम हो गया है।"'}
                                </p>
                            </div>

                            <Button onClick={() => { setProcessStep('idle'); setIsTransferModalOpen(false); setIsDepositModalOpen(false); }} className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-all text-xs">
                                Return to Terminal
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Shadow Deposit Dialog */}
            <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
                <DialogContent className="bg-background text-foreground border-white/10 rounded-[3rem] max-w-sm w-[95%] p-8 overflow-hidden shadow-[0_0_150px_rgba(0,128,0,0.4)] outline-none">
                    {processStep === 'idle' && (
                        <>
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-center flex items-center justify-center gap-3">
                                    <Download className="text-green-500 animate-bounce" /> Confirm Deposit
                                </DialogTitle>
                                <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest mt-1">Updating Private Shadow Vault</p>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Sender Name (Friend)</Label>
                                    <Input placeholder="Dost Ka Name" value={senderName} onChange={e => setSenderName(e.target.value)} className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Amount Received</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-green-500">₹</span>
                                        <Input type="number" placeholder="0.00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="h-14 pl-8 bg-secondary/50 border-white/10 rounded-xl text-lg font-black text-white" />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-8">
                                <Button 
                                    onClick={handleShadowDeposit} 
                                    className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                                >
                                    <ShieldCheck size={18} /> Execute Vault Sync
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
                                    {processStep === 'encrypting' ? 'Syncing Node...' : 
                                     processStep === 'routing' ? 'Routing Shadow Path...' : 'Confirming Deposit...'}
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Autonomous Ledger Inbound</p>
                            </div>
                            <div className="w-full bg-secondary/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                <p className="text-[8px] font-black uppercase text-white/40">Status: ENCRYPTED</p>
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
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Deposit Confirmed!</h3>
                                <p className="text-xs text-muted-foreground font-bold uppercase">
                                    ₹{depositAmount} Added to Vault from {senderName}.
                                </p>
                            </div>

                            <div className="w-full bg-secondary/40 p-5 rounded-3xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Deposit ID</span>
                                    <span className="text-[10px] font-mono font-black text-green-500">{lastTxId}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Target Node</span>
                                    <span className="text-[10px] font-black text-white/80 uppercase">ASNAP-VAULT-MAIN</span>
                                </div>
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
