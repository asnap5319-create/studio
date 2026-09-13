'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { CheckCircle2, Loader2, X, Zap, BarChart3, Trophy, Frown, Coins, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  let h = 0;
  for (let i = 0; i < period.length; i++) {
    h = Math.imul(31, h) + period.charCodeAt(i) | 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  const num = Math.abs(h % 10);
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

  const processedBetIdsRef = useRef<Set<string>>(new Set());
  const processedPeriodsRef = useRef<Set<string>>(new Set());
  const shownPopupPeriodsRef = useRef<Set<string>>(new Set());

  const resultsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'game_results'), orderBy('period', 'desc'), limit(60)) : null, 
    [firestore]
  );
  const { data: firestoreResults } = useCollection<GameResult>(resultsQuery);

  const myBetsQuery = useMemoFirebase(() => 
    (firestore && user) ? query(collection(firestore, 'users', user.uid, 'game_bets'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore, user]
  );
  const { data: myBets } = useCollection<Bet>(myBetsQuery);

  const displayResults = useMemo(() => {
    if (!currentPeriod) return [];
    const datePart = currentPeriod.slice(0, 8);
    const basePart = currentPeriod.slice(8, 13);
    const currentRoundIndex = parseInt(currentPeriod.slice(-4));
    const fullHistory: GameResult[] = [];
    for (let i = 1; i <= 60; i++) {
        const roundIdx = currentRoundIndex - i;
        if (roundIdx < 0) continue; 
        const periodId = `${datePart}${basePart}${roundIdx.toString().padStart(4, '0')}`;
        const dbEntry = firestoreResults?.find(r => r.period === periodId);
        if (dbEntry) {
            fullHistory.push(dbEntry);
        } else {
            const mathRes = getJalwaResult(periodId);
            fullHistory.push({
                id: periodId, period: periodId, number: mathRes.num, color: mathRes.color as any, size: mathRes.size as any, createdAt: null
            });
        }
    }
    return fullHistory;
  }, [firestoreResults, currentPeriod]);

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
            const saveResult = async () => {
                if (processedPeriodsRef.current.has(currentPeriod)) return;
                processedPeriodsRef.current.add(currentPeriod);
                const { num, color, size } = getJalwaResult(currentPeriod);
                try {
                    await setDoc(doc(firestore, 'game_results', currentPeriod), {
                        id: currentPeriod, period: currentPeriod, number: num, color, size, createdAt: serverTimestamp()
                    }, { merge: true });
                } catch (e) { }
            };
            saveResult();
        }
        setCurrentPeriod(periodId);
      }
    };
    const interval = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(interval);
  }, [currentPeriod, firestore, user]);

  useEffect(() => {
    if (!firestore || !user || !displayResults.length || !myBets) return;
    const pendingBets = myBets.filter(b => b.status === 'pending' && !processedBetIdsRef.current.has(b.id));
    if (pendingBets.length === 0) return;
    const processSettlement = async () => {
        const batch = writeBatch(firestore);
        let totalWinDelta = 0;
        let updateTriggered = false;
        pendingBets.forEach(bet => {
            const result = displayResults.find(r => r.period === bet.period);
            if (result) {
                processedBetIdsRef.current.add(bet.id);
                updateTriggered = true;
                let isWin = false;
                let mult = 1.99;
                if (bet.selection === 'big') isWin = result.number >= 5;
                else if (bet.selection === 'small') isWin = result.number < 5;
                else if (typeof bet.selection === 'number') { isWin = bet.selection === result.number; mult = 9.0; }
                else {
                    isWin = result.color.includes(bet.selection as string);
                    if (result.color.includes('violet') && (bet.selection === 'red' || bet.selection === 'green')) mult = 1.5;
                    if (bet.selection === 'violet') mult = 4.5;
                }
                const betRef = doc(firestore, 'users', user.uid, 'game_bets', bet.id);
                if (isWin) {
                    const winAmt = parseFloat((bet.amount * mult).toFixed(2));
                    totalWinDelta += winAmt;
                    batch.update(betRef, { status: 'win', winAmount: winAmt });
                } else {
                    batch.update(betRef, { status: 'loss' });
                }
                if (!shownPopupPeriodsRef.current.has(bet.period)) {
                    setPopup({ 
                        isOpen: true, isWin, amount: isWin ? parseFloat((bet.amount * mult).toFixed(1)) : 0, 
                        period: bet.period, result: { num: result.number, color: result.color, size: result.size } 
                    });
                    shownPopupPeriodsRef.current.add(bet.period);
                }
            }
        });
        if (updateTriggered) {
            if (totalWinDelta > 0) {
                batch.update(doc(firestore, 'users', user.uid), { virtualBalance: increment(totalWinDelta), updatedAt: serverTimestamp() });
            }
            try { await batch.commit(); } catch (e) { console.error("Settlement error:", e); }
        }
    };
    processSettlement();
  }, [displayResults, myBets, firestore, user]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (popup.isOpen) {
      setPopupTimer(3);
      timer = setInterval(() => {
        setPopupTimer((prev) => {
          if (prev <= 1) {
            setPopup((p) => ({ ...p, isOpen: false }));
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [popup.isOpen]);

  const handleOpenBetPanel = (option: string | number) => {
    if (timeLeft <= 5) { toast({ variant: 'destructive', title: "Round Locked" }); return; }
    setSelectedOption(option); 
    setIsBetPanelOpen(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !firestore || isBetting || selectedOption === null || !userProfile) return;
    if (userProfile.hasDeposited === false) {
      toast({ variant: 'destructive', title: "Bet Locked! 🔒", description: "बेट लगाने के लिए पहले कम से कम एक बार रिचार्ज (Deposit) करें भाई। ✅" });
      setIsBetPanelOpen(false);
      return;
    }
    const amountNum = parseInt(betAmount);
    if (isNaN(amountNum) || amountNum < 1) { toast({ variant: 'destructive', title: "Invalid Amount" }); return; }
    const finalAmount = amountNum * multiplier;
    if (finalAmount > (userProfile.virtualBalance || 0)) { toast({ variant: 'destructive', title: "Low Balance" }); return; }
    setIsBetting(true);
    try {
      const batch = writeBatch(firestore);
      const betId = `bet_${Date.now()}_${user.uid.slice(0, 5)}`;
      batch.update(doc(firestore, 'users', user.uid), { virtualBalance: increment(-finalAmount), updatedAt: serverTimestamp() });
      batch.set(doc(firestore, 'users', user.uid, 'game_bets', betId), {
        id: betId, userId: user.uid, period: currentPeriod, selection: selectedOption, amount: finalAmount, status: 'pending', createdAt: serverTimestamp()
      });
      await batch.commit();
      setIsBetPanelOpen(false);
      toast({ title: "Bet Placed! ✅" });
    } catch (e) { toast({ variant: 'destructive', title: "Error" }); }
    finally { setIsBetting(false); }
  };

  return (
    <div className="space-y-6 select-none pb-24 w-full px-4">
      {userProfile?.hasDeposited === false && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
              <Lock className="text-yellow-500 h-5 w-5 shrink-0" />
              <p className="text-[10px] font-black text-yellow-500 uppercase leading-tight">
                  Betting is locked! Recharge once to unlock your ₹28 bonus and start playing.
              </p>
          </div>
      )}

      <div className="bg-[#f95959] rounded-[2.5rem] p-6 text-white flex justify-between items-center shadow-xl relative overflow-hidden">
        <div className="space-y-3 z-10">
            <div className="flex items-center gap-1.5"><Zap size={14} className="fill-white" /><p className="text-[9px] font-black uppercase tracking-[0.2em]">WinGo 30S</p></div>
            <div className="flex gap-1.5">
                {displayResults.slice(0, 5).map(res => (
                    <div key={res.id} className={cn("w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-black shadow-md", res.color.includes('green') ? "bg-green-500" : "bg-red-500")} style={{ fontStyle: 'normal' }}>{res.number}</div>
                ))}
            </div>
        </div>
        <div className="text-right z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-90 mb-2">{timeLeft <= 5 ? "Wait" : "Time Left"}</p>
            <div className="flex items-center justify-end">
                {timeLeft <= 5 ? (
                    <div className="h-12 flex items-center justify-center px-4 rounded-xl bg-white text-red-600 font-black text-lg shadow-xl animate-pulse uppercase">Wait</div>
                ) : (
                    ['0', '0', ':', (timeLeft < 10 ? '0' : timeLeft.toString()[0]), (timeLeft < 10 ? timeLeft.toString() : (timeLeft.toString()[1] || '0'))].map((char, i) => (
                        <div key={i} className={cn("h-12 w-9 flex items-center justify-center rounded-xl bg-white text-[#f95959] font-black text-2xl shadow-xl mx-0.5", char === ':' && "bg-transparent text-white w-2 shadow-none")} style={{ fontStyle: 'normal' }}>{char}</div>
                    ))
                )}
            </div>
        </div>
      </div>

      <div className="bg-secondary/40 rounded-[3rem] p-6 shadow-2xl border border-white/5 space-y-6 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-3">
              <Button onClick={() => handleOpenBetPanel('green')} className="bg-green-500 hover:bg-green-600 h-14 rounded-2xl font-black uppercase text-xs shadow-lg">Green</Button>
              <Button onClick={() => handleOpenBetPanel('violet')} className="bg-purple-500 hover:bg-purple-600 h-14 rounded-2xl font-black uppercase text-xs shadow-lg">Violet</Button>
              <Button onClick={() => handleOpenBetPanel('red')} className="bg-red-500 hover:bg-red-600 h-14 rounded-2xl font-black uppercase text-xs shadow-lg">Red</Button>
          </div>
          <div className="bg-background/60 p-5 rounded-2xl border border-white/5 shadow-inner">
              <div className="grid grid-cols-5 gap-3">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button key={num} onClick={() => handleOpenBetPanel(num)} className={cn("relative w-11 h-11 mx-auto rounded-full font-black text-lg flex items-center justify-center text-white shadow-lg active:scale-90 transition-all", num === 0 || num === 5 ? "bg-gradient-to-br from-purple-500 to-red-500" : [1, 3, 7, 9].includes(num) ? "bg-green-500" : "bg-red-500")} style={{ fontStyle: 'normal' }}>{num}</button>
                  ))}
              </div>
          </div>
          <div className="flex justify-between items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
              {[1, 5, 10, 20, 50, 100].map(m => (
                  <button key={m} onClick={() => setMultiplier(m)} className={cn("flex-1 min-w-[50px] h-10 rounded-lg text-[10px] font-black uppercase transition-all", multiplier === m ? "bg-primary text-white shadow-lg" : "bg-white/5 text-white/40 border border-white/5")}>X{m}</button>
              ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => handleOpenBetPanel('big')} className="bg-orange-500 hover:bg-orange-600 h-14 rounded-2xl font-black uppercase text-xl text-white shadow-lg">Big</Button>
              <Button onClick={() => handleOpenBetPanel('small')} className="bg-blue-500 hover:bg-blue-600 h-14 rounded-2xl font-black uppercase text-xl text-white shadow-lg">Small</Button>
          </div>
      </div>

      <div className="bg-secondary/40 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
        <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-background/50 p-1 h-12 rounded-none border-b border-white/5">
                <TabsTrigger value="results" className="rounded-none font-black text-[10px] uppercase data-[state=active]:bg-primary/20 data-[state=active]:text-primary">History</TabsTrigger>
                <TabsTrigger value="my" className="rounded-none font-black text-[10px] uppercase data-[state=active]:bg-primary/20 data-[state=active]:text-primary">My Bets</TabsTrigger>
            </TabsList>
            <TabsContent value="results" className="m-0">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-background/80 text-white/40 sticky top-0 z-10 backdrop-blur-md">
                            <tr className="text-[8px] font-black uppercase">
                                <th className="py-4 px-4">Period</th>
                                <th className="py-4 px-2 text-center">Num</th>
                                <th className="py-4 px-2 text-center">Size</th>
                                <th className="py-4 px-4 text-center">Color</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {displayResults.map(res => (
                                <tr key={res.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-4 px-4 text-[10px] font-bold text-white/50" style={{ fontStyle: 'normal' }}>{res.period.slice(-4)}</td>
                                    <td className={cn("py-4 px-2 text-center font-black text-xl", res.number === 0 || res.number === 5 ? "text-purple-400" : [1, 3, 7, 9].includes(res.number) ? "text-green-400" : "text-red-400")} style={{ fontStyle: 'normal' }}>{res.number}</td>
                                    <td className="py-4 px-2 text-center font-black text-[10px] uppercase text-white/80">{res.size}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex gap-1 justify-center">
                                            {res.number === 0 ? <><div className="w-3.5 h-3.5 rounded-full bg-red-500" /><div className="w-3.5 h-3.5 rounded-full bg-purple-500" /></> : res.number === 5 ? <><div className="w-3.5 h-3.5 rounded-full bg-green-500" /><div className="w-3.5 h-3.5 rounded-full bg-purple-500" /></> : <div className={cn("w-3.5 h-3.5 rounded-full", res.color.includes('green') ? "bg-green-500" : "bg-red-500")} />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </TabsContent>
            <TabsContent value="my" className="m-0 p-4 space-y-3 bg-background/20 min-h-[300px]">
                {myBets && myBets.length > 0 ? (
                    myBets.map(bet => (
                        <div key={bet.id} className="bg-secondary/60 p-4 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn("px-3 py-1 rounded-lg flex items-center justify-center font-black text-[8px] uppercase", bet.status === 'win' ? "bg-green-500 text-white" : bet.status === 'loss' ? "bg-red-500 text-white" : "bg-primary/20 text-primary")}>
                                    {bet.status}
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-white/40 uppercase" style={{ fontStyle: 'normal' }}>{bet.period.slice(-4)} Round</p>
                                    <p className="text-[10px] font-black uppercase text-white">{bet.selection}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={cn("font-black text-lg", bet.status === 'win' ? "text-green-400" : bet.status === 'loss' ? "text-red-400" : "text-primary")} style={{ fontStyle: 'normal' }}>
                                    {bet.status === 'win' ? `+₹${bet.winAmount?.toFixed(1)}` : bet.status === 'loss' ? `-₹${bet.amount}` : `₹${bet.amount}`}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-20"><BarChart3 size={30} className="text-white" /><p className="text-[10px] font-black uppercase tracking-widest mt-2 text-white">No History</p></div>
                )}
            </TabsContent>
        </Tabs>
      </div>

      <Sheet open={isBetPanelOpen} onOpenChange={setIsBetPanelOpen}>
        <SheetContent side="bottom" className="h-[75vh] bg-background border-white/5 rounded-t-[2.5rem] p-0 overflow-hidden z-[1000] text-white outline-none">
           <SheetHeader className="p-6 pb-2 flex flex-row items-center justify-between border-b border-white/5">
                <SheetTitle className="text-xl font-black uppercase tracking-tighter text-white italic">PLACE BET</SheetTitle>
                <button onClick={() => setIsBetPanelOpen(false)} className="p-1.5 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                </button>
           </SheetHeader>
           <div className="p-6 space-y-6 overflow-y-auto h-full pb-24 scrollbar-hide">
              <div className="bg-secondary/60 p-6 rounded-3xl flex items-center justify-between border border-white/5 shadow-2xl relative overflow-hidden group">
                  <div className="space-y-1 relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">CHOICE</p>
                      <h4 className={cn("text-5xl font-black uppercase", typeof selectedOption === 'string' && selectedOption === 'big' ? "text-orange-400" : typeof selectedOption === 'string' && selectedOption === 'small' ? "text-blue-400" : "text-primary")} style={{ fontStyle: 'normal' }}>{selectedOption}</h4>
                  </div>
                  <div className="text-right space-y-1 relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">BALANCE</p>
                      <p className="text-2xl font-black text-white" style={{ fontStyle: 'normal' }}>₹{userProfile?.virtualBalance?.toFixed(1) || '0.0'}</p>
                  </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                  {[10, 50, 100, 500].map(amt => (
                      <button key={amt} onClick={() => setBetAmount(amt.toString())} className={cn("h-12 rounded-xl text-xs font-black uppercase border-2 transition-all active:scale-90", betAmount === amt.toString() ? "bg-primary text-white border-primary" : "bg-white/5 text-white/60 border-transparent")}>₹{amt}</button>
                  ))}
              </div>
              <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">CUSTOM AMOUNT</p>
                  <Input type="number" placeholder="Amount..." value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="h-16 bg-white/5 border-white/10 rounded-2xl text-2xl font-black px-6 text-white focus:ring-primary" style={{ fontStyle: 'normal' }} />
              </div>
              <div className="bg-primary/10 p-5 rounded-2xl flex justify-between items-center border border-primary/20 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">TOTAL PAY:</p>
                  <p className="text-4xl font-black text-primary" style={{ fontStyle: 'normal' }}>₹{(parseInt(betAmount) || 0) * multiplier}</p>
              </div>
              <Button onClick={handlePlaceBet} disabled={isBetting} className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg active:scale-95 transition-all mb-6">
                  {isBetting ? <div className="flex items-center gap-2"><Loader2 className="animate-spin h-6 w-6" /><span>BETTING...</span></div> : <><CheckCircle2 size={24} /> CONFIRM BET</>}
              </Button>
           </div>
        </SheetContent>
      </Sheet>

      <Dialog open={popup.isOpen} onOpenChange={(open) => !open && setPopup(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className={cn("max-w-[300px] p-0 border-none rounded-[2.5rem] overflow-hidden shadow-2xl z-[2000] animate-in zoom-in duration-300", popup.isWin ? "bg-red-600 animate-win-glow" : "bg-blue-600")}>
            {popup.isWin && <div className="absolute inset-0 animate-shimmer-overlay pointer-events-none z-0" />}
            <div className="relative p-8 flex flex-col items-center text-center text-white space-y-6 z-10">
                <button onClick={() => setPopup(prev => ({ ...prev, isOpen: false }))} className="absolute top-4 right-4 p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={16} /></button>
                <div className={cn("w-20 h-20 rounded-full flex items-center justify-center shadow-2xl", popup.isWin ? "bg-yellow-400 text-red-900" : "bg-white/10 text-white")}>
                    {popup.isWin ? <Trophy size={40} /> : <Frown size={40} />}
                </div>
                <div className="space-y-1">
                    <h2 className="text-5xl font-black uppercase tracking-tight">{popup.isWin ? "WIN!" : "LOSE"}</h2>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{popup.isWin ? "Congratulations" : "Better luck next time"}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 w-full space-y-3 shadow-inner border border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Result: {popup.period.slice(-4)}</p>
                    <div className="flex items-center justify-center gap-3">
                        <div className={cn("w-11 h-11 rounded-full flex items-center justify-center font-black text-2xl border-2 border-white/20 shadow-lg", popup.result?.num === 0 || popup.result?.num === 5 ? "bg-purple-600" : [1,3,7,9].includes(popup.result?.num || 0) ? "bg-green-600" : "bg-red-600")} style={{ fontStyle: 'normal' }}>{popup.result?.num}</div>
                        <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase bg-white/20">{popup.result?.size}</span>
                    </div>
                </div>
                {popup.isWin && (
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400">Winning</p>
                        <div className="flex items-center justify-center gap-1.5"><Coins size={16} className="text-yellow-400" /><h3 className="text-4xl font-black" style={{ fontStyle: 'normal' }}>₹{popup.amount?.toFixed(1) || '0.0'}</h3></div>
                    </div>
                )}
                <div className="w-full pt-2">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-white transition-all duration-1000 ease-linear" style={{ width: `${(popupTimer / 3) * 100}%` }} /></div>
                    <p className="text-[7px] font-black uppercase tracking-widest mt-3 opacity-40">Closing in {popupTimer}s</p>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
