
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, increment, setDoc, serverTimestamp, writeBatch, addDoc } from 'firebase/firestore';
import { CheckCircle2, Loader2, X, TrendingUp, Zap, Sparkles, ShieldCheck } from 'lucide-react';
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

// Simple deterministic pseudo-random number from period string
// This ensures EVERY user sees the exact same result for the same period ID
const getDeterministicResult = (period: string) => {
  let hash = 0;
  for (let i = 0; i < period.length; i++) {
    hash = (hash << 5) - hash + period.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 10;
};

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
  
  // AI Prediction State (Synced with Deterministic Logic)
  const [prediction, setPrediction] = useState<{ size: 'BIG' | 'SMALL', color: 'GREEN' | 'RED', num: number } | null>(null);

  const processedPeriods = useRef<Set<string>>(new Set());

  // GLOBAL RESULT GENERATION (Deterministic)
  const generateResult = async (periodToProcess: string) => {
    if (!firestore || !user) return;
    
    if (processedPeriods.current.has(periodToProcess)) return;
    processedPeriods.current.add(periodToProcess);

    try {
        const resultDocRef = doc(firestore, 'game_results', periodToProcess);
        
        // Calculate deterministic number for this period
        const num = getDeterministicResult(periodToProcess);
        
        let color: 'red' | 'green' | 'violet' | 'red-violet' | 'green-violet' = 'red';
        if (num === 0) color = 'red-violet';
        else if (num === 5) color = 'green-violet';
        else if ([1, 3, 7, 9].includes(num)) color = 'green';
        else color = 'red';

        const size = num >= 5 ? 'big' : 'small';

        // Write to global results - will only succeed if doc doesn't exist
        await setDoc(resultDocRef, {
            id: periodToProcess,
            period: periodToProcess,
            number: num,
            color,
            size,
            createdAt: serverTimestamp()
        }, { merge: false });

    } catch (e: any) {
        // If already exists or permission error (common for global writes), ignore silently
        if (e.code !== 'permission-denied' && e.code !== 'already-exists') {
            console.error("Global Result generation error:", e);
        }
    }
  };

  // REAL-TIME SYNCED TIMER & PERIOD (+1 ROUND AHEAD OF JALWA)
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const seconds = now.getUTCSeconds();
      const remaining = 30 - (seconds % 30);
      setTimeLeft(remaining);

      const datePart = format(now, 'yyyyMMdd');
      const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      
      // Jalwa Sync: Standard (utcMinutes * 2 + Math.floor(seconds / 30)) + 1
      // User requested 1 ROUND AHEAD, so we use +2 offset
      const roundIndexInDay = (utcMinutes * 2 + Math.floor(seconds / 30)) + 2;
      const periodId = `${datePart}10001${roundIndexInDay.toString().padStart(4, '0')}`;
      
      if (periodId !== currentPeriod) {
        // When period changes, generate the result for the PREVIOUS period
        if (currentPeriod) {
            generateResult(currentPeriod);
        }
        setCurrentPeriod(periodId);
        
        // Generate DETERMINISTIC Prediction for the NEW upcoming round
        const predNum = getDeterministicResult(periodId);
        setPrediction({
            size: predNum >= 5 ? 'BIG' : 'SMALL',
            color: [1, 3, 5, 7, 9].includes(predNum) ? 'GREEN' : 'RED',
            num: predNum
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentPeriod, firestore, user]);

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

  // SETTLEMENT LOGIC (Instant settlement when result arrives)
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
            let mult = 2; // Default multiplier

            if (typeof bet.selection === 'number') {
                isWin = bet.selection === matchedResult.number;
                mult = 9;
            } else if (bet.selection === 'big' || bet.selection === 'small') {
                isWin = bet.selection === matchedResult.size;
                mult = 1.99; // Standard payout
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
                batch.update(betRef, { status: 'win', winAmount: Math.floor(winAmt) });
            } else {
                batch.update(betRef, { status: 'loss' });
            }
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        if (totalWinDelta > 0) {
            batch.update(doc(firestore, 'users', user.uid), {
                virtualBalance: increment(Math.floor(totalWinDelta))
            });
            toast({ title: "Winner! 🏆", description: `You won ₹${totalWinDelta.toFixed(0)} coins!` });
        }
        batch.commit().catch(err => console.error("Settlement error:", err));
    }
  }, [results, myBets, firestore, user]);

  const handleOpenBetPanel = (option: string | number) => {
    if (timeLeft < 5) {
        toast({ variant: 'destructive', title: "Round Locked", description: "Wait for next round." });
        return;
    }
    setSelectedOption(option);
    setIsBetPanelOpen(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !firestore || isBetting || selectedOption === null || !userProfile) return;

    const amountNum = parseInt(betAmount);
    if (isNaN(amountNum) || amountNum < 1) {
      toast({ variant: 'destructive', title: "Invalid Amount", description: "Minimum bet is ₹1" });
      return;
    }

    const finalAmount = amountNum * multiplier;
    if (finalAmount > (userProfile.virtualBalance || 0)) {
      toast({ variant: 'destructive', title: "Insufficient Balance", description: "Balance kam hai bhai." });
      return;
    }

    setIsBetting(true);
    try {
      // Deduct balance
      await updateDoc(doc(firestore, 'users', user.uid), {
        virtualBalance: increment(-finalAmount)
      });

      // Save bet to user profile
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
      toast({ variant: 'destructive', title: "Error", description: "Bet lagane me dikat hui." });
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
    <div className="space-y-6 select-none pb-24 animate-in fade-in duration-700">
      
      {/* --- PREMIUM AI PREDICTION CARD (SYNCED) --- */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-white border border-primary/20 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                <Sparkles size={80} className="text-primary" />
            </div>
            
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="font-black italic uppercase text-lg tracking-tighter text-foreground">A.snap AI Tip</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Accuracy: 99.1%</p>
                    </div>
                </div>
                <div className="bg-secondary/50 px-3 py-1.5 rounded-full border border-border flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Calculated</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/40 rounded-[2rem] p-5 border border-border/50 flex flex-col items-center justify-center gap-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Period</span>
                    <p className="text-sm font-black italic tracking-tighter text-foreground">{currentPeriod.slice(-4)}</p>
                </div>
                <div className="bg-primary/5 rounded-[2rem] p-5 border border-primary/20 flex flex-col items-center justify-center gap-2">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Recommended</span>
                    <div className="flex items-center gap-2">
                        <p className={cn(
                            "text-2xl font-black italic uppercase tracking-tighter",
                            prediction?.size === 'BIG' ? "text-orange-500" : "text-blue-500"
                        )}>
                            {prediction?.size || '---'}
                        </p>
                        <div className={cn(
                            "w-3 h-3 rounded-full shadow-sm",
                            prediction?.color === 'GREEN' ? "bg-green-500" : "bg-red-500"
                        )} />
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">
                <ShieldCheck size={10} /> Certified WinGo 30S Predictor (One Ahead)
            </div>
        </div>
      </div>

      {/* Header Time Dashboard */}
      <div className="bg-[#f95959] rounded-[2rem] p-6 text-white flex justify-between items-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-black/5 pointer-events-none" />
        <div className="space-y-4 z-10">
            <div className="flex items-center gap-2">
                <Zap size={14} className="fill-white" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-90">WinGo 30sec</p>
            </div>
            <div className="flex gap-2">
                {results?.slice(0, 5).map(res => (
                    <div key={res.id} className={cn("w-6 h-6 rounded-full border border-white/40 flex items-center justify-center text-[10px] font-black shadow-lg", getNumberBgClass(res.number))}>
                        {res.number}
                    </div>
                ))}
            </div>
        </div>
        <div className="text-right z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90 mb-3">Time Remaining</p>
            <div className="flex items-center gap-1.5 justify-end">
                {['0', '0', ':', '0', (timeLeft < 10 ? '0' : timeLeft.toString()[0]), (timeLeft < 10 ? timeLeft.toString() : (timeLeft.toString()[1] || '0'))].map((char, i) => (
                    <div key={i} className={cn("h-10 w-7 flex items-center justify-center rounded-lg bg-white text-[#f95959] font-black text-2xl shadow-xl", char === ':' && "bg-transparent text-white w-2 shadow-none")}>
                        {char}
                    </div>
                ))}
            </div>
            <p className="text-[11px] font-black mt-3 tracking-tighter opacity-80 bg-black/10 px-3 py-1 rounded-full inline-block">{currentPeriod}</p>
        </div>
      </div>

      {/* Betting Pad */}
      <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-border/50 space-y-8">
          <div className="grid grid-cols-3 gap-4">
              <Button onClick={() => handleOpenBetPanel('green')} className="bg-green-500 hover:bg-green-600 h-16 rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-green-500/20 transition-all active:scale-95">Green</Button>
              <Button onClick={() => handleOpenBetPanel('violet')} className="bg-purple-500 hover:bg-purple-600 h-16 rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-purple-500/20 transition-all active:scale-95">Violet</Button>
              <Button onClick={() => handleOpenBetPanel('red')} className="bg-red-500 hover:bg-red-600 h-16 rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-red-500/20 transition-all active:scale-95">Red</Button>
          </div>

          <div className="bg-[#f6f7ff] p-7 rounded-[2.5rem] border border-blue-50/50 shadow-inner">
              <div className="grid grid-cols-5 gap-y-6 gap-x-3">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleOpenBetPanel(num)}
                      className={cn(
                        "relative w-12 h-12 mx-auto rounded-full font-black text-lg flex items-center justify-center text-white shadow-md active:scale-90 transition-all hover:scale-110",
                        getNumberBgClass(num)
                      )}
                    >
                      {num}
                    </button>
                  ))}
              </div>
          </div>

          <div className="flex justify-between items-center gap-2 overflow-x-auto scrollbar-hide">
              {[1, 5, 10, 20, 50, 100].map(m => (
                  <button key={m} onClick={() => setMultiplier(m)} className={cn("flex-1 min-w-[50px] h-11 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border border-border/30", multiplier === m ? "bg-green-500 text-white border-green-600" : "bg-[#f1f3ff] text-muted-foreground")}>X{m}</button>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => handleOpenBetPanel('big')} className="bg-[#ffae42] hover:bg-[#f39c12] h-16 rounded-l-[2rem] rounded-r-none font-black uppercase text-sm text-white shadow-xl shadow-orange-500/20 transition-all active:scale-95">Big</Button>
              <Button onClick={() => handleOpenBetPanel('small')} className="bg-[#5d83ff] hover:bg-[#3498db] h-16 rounded-r-[2rem] rounded-l-none font-black uppercase text-sm text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95">Small</Button>
          </div>
      </div>

      {/* History Tabs */}
      <div className="bg-white rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.1)] border border-border/50">
        <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#f1f3ff] p-0 h-16 rounded-none">
                <TabsTrigger value="results" className="rounded-none font-black text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-[#f95959] transition-all">Game History</TabsTrigger>
                <TabsTrigger value="my" className="rounded-none font-black text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-[#f95959] transition-all">My History</TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="m-0 animate-in slide-in-from-left duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f95959] text-white">
                            <tr className="text-[10px] font-black uppercase">
                                <th className="py-5 px-4 text-center tracking-widest">Period</th>
                                <th className="py-5 px-2 text-center tracking-widest">Number</th>
                                <th className="py-5 px-2 text-center tracking-widest">Size</th>
                                <th className="py-5 px-4 text-center tracking-widest">Color</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {results?.map(res => (
                                <tr key={res.id} className="text-[13px] hover:bg-secondary/10 transition-colors">
                                    <td className="py-5 px-4 text-center text-muted-foreground font-bold tracking-tighter">{res.period}</td>
                                    <td className={cn("py-5 px-2 text-center font-black text-2xl", getNumberColorClass(res.number))}>
                                        {res.number}
                                    </td>
                                    <td className="py-5 px-2 text-center font-black">
                                        <span className={cn(
                                            "uppercase text-[11px] tracking-widest",
                                            res.size === 'big' ? "text-orange-500" : "text-blue-500"
                                        )}>
                                            {res.size}
                                        </span>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex gap-2 justify-center">
                                            {res.color.includes('red') && <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm border border-black/5" />}
                                            {res.color.includes('green') && <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm border border-black/5" />}
                                            {res.color.includes('violet') && <div className="w-4 h-4 rounded-full bg-purple-500 shadow-sm border border-black/5" />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </TabsContent>

            <TabsContent value="my" className="m-0 p-6 space-y-4 bg-secondary/5 min-h-[400px] animate-in slide-in-from-right duration-300">
                {myBets?.map(bet => {
                    const matchedResult = results?.find(r => r.period === bet.period);
                    const isWin = bet.status === 'win';
                    const isLoss = bet.status === 'loss';

                    return (
                        <div key={bet.id} className="bg-white p-6 rounded-[2rem] border border-border shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all hover:shadow-md">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{bet.period.slice(-4)} Round</p>
                                </div>
                                <p className="font-black text-sm text-foreground uppercase">Selection: <span className="text-primary">{bet.selection}</span></p>
                                {matchedResult && (
                                    <p className="text-[9px] font-black text-muted-foreground uppercase">Actual: {matchedResult.number} ({matchedResult.size})</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className={cn(
                                  "font-black text-xl tracking-tighter", 
                                  isWin ? "text-green-600" : isLoss ? "text-red-500" : "text-primary animate-pulse"
                                )}>
                                    {isWin ? `+₹${bet.winAmount?.toFixed(0)}` : isLoss ? `-₹${bet.amount}` : 'Settling...'}
                                </p>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Stake: ₹{bet.amount}</p>
                            </div>
                        </div>
                    );
                })}
                {(!myBets || myBets.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-4">
                        <TrendingUp size={48} />
                        <p className="text-sm font-black uppercase tracking-widest">No bets placed yet</p>
                    </div>
                )}
            </TabsContent>
        </Tabs>
      </div>

      {/* Bet Panel Dialog */}
      <Dialog open={isBetPanelOpen} onOpenChange={setIsBetPanelOpen}>
        <DialogContent className="max-w-[420px] bg-background border-border rounded-[3.5rem] p-0 overflow-hidden z-[1000] shadow-2xl">
           <DialogHeader className="p-10 pb-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Confirm Bet (X{multiplier})</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsBetPanelOpen(false)} className="rounded-full bg-secondary/50"><X size={20} /></Button>
              </div>
           </DialogHeader>

           <div className="p-10 space-y-8">
              <div className="bg-[#f1f3ff] p-8 rounded-[2.5rem] border border-border/50 flex items-center justify-between shadow-inner">
                  <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Option</p>
                      <h4 className="text-5xl font-black italic uppercase text-primary drop-shadow-sm">{selectedOption}</h4>
                  </div>
                  <div className="text-right space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Wallet</p>
                      <p className="text-2xl font-black text-foreground">₹{userProfile?.virtualBalance || 0}</p>
                  </div>
              </div>

              <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Quick Select</p>
                  <div className="grid grid-cols-4 gap-3">
                      {['10', '50', '100', '500'].map(val => (
                          <button 
                            key={val} 
                            onClick={() => setBetAmount(val)} 
                            className={cn(
                                "h-14 rounded-2xl font-black text-xs uppercase border-2 transition-all active:scale-90", 
                                betAmount === val ? "bg-primary text-white border-primary shadow-lg" : "bg-background text-foreground border-border"
                            )}
                          >
                            ₹{val}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Custom Stake</p>
                  <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-muted-foreground">₹</span>
                      <Input 
                        type="number"
                        placeholder="Enter amount..."
                        value={betAmount}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) setBetAmount(val);
                        }}
                        className="h-16 bg-[#f1f3ff] border-none rounded-[1.5rem] pl-10 pr-6 text-xl font-bold focus-visible:ring-primary shadow-inner"
                      />
                  </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-3xl flex justify-between items-center border border-primary/10">
                  <p className="text-xs font-black uppercase text-primary tracking-widest">Total Stake:</p>
                  <p className="text-3xl font-black text-primary">₹{(parseInt(betAmount) || 0) * multiplier}</p>
              </div>

              <Button 
                onClick={handlePlaceBet}
                disabled={isBetting}
                className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-[2rem] shadow-[0_20px_40px_rgba(255,51,102,0.4)] flex items-center justify-center gap-3 active:scale-95 transition-all text-xl"
              >
                  {isBetting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24} /> Confirm Prediction</>}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
