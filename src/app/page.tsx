'use client';

import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { PredictionGame } from '@/components/prediction-game';
import { Suspense, useEffect } from 'react';
import type { UserProfile } from '@/models/user';

function HomeContent() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();

  // Fetch or Initialize User Profile with Virtual Coins
  const userRef = useMemoFirebase(() => 
    (firestore && user) ? doc(firestore, 'users', user.uid) : null, 
    [firestore, user]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile & { virtualBalance?: number }>(userRef);

  useEffect(() => {
    if (user && firestore && userProfile && userProfile.virtualBalance === undefined) {
      // First time user initialization with 10,000 virtual coins
      setDoc(doc(firestore, 'users', user.uid), {
        virtualBalance: 10000,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(console.error);
    }
  }, [user, firestore, userProfile]);

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="p-4 bg-primary text-white sticky top-0 z-50 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black italic">A</div>
          <h1 className="text-xl font-black italic tracking-tighter">A.Prediction</h1>
        </div>
        <div className="bg-white/10 px-3 py-1 rounded-full border border-white/20">
          <p className="text-[10px] font-bold uppercase opacity-70">Virtual Balance</p>
          <p className="text-sm font-black">₹{userProfile?.virtualBalance?.toLocaleString() || '10,000'}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {user ? (
          <PredictionGame userProfile={userProfile} />
        ) : (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center gap-6">
             <div className="w-24 h-24 bg-money-pattern rounded-3xl flex items-center justify-center animate-bounce">
                <span className="text-4xl text-white font-black italic">A</span>
             </div>
             <div className="space-y-2">
               <h2 className="text-2xl font-black uppercase italic">Welcome to A.snap</h2>
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