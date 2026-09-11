'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { Timer, History, Trophy, Coins, CheckCircle2, AlertCircle, TrendingUp, User, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface GameResult {
  id: string;
  period: string;
  number: number;
  color: 'red' | 'green' | 'violet' | 'red-violet' | 'green-violet';
  size: 'big' | 'small';
  createdAt: any;
}

interface Bet {
  id: string;
  userId: string;
  period: string;
  selection: string | number;
  amount: number;
  status: 'pending' | 'win' | 'loss';
  winAmount?: number;
  createdAt: any;
}

export function PredictionGame({ userProfile }: { userProfile: any }) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [timeLeft, setTimeLeft] = useState(30);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [betAmount, setBetAmount] = useState('10');
  const [isBetting, setIsBetting] = useState(false);

  // --- Round Logic (Synced based on time) ---
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const seconds = now.getSeconds();
      const remaining = 30 - (seconds % 30);
      setTimeLeft(remaining);

      // Generate Period: YYYYMMDDHHmm + RoundIndex
      const datePart = format(now, 'yyyyMMdd');
      const minutePart = now.getHours() * 60 + now.getMinutes();
      const roundPart = Math.floor(seconds / 30);
      const periodId = `${datePart}${(minutePart * 2 + roundPart).toString().padStart(4, '0')}`;
      setCurrentPeriod(periodId);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Auto Generate Results (Simulated Server) ---
  useEffect(() => {
    if (timeLeft === 1 && firestore) {
      const timeout = setTimeout(async () => {
          const num = Math.floor(Math.random() * 10);
          let color: 'red' | 'green' | 'violet' | 'red-violet' | 'green-violet' = 'red';
          
          if (num === 0) color = 'red-violet';
          else if (num === 5) color = 'green-violet';
          else if ([1, 3, 7, 9].includes(num)) color = 'green';
          else color = 'red';

          const size = num >= 5 ? 'big' : 'small';

          try {
            await addDoc(collection(firestore, 'game_results'), {
                period: currentPeriod,
                number: num,
                color,
                size,
                createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Result generation failed:", e);
          }
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [timeLeft, currentPeriod, firestore]);

  // --- Fetch Data ---
  const resultsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'game_results'), orderBy('createdAt', 'desc'), limit(15)) : null, 
    [firestore]
  );
  const { data: results } = useCollection<GameResult>(resultsQuery);

  const myBetsQuery = useMemoFirebase(() => 
    (firestore && user) ? query(collection(firestore, 'users', user.uid, 'game_bets'), orderBy('createdAt', 'desc'), limit(10)) : null, 
    [firestore, user]
  );
  const { data: myBets } = useCollection<Bet>(myBetsQuery);

  // --- Betting Logic ---
  const handlePlaceBet = async (selection: string | number) => {
    if (!user || !firestore || isBetting) return;
    const amount = parseInt(betAmount);

    if (isNaN(amount) || amount < 2) {
      toast({ variant: 'destructive', title: "Invalid Amount", description: "Minimum bet is ₹2 coins." });
      return;
    }

    if (amount > (userProfile?.virtualBalance || 0)) {
      toast({ variant: 'destructive', title: "Low Balance", description: "You don't have enough virtual coins." });
      return;
    }

    if (timeLeft < 5) {
      toast({ variant: 'destructive', title: "Round Locked", description: "Round close ho gaya hai bhai, next round ka wait karo." });
      return;
    }

    setIsBetting(true);
    try {
      await updateDoc(doc(firestore, 'users', user.uid), {
        virtualBalance: increment(-amount)
      });

      await addDoc(collection(firestore, 'users', user.uid, 'game_bets'), {
        userId: user.uid,
        period: currentPeriod,
        selection,
        amount,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      toast({ title: "Bet Success! 🚀", description: `Aapne ₹${amount} coins ${selection} par laga diye hain.` });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Bet Failed", description: "Something went wrong." });
    } finally {
      setIsBetting(false);
    }
  };

  const getColorName = (color: string) => {
    if (color === 'red-violet') return 'Red + Violet';
    if (color === 'green-violet') return 'Green + Violet';
    return color.charAt(0).toUpperCase() + color.slice(1);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Timer & Period Display */}
      <div className="bg-secondary/40 border border-border p-6 rounded-[2.5rem] flex items-center justify-between relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-1.5">
            <History size={12} className="text-primary" /> Current Period
          </p>
          <h3 className="text-2xl font-black italic tracking-tighter text-foreground">{currentPeriod || 'Loading...'}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Time Remaining</p>
          <div className="flex items-center gap-2 justify-end">
            <Timer className={cn("h-6 w-6", timeLeft <= 5 ? "text-destructive animate-pulse" : "text-primary")} />
            <h2 className={cn("text-3xl font-black tabular-nums", timeLeft <= 5 ? "text-destructive" : "text-foreground")}>
              00:{timeLeft.toString().padStart(2, '0')}
            </h2>
          </div>
        </div>
      </div>

      {/* Betting Controls */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Button onClick={() => handlePlaceBet('green')} className="bg-prediction-green hover:bg-green-600 h-16 rounded-2xl font-black uppercase shadow-lg shadow-green-500/20 text-white border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all">Green</Button>
          <Button onClick={() => handlePlaceBet('violet')} className="bg-prediction-violet hover:bg-violet-600 h-16 rounded-2xl font-black uppercase shadow-lg shadow-violet-500/20 text-white border-b-4 border-violet-700 active:border-b-0 active:translate-y-1 transition-all">Violet</Button>
          <Button onClick={() => handlePlaceBet('red')} className="bg-prediction-red hover:bg-red-600 h-16 rounded-2xl font-black uppercase shadow-lg shadow-red-500/20 text-white border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition-all">Red</Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={() => handlePlaceBet('big')} className="bg-prediction-big hover:bg-amber-500 h-14 rounded-2xl font-black uppercase text-black shadow-lg border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all">Big</Button>
          <Button onClick={() => handlePlaceBet('small')} className="bg-prediction-small hover:bg-blue-500 h-14 rounded-2xl font-black uppercase shadow-lg text-white border-b-4 border-blue-600 active:border-b-0 active:translate-y-1 transition-all">Small</Button>
        </div>

        {/* Number Grid */}
        <div className="bg-secondary/20 p-4 rounded-[2rem] border border-border">
          <p className="text-[10px] font-black uppercase text-muted-foreground text-center mb-4 tracking-widest">Select Lucky Number (9X Win)</p>
          <div className="grid grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePlaceBet(num)}
                className={cn(
                  "h-12 rounded-xl font-black text-lg border transition-all active:scale-90 shadow-sm",
                  num === 0 || num === 5 ? "bg-prediction-violet text-white border-violet-400" :
                  [1,3,7,9].includes(num) ? "bg-prediction-green/10 text-green-600 border-green-200" :
                  "bg-prediction-red/10 text-red-600 border-red-200"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="flex items-center gap-3 bg-secondary/30 p-5 rounded-[2rem] border border-border shadow-inner">
          <div className="p-2 bg-primary/10 rounded-xl text-primary"><Coins size={24} /></div>
          <div className="flex-1">
             <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Betting Amount</p>
             <Input 
                type="number" 
                value={betAmount} 
                onChange={(e) => setBetAmount(e.target.value)}
                className="bg-transparent border-none font-black text-2xl focus-visible:ring-0 h-8 p-0 text-foreground"
                placeholder="0"
              />
          </div>
          <div className="flex gap-2">
            {['10', '100', '500', '1000'].map(val => (
              <button 
                key={val} 
                onClick={() => setBetAmount(val)} 
                className={cn(
                  "text-[10px] font-black uppercase px-3 py-2 rounded-xl border transition-all",
                  betAmount === val ? "bg-primary text-white border-primary shadow-lg" : "bg-background text-foreground border-border"
                )}
              >
                ₹{val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History Tabs */}
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-2xl mb-4 h-14">
          <TabsTrigger value="results" className="rounded-xl font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-md">Game History</TabsTrigger>
          <TabsTrigger value="my" className="rounded-xl font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-md">My History</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
           <div className="bg-background rounded-[2.5rem] border border-border overflow-hidden shadow-sm">
              <table className="w-full">
                 <thead className="bg-secondary/40 border-b border-border">
                    <tr className="text-[10px] font-black uppercase text-muted-foreground">
                       <th className="p-4 text-left tracking-widest">Period</th>
                       <th className="p-4 text-center tracking-widest">Lucky N.</th>
                       <th className="p-4 text-center tracking-widest">Size</th>
                       <th className="p-4 text-right tracking-widest pr-6">Color Win</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                    {results?.map(res => (
                      <tr key={res.id} className="text-sm hover:bg-secondary/10 transition-colors">
                        <td className="p-4 font-bold text-muted-foreground">{res.period.slice(-4)}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            <span className={cn(
                              "inline-flex w-8 h-8 items-center justify-center rounded-full font-black text-white shadow-md border-2 border-white/20",
                              [1,3,7,9].includes(res.number) ? "bg-prediction-green" : 
                              res.number === 0 || res.number === 5 ? "bg-prediction-violet" : "bg-prediction-red"
                            )}>
                              {res.number}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                           <span className={cn(
                             "text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm", 
                             res.size === 'big' ? "bg-prediction-big/20 text-amber-700 border border-amber-200" : "bg-prediction-small/20 text-blue-700 border border-blue-200"
                           )}>
                              {res.size}
                           </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                           <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">{getColorName(res.color)}</span>
                              <div className="flex gap-0.5">
                                {res.color.includes('green') && <div className="w-3 h-3 rounded-full bg-prediction-green shadow-sm" />}
                                {res.color.includes('red') && <div className="w-3 h-3 rounded-full bg-prediction-red shadow-sm" />}
                                {res.color.includes('violet') && <div className="w-3 h-3 rounded-full bg-prediction-violet shadow-sm" />}
                              </div>
                           </div>
                        </td>
                      </tr>
                    ))}
                    {(!results || results.length === 0) && (
                      <tr><td colSpan={4} className="p-10 text-center text-muted-foreground italic text-xs uppercase tracking-widest">Waiting for first result...</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </TabsContent>

        <TabsContent value="my">
           <div className="space-y-4">
              {myBets?.map(bet => (
                <div key={bet.id} className="bg-secondary/20 p-5 rounded-[2rem] border border-border flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl shadow-sm", 
                        bet.status === 'win' ? "bg-green-500/10 text-green-600 border border-green-200" : 
                        bet.status === 'loss' ? "bg-red-500/10 text-red-600 border border-red-200" : 
                        "bg-primary/10 text-primary border border-primary/20"
                      )}>
                         {bet.status === 'win' ? <Trophy size={20} /> : <Coins size={20} />}
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Round: {bet.period.slice(-4)}</p>
                         <p className="font-bold text-sm">Bet on: <span className="uppercase text-primary">{bet.selection}</span></p>
                         <p className="text-[10px] font-bold text-muted-foreground">Amount: ₹{bet.amount}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className={cn("font-black text-xl italic", bet.status === 'win' ? "text-green-500 drop-shadow-sm" : bet.status === 'loss' ? "text-red-500/60" : "text-primary animate-pulse")}>
                         {bet.status === 'win' ? `+₹${bet.winAmount}` : bet.status === 'loss' ? `-₹${bet.amount}` : 'Pending...'}
                      </p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase mt-1">
                        {bet.createdAt ? format(bet.createdAt.toDate(), 'HH:mm:ss') : 'Just now'}
                      </p>
                   </div>
                </div>
              ))}
              {(!myBets || myBets.length === 0) && (
                <div className="flex flex-col items-center justify-center py-16 opacity-30 gap-3">
                  <Info size={40} />
                  <p className="font-black uppercase text-xs tracking-widest">No bets placed yet</p>
                </div>
              )}
           </div>
        </TabsContent>
      </Tabs>

      {/* Virtual Coins Notice */}
      <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-start gap-4 shadow-sm">
         <AlertCircle className="text-primary shrink-0 mt-0.5" size={20} />
         <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-primary mb-1">Game Information</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
               भाई, यह गेम सिर्फ मनोरंजन के लिए है। ये ₹ सिक्के पूरी तरह वर्चुअल (नकली) हैं। असली पैसा न तो जमा किया जा सकता है और न ही निकाला जा सकता है। बस खेलें और मज़े करें! ✅
            </p>
         </div>
      </div>
    </div>
  );
}
