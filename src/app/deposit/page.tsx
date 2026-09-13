'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, CreditCard, Zap, Sparkles, CheckCircle2, Smartphone, Camera, Clock, AlertTriangle } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';

const PRESET_AMOUNTS = [100, 200, 300, 400, 500, 1000];
const UPI_ID = "ak63315561338@okicici"; 
const PAYEE_NAME = "Abhishek Kumar"; 

function DepositContent() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const [amount, setAmount] = useState('100');
    const [utr, setUtr] = useState('');
    const [step, setStep] = useState<'select' | 'pay'>('select');
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(540); // 9 minutes in seconds

    // अभिषेक भाई, यहाँ 500 वाले पर 450 चार्ज करने का लॉजिक है
    const payableAmount = useMemo(() => {
        const amt = parseInt(amount) || 100;
        if (amt === 500) return 450; // 10% discount logic
        return amt;
    }, [amount]);

    // Timer Logic for 9 minutes
    useEffect(() => {
        if (step !== 'pay') return;
        if (timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [step, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const qrCodeUrl = useMemo(() => {
        const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${payableAmount}&cu=INR&tn=Deposit%20to%20Asnap`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(upiLink)}`;
    }, [payableAmount]);

    const handleProceedToPay = () => {
        const amt = parseInt(amount);
        if (isNaN(amt) || amt < 100) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Minimum deposit is ₹100" });
            return;
        }
        setStep('pay');
    };

    const handleOpenUpiApp = () => {
        const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${payableAmount}&cu=INR&tn=Deposit%20to%20Asnap`;
        window.location.href = upiUrl;
    };

    const submitRequest = async () => {
        if (!user || !firestore) return;

        setIsLoading(true);
        try {
            // अभिषेक भाई, अब बिना UTR के भी सबमिट हो जाएगा, बस एडमिन को चेक करना होगा
            await addDoc(collection(firestore, 'deposit_requests'), {
                userId: user.uid,
                username: user.displayName || user.email?.split('@')[0] || "User",
                amount: parseInt(amount), // यूजर को पूरा क्रेडिट मिलेगा (जैसे 500)
                payableAmount: payableAmount, // एडमिन देख सकेगा कि उसे 450 मिलने थे
                utr: utr.trim() || "NOT_PROVIDED",
                status: 'pending',
                createdAt: serverTimestamp()
            });

            toast({ title: "Request Submitted! ✅", description: "Payment processing fast. Balance will update soon." });
            router.push('/profile');
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Request failed." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 select-none">
            <header className="p-5 bg-background/80 sticky top-0 z-50 flex items-center gap-4 border-b border-white/5 backdrop-blur-xl">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => step === 'pay' ? setStep('select') : router.back()} 
                    className="rounded-full"
                >
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-xl font-black uppercase italic tracking-tighter">Add Money</h1>
                    <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest">Safe & Secure Gateway</p>
                </div>
            </header>

            <main className="p-6 space-y-8 max-w-lg mx-auto">
                {step === 'select' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-secondary/40 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><CreditCard size={120} /></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Deposit Amount</p>
                            <h2 className="text-8xl font-black text-white" style={{ fontStyle: 'normal' }}>₹{amount}</h2>
                            {amount === '500' && (
                                <div className="mt-4 inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
                                    <Sparkles size={12} />
                                    <span className="text-[10px] font-black uppercase">Special 10% Discount Applied!</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {PRESET_AMOUNTS.map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => setAmount(amt.toString())}
                                    className={cn(
                                        "h-16 rounded-2xl font-black text-lg transition-all active:scale-95 border-2 relative overflow-hidden",
                                        amount === amt.toString() 
                                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                                            : "bg-secondary/50 border-transparent text-muted-foreground"
                                    )}
                                >
                                    ₹{amt}
                                    {amt === 500 && <span className="absolute top-0 right-0 bg-yellow-400 text-black text-[7px] font-black px-1.5 py-0.5 rounded-bl-lg">OFFER</span>}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Custom Amount</p>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-white/20">₹</span>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Min 100"
                                    className="h-20 pl-12 bg-secondary/30 border-white/10 rounded-[2rem] text-4xl font-black text-white focus:ring-primary"
                                />
                            </div>
                        </div>

                        <Button 
                            onClick={handleProceedToPay}
                            className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-[2.5rem] shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 text-2xl active:scale-95 transition-all"
                        >
                            <Zap size={24} className="fill-white" /> PAY NOW
                        </Button>
                    </div>
                )}

                {step === 'pay' && (
                    <div className="space-y-6 animate-in zoom-in duration-500">
                        <div className="flex items-center justify-between bg-red-600/10 border border-red-600/30 p-4 rounded-2xl">
                             <div className="flex items-center gap-3">
                                <Clock className="text-red-500 animate-pulse" size={20} />
                                <p className="text-xs font-black uppercase text-red-500">Finish Payment In:</p>
                             </div>
                             <p className="text-2xl font-black text-red-500 font-mono tracking-tighter">{formatTime(timeLeft)}</p>
                        </div>

                        <div className="text-center space-y-1">
                             <h3 className="text-3xl font-black uppercase italic tracking-tighter">Scan & Pay</h3>
                             <p className="text-sm font-black text-primary uppercase">Amount to Transfer: ₹{payableAmount}</p>
                             {amount === '500' && <p className="text-[8px] font-bold text-green-500 uppercase">You selected ₹500, but pay only ₹450!</p>}
                        </div>

                        <div className="relative mx-auto w-80 h-80 bg-white p-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-primary/20">
                             <img 
                                src={qrCodeUrl} 
                                alt="UPI QR Code" 
                                className="w-full h-full object-contain relative z-10"
                             />
                        </div>

                        <div className="bg-secondary/40 border border-white/5 p-5 rounded-[2rem] text-center space-y-3">
                             <p className="text-xs text-white/90 font-bold leading-relaxed italic">
                                "भाई लोग, आप इस QR कोड का **स्क्रीनशॉट** ले लो या दूसरे फोन से **स्कैन** कर लो। PhonePe, GPay, Paytm कहीं से भी पैसे डाल सकते हैं।"
                             </p>
                        </div>

                        <div className="bg-secondary/40 border border-white/5 p-6 rounded-[2.5rem] space-y-4">
                            <div className="space-y-1 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Verify Transaction</p>
                                <h4 className="text-[11px] font-bold text-white uppercase opacity-70">पैसे भेजने के बाद 12 Digit UTR यहाँ भरें (Optional)</h4>
                            </div>

                            <Input
                                placeholder="Enter 12 Digit UTR Number"
                                value={utr}
                                onChange={(e) => setUtr(e.target.value)}
                                className="h-16 bg-background border-white/10 rounded-2xl text-2xl font-black text-center text-primary tracking-widest"
                                maxLength={12}
                            />

                            <Button 
                                onClick={submitRequest}
                                disabled={isLoading}
                                className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-3 shadow-lg text-lg"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24} /> SUBMIT PAYMENT</>}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1">
                            <Button 
                                onClick={handleOpenUpiApp}
                                variant="outline"
                                className="h-12 border-white/10 text-muted-foreground font-black uppercase rounded-xl flex items-center justify-center gap-2 text-[10px] opacity-50"
                            >
                                <Smartphone size={14} /> Open UPI App Directly
                            </Button>
                        </div>

                        <p className="text-[8px] text-center text-muted-foreground uppercase font-bold tracking-widest px-6 opacity-40">
                            Safe Virtual Gaming Protocol • Instant Verification
                        </p>
                    </div>
                )}
            </main>
            <BottomNav />
        </div>
    );
}

export default function DepositPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
            <DepositContent />
        </Suspense>
    );
}
