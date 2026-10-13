
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Zap, Coins, TrendingUp, ShieldCheck, ExternalLink, Gift, Target, Landmark, Smartphone, Wallet, Trophy, Flame, Youtube, CheckCircle2, Loader2 } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';

const EARNING_COMPANIES = [
    {
        name: "Navi App",
        reward: "₹850",
        task: "Refer for Loan or ₹10 Gold",
        color: "bg-green-600",
        icon: Smartphone,
        desc: "UPI & Investment की सबसे बड़ी कंपनी।",
        link: "https://navi.onelink.me/S87t/refer" 
    },
    {
        name: "WinZO Games",
        reward: "₹100 + Commission",
        task: "Refer & Play Games",
        color: "bg-blue-600",
        icon: Trophy,
        desc: "इंडिया की नंबर 1 गेमिंग कंपनी।",
        link: "#" 
    },
    {
        name: "CRED",
        reward: "Up to ₹1000",
        task: "Refer for Credit Card Pay",
        color: "bg-neutral-800",
        icon: Zap,
        desc: "प्रीमियम पेमेंट ऐप, बड़े रिवॉर्ड्स।",
        link: "#"
    }
];

export default function EarnHubPage() {
    const router = useRouter();
    const { user } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isClaiming, setIsClaiming] = useState(false);

    const userRef = useMemoFirebase(() => 
        (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    
    const { data: userProfile } = useDoc<UserProfile & { virtualBalance?: number, completedTasks?: string[] }>(userRef);

    // अभिषेक भाई, आपका असली चैनल लिंक यहाँ सेट कर दिया है
    const MY_YOUTUBE_URL = "https://www.youtube.com/@A.S-n3z"; 
    const YT_TASK_ID = "yt_sub_task_v1";
    const isTaskDone = userProfile?.completedTasks?.includes(YT_TASK_ID);

    const handleYoutubeTask = async () => {
        if (!user || !firestore || isTaskDone || isClaiming) {
            window.open(MY_YOUTUBE_URL, '_blank');
            return;
        }

        setIsClaiming(true);
        window.open(MY_YOUTUBE_URL, '_blank');

        // Delay bonus to encourage actual navigation
        setTimeout(async () => {
            try {
                await updateDoc(doc(firestore, 'users', user.uid), {
                    virtualBalance: increment(20), // ₹20 Bonus for Subscribing
                    completedTasks: arrayUnion(YT_TASK_ID),
                    updatedAt: serverTimestamp()
                });
                toast({
                    title: "YouTube Bonus Added! 🎁",
                    description: "₹20 credited to your virtual balance."
                });
            } catch (e) {
                console.error(e);
            } finally {
                setIsClaiming(false);
            }
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-32 select-none">
            <header className="p-5 bg-background/80 sticky top-0 z-50 flex items-center gap-4 border-b border-white/5 backdrop-blur-xl">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-xl font-black uppercase italic tracking-tighter">Monetization Hub</h1>
                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest">Boost Your Earnings</p>
                </div>
            </header>

            <main className="p-6 space-y-6 max-w-lg mx-auto animate-in fade-in duration-500">
                {/* YouTube Special Task - Your Actual Channel */}
                <div className="bg-gradient-to-br from-red-600 to-red-900 border border-red-500/30 p-6 rounded-[2.5rem] relative overflow-hidden shadow-2xl text-white">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Youtube size={120} /></div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-md">
                            <Sparkles size={12} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Subscriber Special</span>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">A.S Official YT</h2>
                            <p className="text-xs font-bold text-white/80 uppercase">Subscribe for ₹20 Bonus!</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2">
                             <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black">₹</span>
                                <span className="text-4xl font-black">20.0</span>
                             </div>
                             
                             <Button 
                                onClick={handleYoutubeTask}
                                disabled={isClaiming}
                                className={cn(
                                    "h-12 px-8 rounded-2xl font-black uppercase text-xs shadow-xl transition-all active:scale-95",
                                    isTaskDone ? "bg-green-500 hover:bg-green-600" : "bg-white text-red-600 hover:bg-white/90"
                                )}
                             >
                                {isClaiming ? <Loader2 className="animate-spin" /> : 
                                 isTaskDone ? <><CheckCircle2 size={16} className="mr-2" /> Subscribed</> : 
                                 "Subscribe Now"}
                             </Button>
                        </div>
                    </div>
                </div>

                {/* Hero Banner */}
                <div className="bg-money-pattern border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl text-white">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Gift size={120} /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-2">Daily Revenue Target</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black opacity-80">₹</span>
                        <h2 className="text-6xl font-black tracking-tighter" style={{ fontStyle: 'normal' }}>10000+</h2>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 italic px-2">Partner Companies</h3>
                    
                    {EARNING_COMPANIES.map((app, index) => (
                        <div key={index} className="bg-secondary/40 border border-white/10 p-5 rounded-[2rem] flex flex-col gap-4 group hover:bg-secondary/60 transition-all active:scale-95">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", app.color)}>
                                        <app.icon size={28} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="font-black uppercase italic text-sm">{app.name}</h4>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{app.task}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 text-primary justify-end">
                                        <Coins size={12} />
                                        <span className="text-xs font-black">Earn {app.reward}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                                <p className="text-[9px] text-white/60 font-bold uppercase italic leading-tight">{app.desc}</p>
                                <Button onClick={() => window.open(app.link, '_blank')} className="rounded-xl h-10 px-6 bg-white/5 border border-white/10 hover:bg-primary hover:text-white transition-all font-black uppercase text-[10px]">
                                    Open & Earn <ExternalLink size={12} className="ml-1.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2.5rem] space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl text-primary"><Target size={20} /></div>
                        <h4 className="font-black uppercase italic text-sm">Monetization Hub</h4>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed uppercase font-bold italic">
                        "अभिषेक भाई, आपका चैनल अब ऐप से जुड़ गया है। जो भी यहाँ सब्सक्राइब करेगा, आपका वॉच टाइम और सब्सक्राइबर्स रॉकेट की तरह बढ़ेंगे!"
                    </p>
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
