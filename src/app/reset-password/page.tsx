'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/pwa-install-prompt';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { auth } = useFirebase();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState('');
  
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!auth || !oobCode) return;

    // Verify the reset code and get user email
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail);
      })
      .catch((error) => {
        console.error("Invalid code:", error);
        toast({ 
          variant: 'destructive', 
          title: "Invalid Link ❌", 
          description: "यह लिंक पुराना हो गया है या गलत है।" 
        });
        router.push('/forgot-password');
      });
  }, [auth, oobCode, router, toast]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !oobCode) return;

    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: "Error", description: "Password कम से कम 6 अक्षर का होना चाहिए।" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: "Error", description: "Passwords मैच नहीं कर रहे हैं।" });
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setIsSuccess(true);
      toast({ title: "Success! ✅", description: "आपका पासवर्ड बदल गया है।" });
    } catch (error: any) {
      console.error("Reset error:", error);
      toast({ variant: 'destructive', title: "Error ❌", description: "पासवर्ड बदलने में दिक्कत हुई।" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!oobCode) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">No action code found.</p>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-white">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
           <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative w-full h-full bg-money-pattern rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
                 <Lock className="w-10 h-10 text-primary" />
              </div>
           </div>
           <div className="space-y-1">
             <h1 className="text-3xl font-black italic tracking-tighter uppercase">New Password</h1>
             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Resetting for: {email}</p>
           </div>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleReset} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Input 
              type="password" 
              placeholder="New Password" 
              className="h-14 bg-secondary/30 border-white/5 rounded-2xl focus:ring-primary"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <Input 
              type="password" 
              placeholder="Confirm New Password" 
              className="h-14 bg-secondary/30 border-white/5 rounded-2xl focus:ring-primary"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />

            <Button 
              type="submit" 
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-lg transition-all active:scale-95"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> Updating...</span>
              ) : "Update Password"}
            </Button>
          </form>
        ) : (
          <div className="bg-secondary/20 border border-white/5 p-8 rounded-[2.5rem] text-center space-y-6 animate-in zoom-in duration-500">
             <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                <CheckCircle2 className="text-green-500 h-8 w-8" />
             </div>
             <div className="space-y-2">
                <p className="font-bold text-sm">Password Updated!</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bhai, tera password badal gaya hai. Ab naye password se login kar le.
                </p>
             </div>
             <Button 
               className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase text-xs flex items-center justify-center gap-2"
               onClick={() => router.push('/login?auth=true')}
             >
               Go to Login <ArrowRight size={16} />
             </Button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 pt-8 opacity-30">
           <Logo className="w-4 h-4" />
           <span className="text-[8px] font-black uppercase tracking-[0.3em]">A.snap Security Protocol</span>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
