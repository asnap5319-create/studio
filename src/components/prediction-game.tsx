
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, increment, setDoc, serverTimestamp, writeBatch, addDoc } from 'firebase/firestore';
import { CheckCircle2, Loader2, X } from 'lucide-react';
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
  const [multiplier, setMultiplier] = useState(1);
  const [isBetting, setIsBetting] = useState(false);
  
  const processedPeriods = useRef<Set<string>>(new Set());

  // GLOBAL RESULT GENERATION (Idempotent)
  const generateResult = async (periodToProcess: string) => {
    if (!firestore || !user) return;
    
    if (processedPeriods.current.has(periodToProcess)) return;
    processedPeriods.current.add(periodToProcess);

    try {
        const resultDocRef = doc(firestore, 'game_results', periodToProcess);
        
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
        }, { merge: false });

    } catch (e: any) {
        if (e.code !== 'permission-denied' && e.code !== 'already-exists') {
            console.error("Global Result generation error:", e);
        }
    }
  };

  // REAL-TIME SYNCED TIMER & PERIOD
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const seconds = now.getUTCSeconds();
      const remaining = 30 - (seconds % 30);
      setTimeLeft(remaining);

      const datePart = format(now, 'yyyyMMdd');
      const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      const roundIndex = Math.floor(seconds / 30);
      const periodId = `${datePart}${(utcMinutes * 2 + roundIndex).toString().padStart(4, '0')}`;
      
      if (periodId !== currentPeriod) {
        if (currentPeriod) {
            generateResult(currentPeriod);
        }
        setCurrentPeriod(periodId);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentPeriod, firestore, user]);

  // Real-time Global History
  const resultsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'game_results'), orderBy('period', 'desc'), limit(50)) : null, 
    [firestore]
  );
  const { data: results } = useCollection<GameResult>(resultsQuery);

  // Real-time User Bets
  const myBetsQuery = useMemoFirebase(() => 
    (firestore && user) ? query(collection(firestore, 'users', user.uid, 'game_bets'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore, user]
  );
  const { data: myBets } = useCollection<Bet>(myBetsQuery);

  // GLOBAL SETTLEMENT
  useEffect(() => {
    if (!firestore || !user || !results || results.length === 0 || !myBets) return;

    const pendingBets = myBets.filter(b => b.status === 'pending');
    if (pendingBets.length === 0) return;

    const batch = writeBatch(firestore);
    let totalWinDelta = 0;
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
                totalWinDelta += winAmt;
                batch.update(betRef, { status: 'win', winAmount: winAmt });
            } else {
                batch.update(betRef, { status: 'loss' });
            }
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        if (totalWinDelta > 0) {
            batch.update(doc(firestore, 'users', user.uid), {
                virtualBalance: increment(totalWinDelta)
            });
            toast({ title: "Jackpot! 💰", description: `भाई, आप ₹${totalWinDelta.toFixed(0)} सिक्के जीत गए!` });
        }
        batch.commit().catch(err => console.error("Settlement error:", err));
    }
  }, [results, myBets, firestore, user]);

  const handleOpenBetPanel = (option: string | number) => {
    if (timeLeft < 5) {
        toast({ variant: 'destructive', title: "Round Locked", description: "अगले राउंड का इंतज़ार करें।" });
        return;
    }
    setSelectedOption(option);
    setIsBetPanelOpen(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !firestore || isBetting || selectedOption === null || !userProfile) return;

    if (timeLeft < 5) {
        toast({ variant: 'destructive', title: "Round Locked", description: "राउंड बंद हो रहा है, थोड़ा रुकें।" });
        setIsBetPanelOpen(false);
        return;
    }

    const amountNum = parseInt(betAmount);
    if (isNaN(amountNum) || amountNum < 1) {
      toast({ variant: 'destructive', title: "Invalid Amount", description: "सही अमाउंट लिखें (Min ₹1)" });
      return;
    }

    const finalAmount = amountNum * multiplier;
    if (finalAmount > (userProfile.virtualBalance || 0)) {
      toast({ variant: 'destructive', title: "No Coins", description: "आपका बैलेंस कम है।" });
      return;
    }

    setIsBetting(true);
    try {
      await updateDoc(doc(firestore, 'users', user.uid), {
        virtualBalance: increment(-finalAmount)
      });

      await addDoc(collection(firestore, 'users', user.uid, 'game_bets'), {
        userId: user.uid,
        period: currentPeriod,
        selection: selectedOption,
        amount: finalAmount,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      toast({ title: "Bet Placed! ✅" });
      setIsBetPanelOpen(false);
    } catch (e: any) {
      console.error("Bet error:", e);
      toast({ variant: 'destructive', title: "Error", description: "बेट फेल हो गई।" });
    } finally {
      setIsBetting(false);
    }
  };

  const getNumberBgClass = (num: number) => {
    if (num === 0) return "bg-gradient-to-br from-red-500 to-purple-500";
    if (num === 5) return "bg-gradient-to-br from-green-500 to-purple-500";
    if ([1, 3, 7, 9].includes(num)) return "bg-green-500";
    return "bg-red-500";
  };

  const getNumberColorClass = (num: number) => {
      if (num === 0 || num === 5) return "text-purple-600";
      if ([1, 3, 7, 9].includes(num)) return "text-green-600";
      return "text-red-600";
  };

  return (
    <div className="space-y-4 select-none pb-20">
      {/* Header Dashboard */}
      <div className="bg-[#f95959] rounded-2xl p-5 text-white flex justify-between items-center shadow-lg">
        <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">WinGo 30sec</p>
            <div className="flex gap-1.5">
                {results?.slice(0, 5).map(res => (
                    <div key={res.id} className={cn("w-5 h-5 rounded-full border border-white/40 flex items-center justify-center text-[9px] font-black shadow-sm", getNumberBgClass(res.number))}>
                        {res.number}
                    </div>
                ))}
            </div>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90 mb-2">Time Remaining</p>
            <div className="flex items-center gap-1.5 justify-end">
                {['0', '0', ':', '0', (timeLeft < 10 ? '0' : timeLeft.toString()[0]), (timeLeft < 10 ? timeLeft.toString() : (timeLeft.toString()[1] || '0'))].map((char, i) => (
                    <div key={i} className={cn("h-8 w-6 flex items-center justify-center rounded-md bg-white text-[#f95959] font-black text-xl shadow-inner", char === ':' && "bg-transparent text-white w-2 shadow-none")}>
                        {char}
                    </div>
                ))}
            </div>
            <p className="text-[11px] font-black mt-2 tracking-tighter opacity-80">{currentPeriod}</p>
        </div>
      </div>

      {/* Betting Pad */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-border/50 space-y-6">
          <div className="grid grid-cols-3 gap-4">
              <Button onClick={() => handleOpenBetPanel('green')} className="bg-green-500 hover:bg-green-600 h-14 rounded-2xl font-black uppercase text-xs">Green</Button>
              <Button onClick={() => handleOpenBetPanel('violet')} className="bg-purple-500 hover:bg-purple-600 h-14 rounded-2xl font-black uppercase text-xs">Violet</Button>
              <Button onClick={() => handleOpenBetPanel('red')} className="bg-red-500 hover:bg-red-600 h-14 rounded-2xl font-black uppercase text-xs">Red</Button>
          </div>

          <div className="bg-[#f6f7ff] p-5 rounded-[2rem] border border-blue-50/50 shadow-inner">
              <div className="grid grid-cols-5 gap-y-6 gap-x-3">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleOpenBetPanel(num)}
                      className={cn(
                        "relative w-12 h-12 mx-auto rounded-full font-black text-lg flex items-center justify-center text-white shadow-md active:scale-90 transition-transform",
                        getNumberBgClass(num)
                      )}
                    >
                      {num}
                    </button>
                  ))}
              </div>
          </div>

          <div className="flex justify-between items-center gap-2">
              {[1, 5, 10, 20, 50, 100].map(m => (
                  <button key={m} onClick={() => setMultiplier(m)} className={cn("flex-1 h-10 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm", multiplier === m ? "bg-green-500 text-white" : "bg-[#f1f3ff] text-muted-foreground")}>X{m}</button>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => handleOpenBetPanel('big')} className="bg-[#ffae42] hover:bg-[#f39c12] h-14 rounded-l-full rounded-r-none font-black uppercase text-sm text-white">Big</Button>
              <Button onClick={() => handleOpenBetPanel('small')} className="bg-[#5d83ff] hover:bg-[#3498db] h-14 rounded-r-full rounded-l-none font-black uppercase text-sm text-white">Small</Button>
          </div>
      </div>

      {/* History Tabs */}
      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-border/50">
        <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#f1f3ff] p-0 h-14 rounded-none">
                <TabsTrigger value="results" className="rounded-none font-black text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-[#f95959]">Game History</TabsTrigger>
                <TabsTrigger value="my" className="rounded-none font-black text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-[#f95959]">My Bets</TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="m-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f95959] text-white">
                            <tr className="text-[10px] font-black uppercase">
                                <th className="py-4 px-4 text-center">Period</th>
                                <th className="py-4 px-2 text-center">Number</th>
                                <th className="py-4 px-2 text-center">Big Small</th>
                                <th className="py-4 px-4 text-center">Color</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {results?.map(res => (
                                <tr key={res.id} className="text-[13px] hover:bg-secondary/5">
                                    <td className="py-4 px-4 text-center text-muted-foreground font-bold tracking-tighter">{res.period}</td>
                                    <td className={cn("py-4 px-2 text-center font-black text-xl", getNumberColorClass(res.number))}>
                                        {res.number}
                                    </td>
                                    <td className="py-4 px-2 text-center font-black">
                                        <span className={cn(
                                            "uppercase text-[11px] tracking-widest",
                                            res.size === 'big' ? "text-orange-500" : "text-blue-500"
                                        )}>
                                            {res.size || (res.number >= 5 ? 'Big' : 'Small')}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex gap-1.5 justify-center">
                                            {res.color.includes('red') && <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm border border-black/5" />}
                                            {res.color.includes('green') && <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm border border-black/5" />}
                                            {res.color.includes('violet') && <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm border border-black/5" />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </TabsContent>

            <TabsContent value="my" className="m-0 p-4 space-y-3 bg-secondary/5 min-h-[300px]">
                {myBets?.map(bet => {
                    const matchedResult = results?.find(r => r.period === bet.period);
                    const isWin = bet.status === 'win';
                    const isLoss = bet.status === 'loss';
                    const isPending = bet.status === 'pending';

                    return (
                        <div key={bet.id} className="bg-white p-5 rounded-3xl border border-border shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{bet.period.slice(-4)} Round</p>
                                </div>
                                <p className="font-black text-sm text-foreground">Bet: <span className="uppercase text-primary">{bet.selection}</span></p>
                                {matchedResult && (
                                    <p className="text-[9px] font-black text-muted-foreground uppercase">Result: {matchedResult.number} ({matchedResult.size})</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className={cn(
                                  "font-black text-lg", 
                                  isWin ? "text-green-600" : isLoss ? "text-red-500" : "text-primary animate-pulse"
                                )}>
                                    {isWin ? `+₹${bet.winAmount?.toFixed(0)}` : isLoss ? `-₹${bet.amount}` : 'Wait...'}
                                </p>
                                <p className="text-[8px] text-muted-foreground font-bold uppercase mt-1">Stake: ₹{bet.amount}</p>
                            </div>
                        </div>
                    );
                })}
                {(!myBets || myBets.length === 0) && (
                    <div className="text-center py-20 opacity-30 italic text-sm font-bold uppercase tracking-widest">No history yet</div>
                )}
            </TabsContent>
        </Tabs>
      </div>

      {/* Bet Panel Dialog */}
      <Dialog open={isBetPanelOpen} onOpenChange={setIsBetPanelOpen}>
        <DialogContent className="max-w-[420px] bg-background border-border rounded-[3rem] p-0 overflow-hidden z-[1000]">
           <DialogHeader className="p-8 pb-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-black italic uppercase text-foreground tracking-tighter">Place Bet (X{multiplier})</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsBetPanelOpen(false)} className="rounded-full bg-secondary/50"><X size={20} /></Button>
              </div>
           </DialogHeader>

           <div className="p-8 space-y-8">
              <div className="bg-[#f1f3ff] p-7 rounded-[2.5rem] border border-border/50 flex items-center justify-between shadow-inner">
                  <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selected Option</p>
                      <h4 className="text-4xl font-black italic uppercase text-primary drop-shadow-sm">{selectedOption}</h4>
                  </div>
                  <div className="text-right space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Your Wallet</p>
                      <p className="text-2xl font-black text-foreground">₹{userProfile?.virtualBalance || 0}</p>
                  </div>
              </div>

              <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Select Amount</p>
                  <div className="grid grid-cols-4 gap-3">
                      {['10', '50', '100', '500'].map(val => (
                          <button 
                            key={val} 
                            onClick={() => setBetAmount(val)} 
                            className={cn(
                                "h-12 rounded-2xl font-black text-xs uppercase border-2 transition-all active:scale-90", 
                                betAmount === val ? "bg-primary text-white border-primary shadow-lg" : "bg-background text-foreground border-border"
                            )}
                          >
                            ₹{val}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Custom Amount</p>
                  <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground">₹</span>
                      <Input 
                        type="number"
                        placeholder="Enter custom amount..."
                        value={betAmount}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Only allow positive integers
                            if (val === '' || /^\d+$/.test(val)) {
                                setBetAmount(val);
                            }
                        }}
                        className="h-14 bg-[#f1f3ff] border-none rounded-2xl pl-10 pr-6 text-lg font-bold focus-visible:ring-primary shadow-inner"
                      />
                  </div>
              </div>

              <div className="bg-primary/5 p-5 rounded-2xl flex justify-between items-center border border-primary/10">
                  <p className="text-xs font-black uppercase text-primary tracking-widest">Total Stake:</p>
                  <p className="text-2xl font-black text-primary">₹{(parseInt(betAmount) || 0) * multiplier}</p>
              </div>

              <Button 
                onClick={handlePlaceBet}
                disabled={isBetting}
                className="w-full h-18 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-[1.5rem] shadow-[0_15px_30px_rgba(255,51,102,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all text-lg py-8"
              >
                  {isBetting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 /> Confirm Bet</>}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
