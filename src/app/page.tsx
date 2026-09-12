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
import { useRouter } from 'next/navigation';

function HomeContent() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
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
            if (data && typeof data.virtualBalance === 'number') {
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

  if (isUserLoading || isProfileLoading || isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 w-full max-w-none text-foreground">
      <header className="p-4 bg-background/80 sticky top-0 z-50 flex items-center justify-between border-b border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black text-white shadow-[0_5px_15px_rgba(255,51,102,0.3)] text-xl">A</div>
          <h1 className="text-2xl font-black tracking-tight uppercase italic text-white drop-shadow-md">WinGo</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Server Live</span>
        </div>
      </header>

      <main className="w-full space-y-6 pt-4">
        {user ? (
          <>
            <div className="w-full px-4">
                <div className="bg-money-pattern p-6 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group border border-white/10">
                   <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                      <Wallet size={120} />
                   </div>
                   
                   <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/70 flex items-center gap-1.5">
                              <Sparkles size={12} className="text-yellow-400" /> Virtual Balance
                            </p>
                            <div className="flex items-baseline gap-1.5">
                               <span className="text-2xl font-black text-white/80">₹</span>
                               <h2 className="text-5xl font-black tracking-tighter drop-shadow-2xl" style={{ fontStyle: 'normal' }}>
                                  {userProfile?.virtualBalance?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '0.0'}
                               </h2>
                            </div>
                         </div>
                         <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
                            <TrendingUp className="text-white w-6 h-6" />
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <Link href="/deposit" className="flex-1">
                            <Button 
                                className="w-full bg-white text-green-700 hover:bg-white/90 rounded-2xl h-14 font-black uppercase text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                            >
                                <PlusCircle size={20} /> Deposit
                            </Button>
                         </Link>
                         <Link href="/withdraw" className="flex-1">
                            <Button 
                                className="w-full bg-green-800/40 text-white hover:bg-green-800/60 border border-white/20 rounded-2xl h-14 font-black uppercase text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all backdrop-blur-sm"
                            >
                                <ArrowUpRight size={20} /> Withdraw
                            </Button>
                         </Link>
                      </div>
                   </div>
                </div>
            </div>

            <div className="w-full">
              <PredictionGame userProfile={userProfile} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center gap-6 px-8">
             <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
                <div className="w-32 h-28 bg-money-pattern rounded-[2.5rem] flex items-center justify-center relative z-10 shadow-2xl border-4 border-white/10">
                    <span className="text-6xl text-white font-black">A</span>
                </div>
             </div>
             
             <div className="space-y-3">
               <div className="flex items-center justify-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[9px]">
                  <Zap size={12} className="fill-primary" /> Instant Service
               </div>
               <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none italic text-white drop-shadow-2xl">
                 FAST WITHDRAWAL
               </h2>
               <div className="pt-2">
                  <h3 className="text-6xl md:text-7xl font-black italic uppercase tracking-tighter animate-shimmer-text drop-shadow-[0_0_30px_rgba(255,51,102,0.5)]">
                    WinGo
                  </h3>
               </div>
             </div>

             <a href="/login?auth=true" className="w-full max-w-[280px] mt-4">
                <button className="w-full bg-primary h-16 rounded-2xl text-white font-black uppercase text-lg shadow-[0_15px_40px_rgba(255,51,102,0.4)] active:scale-95 transition-all hover:bg-primary/90 flex items-center justify-center gap-3">
                   GET STARTED <ArrowUpRight size={20} />
                </button>
             </a>

             <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest opacity-60">
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
