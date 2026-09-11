'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { Timer, History, Trophy, Coins, CheckCircle2, AlertCircle, TrendingUp, User } from 'lucide-react';
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
      // Simulate round end result generation
      const timeout = setTimeout(async () => {
          const num = Math.floor(Math.random() * 10);
          let color: 'red' | 'green' | 'violet' | 'red-violet' | 'green-violet' = 'red';
          if (num === 0) color = 'red-violet';
          else if (num === 5) color = 'green-violet';
          else if ([1, 3, 7, 9].includes(num)) color = 'green';
          else color = 'red';

          const size = num >= 5 ? 'big' : 'small';

          await addDoc(collection(firestore, 'game_results'), {
              period: currentPeriod,
              number: num,
              color,
              size,
              createdAt: serverTimestamp()
          });
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
      toast({ variant: 'destructive', title: "Round Locked", description: "Too late! Wait for the next round." });
      return;
    }

    setIsBetting(true);
    try {
      // 1. Deduct Balance
      await updateDoc(doc(firestore, 'users', user.uid), {
        virtualBalance: increment(-amount)
      });

      // 2. Log Bet
      await addDoc(collection(firestore, 'users', user.uid, 'game_bets'), {
        userId: user.uid,
        period: currentPeriod,
        selection,
        amount,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      toast({ title: "Bet Placed! 🚀", description: `You bet ₹${amount} on ${selection}` });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Failed" });
    } finally {
      setIsBetting(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Timer & Period Display */}
      <div className="bg-secondary/40 border border-border p-6 rounded-[2.5rem] flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-1">
            <History size={10} /> Current Period
          </p>
          <h3 className="text-2xl font-black italic tracking-tighter text-foreground">{currentPeriod || 'Loading...'}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Time Left</p>
          <div className="flex items-center gap-2 justify-end">
            <Timer className={cn("h-5 w-5", timeLeft <= 5 ? "text-destructive animate-pulse" : "text-primary")} />
            <h2 className={cn("text-3xl font-black tabular-nums", timeLeft <= 5 ? "text-destructive" : "text-foreground")}>
              00:{timeLeft.toString().padStart(2, '0')}
            </h2>
          </div>
        </div>
      </div>

      {/* Betting Section */}
      <div className="space-y-4">
        {/* Colors & Big/Small */}
        <div className="grid grid-cols-3 gap-3">
          <Button onClick={() => handlePlaceBet('green')} className="bg-prediction-green hover:bg-green-500 h-16 rounded-2xl font-black uppercase shadow-lg shadow-green-500/20">Green</Button>
          <Button onClick={() => handlePlaceBet('violet')} className="bg-prediction-violet hover:bg-violet-500 h-16 rounded-2xl font-black uppercase shadow-lg shadow-violet-500/20">Violet</Button>
          <Button onClick={() => handlePlaceBet('red')} className="bg-prediction-red hover:bg-red-500 h-16 rounded-2xl font-black uppercase shadow-lg shadow-red-500/20">Red</Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => handlePlaceBet('big')} className="bg-prediction-big hover:bg-amber-500 h-14 rounded-2xl font-black uppercase text-black shadow-lg">Big</Button>
          <Button onClick={() => handlePlaceBet('small')} className="bg-prediction-small hover:bg-blue-500 h-14 rounded-2xl font-black uppercase shadow-lg">Small</Button>
        </div>

        {/* Number Grid */}
        <div className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePlaceBet(num)}
              className={cn(
                "h-12 rounded-xl font-black text-lg border transition-all active:scale-90",
                num === 0 || num === 5 ? "bg-prediction-violet text-white" :
                [1,3,7,9].includes(num) ? "bg-prediction-green/10 text-green-600 border-green-200" :
                "bg-prediction-red/10 text-red-600 border-red-200"
              )}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Amount Input */}
        <div className="flex items-center gap-3 bg-secondary/20 p-4 rounded-2xl border border-border">
          <Coins className="text-primary" />
          <Input 
            type="number" 
            value={betAmount} 
            onChange={(e) => setBetAmount(e.target.value)}
            className="bg-transparent border-none font-black text-lg focus-visible:ring-0 h-8 p-0"
            placeholder="Bet amount..."
          />
          <div className="flex gap-2">
            {['10', '100', '500'].map(val => (
              <button key={val} onClick={() => setBetAmount(val)} className="text-[10px] font-black uppercase px-2 py-1 bg-background rounded-lg border border-border">₹{val}</button>
            ))}
          </div>
        </div>
      </div>

      {/* History Tabs */}
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-2xl mb-4 h-12">
          <TabsTrigger value="results" className="rounded-xl font-bold text-[11px] uppercase tracking-widest">Game History</TabsTrigger>
          <TabsTrigger value="my" className="rounded-xl font-bold text-[11px] uppercase tracking-widest">My History</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
           <div className="bg-background rounded-3xl border border-border overflow-hidden">
              <table className="w-full">
                 <thead className="bg-secondary/30">
                    <tr className="text-[10px] font-black uppercase text-muted-foreground">
                       <th className="p-4 text-left">Period</th>
                       <th className="p-4 text-center">Number</th>
                       <th className="p-4 text-center">Big/Small</th>
                       <th className="p-4 text-center">Color</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                    {results?.map(res => (
                      <tr key={res.id} className="text-sm">
                        <td className="p-4 font-bold text-muted-foreground">{res.period.slice(-4)}</td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "inline-flex w-7 h-7 items-center justify-center rounded-full font-black text-white",
                            [1,3,7,9].includes(res.number) ? "bg-prediction-green" : 
                            res.number === 0 || res.number === 5 ? "bg-prediction-violet" : "bg-prediction-red"
                          )}>
                            {res.number}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                           <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-md", res.size === 'big' ? "bg-prediction-big/20 text-amber-600" : "bg-prediction-small/20 text-blue-600")}>
                              {res.size}
                           </span>
                        </td>
                        <td className="p-4 text-center">
                           <div className="flex justify-center gap-1">
                              {res.color.includes('green') && <div className="w-3 h-3 rounded-full bg-prediction-green" />}
                              {res.color.includes('red') && <div className="w-3 h-3 rounded-full bg-prediction-red" />}
                              {res.color.includes('violet') && <div className="w-3 h-3 rounded-full bg-prediction-violet" />}
                           </div>
                        </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </TabsContent>

        <TabsContent value="my">
           <div className="space-y-3">
              {myBets?.map(bet => (
                <div key={bet.id} className="bg-secondary/20 p-4 rounded-2xl border border-border flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl", bet.status === 'win' ? "bg-green-500/10 text-green-600" : bet.status === 'loss' ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary")}>
                         {bet.status === 'win' ? <Trophy size={18} /> : <Coins size={18} />}
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Round: {bet.period.slice(-4)}</p>
                         <p className="font-bold text-sm">Bet: <span className="uppercase">{bet.selection}</span> (₹{bet.amount})</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className={cn("font-black text-lg italic", bet.status === 'win' ? "text-green-500" : bet.status === 'loss' ? "text-red-500" : "text-primary")}>
                         {bet.status === 'win' ? `+₹${bet.winAmount}` : bet.status === 'loss' ? `-₹${bet.amount}` : 'Pending'}
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{bet.createdAt ? format(bet.createdAt.toDate(), 'HH:mm') : ''}</p>
                   </div>
                </div>
              ))}
              {(!myBets || myBets.length === 0) && (
                <div className="text-center py-10 opacity-30 italic text-sm">No bets placed yet.</div>
              )}
           </div>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="p-4 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-start gap-3">
         <AlertCircle className="text-primary shrink-0" size={18} />
         <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-primary mb-1">Virtual Game Rule</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
               यह गेम केवल मनोरंजन के लिए है। यहाँ इस्तेमाल होने वाले कॉइन्स की कोई असली कीमत नहीं है। कोई डिपॉजिट या विड्रॉल उपलब्ध नहीं है।
            </p>
         </div>
      </div>
    </div>
  );
}