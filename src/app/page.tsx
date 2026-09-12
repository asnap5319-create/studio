'use client';

import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Loader2, Wallet, PlusCircle, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { PredictionGame } from '@/components/prediction-game';
import { Suspense, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';

function HomeContent() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const initRef = useRef(false);

  // Fetch User Profile
  const userRef = useMemoFirebase(() => 
    (firestore && user) ? doc(firestore, 'users', user.uid) : null, 
    [firestore, user]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile & { virtualBalance?: number, walletVersion?: string }>(userRef);

  useEffect(() => {
    const initializeUser = async () => {
      // अगर पहले ही इस सेशन में कर चुके हैं या डेटा लोड हो रहा है, तो रुकें
      if (!user || !firestore || isProfileLoading || isInitializing || initRef.current) return;

      const uRef = doc(firestore, 'users', user.uid);
      const snap = await getDoc(uRef);
      const data = snap.data();

      // अगर वर्जन 'v28' पहले से है, तो कुछ नहीं करना
      if (data?.walletVersion === 'v28') {
        initRef.current = true;
        return;
      }

      // वरना पहली बार 28 रुपये सेट करें
      setIsInitializing(true);
      try {
        await setDoc(uRef, {
            id: user.uid,
            username: user.displayName || user.email?.split('@')[0] || 'user',
            email: user.email || '',
            virtualBalance: 28, 
            walletVersion: 'v28',
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

  const handleActionClick = (type: string) => {
    toast({
      title: `${type} Section`,
      description: "भाई, यह सिर्फ एक वर्चुअल गेम है। असली डिपॉजिट या विड्रॉल अभी उपलब्ध नहीं है।",
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
    <div className="min-h-screen bg-background pb-20 w-full max-w-none">
      <header className="p-5 bg-background sticky top-0 z-50 flex items-center justify-between border-b border-border/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center font-black text-white shadow-lg shadow-primary/20 text-2xl">A</div>
          <h1 className="text-3xl font-black tracking-tight uppercase">A.Snap Game</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-secondary/50 px-5 py-2.5 rounded-full border border-border">
          <div className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[12px] font-black uppercase tracking-widest text-muted-foreground">Server Live</span>
        </div>
      </header>

      <main className="w-full space-y-8 pt-8">
        {user ? (
          <>
            <div className="w-full px-5">
                <div className="bg-money-pattern p-10 rounded-[3rem] shadow-xl text-white relative overflow-hidden group">
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
                               <h2 className="text-7xl font-black tracking-tighter drop-shadow-lg">
                                  {userProfile?.virtualBalance?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '0.0'}
                               </h2>
                            </div>
                         </div>
                         <div className="bg-white/10 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                            <TrendingUp className="text-white w-8 h-8" />
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <Button 
                            onClick={() => handleActionClick('Deposit')}
                            className="bg-white text-green-700 hover:bg-white/90 rounded-[2rem] h-20 font-black uppercase text-base flex items-center justify-center gap-3 shadow-xl shadow-black/10 active:scale-95 transition-all"
                         >
                            <PlusCircle size={24} /> Deposit
                         </Button>
                         <Button 
                            onClick={() => handleActionClick('Withdraw')}
                            className="bg-green-800/40 text-white hover:bg-green-800/60 border border-white/20 rounded-[2rem] h-20 font-black uppercase text-base flex items-center justify-center gap-3 shadow-xl shadow-black/10 active:scale-95 transition-all backdrop-blur-sm"
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
          <div className="flex flex-col items-center justify-center h-[70vh] text-center gap-10 px-8">
             <div className="w-32 h-32 bg-money-pattern rounded-[3rem] flex items-center justify-center animate-bounce shadow-2xl">
                <span className="text-6xl text-white font-black">A</span>
             </div>
             <div className="space-y-4">
               <h2 className="text-4xl font-black uppercase tracking-tight">Welcome to A.snap</h2>
               <p className="text-muted-foreground text-lg max-w-sm mx-auto font-medium">Login now to start your virtual coin prediction journey and compete with friends.</p>
             </div>
             <a href="/login?auth=true" className="w-full max-w-[280px]">
                <button className="w-full bg-primary h-20 rounded-[2rem] text-white font-black uppercase text-xl shadow-xl active:scale-95 transition-all">Get Started</button>
             </a>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
