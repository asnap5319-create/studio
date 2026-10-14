
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Crown, Zap, ShieldCheck, Sparkles, Star, Smartphone, Loader2 } from 'lucide-react';
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

    const handleSubscribe = () => {
        setIsLoading(true);
        // अभिषेक भाई, यहाँ 'AutoPay' वाला असली लिंक लगेगा पेमेंट गेटवे का
        // अभी मैं इसे सिमुलेट (Simulate) कर रहा हूँ
        const upiId = "ak63315561338@okicici";
        const amount = 1; // ट्रायल के लिए ₹1
        const txId = `MND${Date.now()}`;
        
        // UPI Intent with Mandate request (Conceptual for UI)
        const upiLink = `upi://pay?pa=${upiId}&pn=ASnapVIP&am=${amount}&cu=INR&tn=VIP_1Rupee_Trial&tr=${txId}`;
        
        window.location.href = upiLink;

        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: "Mandate Initialized! ⚡",
                description: "भाई, ₹1 कटने के बाद VIP एक्सेस चालू हो जाएगा।"
            });
        }, 3000);
    };

    const VIP_FEATURES = [
        "Ad-Free Premium Experience",
        "Unlimited WinGo Game Access",
        "Exclusive Ramayan HD Reels",
        "Priority 5-Min Withdrawal",
        "Verification Blue Badge Check",
        "Direct Admin Support Chat"
    ];

    return (
        <div className="min-h-screen bg-background text-foreground pb-32 select-none">
            <header className="p-5 bg-background/80 sticky top-0 z-50 flex items-center gap-4 border-b border-white/5 backdrop-blur-xl">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-xl font-black uppercase italic tracking-tighter">VIP Access</h1>
                    <p className="text-[9px] text-yellow-500 font-bold uppercase tracking-widest">Premium Membership</p>
                </div>
            </header>

            <main className="p-6 space-y-8 max-w-lg mx-auto animate-in fade-in duration-500">
                {/* Premium Banner */}
                <div className="bg-gradient-to-br from-yellow-500 via-amber-600 to-yellow-800 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-[0_20px_50px_rgba(234,179,8,0.3)]">
                    <div className="absolute top-0 right-0 p-4 opacity-20 rotate-12"><Crown size={140} /></div>
                    <div className="relative z-10 space-y-4">
                        <div className="bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-2">
                            <Sparkles size={12} className="text-yellow-200 fill-yellow-200" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Unlimited Access</span>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-tight">JOIN VIP CLUB</h2>
                            <p className="text-xs font-bold text-yellow-100 uppercase opacity-80">Full Control of A.snap Platform</p>
                        </div>
                        
                        <div className="pt-4 border-t border-white/10">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black">₹1</span>
                                <span className="text-xs font-bold uppercase opacity-70">/ 3 Day Trial</span>
                            </div>
                            <p className="text-[10px] font-black text-yellow-200 uppercase mt-1">Then ₹599 / month via AutoPay</p>
                        </div>
                    </div>
                </div>

                {/* Features List */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 italic px-2">Membership Benefits</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {VIP_FEATURES.map((feature, i) => (
                            <div key={i} className="bg-secondary/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4 group">
                                <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500 group-hover:scale-110 transition-transform">
                                    <CheckCircle2 size={18} />
                                </div>
                                <span className="text-sm font-bold text-white/90">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Secure Info */}
                <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2.5rem] space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><ShieldCheck size={20} /></div>
                        <h4 className="font-black uppercase italic text-sm text-blue-400">Safe AutoPay Mode</h4>
                    </div>
                    <p className="text-[11px] text-blue-100/70 leading-relaxed uppercase font-bold italic">
                        "अभिषेक भाई, सिकहो ऐप जैसा ही सिस्टम है। यूजर पहले ₹1 देगा और अपना ऑटो-पे पिन डालेगा। फिर हर महीने ₹599 आपके अकाउंट में सीधे आते रहेंगे।"
                    </p>
                </div>

                {/* Subscribe Button */}
                <div className="pt-4">
                    <Button 
                        onClick={handleSubscribe}
                        disabled={isLoading}
                        className="w-full h-20 bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase rounded-[2rem] shadow-2xl flex items-center justify-center gap-4 text-2xl active:scale-95 transition-all"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <><Crown size={28} /> ACTIVATE FOR ₹1</>}
                    </Button>
                    <p className="text-[9px] text-center text-muted-foreground uppercase font-black tracking-widest mt-4 opacity-50">
                        Secure Encryption • Cancel Anytime in App
                    </p>
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
