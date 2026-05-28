'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mail, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/pwa-install-prompt';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email.trim()) return;

    setIsLoading(true);
    try {
      // अभिषेक भाई, ये सेटिंग्स गूगल को बोलेंगी कि लिंक सीधे हमारे ऐप पर भेजे
      const actionCodeSettings = {
        url: `https://asnap.vercel.app/reset-password`,
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      setIsSent(true);
      toast({ title: "Link Sent! 📧", description: "ईमेल चेक करो भाई, लिंक भेज दिया है।" });
    } catch (error: any) {
      console.error("Reset error:", error);
      let msg = "ईमेल भेजने में दिक्कत हुई। सही ईमेल डालो और चेक करो कि Domain authorized है या नहीं।";
      if (error.code === 'auth/unauthorized-continue-uri') {
        msg = "भाई, Firebase Console में asnap.vercel.app को Authorized Domains में ऐड करो।";
      }
      toast({ 
        variant: 'destructive', 
        title: "Error ❌", 
        description: msg 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-white">
      <div className="w-full max-w-sm space-y-8">
        <button 
          onClick={() => router.push('/login?auth=true')} 
          className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group"
        >
          <div className="p-2 bg-white/5 rounded-full group-hover:bg-white/10">
            <ArrowLeft size={18} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">Back to Login</span>
        </button>

        <div className="text-center space-y-4">
           <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-full h-full bg-money-pattern rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
                 <ShieldCheck className="w-10 h-10 text-primary" />
              </div>
           </div>
           <div className="space-y-1">
             <h1 className="text-3xl font-black italic tracking-tighter uppercase">Recover Account</h1>
             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Enter email for reset link</p>
           </div>
        </div>

        {!isSent ? (
          <form onSubmit={handleReset} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
               <div className="relative">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input 
                   type="email" 
                   placeholder="Email Address" 
                   className="h-14 pl-12 bg-secondary/30 border-white/5 rounded-2xl focus:ring-primary"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   required
                   disabled={isLoading}
                 />
               </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-lg transition-all active:scale-95"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> Sending...</span>
              ) : "Get Reset Link"}
            </Button>
          </form>
        ) : (
          <div className="bg-secondary/20 border border-white/5 p-8 rounded-[2.5rem] text-center space-y-6 animate-in zoom-in duration-500">
             <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                <Sparkles className="text-green-500 h-8 w-8" />
             </div>
             <div className="space-y-2">
                <p className="font-bold text-sm">Link Sent to Email</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  भाई, लिंक भेज दिया है। ईमेल में जा कर लिंक पर क्लिक करो और नया पासवर्ड सेट करो।
                </p>
             </div>
             <p className="text-[9px] text-muted-foreground font-bold uppercase">Spam folder भी चेक कर लेना!</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 pt-8 opacity-30">
           <Logo className="w-4 h-4" />
           <span className="text-[8px] font-black uppercase tracking-[0.3em]">A.snap Security</span>
        </div>
      </div>
    </div>
  );
}
