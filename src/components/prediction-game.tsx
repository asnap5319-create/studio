
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, increment, setDoc, serverTimestamp, writeBatch, getDocs, where, getDoc, addDoc } from 'firebase/firestore';
import { Timer, History, Trophy, Coins, CheckCircle2, AlertCircle, TrendingUp, Info, Zap, X, Loader2, Play } from 'lucide-react';
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
  const [betAmount, setBetAmount] = useState('1');
  const [multiplier, setMultiplier] = useState(1);
  const [isBetting, setIsBetting] = useState(false);
  
  const processedPeriods = useRef<Set<string>>(new Set());

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const seconds = now.getSeconds();
      const remaining = 30 - (seconds % 30);
      setTimeLeft(remaining);

      // Period ID logic based on time
      const datePart = format(now, 'yyyyMMdd');
      const minutePart = now.getHours() * 60 + now.getMinutes();
      const roundPart = Math.floor(seconds / 30);
      const periodId = `${datePart}${(minutePart * 2 + roundPart).toString().padStart(4, '0')}`;
      
      if (periodId !== currentPeriod) {
        // When period changes, generate result for the PREVIOUS period
        if (currentPeriod && !processedPeriods.current.has(currentPeriod)) {
            generateResult(currentPeriod);
        }
        setCurrentPeriod(periodId);
      }
    };

    const generateResult = async (periodToProcess: string) => {
        if (!firestore || !user) return;
        processedPeriods.current.add(periodToProcess);

        try {
            const resultDocRef = doc(firestore, 'game_results', periodToProcess);
            const docSnap = await getDoc(resultDocRef);

            // Only create if it doesn't exist to prevent errors and ensure single result
            if (!docSnap.exists()) {
                const num = Math.floor(Math.random() * 10);
                let color: 'red' | 'green' | 'violet' | 'red-violet' | 'green-violet' = 'red';
                
                if (num === 0) color = 'red-violet';
                else if (num === 5) color = 'green-violet';
                else if ([1, 3, 7, 9].includes(num)) color = 'green';
                else color = 'red';

                const size = num >= 5 ? 'big' : 'small';

                await setDoc(resultDocRef, {
                    id: periodToProcess,
                    period: periodToProcess,
                    number: num,
                    color,
                    size,
                    createdAt: serverTimestamp()
                });
            }
        } catch (e: any) {
            // Permission errors are common if multiple users write, we just catch them
            if (e.code !== 'permission-denied') {
                console.error("Result generation error:", e);
                processedPeriods.current.delete(periodToProcess);
            }
        }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentPeriod, firestore, user]);

  // Use 'period' for sorting instead of 'createdAt' to prevent null-timestamp flickering
  const resultsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'game_results'), orderBy('period', 'desc'), limit(50)) : null, 
    [firestore]
  );
  const { data: results } = useCollection<GameResult>(resultsQuery);

  const myBetsQuery = useMemoFirebase(() => 
    (firestore && user) ? query(collection(firestore, 'users', user.uid, 'game_bets'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore, user]
  );
  const { data: myBets } = useCollection<Bet>(myBetsQuery);

  // Settlement Logic: Check all results against all pending bets
  useEffect(() => {
    if (!firestore || !user || !results || results.length === 0 || !myBets) return;

    const pendingBets = myBets.filter(b => b.status === 'pending');
    if (pendingBets.length === 0) return;

    const batch = writeBatch(firestore);
    let totalWin = 0;
    let updatedCount = 0;

    pendingBets.forEach(bet => {
        const matchedResult = results.find(r => r.period === bet.period);
        if (matchedResult) {
            let isWin = false;
            let mult = 2;

            if (typeof bet.selection === 'number') {
                isWin = bet.selection === matchedResult.number;
                mult = 9;
            } else if (bet.selection === 'big' || bet.selection === 'small') {
                isWin = bet.selection === matchedResult.size;
            } else {
                isWin = matchedResult.color.includes(bet.selection as string);
                if (matchedResult.color.includes('violet') && (bet.selection === 'red' || bet.selection === 'green')) {
                    mult = 1.5;
                }
                if (bet.selection === 'violet') mult = 4.5;
            }

            const betRef = doc(firestore, 'users', user.uid, 'game_bets', bet.id);
            if (isWin) {
                const winAmt = bet.amount * mult;
                totalWin += winAmt;
                batch.update(betRef, { status: 'win', winAmount: winAmt });
            } else {
                batch.update(betRef, { status: 'loss' });
            }
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        if (totalWin > 0) {
            batch.update(doc(firestore, 'users', user.uid), {
                virtualBalance: increment(totalWin)
            });
            toast({ title: "Congratulations! 🎉", description: `You won ₹${totalWin.toFixed(2)} in total!` });
        }
        batch.commit().catch(err => console.error("Batch settle error:", err));
    }
  }, [results, myBets, firestore, user, toast]);

  const handleOpenBetPanel = (option: string | number) => {
    if (timeLeft < 5) {
        toast({ variant: 'destructive', title: "Round Locked", description: "Wait for next round (5s lock)." });
        return;
    }
    setSelectedOption(option);
    setIsBetPanelOpen(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !firestore || isBetting || selectedOption === null || !userProfile) return;

    if (timeLeft < 5) {
        toast({ variant: 'destructive', title: "Round Locked", description: "Too late! Wait for next round." });
        setIsBetPanelOpen(false);
        return;
    }

    const finalAmount = parseInt(betAmount) * multiplier;
    const currentBalance = userProfile.virtualBalance || 0;
    if (finalAmount > currentBalance) {
      toast({ variant: 'destructive', title: "Insufficient Coins", description: `Available: ₹${currentBalance}` });
      return;
    }

    setIsBetting(true);
    try {
      // Deduct balance first
      await updateDoc(doc(firestore, 'users', user.uid), {
        virtualBalance: increment(-finalAmount)
      });

      // Save bet document
      await addDoc(collection(firestore, 'users', user.uid, 'game_bets'), {
        userId: user.uid,
        period: currentPeriod,
        selection: selectedOption,
        amount: finalAmount,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      toast({ title: "Bet Confirmed! 🚀" });
      setIsBetPanelOpen(false);
    } catch (e: any) {
      console.error("Bet error:", e);
      toast({ variant: 'destructive', title: "Error", description: "Failed to place bet. Try again." });
    } finally {
      setIsBetting(false);
    }
  };

  const getNumberColorClass = (num: number) => {
      if (num === 0) return "text-purple-500";
      if (num === 5) return "text-purple-500";
      if ([1, 3, 7, 9].includes(num)) return "text-green-500";
      return "text-red-500";
  };

  const getNumberBgClass = (num: number) => {
    if (num === 0) return "bg-gradient-to-br from-red-500 to-purple-500";
    if (num === 5) return "bg-gradient-to-br from-green-500 to-purple-500";
    if ([1, 3, 7, 9].includes(num)) return "bg-green-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4 select-none pb-20">
      <div className="bg-[#f95959] rounded-2xl p-4 text-white flex justify-between items-center shadow-lg">
        <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">WinGo 30sec</p>
            <div className="flex gap-1">
                {results?.slice(0, 5).map(res => (
                    <div key={res.id} className={cn("w-4 h-4 rounded-full border border-white/30 flex items-center justify-center text-[8px] font-black", getNumberBgClass(res.number))}>
                        {res.number}
                    </div>
                ))}
            </div>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">Time Remaining</p>
            <div className="flex items-center gap-1 justify-end">
                {['0', '0', ':', '0', (timeLeft < 10 ? '0' : timeLeft.toString()[0]), (timeLeft < 10 ? timeLeft.toString() : (timeLeft.toString()[1] || '0'))].map((char, i) => (
                    <div key={i} className={cn("h-7 w-5 flex items-center justify-center rounded bg-white text-[#f95959] font-black text-lg", char === ':' && "bg-transparent text-white w-2")}>
                        {char}
                    </div>
                ))}
            </div>
            <p className="text-[11px] font-black mt-1 tracking-tight">{currentPeriod}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/50 space-y-6">
          <div className="grid grid-cols-3 gap-4">
              <Button onClick={() => handleOpenBetPanel('green')} className="bg-green-500 hover:bg-green-600 h-12 rounded-xl font-black uppercase text-sm">Green</Button>
              <Button onClick={() => handleOpenBetPanel('violet')} className="bg-purple-500 hover:bg-purple-600 h-12 rounded-xl font-black uppercase text-sm">Violet</Button>
              <Button onClick={() => handleOpenBetPanel('red')} className="bg-red-500 hover:bg-red-600 h-12 rounded-xl font-black uppercase text-sm">Red</Button>
          </div>

          <div className="bg-[#f6f7ff] p-4 rounded-3xl border border-blue-50/50">
              <div className="grid grid-cols-5 gap-y-6 gap-x-3">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleOpenBetPanel(num)}
                      className={cn(
                        "relative w-11 h-11 mx-auto rounded-full font-black text-lg flex items-center justify-center text-white shadow-md active:scale-90 transition-transform",
                        getNumberBgClass(num)
                      )}
                    >
                      <div className="absolute inset-1 rounded-full border-2 border-white/20" />
                      {num}
                    </button>
                  ))}
              </div>
          </div>

          <div className="flex justify-between items-center gap-2">
              <button className="flex-1 bg-white border border-border h-9 rounded-md text-[10px] font-bold text-muted-foreground uppercase">Random</button>
              {[1, 5, 10, 20, 50, 100].map(m => (
                  <button key={m} onClick={() => setMultiplier(m)} className={cn("flex-1 h-9 rounded-md text-[10px] font-bold uppercase transition-all", multiplier === m ? "bg-green-500 text-white" : "bg-[#f1f3ff] text-muted-foreground")}>X{m}</button>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => handleOpenBetPanel('big')} className="bg-[#ffae42] hover:bg-[#f39c12] h-12 rounded-l-full rounded-r-none font-black uppercase text-sm text-white">Big</Button>
              <Button onClick={() => handleOpenBetPanel('small')} className="bg-[#5d83ff] hover:bg-[#3498db] h-12 rounded-r-full rounded-l-none font-black uppercase text-sm text-white">Small</Button>
          </div>
      </div>

      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-border/50">
        <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#f1f3ff] p-0 h-12 rounded-none">
                <TabsTrigger value="results" className="rounded-none font-bold text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-[#f95959]">Game History</TabsTrigger>
                <TabsTrigger value="chart" className="rounded-none font-bold text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-[#f95959]">Chart</TabsTrigger>
                <TabsTrigger value="my" className="rounded-none font-bold text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-[#f95959]">My History</TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="m-0">
                <table className="w-full">
                    <thead className="bg-[#f95959] text-white">
                        <tr className="text-[10px] font-bold uppercase">
                            <th className="py-3 px-4 text-center font-black">Period</th>
                            <th className="py-3 px-2 text-center font-black">Number</th>
                            <th className="py-3 px-2 text-center font-black">Big Small</th>
                            <th className="py-3 px-4 text-center font-black">Color</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {results?.map(res => (
                            <tr key={res.id} className="text-[12px] hover:bg-secondary/5 animate-in fade-in slide-in-from-top-4 duration-500">
                                <td className="py-4 px-4 text-center text-muted-foreground font-medium">{res.period}</td>
                                <td className={cn("py-4 px-2 text-center font-black text-xl", getNumberColorClass(res.number))}>
                                    {res.number}
                                </td>
                                <td className="py-4 px-2 text-center text-foreground font-bold capitalize">
                                    {res.size || (res.number >= 5 ? 'Big' : 'Small')}
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex gap-1 justify-center">
                                        {res.color.includes('red') && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />}
                                        {res.color.includes('green') && <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm" />}
                                        {res.color.includes('violet') && <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" />}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TabsContent>

            <TabsContent value="my" className="m-0 p-4 space-y-3">
                {myBets?.map(bet => {
                    const matchedResult = results?.find(r => r.period === bet.period);
                    return (
                        <div key={bet.id} className="bg-secondary/20 p-4 rounded-2xl border border-border flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{bet.period.slice(-4)} Round</p>
                                <p className="font-black text-sm">Bet: <span className="uppercase text-primary">{bet.selection}</span></p>
                                {matchedResult && (
                                    <p className="text-[9px] font-bold text-foreground uppercase">Result: {matchedResult.number} ({matchedResult.size})</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className={cn("font-black text-base", bet.status === 'win' ? "text-green-600" : bet.status === 'loss' ? "text-red-500" : "text-primary animate-pulse")}>
                                    {bet.status === 'win' ? `+₹${bet.winAmount?.toFixed(2)}` : bet.status === 'loss' ? `-₹${bet.amount}` : 'Pending...'}
                                </p>
                            </div>
                        </div>
                    );
                })}
                {(!myBets || myBets.length === 0) && (
                    <div className="text-center py-10 opacity-30 italic text-sm">No betting history</div>
                )}
            </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isBetPanelOpen} onOpenChange={setIsBetPanelOpen}>
        <DialogContent className="max-w-[400px] bg-background border-border rounded-[2.5rem] p-0 overflow-hidden z-[1000]">
           <DialogHeader className="p-6 pb-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-black italic uppercase text-foreground">Place Bet (X{multiplier})</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsBetPanelOpen(false)} className="rounded-full"><X size={20} /></Button>
              </div>
           </DialogHeader>

           <div className="p-8 space-y-8">
              <div className="bg-[#f1f3ff] p-6 rounded-[2rem] border border-border/50 flex items-center justify-between">
                  <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Selection</p>
                      <h4 className="text-3xl font-black italic uppercase text-primary">{selectedOption}</h4>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Wallet</p>
                      <p className="text-xl font-black text-foreground">₹{userProfile?.virtualBalance || 0}</p>
                  </div>
              </div>

              <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Base Amount</p>
                  <div className="grid grid-cols-3 gap-3">
                      {['1', '10', '100', '500', '1000', '5000'].map(val => (
                          <button key={val} onClick={() => setBetAmount(val)} className={cn("h-11 rounded-xl font-black text-xs uppercase border-2 transition-all", betAmount === val ? "bg-primary text-white border-primary shadow-lg" : "bg-background text-foreground border-border")}>₹{val}</button>
                      ))}
                  </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl flex justify-between items-center">
                  <p className="text-xs font-bold uppercase text-primary">Total Coins:</p>
                  <p className="text-xl font-black text-primary">₹{parseInt(betAmount) * multiplier}</p>
              </div>

              <Button 
                onClick={handlePlaceBet}
                disabled={isBetting}
                className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-base"
              >
                  {isBetting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 /> Confirm Bet</>}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
