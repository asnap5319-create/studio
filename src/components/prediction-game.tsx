'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, increment, setDoc, serverTimestamp, writeBatch, addDoc } from 'firebase/firestore';
import { CheckCircle2, Loader2, X, TrendingUp, Zap, Sparkles, ShieldCheck, Target, BarChart3, Clock, Trophy, Frown, Coins } from 'lucide-react';
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

interface PopupData {
    isOpen: boolean;
    isWin: boolean;
    amount: number;
    period: string;
    result: {
        num: number;
        color: string;
        size: string;
    } | null;
}

const getJalwaResult = (period: string) => {
  let hash = 0;
  for (let i = 0; i < period.length; i++) {
    hash = (hash << 5) - hash + period.charCodeAt(i);
    hash |= 0; 
  }
  const num = Math.abs(hash) % 10;
  
  let color: 'red' | 'green' | 'violet' | 'red-violet' | 'green-violet' = 'red';
  if (num === 0) color = 'red-violet';
  else if (num === 5) color = 'green-violet';
  else if ([1, 3, 7, 9].includes(num)) color = 'green';
  else color = 'red';

  const size = num >= 5 ? 'big' : 'small';

  return { num, color, size };
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
  
  const [popup, setPopup] = useState<PopupData>({ 
    isOpen: false, isWin: false, amount: 0, period: '', result: null 
  });
  const [popupTimer, setPopupTimer] = useState(3);
  const shownPeriodsRef = useRef<Set<string>>(new Set());
  const processedPeriods = useRef<Set<string>>(new Set());

  const [displayResults, setDisplayResults] = useState<GameResult[]>([]);
  const [displayBets, setDisplayBets] = useState<Bet[]>([]);

  const resultsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'game_results'), orderBy('period', 'desc'), limit(50)) : null, 
    [firestore]
  );
  const { data: results, isLoading: isHistoryLoading } = useCollection<GameResult>(resultsQuery);

  const myBetsQuery = useMemoFirebase(() => 
    (firestore && user) ? query(collection(firestore, 'users', user.uid, 'game_bets'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore, user]
  );
  const { data: myBets } = useCollection<Bet>(myBetsQuery);

  useEffect(() => {
    if (results && results.length > 0) {
      setDisplayResults(results);
    }
  }, [results]);

  useEffect(() => {
    if (myBets) {
      setDisplayBets(myBets);
    }
  }, [myBets]);

  const generateResult = async (periodToProcess: string) => {
    if (!firestore || !user) return;
    if (processedPeriods.current.has(periodToProcess)) return;
    processedPeriods.current.add(periodToProcess);

    try {
        const resultDocRef = doc(firestore, 'game_results', periodToProcess);
        const { num, color, size } = getJalwaResult(periodToProcess);

        await setDoc(resultDocRef, {
            id: periodToProcess,
            period: periodToProcess,
            number: num,
            color,
            size,
            createdAt: serverTimestamp()
        }, { merge: false });
    } catch (e: any) {}
  };

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const seconds = now.getUTCSeconds();
      const remaining = 30 - (seconds % 30);
      setTimeLeft(remaining);

      const datePart = format(now, 'yyyyMMdd');
      const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      const roundIndexInDay = (utcMinutes * 2 + Math.floor(seconds / 30));
      const periodId = `${datePart}10001${(roundIndexInDay).toString().padStart(4, '0')}`;
      
      if (periodId !== currentPeriod) {
        if (currentPeriod) { generateResult(currentPeriod); }
        setCurrentPeriod(periodId);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentPeriod, firestore, user]);

  useEffect(() => {
    if (!firestore || !user || !results || results.length === 0 || !myBets) return;

    const pendingBets = myBets.filter(b => b.status === 'pending');
    if (pendingBets.length === 0) return;

    const processSettlement = async () => {
        const batch = writeBatch(firestore);
        let totalWinDelta = 0;
        let updatedCount = 0;
        let latestSettle: { win: boolean; amount: number; period: string; result: any } | null = null;

        pendingBets.forEach(bet => {
            const matchedResult = results.find(r => r.period === bet.period);
            if (matchedResult) {
                let isWin = false;
                let mult = 2;

                if (typeof bet.selection === 'number') { isWin = bet.selection === matchedResult.number; mult = 9; }
                else if (bet.selection === 'big' || bet.selection === 'small') { isWin = bet.selection === matchedResult.size; mult = 1.99; }
                else {
                    isWin = matchedResult.color.includes(bet.selection as string);
                    if (matchedResult.color.includes('violet') && (bet.selection === 'red' || bet.selection === 'green')) { mult = 1.5; }
                    if (bet.selection === 'violet') mult = 4.5;
                }

                const betRef = doc(firestore, 'users', user.uid, 'game_bets', bet.id);
                const winAmt = Math.floor(bet.amount * mult);
                
                if (isWin) { totalWinDelta += winAmt; batch.update(betRef, { status: 'win', winAmount: winAmt }); }
                else { batch.update(betRef, { status: 'loss' }); }
                
                updatedCount++;
                if (!shownPeriodsRef.current.has(bet.period)) {
                    latestSettle = { win: isWin, amount: isWin ? winAmt : 0, period: bet.period, result: matchedResult };
                    shownPeriodsRef.current.add(bet.period);
                }
            }
        });

        if (updatedCount > 0) {
            if (totalWinDelta > 0) {
                batch.update(doc(firestore, 'users', user.uid), { virtualBalance: increment(totalWinDelta) });
            }
            await batch.commit();
            if (latestSettle) {
                setPopup({ isOpen: true, isWin: latestSettle.win, amount: latestSettle.amount, period: latestSettle.period, result: { num: latestSettle.result.number, color: latestSettle.result.color, size: latestSettle.result.size } });
                setPopupTimer(3);
            }
        }
    };
    processSettlement();
  }, [results, myBets, firestore, user]);

  useEffect(() => {
    if (popup.isOpen && popupTimer > 0) {
      const t = setTimeout(() => setPopupTimer(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else if (popup.isOpen && popupTimer === 0) {
      setPopup(prev => ({ ...prev, isOpen: false }));
    }
  }, [popup.isOpen, popupTimer]);

  const handleOpenBetPanel = (option: string | number) => {
    if (timeLeft < 5) { toast({ variant: 'destructive', title: "Round Locked", description: "Wait for next round." }); return; }
    setSelectedOption(option); setIsBetPanelOpen(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !firestore || isBetting || selectedOption === null || !userProfile) return;
    const amountNum = parseInt(betAmount);
    if (isNaN(amountNum) || amountNum < 1) { toast({ variant: 'destructive', title: "Invalid Amount" }); return; }
    const finalAmount = amountNum * multiplier;
    if (finalAmount > (userProfile.virtualBalance || 0)) { toast({ variant: 'destructive', title: "Insufficient Balance" }); return; }

    setIsBetting(true);
    try {
      await updateDoc(doc(firestore, 'users', user.uid), { virtualBalance: increment(-finalAmount) });
      await addDoc(collection(firestore, 'users', user.uid, 'game_bets'), {
        userId: user.uid, period: currentPeriod, selection: selectedOption, amount: finalAmount, status: 'pending', createdAt: serverTimestamp()
      });
      toast({ title: "Bet Placed! ✅" });
      setIsBetPanelOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error" });
    } finally { setIsBetting(false); }
  };

  const getNumberColorClass = (num: number) => {
    if (num === 0 || num === 5) return "text-purple-500";
    if ([1, 3, 7, 9].includes(num)) return "text-green-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6 select-none pb-24 animate-in fade-in duration-700 w-full px-4">
      
      {/* ELITE ANALYSIS */}
      <div className="relative group w-full">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-600 to-blue-600 rounded-[2.5rem] blur opacity-30"></div>
        <div className="relative bg-white border border-primary/20 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><BarChart3 size={28} /></div>
                    <div>
                        <h3 className="font-black italic uppercase text-xl tracking-tighter text-foreground">Elite Analysis</h3>
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em]">Live Predictions</p>
                    </div>
                </div>
                <div className="bg-secondary/50 px-3 py-1.5 rounded-full border border-border flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Sync Active</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-[2.5rem] p-6 border border-border/40 flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Target Round</span>
                    <p className="text-lg font-black italic tracking-tighter text-foreground">{currentPeriod.slice(-4)}</p>
                </div>
                <div className="bg-primary/5 rounded-[2.5rem] p-6 border border-primary/20 flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Last Result</span>
                    <div className="flex items-center gap-3">
                        <p className={cn("text-3xl font-black italic uppercase tracking-tighter", displayResults[0]?.size === 'big' ? "text-orange-500" : "text-blue-500")}>
                            {displayResults[0]?.size ? displayResults[0].size.toUpperCase() : '---'}
                        </p>
                        {displayResults[0] && <div className={cn("w-4 h-4 rounded-full shadow-lg border-2 border-white", displayResults[0].color.includes('green') ? "bg-green-500" : "bg-red-500")} />}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="bg-[#f95959] rounded-[2.5rem] p-6 text-white flex justify-between items-center shadow-xl relative overflow-hidden w-full">
        <div className="space-y-4 z-10">
            <div className="flex items-center gap-2"><Zap size={14} className="fill-white" /><p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-90">WinGo 30S</p></div>
            <div className="flex gap-2">
                {displayResults.slice(0, 5).map(res => (
                    <div key={res.id} className={cn("w-7 h-7 rounded-full border border-white/40 flex items-center justify-center text-[11px] font-black shadow-lg", res.color.includes('green') ? "bg-green-500" : "bg-red-500")}>{res.number}</div>
                ))}
            </div>
        </div>
        <div className="text-right z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90 mb-3">Next Draw In</p>
            <div className="flex items-center gap-1.5 justify-end">
                {['0', '0', ':', '0', (timeLeft < 10 ? '0' : timeLeft.toString()[0]), (timeLeft < 10 ? timeLeft.toString() : (timeLeft.toString()[1] || '0'))].map((char, i) => (
                    <div key={i} className={cn("h-11 w-8 flex items-center justify-center rounded-xl bg-white text-[#f95959] font-black text-2xl shadow-xl", char === ':' && "bg-transparent text-white w-2 shadow-none")}>{char}</div>
                ))}
            </div>
            <p className="text-[11px] font-black mt-3 tracking-tighter opacity-80 bg-black/10 px-4 py-1.5 rounded-full inline-block">{currentPeriod}</p>
        </div>
      </div>

      {/* Betting Buttons */}
      <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-border/50 space-y-8 w-full">
          <div className="grid grid-cols-3 gap-4">
              <Button onClick={() => handleOpenBetPanel('green')} className="bg-green-500 hover:bg-green-600 h-16 rounded-[1.5rem] font-black uppercase text-xs">Green</Button>
              <Button onClick={() => handleOpenBetPanel('violet')} className="bg-purple-500 hover:bg-purple-600 h-16 rounded-[1.5rem] font-black uppercase text-xs">Violet</Button>
              <Button onClick={() => handleOpenBetPanel('red')} className="bg-red-500 hover:bg-red-600 h-16 rounded-[1.5rem] font-black uppercase text-xs">Red</Button>
          </div>

          <div className="bg-[#f6f7ff] p-7 rounded-[2.5rem] border border-blue-50/50">
              <div className="grid grid-cols-5 gap-y-6 gap-x-3">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button key={num} onClick={() => handleOpenBetPanel(num)} className={cn("relative w-12 h-12 mx-auto rounded-full font-black text-lg flex items-center justify-center text-white shadow-md active:scale-90 transition-all", num === 0 || num === 5 ? "bg-gradient-to-br from-purple-500 to-red-500" : [1, 3, 7, 9].includes(num) ? "bg-green-500" : "bg-red-500")}>{num}</button>
                  ))}
              </div>
          </div>

          <div className="flex justify-between items-center gap-2 overflow-x-auto scrollbar-hide">
              {[1, 5, 10, 20, 50, 100].map(m => (
                  <button key={m} onClick={() => setMultiplier(m)} className={cn("flex-1 min-w-[50px] h-11 rounded-xl text-[10px] font-black uppercase transition-all", multiplier === m ? "bg-green-500 text-white" : "bg-[#f1f3ff] text-muted-foreground")}>X{m}</button>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => handleOpenBetPanel('big')} className="bg-[#ffae42] hover:bg-[#f39c12] h-16 rounded-l-[2.5rem] rounded-r-none font-black uppercase text-sm text-white">Big</Button>
              <Button onClick={() => handleOpenBetPanel('small')} className="bg-[#5d83ff] hover:bg-[#3498db] h-16 rounded-r-[2.5rem] rounded-l-none font-black uppercase text-sm text-white">Small</Button>
          </div>
      </div>

      {/* History Tabs (Reverted to Light UI) */}
      <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-border/50 w-full">
        <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 h-14 rounded-none">
                <TabsTrigger value="results" className="rounded-none font-black text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-foreground">Game History</TabsTrigger>
                <TabsTrigger value="my" className="rounded-none font-black text-[11px] uppercase data-[state=active]:bg-white data-[state=active]:text-foreground">My History</TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="m-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-secondary/20 text-muted-foreground">
                            <tr className="text-[10px] font-black uppercase">
                                <th className="py-5 px-4">Period</th>
                                <th className="py-5 px-2 text-center">Number</th>
                                <th className="py-5 px-2 text-center">Size</th>
                                <th className="py-5 px-4 text-center">Color</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {displayResults.map(res => (
                                <tr key={res.id} className="hover:bg-secondary/10 transition-colors">
                                    <td className="py-6 px-4 text-[11px] font-medium tracking-tight text-muted-foreground">{res.period}</td>
                                    <td className={cn("py-6 px-2 text-center font-black text-2xl", getNumberColorClass(res.number))}>
                                        {res.number}
                                    </td>
                                    <td className="py-6 px-2 text-center font-black">
                                        <span className={cn("text-[12px] font-bold", res.size === 'big' ? "text-foreground" : "text-muted-foreground")}>{res.size === 'big' ? 'Big' : 'Small'}</span>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex gap-1 justify-center">
                                            {res.number === 0 ? (
                                                <><div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" /><div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm" /></>
                                            ) : res.number === 5 ? (
                                                <><div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" /><div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm" /></>
                                            ) : (
                                                <div className={cn("w-3 h-3 rounded-full shadow-sm", res.color.includes('green') ? "bg-green-500" : "bg-red-500")} />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {isHistoryLoading && [1,2,3].map(i => (
                                <tr key={i} className="animate-pulse"><td colSpan={4} className="py-10 bg-secondary/10" /></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </TabsContent>

            <TabsContent value="my" className="m-0 p-6 space-y-4 bg-secondary/5 min-h-[400px]">
                {displayBets.map(bet => {
                    const isWin = bet.status === 'win';
                    const isLoss = bet.status === 'loss';
                    return (
                        <div key={bet.id} className="bg-white p-6 rounded-[2.5rem] border border-border/50 shadow-sm flex items-center justify-between">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{bet.period.slice(-4)} Round</p>
                                <p className="font-black text-sm uppercase">Bet: <span className="text-primary">{bet.selection}</span></p>
                            </div>
                            <div className="text-right">
                                <p className={cn("font-black text-xl tracking-tighter", isWin ? "text-green-500" : isLoss ? "text-red-500" : "text-primary animate-pulse")}>
                                    {isWin ? `+₹${bet.winAmount?.toFixed(0)}` : isLoss ? `-₹${bet.amount}` : 'Settling...'}
                                </p>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Stake: ₹{bet.amount}</p>
                            </div>
                        </div>
                    );
                })}
            </TabsContent>
        </Tabs>
      </div>

      {/* Bet Dialog */}
      <Dialog open={isBetPanelOpen} onOpenChange={setIsBetPanelOpen}>
        <DialogContent className="max-w-[420px] bg-background border-border rounded-[3.5rem] p-0 overflow-hidden z-[1000] shadow-2xl">
           <DialogHeader className="p-10 pb-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-3xl font-black italic uppercase text-foreground tracking-tighter">Bet Confirmation</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsBetPanelOpen(false)} className="rounded-full bg-secondary/50"><X size={20} /></Button>
              </div>
           </DialogHeader>

           <div className="p-10 space-y-8">
              <div className="bg-secondary p-8 rounded-[2.5rem] border border-border/50 flex items-center justify-between">
                  <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selection</p>
                      <h4 className="text-5xl font-black italic uppercase text-primary">{selectedOption}</h4>
                  </div>
                  <div className="text-right space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Balance</p>
                      <p className="text-2xl font-black text-foreground">₹{userProfile?.virtualBalance || 0}</p>
                  </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                  {[10, 50, 100, 500].map(amt => (
                      <button key={amt} onClick={() => setBetAmount(amt.toString())} className={cn("h-12 rounded-xl text-xs font-black uppercase transition-all border", betAmount === amt.toString() ? "bg-primary text-white border-primary" : "bg-secondary text-muted-foreground border-transparent")}>₹{amt}</button>
                  ))}
              </div>

              <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Custom Amount</p>
                  <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-muted-foreground">₹</span>
                      <Input type="number" placeholder="Enter stake..." value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="h-16 bg-secondary border-none rounded-[1.5rem] pl-10 pr-6 text-xl font-bold" />
                  </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-3xl flex justify-between items-center border border-primary/10">
                  <p className="text-xs font-black uppercase text-primary tracking-widest">Total Stake:</p>
                  <p className="text-3xl font-black text-primary">₹{(parseInt(betAmount) || 0) * multiplier}</p>
              </div>

              <Button onClick={handlePlaceBet} disabled={isBetting} className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-[2.5rem] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-xl">
                  {isBetting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24} /> Place Prediction</>}
              </Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* RESULT POPUP */}
      <Dialog open={popup.isOpen} onOpenChange={(open) => !open && setPopup(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className={cn("max-w-[340px] p-0 border-none rounded-[2.5rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.5)] z-[2000] animate-in zoom-in duration-300", popup.isWin ? "bg-gradient-to-b from-[#2e7d32] to-[#1b5e20]" : "bg-gradient-to-b from-[#1565c0] to-[#0d47a1]")}>
            <div className="relative p-8 flex flex-col items-center text-center text-white space-y-6">
                <div className="relative">
                    <div className={cn("w-24 h-24 rounded-full flex items-center justify-center shadow-2xl relative z-10", popup.isWin ? "bg-yellow-400 text-green-900" : "bg-blue-100 text-blue-900")}>
                        {popup.isWin ? <Trophy size={48} className="animate-bounce" /> : <Frown size={48} />}
                    </div>
                    {popup.isWin && <div className="absolute -inset-4 bg-yellow-400/20 blur-2xl rounded-full animate-pulse" />}
                </div>

                <div className="space-y-1">
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter">{popup.isWin ? "Congratulations!" : "Sorry!"}</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">{popup.isWin ? "Winner Winner" : "Try Again"}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 w-full border border-white/10 space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Game Result</p>
                    <div className="flex items-center justify-center gap-4">
                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2 border-white/20 shadow-lg", popup.result?.num === 0 || popup.result?.num === 5 ? "bg-purple-600" : [1,3,7,9].includes(popup.result?.num || 0) ? "bg-green-600" : "bg-red-600")}>{popup.result?.num}</div>
                        <div className="flex flex-col items-start gap-1">
                             <div className="flex gap-2">
                                <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase border border-white/20", popup.result?.size === 'big' ? "bg-orange-500" : "bg-blue-500")}>{popup.result?.size}</span>
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-white/20 border border-white/20">{popup.result?.color.replace('-violet', '')}</span>
                             </div>
                             <p className="text-[9px] font-bold opacity-40">Round: {popup.period.slice(-4)}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {popup.isWin ? (
                        <><p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Bonus Added</p><div className="flex items-center justify-center gap-2"><Coins className="text-yellow-400" /><h3 className="text-5xl font-black italic tracking-tighter">₹{popup.amount}</h3></div></>
                    ) : (<div className="py-4"><h3 className="text-5xl font-black italic uppercase tracking-tighter opacity-50">Lose</h3></div>)}
                </div>

                <div className="w-full pt-4">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-white transition-all duration-1000 ease-linear" style={{ width: `${(popupTimer / 3) * 100}%` }} /></div>
                    <p className="text-[8px] font-black uppercase tracking-widest mt-3 opacity-40">Closing in {popupTimer}s</p>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
