'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, CreditCard, ShieldCheck, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';

const PRESET_AMOUNTS = [100, 200, 300, 400, 500, 1000];
const UPI_ID = "ak63315561338@okicici"; // अभिषेक भाई, आपकी नई ICICI आईडी यहाँ डाल दी है
const PAYEE_NAME = "Abhishek Kumar"; // बैंक वेरिफिकेशन के लिए आपका असली नाम

function DepositContent() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const [amount, setAmount] = useState('100');
    const [utr, setUtr] = useState('');
    const [step, setStep] = useState<'select' | 'verify'>('select');
    const [isLoading, setIsLoading] = useState(false);

    const handlePayment = () => {
        const amt = parseInt(amount);
        if (isNaN(amt) || amt < 100) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Minimum deposit is ₹100" });
            return;
        }

        // Generate Standard UPI Deep Link for better GPay/PhonePe compatibility
        const encodedName = encodeURIComponent(PAYEE_NAME);
        const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodedName}&am=${amt}&cu=INR&tn=Deposit%20to%20Asnap`;
        
        // Open UPI App via deep linking
        window.location.href = upiUrl;
        
        // Move to verification step
        setStep('verify');
        toast({ title: "Opening UPI App", description: "Please complete the payment and note down the UTR/Ref number." });
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
                <Button variant="ghost" size="icon" onClick={() => step === 'verify' ? setStep('select') : router.back()} className="rounded-full">
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-xl font-black uppercase italic tracking-tighter">Add Money</h1>
                    <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest">Safe & Secure Gateway</p>
                </div>
            </header>

            <main className="p-6 space-y-8 max-w-lg mx-auto">
                {step === 'select' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Balance Card Styling */}
                        <div className="bg-secondary/40 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><CreditCard size={100} /></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Selected Amount</p>
                            <h2 className="text-7xl font-black text-white" style={{ fontStyle: 'normal' }}>₹{amount}</h2>
                        </div>

                        {/* Presets */}
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
                                    style={{ fontStyle: 'normal' }}
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>

                        {/* Custom Input */}
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
                                    style={{ fontStyle: 'normal' }}
                                />
                            </div>
                        </div>

                        <Button 
                            onClick={handlePayment}
                            className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-[2.5rem] shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 text-xl active:scale-95 transition-all"
                        >
                            <Zap size={24} className="fill-white" /> DEPOSIT NOW
                        </Button>

                        <div className="flex items-center justify-center gap-3 py-4 opacity-40">
                             <ShieldCheck size={16} />
                             <span className="text-[9px] font-black uppercase tracking-widest">Encrypted Transaction</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in zoom-in duration-500">
                        <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-[2.5rem] text-center space-y-4">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                <CheckCircle2 className="text-white" size={32} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase italic">Payment Started</h3>
                                <p className="text-xs text-muted-foreground">Complete payment to <b>{PAYEE_NAME}</b></p>
                            </div>
                        </div>

                        <div className="bg-secondary/40 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Verification Step</p>
                                <h4 className="text-sm font-bold text-white leading-relaxed">
                                    पेमेंट पूरा करने के बाद, ट्रांजेक्शन का **UTR/Reference Number (12 Digit)** यहाँ भरें।
                                </h4>
                            </div>

                            <Input
                                placeholder="Enter 12 Digit UTR Number"
                                value={utr}
                                onChange={(e) => setUtr(e.target.value)}
                                className="h-16 bg-background border-white/10 rounded-2xl text-2xl font-black text-center text-primary"
                                maxLength={12}
                                style={{ fontStyle: 'normal' }}
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
                            Note: Wrong UTR submissions will result in permanent account suspension. Please provide correct details.
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
