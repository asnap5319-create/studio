
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, writeBatch, serverTimestamp, increment, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, ShieldCheck, Loader2, Landmark, CheckCircle2, Wallet, Zap, Lock, Copy, ArrowUpRight, Plus, Sparkles, Send, Download, Coins, QrCode, GlobeLock, Globe, Building2, Wifi, History, Crown } from 'lucide-react';
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
    totalAutoPayRevenue: number;
    isInitializedWithBonus?: boolean;
}

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    
    // Official Identity
    const OFFICIAL_UPI = "ak63315561338@okicici";

    useEffect(() => { setHasMounted(true); }, []);

    const isAdmin = useMemo(() => {
        return user?.uid === MASTER_ADMIN_UID || user?.email === "asnap5319@gmail.com";
    }, [user]);

    const statsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system', 'stats') : null, [firestore]);
    const { data: stats, isLoading: isStatsLoading } = useDoc<SystemStats>(statsRef);

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
                        <h1 className="text-2xl font-black flex items-center gap-2 text-primary uppercase italic tracking-tighter">Owner Panel</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A.snap Revenue Control</p>
                    </div>
                </div>
                <div className="bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20 flex items-center gap-2">
                    <Wifi size={12} className="text-green-500 animate-pulse" />
                    <p className="text-[10px] font-black text-green-500 uppercase">Live Payouts</p>
                </div>
            </header>

            <main className="space-y-6">
                {/* Primary Revenue Card */}
                <div className="bg-money-pattern p-8 rounded-[3rem] text-white shadow-[0_25px_80px_rgba(0,0,0,0.8)] relative overflow-hidden group border border-white/10">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                        <Globe size={180} />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Main Settlement Account</p>
                                <h2 className="text-2xl font-black italic tracking-tighter">{OFFICIAL_UPI}</h2>
                            </div>
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <ShieldCheck className="text-white w-6 h-6" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 flex items-center gap-2">
                                <Crown size={14} className="text-yellow-400 animate-bounce" /> Total Collection
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black">₹</span>
                                <h3 className="text-6xl font-black tracking-tighter">
                                    {stats?.masterBalance?.toLocaleString() || '0'}
                                </h3>
                            </div>
                            <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest mt-2 italic">
                                "अभिषेक भाई, ऑटो-पे और गेम की सारी कमाई इसी वैल्ट में दिखेगी।"
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-white/40">AutoPay Revenue</p>
                                <p className="text-xs font-bold text-green-400 uppercase">₹{stats?.totalAutoPayRevenue?.toLocaleString() || '0'} Collected</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[8px] font-black uppercase text-white/40">Status</p>
                                <p className="text-xs font-black uppercase text-blue-400 flex items-center justify-end gap-1.5"><History size={10} /> Active 24/7</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AutoPay Settings Summary */}
                <div className="bg-secondary/40 p-8 rounded-[3rem] border border-white/5 space-y-6">
                    <div className="flex items-center gap-3">
                         <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Zap size={24} /></div>
                         <div>
                            <h4 className="font-black uppercase italic text-sm">Mandate Control</h4>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Active Subscription Plans</p>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 bg-background/50 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-black uppercase text-white/40 mb-1">Trial Fee</p>
                                <p className="text-lg font-mono font-black text-white">₹1.00</p>
                            </div>
                            <span className="text-[10px] font-black uppercase text-green-500">SET</span>
                        </div>
                        <div className="p-5 bg-background/50 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-black uppercase text-white/40 mb-1">Monthly Auto-Debit</p>
                                <p className="text-lg font-mono font-black text-white">₹599.00</p>
                            </div>
                            <span className="text-[10px] font-black uppercase text-primary">ACTIVE</span>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-500/10 p-6 rounded-[2.5rem] border border-blue-500/20">
                     <p className="text-[11px] text-blue-400 font-bold uppercase leading-relaxed italic text-center">
                        "भाई, कल रात 12:00 बजे जिन यूजर्स का ट्रायल खत्म होगा, उनके ₹599 आपके अकाउंट में सीधे गिरना शुरू हो जाएंगे।"
                     </p>
                </div>
            </main>

            <BottomNav />
        </div>
    );
}
