'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, increment, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { CheckCircle2, Loader2, X, Zap, BarChart3, Clock, Trophy, Frown, Coins, ChevronRight } from 'lucide-react';
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

  // Firestore Sync
  const resultsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'game_results'), orderBy('period', 'desc'), limit(50)) : null, 
    [firestore]
  );
  const { data: firestoreResults } = useCollection<GameResult>(resultsQuery);

  const myBetsQuery = useMemoFirebase(() => 
    (firestore && user) ? query(collection(firestore, 'users', user.uid, 'game_bets'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore, user]
  );
  const { data: myBets } = useCollection<Bet>(myBetsQuery);

  // Stable History Reconstruction
  const displayResults = useMemo(() => {
    const now = new Date();
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const currentSeconds = now.getUTCSeconds();
    const currentRoundIndex = (utcMinutes * 2 + Math.floor(currentSeconds / 30));
    const datePart = format(now, 'yyyyMMdd');

    const fullHistory: GameResult[] = [];

    for (let i = 1; i <= 60; i++) {
        const roundIdx = currentRoundIndex - i;
        if (roundIdx < 0) continue; 
        
        const periodId = `${datePart}10001${(roundIdx).toString().padStart(4, '0')}`;
        const dbEntry = firestoreResults?.find(r => r.period === periodId);
        
        if (dbEntry) {
            fullHistory.push(dbEntry);
        } else {
            const mathRes = getJalwaResult(periodId);
            fullHistory.push({
                id: periodId,
                period: periodId,
                number: mathRes.num,
                color: mathRes.color as any,
                size: mathRes.size as any,
                createdAt: null
            });
        }
    }
    return fullHistory;
  }, [firestoreResults, currentPeriod]);

  // Sync Timer and Period
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
        if (currentPeriod && firestore && user) {
            const generateResult = async () => {
                if (processedPeriods.current.has(currentPeriod)) return;
                processedPeriods.current.add(currentPeriod);
                const { num, color, size } = getJalwaResult(currentPeriod);
                try {
                    await setDoc(doc(firestore, 'game_results', currentPeriod), {
                        id: currentPeriod, period: currentPeriod, number: num, color, size, createdAt: serverTimestamp()
                    });
                } catch (e) {}
            };
            generateResult();
        }
        setCurrentPeriod(periodId);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentPeriod, firestore, user]);

  // Settlement Logic
  useEffect(() => {
    if (!firestore || !user || !displayResults.length || !myBets) return;

    const pendingBets = myBets.filter(b => b.status === 'pending');
    if (pendingBets.length === 0) return;

    const processSettlement = async () => {
        const batch = writeBatch(firestore);
        let totalWinDelta = 0;
        let updatedCount = 0;
        let latestSettle: { win: boolean; amount: number; period: string; result: any } | null = null;

        pendingBets.forEach(bet => {
            const matchedResult = displayResults.find(r => r.period === bet.period);
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
                
                if (isWin) { 
                    totalWinDelta += winAmt; 
                    batch.update(betRef, { status: 'win', winAmount: winAmt }); 
                } else { 
                    batch.update(betRef, { status: 'loss' }); 
                }
                
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
  }, [displayResults, myBets, firestore, user]);

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
      const batch = writeBatch(firestore);
      const userRef = doc(firestore, 'users', user.uid);
      const betId = `bet_${Date.now()}_${user.uid.slice(0, 5)}`;
      const betDocRef = doc(firestore, 'users', user.uid, 'game_bets', betId);

      batch.update(userRef, { virtualBalance: increment(-finalAmount) });
      batch.set(betDocRef, {
        id: betId,
        userId: user.uid,
        period: currentPeriod,
        selection: selectedOption,
        amount: finalAmount,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Bet Placed! ✅" });
      setIsBetPanelOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error Placing Bet" });
    } finally { setIsBetting(false); }
  };

  const getNumberColorClass = (num: number) => {
    if (num === 0 || num === 5) return "text-purple-600";
    if ([1, 3, 7, 9].includes(num)) return "text-green-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-8 select-none pb-24 animate-in fade-in duration-700 w-full px-5">
      
      {/* Analysis Card */}
      <div className="relative group w-full">
        <div className="absolute -inset-1.5 bg-gradient-to-r from-primary via-purple-600 to-blue-600 rounded-[3rem] blur opacity-40"></div>
        <div className="relative bg-white border border-primary/20 rounded-[3rem] p-10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><BarChart3 size={40} /></div>
                    <div>
                        <h3 className="font-black uppercase text-3xl tracking-tight text-foreground">Elite Analysis</h3>
                        <p className="text-[12px] font-black text-green-600 uppercase tracking-[0.3em]">Live Round Data</p>
                    </div>
                </div>
                <div className="bg-secondary/50 px-5 py-2.5 rounded-full border border-border flex items-center gap-2">
                    <div className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[11px] font-black uppercase text-muted-foreground">Sync Active</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="bg-secondary/30 rounded-[3rem] p-10 border border-border/40 flex flex-col items-center justify-center gap-4">
                    <span className="text-[12px] font-black text-muted-foreground uppercase tracking-widest">Current Round</span>
                    <p className="text-3xl font-black text-foreground">{currentPeriod.slice(-4)}</p>
                </div>
                <div className="bg-primary/5 rounded-[3rem] p-10 border border-primary/20 flex flex-col items-center justify-center gap-4">
                    <span className="text-[12px] font-black text-primary uppercase tracking-widest">Last Round</span>
                    <div className="flex items-center gap-5">
                        <p className={cn("text-5xl font-black uppercase tracking-tight", displayResults[0]?.size === 'big' ? "text-orange-500" : "text-blue-500")}>
                            {displayResults[0]?.size ? displayResults[0].size.toUpperCase() : '---'}
                        </p>
                        {displayResults[0] && <div className={cn("w-6 h-6 rounded-full shadow-lg border-2 border-white", displayResults[0].color.includes('green') ? "bg-green-500" : "bg-red-500")} />}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Timer Section */}
      <div className="bg-[#f95959] rounded-[3.5rem] p-10 text-white flex justify-between items-center shadow-xl relative overflow-hidden w-full">
        <div className="space-y-8 z-10">
            <div className="flex items-center gap-3"><Zap size={22} className="fill-white" /><p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-95">WinGo 30S</p></div>
            <div className="flex gap-3">
                {displayResults.slice(0, 5).map(res => (
                    <div key={res.id} className={cn("w-11 h-11 rounded-full border border-white/40 flex items-center justify-center text-base font-black shadow-lg", res.color.includes('green') ? "bg-green-500" : "bg-red-500")}>{res.number}</div>
                ))}
            </div>
        </div>
        <div className="text-right z-10">
            <p className="text-[12px] font-black uppercase tracking-[0.3em] opacity-95 mb-5">
                {timeLeft <= 5 ? "Processing Result" : "Round Closes In"}
            </p>
            <div className="flex items-center gap-2.5 justify-end">
                {timeLeft <= 5 ? (
                    <div className="h-16 flex items-center justify-center px-8 rounded-2xl bg-white text-red-600 font-black text-3xl shadow-xl animate-pulse uppercase tracking-tight">
                        Last Result
                    </div>
                ) : (
                    ['0', '0', ':', '0', (timeLeft < 10 ? '0' : timeLeft.toString()[0]), (timeLeft < 10 ? timeLeft.toString() : (timeLeft.toString()[1] || '0'))].map((char, i) => (
                        <div key={i} className={cn("h-16 w-12 flex items-center justify-center rounded-2xl bg-white text-[#f95959] font-black text-4xl shadow-xl", char === ':' && "bg-transparent text-white w-2 shadow-none")}>{char}</div>
                    ))
                )}
            </div>
            <p className="text-base font-black mt-5 tracking-tight opacity-80 bg-black/10 px-8 py-2.5 rounded-full inline-block">{currentPeriod}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-[4rem] p-12 shadow-2xl border border-border/50 space-y-12 w-full">
          <div className="grid grid-cols-3 gap-6">
              <Button onClick={() => handleOpenBetPanel('green')} className="bg-green-500 hover:bg-green-600 h-24 rounded-[2.5rem] font-black uppercase text-base shadow-lg shadow-green-500/20">Green</Button>
              <Button onClick={() => handleOpenBetPanel('violet')} className="bg-purple-500 hover:bg-purple-600 h-24 rounded-[2.5rem] font-black uppercase text-base shadow-lg shadow-purple-500/20">Violet</Button>
              <Button onClick={() => handleOpenBetPanel('red')} className="bg-red-500 hover:bg-red-600 h-24 rounded-[2.5rem] font-black uppercase text-base shadow-lg shadow-red-500/20">Red</Button>
          </div>

          <div className="bg-[#f6f7ff] p-10 rounded-[3.5rem] border border-blue-50/50 shadow-inner">
              <div className="grid grid-cols-5 gap-y-10 gap-x-5">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button key={num} onClick={() => handleOpenBetPanel(num)} className={cn("relative w-16 h-16 mx-auto rounded-full font-black text-3xl flex items-center justify-center text-white shadow-md active:scale-90 transition-all", num === 0 || num === 5 ? "bg-gradient-to-br from-purple-500 to-red-500" : [1, 3, 7, 9].includes(num) ? "bg-green-500" : "bg-red-500")}>{num}</button>
                  ))}
              </div>
          </div>

          <div className="flex justify-between items-center gap-4 overflow-x-auto scrollbar-hide py-2">
              {[1, 5, 10, 20, 50, 100].map(m => (
                  <button key={m} onClick={() => setMultiplier(m)} className={cn("flex-1 min-w-[70px] h-16 rounded-2xl text-[14px] font-black uppercase transition-all shadow-sm", multiplier === m ? "bg-green-500 text-white shadow-green-500/30" : "bg-[#f1f3ff] text-muted-foreground")}>X{m}</button>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
              <Button onClick={() => handleOpenBetPanel('big')} className="bg-[#ffae42] hover:bg-[#f39c12] h-24 rounded-l-[3.5rem] rounded-r-none font-black uppercase text-2xl text-white shadow-lg shadow-orange-500/20">Big</Button>
              <Button onClick={() => handleOpenBetPanel('small')} className="bg-[#5d83ff] hover:bg-[#3498db] h-24 rounded-r-[3.5rem] rounded-l-none font-black uppercase text-2xl text-white shadow-lg shadow-blue-500/20">Small</Button>
          </div>
      </div>

      {/* History Tabs */}
      <div className="bg-white rounded-[4rem] overflow-hidden shadow-2xl border border-border/50 w-full">
        <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-2 h-20 rounded-none">
                <TabsTrigger value="results" className="rounded-none font-black text-[14px] uppercase data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm">Game History</TabsTrigger>
                <TabsTrigger value="my" className="rounded-none font-black text-[14px] uppercase data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm">My History</TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="m-0">
                <div className="overflow-x-auto max-h-[800px] overflow-y-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-secondary/20 text-muted-foreground sticky top-0 z-10">
                            <tr className="text-[12px] font-black uppercase">
                                <th className="py-8 px-8">Period</th>
                                <th className="py-8 px-2 text-center">Number</th>
                                <th className="py-8 px-2 text-center">Size</th>
                                <th className="py-8 px-8 text-center">Color</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {displayResults.map(res => (
                                <tr key={res.id} className="hover:bg-secondary/10 transition-colors">
                                    <td className="py-10 px-8 text-sm font-bold tracking-tight text-muted-foreground">{res.period}</td>
                                    <td className={cn("py-10 px-2 text-center font-black text-4xl", getNumberColorClass(res.number))}>
                                        {res.number}
                                    </td>
                                    <td className="py-10 px-2 text-center font-black">
                                        <span className={cn("text-[16px] font-black", res.size === 'big' ? "text-foreground" : "text-muted-foreground")}>{res.size === 'big' ? 'Big' : 'Small'}</span>
                                    </td>
                                    <td className="py-10 px-8">
                                        <div className="flex gap-2 justify-center">
                                            {res.number === 0 ? (
                                                <><div className="w-5 h-5 rounded-full bg-red-500 shadow-sm" /><div className="w-5 h-5 rounded-full bg-purple-500 shadow-sm" /></>
                                            ) : res.number === 5 ? (
                                                <><div className="w-5 h-5 rounded-full bg-green-500 shadow-sm" /><div className="w-5 h-5 rounded-full bg-purple-500 shadow-sm" /></>
                                            ) : (
                                                <div className={cn("w-5 h-5 rounded-full shadow-sm", res.color.includes('green') ? "bg-green-500" : "bg-red-500")} />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </TabsContent>

            <TabsContent value="my" className="m-0 p-10 space-y-6 bg-secondary/5 min-h-[500px]">
                {myBets && myBets.length > 0 ? (
                    myBets.map(bet => {
                        const isWin = bet.status === 'win';
                        const isLoss = bet.status === 'loss';
                        
                        return (
                            <div key={bet.id} className="bg-white p-8 rounded-[3.5rem] border border-border/50 shadow-md space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-16 h-16 rounded-full flex items-center justify-center font-black uppercase text-sm border-2",
                                            isWin ? "bg-green-500/10 text-green-600 border-green-500" : 
                                            isLoss ? "bg-red-500/10 text-red-600 border-red-500" : 
                                            "bg-primary/10 text-primary border-primary/20"
                                        )}>
                                            {isWin ? 'WIN' : isLoss ? 'LOSS' : 'WAIT'}
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-black text-muted-foreground uppercase tracking-widest">{bet.period.slice(-4)} ROUND</p>
                                            <p className="text-[11px] font-bold text-muted-foreground">{bet.createdAt ? format(bet.createdAt.toDate(), 'HH:mm dd MMM') : 'Just now'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={cn(
                                            "inline-flex px-5 py-2 rounded-full text-[12px] font-black uppercase tracking-widest mb-2", 
                                            isWin ? "bg-green-500 text-white" : 
                                            isLoss ? "bg-red-500 text-white" : 
                                            "bg-secondary text-muted-foreground"
                                        )}>
                                            {isWin ? 'WINNING' : isLoss ? 'LOSING' : 'SETTLING...'}
                                        </div>
                                        <p className={cn(
                                            "font-black text-3xl tracking-tight", 
                                            isWin ? "text-green-600" : 
                                            isLoss ? "text-red-600" : 
                                            "text-primary animate-pulse"
                                        )}>
                                            {isWin ? `+₹${bet.winAmount?.toFixed(1)}` : isLoss ? `-₹${bet.amount}` : `₹${bet.amount}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-5 border-t border-dashed border-border">
                                    <div className="flex items-center gap-8">
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Choice</p>
                                            <p className="text-base font-black uppercase text-foreground">{bet.selection}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Stake</p>
                                            <p className="text-base font-black text-foreground">₹{bet.amount}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={22} className="text-muted-foreground/30" />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-28 text-center space-y-8 opacity-40">
                        <BarChart3 size={70} className="text-muted-foreground" />
                        <p className="text-base font-black uppercase tracking-[0.3em]">No bets placed yet</p>
                    </div>
                )}
            </TabsContent>
        </Tabs>
      </div>

      {/* Bet Dialog */}
      <Dialog open={isBetPanelOpen} onOpenChange={setIsBetPanelOpen}>
        <DialogContent className="max-w-[450px] bg-background border-border rounded-[4rem] p-0 overflow-hidden z-[1000] shadow-2xl">
           <DialogHeader className="p-12 pb-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-4xl font-black uppercase tracking-tight text-foreground">Predict</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsBetPanelOpen(false)} className="rounded-full bg-secondary/50 h-14 w-14"><X size={28} /></Button>
              </div>
           </DialogHeader>

           <div className="p-12 space-y-12">
              <div className="bg-secondary p-12 rounded-[3.5rem] border border-border/50 flex items-center justify-between">
                  <div className="space-y-4">
                      <p className="text-[12px] font-black uppercase text-muted-foreground tracking-widest">Target</p>
                      <h4 className="text-7xl font-black uppercase text-primary">{selectedOption}</h4>
                  </div>
                  <div className="text-right space-y-3">
                      <p className="text-[12px] font-black uppercase text-muted-foreground tracking-widest">Account</p>
                      <p className="text-4xl font-black text-foreground">₹{userProfile?.virtualBalance || 0}</p>
                  </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                  {[10, 50, 100, 500].map(amt => (
                      <button key={amt} onClick={() => setBetAmount(amt.toString())} className={cn("h-16 rounded-2xl text-base font-black uppercase transition-all border-2", betAmount === amt.toString() ? "bg-primary text-white border-primary" : "bg-secondary text-muted-foreground border-transparent")}>₹{amt}</button>
                  ))}
              </div>

              <div className="space-y-6">
                  <p className="text-[12px] font-black uppercase text-muted-foreground tracking-[0.3em] ml-2">Custom Stake</p>
                  <div className="relative">
                      <span className="absolute left-7 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-2xl">₹</span>
                      <Input type="number" placeholder="0.00" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="h-24 bg-secondary border-none rounded-[2.5rem] pl-14 pr-10 text-3xl font-black" />
                  </div>
              </div>

              <div className="bg-primary/5 p-10 rounded-[3rem] flex justify-between items-center border border-primary/10">
                  <p className="text-base font-black uppercase text-primary tracking-widest">Total Stake:</p>
                  <p className="text-5xl font-black text-primary">₹{(parseInt(betAmount) || 0) * multiplier}</p>
              </div>

              <Button onClick={handlePlaceBet} disabled={isBetting} className="w-full h-28 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-[3.5rem] shadow-xl flex items-center justify-center gap-5 active:scale-95 transition-all text-3xl">
                  {isBetting ? <Loader2 className="animate-spin w-10 h-10" /> : <><CheckCircle2 size={40} /> Confirm Bet</>}
              </Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Result Popup */}
      <Dialog open={popup.isOpen} onOpenChange={(open) => !open && setPopup(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className={cn("max-w-[360px] p-0 border-none rounded-[3.5rem] overflow-hidden shadow-[0_50px_120px_rgba(0,0,0,0.6)] z-[2000] animate-in zoom-in duration-300", popup.isWin ? "bg-gradient-to-b from-[#2e7d32] to-[#1b5e20]" : "bg-gradient-to-b from-[#1565c0] to-[#0d47a1]")}>
            <div className="relative p-12 flex flex-col items-center text-center text-white space-y-10">
                <div className="relative">
                    <div className={cn("w-32 h-32 rounded-full flex items-center justify-center shadow-2xl relative z-10", popup.isWin ? "bg-yellow-400 text-green-900" : "bg-blue-100 text-blue-900")}>
                        {popup.isWin ? <Trophy size={64} className="animate-bounce" /> : <Frown size={64} />}
                    </div>
                    {popup.isWin && <div className="absolute -inset-8 bg-yellow-400/25 blur-3xl rounded-full animate-pulse" />}
                </div>

                <div className="space-y-3">
                    <h2 className="text-6xl font-black uppercase tracking-tight">{popup.isWin ? "Winner!" : "Sorry"}</h2>
                    <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-80">{popup.isWin ? "Congratulations" : "Try Again"}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-[3rem] p-8 w-full border border-white/10 space-y-6">
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-60">Game Result</p>
                    <div className="flex items-center justify-center gap-6">
                        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center font-black text-3xl border-2 border-white/20 shadow-lg", popup.result?.num === 0 || popup.result?.num === 5 ? "bg-purple-600" : [1,3,7,9].includes(popup.result?.num || 0) ? "bg-green-600" : "bg-red-600")}>{popup.result?.num}</div>
                        <div className="flex flex-col items-start gap-2">
                             <div className="flex gap-3">
                                <span className={cn("px-5 py-2 rounded-full text-[12px] font-black uppercase border border-white/20", popup.result?.size === 'big' ? "bg-orange-500" : "bg-blue-500")}>{popup.result?.size}</span>
                                <span className="px-5 py-2 rounded-full text-[12px] font-black uppercase bg-white/20 border border-white/20">{popup.result?.color.replace('-violet', '')}</span>
                             </div>
                             <p className="text-[11px] font-bold opacity-50">Period: {popup.period.slice(-4)}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {popup.isWin ? (
                        <><p className="text-[12px] font-black uppercase tracking-widest text-yellow-400">Winning Bonus</p><div className="flex items-center justify-center gap-4"><Coins className="text-yellow-400 w-10 h-10" /><h3 className="text-7xl font-black tracking-tight">₹{popup.amount}</h3></div></>
                    ) : (<div className="py-8"><h3 className="text-7xl font-black uppercase tracking-tight opacity-50">LOSE</h3></div>)}
                </div>

                <div className="w-full pt-8">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-white transition-all duration-1000 ease-linear" style={{ width: `${(popupTimer / 3) * 100}%` }} /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-5 opacity-40">Auto Closing in {popupTimer}s</p>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}