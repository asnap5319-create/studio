'use client';

import { useState, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, CreditCard, ShieldCheck, Zap, Sparkles, CheckCircle2, QrCode, Smartphone, Camera } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';
import Image from 'next/image';

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
    const [step, setStep] = useState<'select' | 'pay' | 'verify'>('select');
    const [isLoading, setIsLoading] = useState(false);

    // Generate Dynamic QR Code URL using Google Charts API or QRServer
    const qrCodeUrl = useMemo(() => {
        const amt = parseInt(amount) || 100;
        const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${amt}&cu=INR&tn=Deposit%20to%20Asnap`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;
    }, [amount]);

    const handleProceedToPay = () => {
        const amt = parseInt(amount);
        if (isNaN(amt) || amt < 100) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Minimum deposit is ₹100" });
            return;
        }
        setStep('pay');
    };

    const handleOpenUpiApp = () => {
        const amt = parseInt(amount);
        const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${amt}&cu=INR&tn=Deposit%20to%20Asnap`;
        window.location.href = upiUrl;
    };

    const submitRequest = async () => {
        if (!user || !firestore || !utr.trim()) {
            toast({ variant: 'destructive', title: "Enter UTR", description: "Please enter the 12-digit payment reference number." });
            return;
        }

        if (utr.length < 10) {
            toast({ variant: 'destructive', title: "Invalid UTR", description: "Please enter a valid Transaction ID/UTR." });
            return;
        }

        setIsLoading(true);
        try {
            await addDoc(collection(firestore, 'deposit_requests'), {
                userId: user.uid,
                username: user.displayName || user.email?.split('@')[0] || "User",
                amount: parseInt(amount),
                utr: utr.trim(),
                status: 'pending',
                createdAt: serverTimestamp()
            });

            toast({ title: "Request Submitted! ✅", description: "Admin will verify your payment and add balance shortly." });
            router.push('/profile');
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to send request. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <header className="p-5 bg-background/80 sticky top-0 z-50 flex items-center gap-4 border-b border-white/5 backdrop-blur-xl">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                        if (step === 'pay') setStep('select');
                        else if (step === 'verify') setStep('pay');
                        else router.back();
                    }} 
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
                            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><CreditCard size={100} /></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Selected Amount</p>
                            <h2 className="text-7xl font-black text-white">₹{amount}</h2>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {PRESET_AMOUNTS.map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => setAmount(amt.toString())}
                                    className={cn(
                                        "h-14 rounded-2xl font-black text-sm transition-all active:scale-95 border-2",
                                        amount === amt.toString() 
                                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                                            : "bg-secondary/50 border-transparent text-muted-foreground"
                                    )}
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Enter Custom Amount</p>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-white/20">₹</span>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Min 100"
                                    className="h-20 pl-12 bg-secondary/30 border-white/10 rounded-[2rem] text-3xl font-black text-white focus:ring-primary"
                                />
                            </div>
                        </div>

                        <Button 
                            onClick={handleProceedToPay}
                            className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-[2.5rem] shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 text-xl active:scale-95 transition-all"
                        >
                            <Zap size={24} className="fill-white" /> DEPOSIT NOW
                        </Button>
                    </div>
                )}

                {step === 'pay' && (
                    <div className="space-y-8 animate-in zoom-in duration-500">
                        <div className="text-center space-y-2">
                             <h3 className="text-2xl font-black uppercase italic tracking-tighter">Scan & Pay</h3>
                             <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em]">Amount to Pay: ₹{amount}</p>
                        </div>

                        {/* QR Code Container */}
                        <div className="relative mx-auto w-72 h-72 bg-white p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(255,51,102,0.2)] border-4 border-primary/20">
                             <div className="absolute inset-0 bg-primary/5 rounded-[1.8rem] animate-pulse pointer-events-none" />
                             <img 
                                src={qrCodeUrl} 
                                alt="UPI QR Code" 
                                className="w-full h-full object-contain relative z-10"
                             />
                        </div>

                        <div className="bg-secondary/40 border border-white/5 p-6 rounded-[2rem] text-center space-y-4">
                             <div className="flex items-center justify-center gap-2 text-yellow-500 font-bold">
                                <Camera size={18} />
                                <span className="text-sm">Important Note:</span>
                             </div>
                             <p className="text-xs text-white/80 font-bold leading-relaxed italic">
                                "भाई लोग, आप इस QR कोड का स्क्रीनशॉट खींचकर भी किसी भी ऐप (PhonePe, GPay, Paytm) से पैसे डाल सकते हैं।"
                             </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <Button 
                                onClick={handleOpenUpiApp}
                                className="h-16 bg-white text-black hover:bg-white/90 font-black uppercase rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                            >
                                <Smartphone size={20} /> Open UPI App Directly
                            </Button>
                            
                            <Button 
                                onClick={() => setStep('verify')}
                                className="h-16 bg-primary text-white font-black uppercase rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
                            >
                                I HAVE PAID <CheckCircle2 size={20} />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'verify' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-[2.5rem] text-center space-y-4">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                <CheckCircle2 className="text-white" size={32} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase italic">Final Step</h3>
                                <p className="text-xs text-muted-foreground">Amount Paid: <b>₹{amount}</b></p>
                            </div>
                        </div>

                        <div className="bg-secondary/40 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Verification</p>
                                <h4 className="text-sm font-bold text-white leading-relaxed">
                                    पेमेंट पूरा करने के बाद, ट्रांजेक्शन का **UTR/Reference Number (12 Digit)** यहाँ भरें।
                                </h4>
                            </div>

                            <Input
                                placeholder="12 Digit UTR Number"
                                value={utr}
                                onChange={(e) => setUtr(e.target.value)}
                                className="h-16 bg-background border-white/10 rounded-2xl text-2xl font-black text-center text-primary"
                                maxLength={12}
                            />

                            <Button 
                                onClick={submitRequest}
                                disabled={isLoading || utr.length < 10}
                                className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-3 shadow-lg"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> SUBMIT FOR APPROVAL</>}
                            </Button>
                        </div>

                        <p className="text-[9px] text-center text-muted-foreground uppercase font-black tracking-[0.2em] leading-relaxed px-6">
                            Note: Wrong UTR submissions will result in permanent account suspension.
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
