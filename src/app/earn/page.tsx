'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Zap, Coins, TrendingUp, ShieldCheck, ExternalLink, Gift, Target } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';

const EARNING_APPS = [
    {
        name: "Navi App",
        reward: "₹850",
        task: "Refer for Loan or Digital Gold",
        color: "bg-green-500",
        link: "#" // अभिषेक भाई, यहाँ अपना Navi रेफरल लिंक डालें
    },
    {
        name: "Upstox",
        reward: "₹800",
        task: "Successful Demat Account Opening",
        color: "bg-blue-600",
        link: "#" // अभिषेक भाई, यहाँ अपना Upstox रेफरल लिंक डालें
    },
    {
        name: "Angel One",
        reward: "₹750",
        task: "Account Open & Trade",
        color: "bg-orange-500",
        link: "#" // अभिषेक भाई, यहाँ अपना Angel One रेफरल लिंक डालें
    },
    {
        name: "ICICI Direct",
        reward: "₹600",
        task: "Account Opening Bonus",
        color: "bg-blue-800",
        link: "#" // अभिषेक भाई, यहाँ अपना ICICI रेफरल लिंक डालें
    },
    {
        name: "HDFC Sky",
        reward: "₹500",
        task: "New User Registration",
        color: "bg-purple-600",
        link: "#" // अभिषेक भाई, यहाँ अपना HDFC Sky रेफरल लिंक डालें
    }
];

export default function EarnHubPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background text-foreground pb-32 select-none">
            <header className="p-5 bg-background/80 sticky top-0 z-50 flex items-center gap-4 border-b border-white/5 backdrop-blur-xl">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-xl font-black uppercase italic tracking-tighter">Earning Hub</h1>
                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest">High Payout Partners</p>
                </div>
            </header>

            <main className="p-6 space-y-6 max-w-lg mx-auto animate-in fade-in duration-500">
                {/* Hero Banner */}
                <div className="bg-money-pattern border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl text-white">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Gift size={120} /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-2">Daily Earning Target</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black opacity-80">₹</span>
                        <h2 className="text-6xl font-black tracking-tighter" style={{ fontStyle: 'normal' }}>5000+</h2>
                    </div>
                    <div className="mt-6 inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
                        <Sparkles size={14} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Direct Cash Rewards Active</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 italic px-2">Top Referral Payouts</h3>
                    
                    {EARNING_APPS.map((app, index) => (
                        <div key={index} className="bg-secondary/40 border border-white/10 p-5 rounded-[2rem] flex items-center justify-between group hover:bg-secondary/60 transition-all active:scale-95">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", app.color)}>
                                    <TrendingUp size={28} />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-black uppercase italic text-sm">{app.name}</h4>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">{app.task}</p>
                                    <div className="flex items-center gap-1.5 text-primary">
                                        <Coins size={12} />
                                        <span className="text-xs font-black">Earn {app.reward}</span>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => window.open(app.link, '_blank')} className="rounded-xl h-10 bg-white/5 border border-white/10 hover:bg-primary hover:text-white transition-all">
                                <ExternalLink size={16} />
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Strategy Card */}
                <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2.5rem] space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl text-primary"><Target size={20} /></div>
                        <h4 className="font-black uppercase italic text-sm">Abhishek Bhai's Strategy</h4>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed uppercase font-bold italic">
                        "इन ऐप्स को अपने दोस्तों को शेयर करो। एक रेफरल का ₹800 तक मिलेगा। दिन में 6 लोगों को जोड़ा तो ₹5,000 पक्के!"
                    </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-3 opacity-30 text-center pb-10">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Official A.snap Earning Node</span>
                    </div>
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
