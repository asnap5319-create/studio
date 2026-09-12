'use client';

import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Loader2, Wallet, PlusCircle, ArrowUpRight, TrendingUp, Sparkles, Zap } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { PredictionGame } from '@/components/prediction-game';
import { Suspense, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import Link from 'next/link';

function HomeContent() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const initRef = useRef(false);

  const userRef = useMemoFirebase(() => 
    (firestore && user) ? doc(firestore, 'users', user.uid) : null, 
    [firestore, user]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile & { virtualBalance?: number }>(userRef);

  useEffect(() => {
    const initializeUser = async () => {
      if (!user || !firestore || isProfileLoading || isInitializing || initRef.current) return;

      const uRef = doc(firestore, 'users', user.uid);
      try {
          const snap = await getDoc(uRef);
          
          if (snap.exists()) {
            const data = snap.data();
            if (data && (typeof data.virtualBalance === 'number' || data.walletVersion === 'v28_final')) {
              initRef.current = true;
              return;
            }
          }

          setIsInitializing(true);
          await setDoc(uRef, {
              id: user.uid,
              username: user.displayName || user.email?.split('@')[0] || `user_${user.uid.slice(0, 4)}`,
              email: user.email || '',
              virtualBalance: 28, 
              walletVersion: 'v28_final',
              updatedAt: serverTimestamp()
          }, { merge: true });
          
          initRef.current = true;
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeUser();
  }, [user, firestore, isProfileLoading, isInitializing]);

  const handleWithdrawClick = () => {
    toast({
      title: "Withdrawal System",
      description: "भाई, यह अभी उपलब्ध नहीं है। गेम खेलो और बैलेंस बनाओ!",
    });
  };

  if (isUserLoading || isProfileLoading || isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 w-full max-w-none text-foreground">
      <header className="p-5 bg-background/80 sticky top-0 z-50 flex items-center justify-between border-b border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center font-black text-white shadow-[0_10px_20px_rgba(255,51,102,0.3)] text-2xl">A</div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-white drop-shadow-md">WinGo</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 px-5 py-2.5 rounded-full border border-white/10">
          <div className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
          <span className="text-[12px] font-black uppercase tracking-widest text-white/60">Server Live</span>
        </div>
      </header>

      <main className="w-full space-y-8 pt-8">
        {user ? (
          <>
            <div className="w-full px-5">
                <div className="bg-money-pattern p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden group border border-white/10">
                   <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                      <Wallet size={160} />
                   </div>
                   
                   <div className="relative z-10 space-y-10">
                      <div className="flex items-center justify-between">
                         <div className="space-y-2">
                            <p className="text-[12px] font-black uppercase tracking-[0.4em] text-white/70 flex items-center gap-2">
                              <Sparkles size={14} className="text-yellow-400" /> Virtual Balance
                            </p>
                            <div className="flex items-baseline gap-2">
                               <span className="text-4xl font-black text-white/80">₹</span>
                               <h2 className="text-7xl font-black tracking-tighter drop-shadow-2xl" style={{ fontStyle: 'normal' }}>
                                  {userProfile?.virtualBalance?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '0.0'}
                               </h2>
                            </div>
                         </div>
                         <div className="bg-white/10 p-5 rounded-3xl border border-white/10 backdrop-blur-md shadow-inner">
                            <TrendingUp className="text-white w-8 h-8" />
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <Link href="/deposit" className="flex-1">
                            <Button 
                                className="w-full bg-white text-green-700 hover:bg-white/90 rounded-[2rem] h-20 font-black uppercase text-base flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
                            >
                                <PlusCircle size={24} /> Deposit
                            </Button>
                         </Link>
                         <Button 
                            onClick={handleWithdrawClick}
                            className="bg-green-800/40 text-white hover:bg-green-800/60 border border-white/20 rounded-[2rem] h-20 font-black uppercase text-base flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all backdrop-blur-sm"
                         >
                            <ArrowUpRight size={24} /> Withdraw
                         </Button>
                      </div>
                   </div>
                </div>
            </div>

            <div className="w-full">
              <PredictionGame userProfile={userProfile} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center gap-8 px-8">
             <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
                <div className="w-36 h-32 bg-money-pattern rounded-[3rem] flex items-center justify-center relative z-10 shadow-2xl border-4 border-white/10">
                    <span className="text-7xl text-white font-black">A</span>
                </div>
             </div>
             
             <div className="space-y-4">
               <div className="flex items-center justify-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[10px]">
                  <Zap size={14} className="fill-primary" /> Instant Service
               </div>
               <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none italic text-white drop-shadow-2xl">
                 FAST WITHDRAWAL
               </h2>
               <div className="pt-4">
                  <h3 className="text-7xl md:text-8xl font-black italic uppercase tracking-tighter animate-shimmer-text drop-shadow-[0_0_30px_rgba(255,51,102,0.5)]">
                    WinGo
                  </h3>
               </div>
             </div>

             <a href="/login?auth=true" className="w-full max-w-[300px] mt-6">
                <button className="w-full bg-primary h-20 rounded-[2.5rem] text-white font-black uppercase text-xl shadow-[0_20px_50px_rgba(255,51,102,0.4)] active:scale-95 transition-all hover:bg-primary/90 flex items-center justify-center gap-3">
                   GET STARTED <ArrowUpRight size={24} />
                </button>
             </a>

             <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest opacity-60">
                Premium Virtual Gaming Protocol
             </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
