'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp, getDocs, where, writeBatch } from 'firebase/firestore';
import { Timer, History, Trophy, Coins, CheckCircle2, AlertCircle, TrendingUp, Info, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [isBetPanelOpen, setIsBetPanelOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | number | null>(null);
  const [betAmount, setBetAmount] = useState('10');
  const [isBetting, setIsBetting] = useState(false);

  // --- Round Logic (Synced based on time) ---
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const seconds = now.getSeconds();
      const remaining = 30 - (seconds % 30);
      setTimeLeft(remaining);

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

  // --- Auto Generate Results (Prototype Server) ---
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
    (firestore && user) ? query(collection(firestore, 'users', user.uid, 'game_bets'), orderBy('createdAt', 'desc'), limit(15)) : null, 
    [firestore, user]
  );
  const { data: myBets } = useCollection<Bet>(myBetsQuery);

  // --- Process Results for User (Simulating backend) ---
  useEffect(() => {
    if (!firestore || !user || !results || results.length === 0 || !myBets) return;

    const latestResult = results[0];
    const pendingBets = myBets.filter(b => b.status === 'pending' && b.period === latestResult.period);

    if (pendingBets.length > 0) {
        const batch = writeBatch(firestore);
        let totalWin = 0;

        pendingBets.forEach(bet => {
            let isWin = false;
            let multiplier = 2; // Colors & Size

            if (typeof bet.selection === 'number') {
                isWin = bet.selection === latestResult.number;
                multiplier = 9;
            } else if (bet.selection === 'big' || bet.selection === 'small') {
                isWin = bet.selection === latestResult.size;
            } else {
                isWin = latestResult.color.includes(bet.selection as string);
            }

            const betRef = doc(firestore, 'users', user.uid, 'game_bets', bet.id);
            if (isWin) {
                const winAmt = bet.amount * multiplier;
                totalWin += winAmt;
                batch.update(betRef, { status: 'win', winAmount: winAmt });
            } else {
                batch.update(betRef, { status: 'loss' });
            }
        });

        if (totalWin > 0) {
            batch.update(doc(firestore, 'users', user.uid), {
                virtualBalance: increment(totalWin)
            });
            toast({ title: "You Won! 🎉", description: `Round ${latestResult.period.slice(-4)} result: Number ${latestResult.number}. Aapne ₹${totalWin} coins jeete!` });
        }
        batch.commit().catch(console.error);
    }
  }, [results, myBets, firestore, user, toast]);

  const handleOpenBetPanel = (option: string | number) => {
    if (timeLeft < 5) {
        toast({ variant: 'destructive', title: "Round Locked", description: "Round close ho gaya hai, please wait." });
        return;
    }
    setSelectedOption(option);
    setIsBetPanelOpen(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !firestore || isBetting || selectedOption === null) return;
    const amount = parseInt(betAmount);

    if (isNaN(amount) || amount < 1) {
      toast({ variant: 'destructive', title: "Invalid Amount", description: "Minimum bet is 1 coin." });
      return;
    }

    if (amount > (userProfile?.virtualBalance || 0)) {
      toast({ variant: 'destructive', title: "Low Balance", description: "You don't have enough virtual coins." });
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
        selection: selectedOption,
        amount,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      toast({ title: "Bet Confirmed! 🚀", description: `Round ${currentPeriod.slice(-4)}: ₹${amount} on ${selectedOption}` });
      setIsBetPanelOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Error", description: "Database error." });
    } finally {
      setIsBetting(false);
    }
  };

  return (
    <div className="space-y-6 select-none pb-10">
      {/* Timer Display */}
      <div className="bg-secondary/40 border border-border p-6 rounded-[2.5rem] flex items-center justify-between relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-1.5">
            <History size={12} className="text-primary" /> Period
          </p>
          <h3 className="text-2xl font-black italic tracking-tighter text-foreground">{currentPeriod || 'Loading...'}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Time Left</p>
          <div className="flex items-center gap-2 justify-end">
            <Timer className={cn("h-6 w-6", timeLeft <= 5 ? "text-destructive animate-pulse" : "text-primary")} />
            <h2 className={cn("text-3xl font-black tabular-nums", timeLeft <= 5 ? "text-destructive" : "text-foreground")}>
              00:{timeLeft.toString().padStart(2, '0')}
            </h2>
          </div>
        </div>
      </div>

      {/* Main Betting Area */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Button onClick={() => handleOpenBetPanel('green')} className="bg-prediction-green hover:bg-green-600 h-16 rounded-2xl font-black uppercase shadow-lg shadow-green-500/20 text-white border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all">Green</Button>
          <Button onClick={() => handleOpenBetPanel('violet')} className="bg-prediction-violet hover:bg-violet-600 h-16 rounded-2xl font-black uppercase shadow-lg shadow-violet-500/20 text-white border-b-4 border-violet-700 active:border-b-0 active:translate-y-1 transition-all">Violet</Button>
          <Button onClick={() => handleOpenBetPanel('red')} className="bg-prediction-red hover:bg-red-600 h-16 rounded-2xl font-black uppercase shadow-lg shadow-red-500/20 text-white border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition-all">Red</Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={() => handleOpenBetPanel('big')} className="bg-prediction-big hover:bg-amber-500 h-14 rounded-2xl font-black uppercase text-black shadow-lg border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all">Big</Button>
          <Button onClick={() => handleOpenBetPanel('small')} className="bg-prediction-small hover:bg-blue-500 h-14 rounded-2xl font-black uppercase shadow-lg text-white border-b-4 border-blue-600 active:border-b-0 active:translate-y-1 transition-all">Small</Button>
        </div>

        <div className="bg-secondary/20 p-4 rounded-[2rem] border border-border">
          <p className="text-[10px] font-black uppercase text-muted-foreground text-center mb-4 tracking-widest">Lucky Number (9X Win)</p>
          <div className="grid grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleOpenBetPanel(num)}
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
                       <th className="p-4 text-left">Period</th>
                       <th className="p-4 text-center">Lucky</th>
                       <th className="p-4 text-center">Size</th>
                       <th className="p-4 text-right pr-6">Color</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                    {results?.map(res => (
                      <tr key={res.id} className="text-sm hover:bg-secondary/5">
                        <td className="p-4 font-bold text-muted-foreground">{res.period.slice(-4)}</td>
                        <td className="p-4 text-center">
                            <span className={cn(
                              "inline-flex w-8 h-8 items-center justify-center rounded-full font-black text-white shadow-sm border-2 border-white/20",
                              [1,3,7,9].includes(res.number) ? "bg-prediction-green" : 
                              res.number === 0 || res.number === 5 ? "bg-prediction-violet" : "bg-prediction-red"
                            )}>
                              {res.number}
                            </span>
                        </td>
                        <td className="p-4 text-center">
                           <span className={cn(
                             "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", 
                             res.size === 'big' ? "bg-prediction-big/10 text-amber-700 border-amber-200" : "bg-prediction-small/10 text-blue-700 border-blue-200"
                           )}>
                              {res.size}
                           </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                            <div className="flex gap-1 justify-end">
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
           <div className="space-y-4">
              {myBets?.map(bet => (
                <div key={bet.id} className="bg-secondary/20 p-5 rounded-[2rem] border border-border flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl", 
                        bet.status === 'win' ? "bg-green-500/10 text-green-600" : 
                        bet.status === 'loss' ? "bg-red-500/10 text-red-600" : 
                        "bg-primary/10 text-primary"
                      )}>
                         {bet.status === 'win' ? <Trophy size={20} /> : <Coins size={20} />}
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-muted-foreground uppercase">Round: {bet.period.slice(-4)}</p>
                         <p className="font-bold text-sm">Bet: <span className="uppercase text-primary">{bet.selection}</span></p>
                         <p className="text-[10px] font-bold text-muted-foreground">Amount: ₹{bet.amount}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className={cn("font-black text-lg", bet.status === 'win' ? "text-green-600" : bet.status === 'loss' ? "text-red-500" : "text-primary animate-pulse")}>
                         {bet.status === 'win' ? `+₹${bet.winAmount}` : bet.status === 'loss' ? `-₹${bet.amount}` : 'Pending...'}
                      </p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">{bet.createdAt ? format(bet.createdAt.toDate(), 'HH:mm:ss') : ''}</p>
                   </div>
                </div>
              ))}
           </div>
        </TabsContent>
      </Tabs>

      {/* Betting Dialog (Popup) */}
      <Dialog open={isBetPanelOpen} onOpenChange={setIsBetPanelOpen}>
        <DialogContent className="max-w-[400px] bg-background border-border rounded-[2.5rem] p-0 overflow-hidden z-[1000]">
           <DialogHeader className="p-6 pb-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-black italic uppercase text-foreground">Place Your Bet</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsBetPanelOpen(false)} className="rounded-full"><X size={20} /></Button>
              </div>
           </DialogHeader>

           <div className="p-8 space-y-8">
              <div className="bg-secondary/40 p-6 rounded-[2rem] border border-border flex items-center justify-between">
                  <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selected Option</p>
                      <h4 className="text-3xl font-black italic uppercase text-primary">{selectedOption}</h4>
                  </div>
                  <div className="text-right space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Current Balance</p>
                      <p className="text-xl font-black text-foreground">₹{userProfile?.virtualBalance || 0}</p>
                  </div>
              </div>

              <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Select Amount (Coins)</p>
                  <div className="grid grid-cols-3 gap-3">
                      {['1', '5', '10', '20', '50', '100'].map(val => (
                          <button 
                            key={val} 
                            onClick={() => setBetAmount(val)}
                            className={cn(
                                "h-12 rounded-xl font-black text-sm uppercase transition-all active:scale-95 border-2",
                                betAmount === val ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-background text-foreground border-border"
                            )}
                          >
                              ₹{val}
                          </button>
                      ))}
                  </div>
                  <div className="relative mt-2">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input 
                        type="number" 
                        value={betAmount} 
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="h-14 pl-12 bg-secondary/30 border-none rounded-2xl font-black text-lg"
                        placeholder="Enter custom amount"
                      />
                  </div>
              </div>

              <Button 
                onClick={handlePlaceBet}
                disabled={isBetting}
                className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-base"
              >
                  {isBetting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 /> Confirm Bet</>}
              </Button>
           </div>

           <div className="p-4 bg-primary/5 text-center">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-[0.2em]">Game Mode: Virtual Only • No Real Cash</p>
           </div>
        </DialogContent>
      </Dialog>

      <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-start gap-4">
         <AlertCircle className="text-primary mt-0.5" size={20} />
         <p className="text-[10px] text-muted-foreground leading-relaxed font-medium uppercase">
            भाई, यह गेम सिर्फ मनोरंजन के लिए है। ये वर्चुअल सिक्के पूरी तरह फ्री और नकली हैं। असली पैसा न तो जमा किया जा सकता है और न ही निकाला जा सकता है। ✅
         </p>
      </div>
    </div>
  );
}
