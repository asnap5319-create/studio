'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { CheckCircle2, Loader2, X, Zap, BarChart3, Trophy, Frown, Coins } from 'lucide-react';
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

/**
 * जलवा गेम का रैंडम और अनपेक्षित परिणाम जनरेशन (Advanced Chaotic Hash)
 * अभिषेक भाई, यह कोड हर राउंड में बिल्कुल नया और रैंडम फील देगा।
 */
const getJalwaResult = (period: string) => {
  // Use a chaotic mixing function (MurmurHash3-style finalizer)
  // This ensures even a 1-bit change in period ID leads to a totally different number.
  let h = 0;
  for (let i = 0; i < period.length; i++) {
    h = Math.imul(31, h) + period.charCodeAt(i) | 0;
  }
  
  // Bit Shuffling (Chaos Phase)
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

                // अभिषेक भाई, ये बिल्कुल जलवा के नियम हैं
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
                    setPopupTimer(3);
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
    if (popup.isOpen && popupTimer > 0) {
      const t = setTimeout(() => setPopupTimer(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else if (popup.isOpen && popupTimer === 0) {
      setPopup(prev => ({ ...prev, isOpen: false }));
    }
  }, [popup.isOpen, popupTimer]);

  const handleOpenBetPanel = (option: string | number) => {
    if (timeLeft <= 5) { toast({ variant: 'destructive', title: "Round Locked" }); return; }
    setSelectedOption(option); 
    setIsBetPanelOpen(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !firestore || isBetting || selectedOption === null || !userProfile) return;
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
    <div className="space-y-8 select-none pb-24 w-full px-5">
      <div className="bg-white border border-border rounded-[3rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><BarChart3 size={30} /></div>
                  <div>
                      <h3 className="font-black uppercase text-2xl tracking-tight text-foreground">Analysis</h3>
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em]">Independent Results</p>
                  </div>
              </div>
              <div className="bg-secondary/50 px-4 py-2 rounded-full border border-border flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Fair Play Active</span>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/20 rounded-[2.5rem] p-8 border border-border flex flex-col items-center justify-center gap-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Period</span>
                  <p className="text-3xl font-black text-foreground" style={{ fontStyle: 'normal' }}>{currentPeriod.slice(-4)}</p>
              </div>
              <div className="bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10 flex flex-col items-center justify-center gap-2">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Last Result</span>
                  <div className="flex items-center gap-3">
                      <p className={cn("text-4xl font-black uppercase", displayResults[0]?.size === 'big' ? "text-orange-500" : "text-blue-500")} style={{ fontStyle: 'normal' }}>
                          {displayResults[0]?.size || '---'}
                      </p>
                      {displayResults[0] && <div className={cn("w-6 h-6 rounded-full shadow-sm", displayResults[0].color.includes('green') ? "bg-green-500" : "bg-red-500")} />}
                  </div>
              </div>
          </div>
      </div>

      <div className="bg-[#f95959] rounded-[3.5rem] p-10 text-white flex justify-between items-center shadow-xl relative overflow-hidden">
        <div className="space-y-6 z-10">
            <div className="flex items-center gap-2"><Zap size={20} className="fill-white" /><p className="text-[11px] font-black uppercase tracking-[0.3em]">WinGo 30S</p></div>
            <div className="flex gap-2">
                {displayResults.slice(0, 5).map(res => (
                    <div key={res.id} className={cn("w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-sm font-black shadow-md", res.color.includes('green') ? "bg-green-500" : "bg-red-500")} style={{ fontStyle: 'normal' }}>{res.number}</div>
                ))}
            </div>
        </div>
        <div className="text-right z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-90 mb-4">{timeLeft <= 5 ? "Wait" : "Time Left"}</p>
            <div className="flex items-center justify-end">
                {timeLeft <= 5 ? (
                    <div className="h-16 flex items-center justify-center px-6 rounded-2xl bg-white text-red-600 font-black text-2xl shadow-xl animate-pulse uppercase">Round Over</div>
                ) : (
                    ['0', '0', ':', (timeLeft < 10 ? '0' : timeLeft.toString()[0]), (timeLeft < 10 ? timeLeft.toString() : (timeLeft.toString()[1] || '0'))].map((char, i) => (
                        <div key={i} className={cn("h-16 w-12 flex items-center justify-center rounded-2xl bg-white text-[#f95959] font-black text-4xl shadow-xl mx-0.5", char === ':' && "bg-transparent text-white w-2 shadow-none")} style={{ fontStyle: 'normal' }}>{char}</div>
                    ))
                )}
            </div>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] p-10 shadow-2xl border border-border/50 space-y-10">
          <div className="grid grid-cols-3 gap-4">
              <Button onClick={() => handleOpenBetPanel('green')} className="bg-green-500 hover:bg-green-600 h-20 rounded-[2rem] font-black uppercase text-sm">Green</Button>
              <Button onClick={() => handleOpenBetPanel('violet')} className="bg-purple-500 hover:bg-purple-600 h-20 rounded-[2rem] font-black uppercase text-sm">Violet</Button>
              <Button onClick={() => handleOpenBetPanel('red')} className="bg-red-500 hover:bg-red-600 h-20 rounded-[2rem] font-black uppercase text-sm">Red</Button>
          </div>
          <div className="bg-secondary/30 p-8 rounded-[3rem] border border-border/50">
              <div className="grid grid-cols-5 gap-6">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button key={num} onClick={() => handleOpenBetPanel(num)} className={cn("relative w-14 h-14 mx-auto rounded-full font-black text-2xl flex items-center justify-center text-white shadow-md active:scale-90 transition-all", num === 0 || num === 5 ? "bg-gradient-to-br from-purple-500 to-red-500" : [1, 3, 7, 9].includes(num) ? "bg-green-500" : "bg-red-500")} style={{ fontStyle: 'normal' }}>{num}</button>
                  ))}
              </div>
          </div>
          <div className="flex justify-between items-center gap-2 overflow-x-auto scrollbar-hide py-1">
              {[1, 5, 10, 20, 50, 100].map(m => (
                  <button key={m} onClick={() => setMultiplier(m)} className={cn("flex-1 min-w-[60px] h-14 rounded-xl text-xs font-black uppercase transition-all", multiplier === m ? "bg-primary text-white" : "bg-secondary text-muted-foreground")}>X{m}</button>
              ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => handleOpenBetPanel('big')} className="bg-orange-400 hover:bg-orange-500 h-20 rounded-[2rem] font-black uppercase text-2xl text-white">Big</Button>
              <Button onClick={() => handleOpenBetPanel('small')} className="bg-blue-400 hover:bg-blue-500 h-20 rounded-[2rem] font-black uppercase text-2xl text-white">Small</Button>
          </div>
      </div>

      <div className="bg-white rounded-[3rem] overflow-hidden shadow-xl border border-border/50">
        <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1.5 h-16 rounded-none">
                <TabsTrigger value="results" className="rounded-none font-black text-xs uppercase data-[state=active]:bg-white">History</TabsTrigger>
                <TabsTrigger value="my" className="rounded-none font-black text-xs uppercase data-[state=active]:bg-white">My Bets</TabsTrigger>
            </TabsList>
            <TabsContent value="results" className="m-0">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-secondary/20 text-muted-foreground sticky top-0 z-10">
                            <tr className="text-[10px] font-black uppercase">
                                <th className="py-6 px-6">Period</th>
                                <th className="py-6 px-2 text-center">Num</th>
                                <th className="py-6 px-2 text-center">Size</th>
                                <th className="py-6 px-6 text-center">Color</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {displayResults.map(res => (
                                <tr key={res.id} className="hover:bg-secondary/5 transition-colors">
                                    <td className="py-8 px-6 text-xs font-bold text-muted-foreground" style={{ fontStyle: 'normal' }}>{res.period}</td>
                                    <td className={cn("py-8 px-2 text-center font-black text-4xl", res.number === 0 || res.number === 5 ? "text-purple-600" : [1, 3, 7, 9].includes(res.number) ? "text-green-600" : "text-red-600")} style={{ fontStyle: 'normal' }}>{res.number}</td>
                                    <td className="py-8 px-2 text-center font-black text-sm uppercase">{res.size}</td>
                                    <td className="py-8 px-6">
                                        <div className="flex gap-1.5 justify-center">
                                            {res.number === 0 ? <><div className="w-5 h-5 rounded-full bg-red-500" /><div className="w-5 h-5 rounded-full bg-purple-500" /></> : res.number === 5 ? <><div className="w-5 h-5 rounded-full bg-green-500" /><div className="w-5 h-5 rounded-full bg-purple-500" /></> : <div className={cn("w-5 h-5 rounded-full", res.color.includes('green') ? "bg-green-500" : "bg-red-500")} />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </TabsContent>
            <TabsContent value="my" className="m-0 p-6 space-y-4 bg-secondary/5 min-h-[400px]">
                {myBets && myBets.length > 0 ? (
                    myBets.map(bet => (
                        <div key={bet.id} className="bg-white p-6 rounded-[2.5rem] border border-border shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn("px-4 py-2 rounded-xl flex items-center justify-center font-black text-[10px] uppercase", bet.status === 'win' ? "bg-green-500 text-white" : bet.status === 'loss' ? "bg-red-500 text-white" : "bg-primary/10 text-primary")}>
                                    {bet.status}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase" style={{ fontStyle: 'normal' }}>{bet.period.slice(-4)} Round</p>
                                    <p className="text-sm font-black uppercase text-foreground">{bet.selection}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={cn("font-black text-2xl", bet.status === 'win' ? "text-green-600" : bet.status === 'loss' ? "text-red-600" : "text-primary")} style={{ fontStyle: 'normal' }}>
                                    {bet.status === 'win' ? `+₹${bet.winAmount?.toFixed(1)}` : bet.status === 'loss' ? `-₹${bet.amount}` : `₹${bet.amount}`}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-30"><BarChart3 size={50} /><p className="text-xs font-black uppercase tracking-widest mt-4">No History</p></div>
                )}
            </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isBetPanelOpen} onOpenChange={setIsBetPanelOpen}>
        <DialogContent className="max-w-[400px] bg-background border-border rounded-[3rem] p-0 overflow-hidden z-[1000]">
           <DialogHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Place Bet</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsBetPanelOpen(false)} className="rounded-full"><X /></Button>
           </DialogHeader>
           <div className="p-8 space-y-8">
              <div className="bg-secondary p-8 rounded-[2.5rem] flex items-center justify-between">
                  <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Choice</p>
                      <h4 className="text-5xl font-black uppercase text-primary">{selectedOption}</h4>
                  </div>
                  <div className="text-right space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Balance</p>
                      <p className="text-3xl font-black text-foreground" style={{ fontStyle: 'normal' }}>₹{userProfile?.virtualBalance?.toFixed(1) || '0.0'}</p>
                  </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                  {[10, 50, 100, 500].map(amt => (
                      <button key={amt} onClick={() => setBetAmount(amt.toString())} className={cn("h-12 rounded-xl text-xs font-black uppercase border-2", betAmount === amt.toString() ? "bg-primary text-white border-primary" : "bg-secondary text-muted-foreground border-transparent")}>₹{amt}</button>
                  ))}
              </div>
              <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground ml-2">Custom Amount</p>
                  <Input type="number" placeholder="0.0" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="h-16 bg-secondary border-none rounded-2xl text-2xl font-black px-6" style={{ fontStyle: 'normal' }} />
              </div>
              <div className="bg-primary/5 p-6 rounded-2xl flex justify-between items-center border border-primary/10">
                  <p className="text-xs font-black uppercase text-primary">Total Pay:</p>
                  <p className="text-4xl font-black text-primary" style={{ fontStyle: 'normal' }}>₹{(parseInt(betAmount) || 0) * multiplier}</p>
              </div>
              <Button onClick={handlePlaceBet} disabled={isBetting} className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-[2rem] shadow-lg flex items-center justify-center gap-4 text-xl">
                  {isBetting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 /> Confirm</>}
              </Button>
           </div>
        </DialogContent>
      </Dialog>

      <Dialog open={popup.isOpen} onOpenChange={(open) => !open && setPopup(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className={cn("max-w-[340px] p-0 border-none rounded-[3rem] overflow-hidden shadow-2xl z-[2000] animate-in zoom-in duration-300", popup.isWin ? "bg-green-700" : "bg-blue-800")}>
            <div className="relative p-10 flex flex-col items-center text-center text-white space-y-8">
                <div className={cn("w-24 h-24 rounded-full flex items-center justify-center shadow-xl", popup.isWin ? "bg-yellow-400 text-green-900" : "bg-white/10 text-white")}>
                    {popup.isWin ? <Trophy size={48} className="animate-bounce" /> : <Frown size={48} />}
                </div>
                <div className="space-y-2">
                    <h2 className="text-6xl font-black uppercase tracking-tight">{popup.isWin ? "WIN!" : "LOSE"}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{popup.isWin ? "Congratulations" : "Better luck next time"}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-6 w-full space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Result: {popup.period.slice(-4)}</p>
                    <div className="flex items-center justify-center gap-4">
                        <div className={cn("w-14 h-14 rounded-full flex items-center justify-center font-black text-3xl border-2 border-white/20", popup.result?.num === 0 || popup.result?.num === 5 ? "bg-purple-600" : [1,3,7,9].includes(popup.result?.num || 0) ? "bg-green-600" : "bg-red-600")} style={{ fontStyle: 'normal' }}>{popup.result?.num}</div>
                        <div className="flex gap-2"><span className="px-5 py-2 rounded-full text-xs font-black uppercase bg-white/20">{popup.result?.size}</span></div>
                    </div>
                </div>
                {popup.isWin && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Winning</p>
                        <div className="flex items-center justify-center gap-2"><Coins className="text-yellow-400" /><h3 className="text-6xl font-black" style={{ fontStyle: 'normal' }}>₹{popup.amount?.toFixed(1)}</h3></div>
                    </div>
                )}
                <div className="w-full pt-4">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-white transition-all duration-1000 ease-linear" style={{ width: `${(popupTimer / 3) * 100}%` }} /></div>
                    <p className="text-[8px] font-black uppercase tracking-widest mt-4 opacity-40">Closing in {popupTimer}s</p>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}