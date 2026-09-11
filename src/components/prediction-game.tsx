'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp, getDocs, where, writeBatch } from 'firebase/firestore';
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

  // --- Round Logic ---
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

  // --- Auto Generate Results (Server Prototype) ---
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

  // --- Fetch Data (50 Rounds Limit) ---
  const resultsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'game_results'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore]
  );
  const { data: results } = useCollection<GameResult>(resultsQuery);

  const myBetsQuery = useMemoFirebase(() => 
    (firestore && user) ? query(collection(firestore, 'users', user.uid, 'game_bets'), orderBy('createdAt', 'desc'), limit(50)) : null, 
    [firestore, user]
  );
  const { data: myBets } = useCollection<Bet>(myBetsQuery);

  // --- Result Processing ---
  useEffect(() => {
    if (!firestore || !user || !results || results.length === 0 || !myBets) return;

    const latestResult = results[0];
    const pendingBets = myBets.filter(b => b.status === 'pending' && b.period === latestResult.period);

    if (pendingBets.length > 0) {
        const batch = writeBatch(firestore);
        let totalWin = 0;

        pendingBets.forEach(bet => {
            let isWin = false;
            let mult = 2;

            if (typeof bet.selection === 'number') {
                isWin = bet.selection === latestResult.number;
                mult = 9;
            } else if (bet.selection === 'big' || bet.selection === 'small') {
                isWin = bet.selection === latestResult.size;
            } else {
                isWin = latestResult.color.includes(bet.selection as string);
            }

            const betRef = doc(firestore, 'users', user.uid, 'game_bets', bet.id);
            if (isWin) {
                const winAmt = bet.amount * mult;
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
            toast({ title: "Congratulations! 🎉", description: `Round ${latestResult.period.slice(-4)} result: ${latestResult.number}. You won ₹${totalWin} coins!` });
        }
        batch.commit().catch(console.error);
    }
  }, [results, myBets, firestore, user, toast]);

  const handleOpenBetPanel = (option: string | number) => {
    if (timeLeft < 5) {
        toast({ variant: 'destructive', title: "Wait for Next Round", description: "This round is locked." });
        return;
    }
    setSelectedOption(option);
    setIsBetPanelOpen(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !firestore || isBetting || selectedOption === null) return;
    const finalAmount = parseInt(betAmount) * multiplier;

    if (isNaN(finalAmount) || finalAmount < 1) {
      toast({ variant: 'destructive', title: "Invalid Amount", description: "Minimum bet is 1 coin." });
      return;
    }

    if (finalAmount > (userProfile?.virtualBalance || 0)) {
      toast({ variant: 'destructive', title: "Insufficient Balance", description: "Check your virtual wallet." });
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

      toast({ title: "Bet Placed! 🚀", description: `₹${finalAmount} on ${selectedOption}` });
      setIsBetPanelOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Error", description: "Try again later." });
    } finally {
      setIsBetting(false);
    }
  };

  const getNumberColorClass = (num: number) => {
      if (num === 0) return "bg-gradient-to-br from-red-500 to-purple-500";
      if (num === 5) return "bg-gradient-to-br from-green-500 to-purple-500";
      if ([1, 3, 7, 9].includes(num)) return "bg-green-500";
      return "bg-red-500";
  };

  return (
    <div className="space-y-4 select-none pb-20">
      {/* Top Header Card (Red) */}
      <div className="bg-[#f95959] rounded-2xl p-4 text-white flex justify-between items-center shadow-lg">
        <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">WinGo 30sec</p>
            <div className="flex gap-1">
                {results?.slice(0, 5).map(res => (
                    <div key={res.id} className={cn("w-4 h-4 rounded-full border border-white/30 flex items-center justify-center text-[8px] font-black", getNumberColorClass(res.number))}>
                        {res.number}
                    </div>
                ))}
            </div>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">Time Remaining</p>
            <div className="flex items-center gap-2 justify-end">
                <div className="flex gap-1">
                    {['0', '0', ':', '0', (timeLeft < 10 ? '0' : timeLeft.toString()[0]), (timeLeft < 10 ? timeLeft.toString() : timeLeft.toString()[1])].map((char, i) => (
                        <div key={i} className={cn("h-7 w-5 flex items-center justify-center rounded bg-white text-[#f95959] font-black text-lg", char === ':' && "bg-transparent text-white w-2")}>
                            {char}
                        </div>
                    ))}
                </div>
            </div>
            <p className="text-[11px] font-black mt-1 tracking-tight">{currentPeriod}</p>
        </div>
      </div>

      {/* Action Buttons Area */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/50 space-y-6">
          <div className="grid grid-cols-3 gap-4">
              <Button onClick={() => handleOpenBetPanel('green')} className="bg-green-500 hover:bg-green-600 h-12 rounded-xl font-black uppercase text-sm shadow-md">Green</Button>
              <Button onClick={() => handleOpenBetPanel('violet')} className="bg-purple-500 hover:bg-purple-600 h-12 rounded-xl font-black uppercase text-sm shadow-md">Violet</Button>
              <Button onClick={() => handleOpenBetPanel('red')} className="bg-red-500 hover:bg-red-600 h-12 rounded-xl font-black uppercase text-sm shadow-md">Red</Button>
          </div>

          <div className="bg-[#f6f7ff] p-4 rounded-3xl border border-blue-50/50">
              <div className="grid grid-cols-5 gap-y-6 gap-x-3">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleOpenBetPanel(num)}
                      className={cn(
                        "relative w-12 h-12 mx-auto rounded-full font-black text-xl flex items-center justify-center text-white shadow-md active:scale-90 transition-transform",
                        getNumberColorClass(num)
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
                  <button key={m} onClick={() => setMultiplier(m)} className={cn("flex-1 h-9 rounded-md text-[10px] font-bold uppercase transition-all", multiplier === m ? "bg-green-500 text-white shadow-inner" : "bg-[#f1f3ff] text-muted-foreground border border-border/30")}>X{m}</button>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => handleOpenBetPanel('big')} className="bg-[#ffae42] hover:bg-[#f39c12] h-12 rounded-l-full rounded-r-none font-black uppercase text-sm text-white">Big</Button>
              <Button onClick={() => handleOpenBetPanel('small')} className="bg-[#5d83ff] hover:bg-[#3498db] h-12 rounded-r-full rounded-l-none font-black uppercase text-sm text-white">Small</Button>
          </div>
      </div>

      {/* History Tabs */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-border/50">
        <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#f1f3ff] p-0 h-12 rounded-none">
                <TabsTrigger value="results" className="rounded-none font-bold text-[11px] uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-[#f95959]">Game History</TabsTrigger>
                <TabsTrigger value="chart" className="rounded-none font-bold text-[11px] uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-[#f95959]">Chart</TabsTrigger>
                <TabsTrigger value="my" className="rounded-none font-bold text-[11px] uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-[#f95959]">My History</TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="m-0">
                <table className="w-full">
                    <thead className="bg-[#f95959] text-white">
                        <tr className="text-[11px] font-bold uppercase">
                            <th className="py-3 px-4 text-left">Period</th>
                            <th className="py-3 px-4 text-center">Number</th>
                            <th className="py-3 px-4 text-center">Big Small</th>
                            <th className="py-3 px-4 text-center">Color</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {results?.map(res => (
                            <tr key={res.id} className="text-[12px] hover:bg-secondary/10 transition-colors">
                                <td className="py-4 px-4 font-medium text-muted-foreground">{res.period}</td>
                                <td className={cn("py-4 px-4 text-center font-black text-xl", 
                                    [1,3,7,9].includes(res.number) ? "text-green-500" : 
                                    res.number === 0 || res.number === 5 ? "text-purple-500" : "text-red-500"
                                )}>
                                    {res.number}
                                </td>
                                <td className="py-4 px-4 text-center text-muted-foreground font-semibold capitalize">{res.size}</td>
                                <td className="py-4 px-4">
                                    <div className="flex gap-1.5 justify-center">
                                        {res.color.includes('green') && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                                        {res.color.includes('red') && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                                        {res.color.includes('violet') && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TabsContent>

            <TabsContent value="my" className="m-0 p-4 space-y-3">
                {myBets?.map(bet => (
                    <div key={bet.id} className="bg-secondary/20 p-4 rounded-2xl border border-border flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{bet.period.slice(-4)} Round</p>
                            <p className="font-black text-sm">Bet: <span className="uppercase text-primary">{bet.selection}</span></p>
                            <p className="text-[10px] font-bold text-muted-foreground">Amount: ₹{bet.amount}</p>
                        </div>
                        <div className="text-right">
                            <p className={cn("font-black text-base", bet.status === 'win' ? "text-green-600" : bet.status === 'loss' ? "text-red-500" : "text-primary animate-pulse")}>
                                {bet.status === 'win' ? `+₹${bet.winAmount}` : bet.status === 'loss' ? `-₹${bet.amount}` : 'Pending...'}
                            </p>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase">{bet.createdAt ? format(bet.createdAt.toDate(), 'HH:mm:ss') : ''}</p>
                        </div>
                    </div>
                ))}
            </TabsContent>
        </Tabs>
      </div>

      {/* Betting Dialog */}
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
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selection</p>
                      <h4 className="text-3xl font-black italic uppercase text-primary">{selectedOption}</h4>
                  </div>
                  <div className="text-right space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Wallet</p>
                      <p className="text-xl font-black text-foreground">₹{userProfile?.virtualBalance || 0}</p>
                  </div>
              </div>

              <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Base Amount</p>
                  <div className="grid grid-cols-3 gap-3">
                      {['1', '10', '100', '500', '1000', '5000'].map(val => (
                          <button 
                            key={val} 
                            onClick={() => setBetAmount(val)}
                            className={cn(
                                "h-11 rounded-xl font-black text-xs uppercase transition-all active:scale-95 border-2",
                                betAmount === val ? "bg-primary text-white border-primary shadow-lg" : "bg-background text-foreground border-border"
                            )}
                          >
                              ₹{val}
                          </button>
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

/** 
 * अभिषेक भाई, useCollection यहाँ ऊपर से इम्पोर्ट किया गया है, 
 * इसे दोबारा न लिखें वरना एरर आएगा।
 */
