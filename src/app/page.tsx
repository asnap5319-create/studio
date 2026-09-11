
'use client';

import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Loader2, Wallet, PlusCircle, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { PredictionGame } from '@/components/prediction-game';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';

function HomeContent() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);

  // Fetch or Initialize User Profile with Virtual Coins
  const userRef = useMemoFirebase(() => 
    (firestore && user) ? doc(firestore, 'users', user.uid) : null, 
    [firestore, user]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile & { virtualBalance?: number }>(userRef);

  useEffect(() => {
    const initializeUser = async () => {
      if (user && firestore && !isProfileLoading && !isInitializing) {
        // If userProfile is missing OR virtualBalance is completely undefined
        // We do a final check from database to ensure 0 is not overwritten with 100
        if (!userProfile || userProfile.virtualBalance === undefined) {
          setIsInitializing(true);
          try {
            const uRef = doc(firestore, 'users', user.uid);
            const snap = await getDoc(uRef);
            
            // Critical check: if it exists AND balance is a number (even 0), do NOT reset
            if (snap.exists() && typeof snap.data()?.virtualBalance === 'number') {
                console.log("User already initialized with balance:", snap.data()?.virtualBalance);
            } else {
                // Only if balance is truly missing, give 100 coins
                await setDoc(uRef, {
                    id: user.uid,
                    username: user.displayName || user.email?.split('@')[0] || 'user',
                    email: user.email || '',
                    virtualBalance: 100, // FREE STARTING COINS - ONLY ONCE
                    updatedAt: serverTimestamp()
                }, { merge: true });
                console.log("User initialized with 100 coins");
            }
          } catch (err) {
            console.error("Initialization error:", err);
          } finally {
            setIsInitializing(false);
          }
        }
      }
    };

    initializeUser();
  }, [user, firestore, userProfile, isProfileLoading]);

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
    <div className="min-h-screen bg-background pb-20">
      <header className="p-4 bg-background sticky top-0 z-50 flex items-center justify-between border-b border-border/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black italic text-white shadow-lg shadow-primary/20">A</div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase">A.Snap Game</h1>
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 px-3 py-1.5 rounded-full border border-border">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Server Live</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {user ? (
          <>
            {/* Premium Wallet Dashboard */}
            <div className="bg-money-pattern p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(22,163,74,0.3)] text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                  <Wallet size={120} />
               </div>
               
               <div className="relative z-10 space-y-8">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 flex items-center gap-2">
                          <Sparkles size={10} className="text-yellow-400" /> Virtual Balance
                        </p>
                        <div className="flex items-baseline gap-2">
                           <span className="text-2xl font-black text-white/80">₹</span>
                           <h2 className="text-5xl font-black italic tracking-tighter drop-shadow-lg">
                              {userProfile?.virtualBalance?.toLocaleString() || '0'}
                           </h2>
                        </div>
                     </div>
                     <div className="bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
                        <TrendingUp className="text-white" />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <Button 
                        onClick={() => handleActionClick('Deposit')}
                        className="bg-white text-green-700 hover:bg-white/90 rounded-2xl h-14 font-black uppercase text-xs flex items-center justify-center gap-2 shadow-xl shadow-black/10 active:scale-95 transition-all"
                     >
                        <PlusCircle size={18} /> Deposit
                     </Button>
                     <Button 
                        onClick={() => handleActionClick('Withdraw')}
                        className="bg-green-800/40 text-white hover:bg-green-800/60 border border-white/20 rounded-2xl h-14 font-black uppercase text-xs flex items-center justify-center gap-2 shadow-xl shadow-black/10 active:scale-95 transition-all backdrop-blur-sm"
                     >
                        <ArrowUpRight size={18} /> Withdraw
                     </Button>
                  </div>
               </div>
            </div>

            <PredictionGame userProfile={userProfile} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center gap-6">
             <div className="w-24 h-24 bg-money-pattern rounded-3xl flex items-center justify-center animate-bounce shadow-2xl">
                <span className="text-4xl text-white font-black italic">A</span>
             </div>
             <div className="space-y-2">
               <h2 className="text-2xl font-black uppercase italic tracking-tighter">Welcome to A.snap</h2>
               <p className="text-muted-foreground text-sm max-w-xs mx-auto">Login now to start your virtual coin prediction journey and compete with friends.</p>
             </div>
             <a href="/login?auth=true" className="w-full max-w-[200px]">
                <button className="w-full bg-primary h-14 rounded-2xl text-white font-black uppercase shadow-xl active:scale-95 transition-all">Get Started</button>
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
