'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp, doc, increment, writeBatch, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Landmark, ShieldCheck, Banknote, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/models/user';

function WithdrawContent() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const [amount, setAmount] = useState('500');
    const [name, setName] = useState('');
    const [upiId, setUpiId] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch user profile for balance
    const userRef = useMemoFirebase(() => 
        (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile & { virtualBalance?: number }>(userRef);

    // Fetch user withdrawal history to check if it's the first time
    const userWithdrawsQuery = useMemoFirebase(() => 
        (firestore && user) ? query(collection(firestore, 'withdraw_requests'), where('userId', '==', user.uid)) : null, 
    [firestore, user]);
    const { data: userWithdraws, isLoading: isHistoryLoading } = useCollection(userWithdrawsQuery);

    const isFirstWithdraw = !userWithdraws || userWithdraws.length === 0;
    const minLimit = isFirstWithdraw ? 500 : 110;

    useEffect(() => {
        if (user?.email) setEmail(user.email);
        if (!isHistoryLoading) {
            setAmount(minLimit.toString());
        }
    }, [user, isHistoryLoading, minLimit]);

    const handleWithdraw = async () => {
        const amt = parseInt(amount);
        const balance = userProfile?.virtualBalance || 0;

        if (!name.trim() || !upiId.trim() || !email.trim()) {
            toast({ variant: 'destructive', title: "Missing Info", description: "Please fill all fields." });
            return;
        }

        if (isNaN(amt) || amt < minLimit) {
            toast({ 
                variant: 'destructive', 
                title: "Invalid Amount", 
                description: isFirstWithdraw 
                    ? `भाई, पहली बार विड्रॉल कम से कम ₹500 का होना चाहिए।` 
                    : `Minimum withdrawal is ₹${minLimit}` 
            });
            return;
        }

        if (amt > balance) {
            toast({ variant: 'destructive', title: "Low Balance", description: `Your balance is ₹${balance.toFixed(1)}` });
            return;
        }

        setIsLoading(true);
        try {
            const batch = writeBatch(firestore!);
            
            // 1. Create withdrawal request
            const reqRef = collection(firestore!, 'withdraw_requests');
            await addDoc(reqRef, {
                userId: user?.uid,
                username: userProfile?.username || "User",
                holderName: name.trim(),
                upiId: upiId.trim(),
                email: email.trim(),
                amount: amt,
                status: 'pending',
                isFirstTime: isFirstWithdraw,
                createdAt: serverTimestamp()
            });

            // 2. Deduct from user balance immediately
            const uRef = doc(firestore!, 'users', user!.uid);
            batch.update(uRef, { 
                virtualBalance: increment(-amt),
                updatedAt: serverTimestamp()
            });

            await batch.commit();

            toast({ title: "Request Sent! ✅", description: "Admin will process your payment within 24 hours." });
            router.push('/profile');
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Error", description: "Request failed. Try again." });
        } finally {
            setIsLoading(false);
        }
    };

    if (isHistoryLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <header className="p-5 bg-background/80 sticky top-0 z-50 flex items-center gap-4 border-b border-white/5 backdrop-blur-xl">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-xl font-black uppercase italic tracking-tighter">Withdrawal</h1>
                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest">Secure Cashout</p>
                </div>
            </header>

            <main className="p-6 space-y-6 max-w-lg mx-auto animate-in fade-in duration-500">
                {/* Balance Card */}
                <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Landmark size={80} /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">Available Balance</p>
                    <h2 className="text-4xl font-black text-white" style={{ fontStyle: 'normal' }}>₹{userProfile?.virtualBalance?.toFixed(1) || '0.0'}</h2>
                </div>

                {isFirstWithdraw && (
                    <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                        <Info className="text-blue-400 h-5 w-5 shrink-0" />
                        <p className="text-[10px] font-black text-blue-400 uppercase leading-tight">
                            First Withdrawal Rule: Minimum ₹500 required for your first payout.
                        </p>
                    </div>
                )}

                <div className="bg-secondary/40 border border-white/5 p-6 rounded-[2.5rem] space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                                Amount (Min ₹{minLimit})
                            </p>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-white/20">₹</span>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="h-16 pl-12 bg-background border-white/10 rounded-2xl text-2xl font-black text-white focus:ring-primary"
                                    style={{ fontStyle: 'normal' }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Account Holder Name</p>
                            <Input
                                placeholder="Enter Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-14 bg-background border-white/10 rounded-2xl font-bold px-6"
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">UPI ID (PhonePe / GPay)</p>
                            <Input
                                placeholder="example@ybl"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                className="h-14 bg-background border-white/10 rounded-2xl font-bold px-6"
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Email Address</p>
                            <Input
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-14 bg-background border-white/10 rounded-2xl font-bold px-6"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                        <p className="text-[10px] text-yellow-500/80 font-bold leading-relaxed uppercase">
                            Warning: Incorrect UPI details will result in loss of funds.
                        </p>
                    </div>

                    <Button 
                        onClick={handleWithdraw}
                        disabled={isLoading}
                        className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg active:scale-95 transition-all"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <><Banknote size={24} /> WITHDRAW NOW</>}
                    </Button>
                </div>

                <div className="flex items-center justify-center gap-3 opacity-30">
                    <ShieldCheck size={16} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Encrypted Payout Request</span>
                </div>
            </main>
            <BottomNav />
        </div>
    );
}

export default function WithdrawPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
            <WithdrawContent />
        </Suspense>
    );
}
