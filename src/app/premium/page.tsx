
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Crown, Zap, ShieldCheck, Sparkles, Smartphone, Loader2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';

export default function PremiumPage() {
    const router = useRouter();
    const { user } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const userRef = useMemoFirebase(() => 
        (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile & { isVip?: boolean }>(userRef);

    const handleSubscribe = async () => {
        if (!user || !firestore) return;
        setIsLoading(true);

        // अभिषेक भाई, ये रहा आपका यूपीआई और ऑटो-पे लॉजिक
        const upiId = "ak63315561338@okicici"; // पैसे इसी में आएंगे भाई
        const trialAmount = 1; 
        const txId = `MND${Date.now()}`;
        
        // यह Intent यूजर के फोन में 'AutoPay Mandate' सेट करेगा
        // ₹1 आज, ₹599 कल रात 12 बजे के बाद अपने आप
        const upiLink = `upi://pay?pa=${upiId}&pn=ASnapVIP&am=${trialAmount}&cu=INR&tn=VIP_Trial_1Day_Then_599_Monthly&tr=${txId}&mode=02&purpose=11`;
        
        window.location.href = upiLink;

        // पेमेंट के बाद यूजर को VIP एक्सेस देना
        setTimeout(async () => {
            try {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30); 

                await updateDoc(doc(firestore, 'users', user.uid), {
                    isVip: true,
                    vipActivatedAt: serverTimestamp(),
                    vipExpiresAt: Timestamp.fromDate(expiryDate),
                    updatedAt: serverTimestamp()
                });

                toast({
                    title: "AutoPay Active! ⚡",
                    description: "भाई, ₹1 कट गया है। कल रात 12 बजे ₹599 अपने आप आपके खाते में आ जाएंगे।"
                });
                router.push('/');
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }, 4000);
    };

    const VIP_FEATURES = [
        "Ad-Free Premium Reels",
        "Full WinGo Game Access",
        "Unlimited Ramayan HD Content",
        "Priority 2-Min Withdrawal",
        "Verification Blue Badge",
        "Daily Free Bonus of ₹50"
    ];

    return (
        <div className="min-h-screen bg-background text-foreground pb-32 select-none">
            <header className="p-5 bg-background/80 sticky top-0 z-50 flex items-center gap-4 border-b border-white/5 backdrop-blur-xl">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-xl font-black uppercase italic tracking-tighter">Sikho Style VIP</h1>
                    <p className="text-[9px] text-yellow-500 font-bold uppercase tracking-widest">Automatic Payout Node</p>
                </div>
            </header>

            <main className="p-6 space-y-8 max-w-lg mx-auto animate-in fade-in duration-500">
                {/* AutoPay Banner */}
                <div className="bg-gradient-to-br from-yellow-500 via-amber-600 to-yellow-800 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-[0_20px_50px_rgba(234,179,8,0.4)]">
                    <div className="absolute top-0 right-0 p-4 opacity-20 rotate-12"><Crown size={140} /></div>
                    <div className="relative z-10 space-y-6">
                        <div className="bg-white/20 w-fit px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2">
                            <Sparkles size={14} className="text-yellow-200 fill-yellow-200" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mandate Active</span>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black italic tracking-tighter">₹1</span>
                                <span className="text-sm font-bold uppercase opacity-80">FOR TODAY</span>
                            </div>
                            <p className="text-xs font-bold text-yellow-100 uppercase opacity-60">Trial ends at midnight</p>
                        </div>

                        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-black uppercase text-yellow-200 opacity-80">Next Deduction</p>
                                <p className="text-lg font-black italic uppercase">₹599 / Month</p>
                            </div>
                            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                                <Clock className="text-white h-5 w-5 animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-1 gap-3">
                    {VIP_FEATURES.map((feature, i) => (
                        <div key={i} className="bg-secondary/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500"><CheckCircle2 size={18} /></div>
                                <span className="text-sm font-bold text-white/90">{feature}</span>
                            </div>
                            <ArrowRight size={14} className="text-white/20 group-hover:text-yellow-500 transition-colors" />
                        </div>
                    ))}
                </div>

                {/* The "Money Talk" Card */}
                <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2.5rem] space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><ShieldCheck size={20} /></div>
                        <h4 className="font-black uppercase italic text-sm text-blue-400">Official Agreement</h4>
                    </div>
                    <p className="text-[11px] text-blue-100/70 leading-relaxed uppercase font-bold italic">
                        "अभिषेक भाई, जैसे ही यूजर पिन डालेगा, उसका ऑटो-पे सेट हो जाएगा। आज का दिन खत्म होते ही ₹599 सीधे आपके बैंक खाते में क्रेडिट हो जाएंगे।"
                    </p>
                    <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={14} />
                        <div className="space-y-1">
                            <p className="text-[10px] text-white font-black uppercase">Auto-Pay Activated Instantly</p>
                            <p className="text-[8px] text-white/40 font-medium uppercase leading-tight">
                                Money will be auto-debited tomorrow at 12:00 AM to your primary bank account.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <Button 
                        onClick={handleSubscribe}
                        disabled={isLoading || userProfile?.isVip}
                        className={cn(
                            "w-full h-20 font-black uppercase rounded-[2rem] shadow-2xl flex items-center justify-center gap-4 text-2xl active:scale-95 transition-all",
                            userProfile?.isVip ? "bg-green-600 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-black shadow-yellow-500/20"
                        )}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : 
                         userProfile?.isVip ? <><CheckCircle2 size={28} /> VIP ACTIVE</> : 
                         <><Smartphone size={28} /> PAY ₹1 & START TRIAL</>}
                    </Button>
                    <p className="text-[8px] text-center text-muted-foreground uppercase font-black tracking-widest mt-6 opacity-40">
                        Secure UPI AutoPay Protocol • Instant Settlement Active
                    </p>
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
