
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirebase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { auth } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const showAuth = searchParams.get('auth') === 'true';

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        // Already logged in, go to home
        router.replace('/');
      } else if (!showAuth) {
        // No explicit auth intent, redirect to video feed root
        router.replace('/');
      } else {
        // Show login form
        setIsRedirecting(false);
      }
    }
  }, [user, isUserLoading, router, showAuth]);

  if (isUserLoading || isRedirecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <div className="relative">
             <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse rounded-full"></div>
             <Loader2 className="animate-spin h-12 w-12 text-primary relative z-10" />
        </div>
        <p className="mt-6 font-bold tracking-widest uppercase text-[10px] text-primary/80 animate-pulse">Redirecting to Feed...</p>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsLoggingIn(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      toast({ title: "Welcome Back! 👋", description: "Logged in successfully." });
      router.push('/');
    } catch (error: any) {
      console.error("Error signing in: ", error);
      toast({ title: "Login Failed", description: "Invalid email or password.", variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
            <h1 className="text-6xl font-black text-primary italic tracking-tighter drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">
              A.snap
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Premium Visual Sharing</p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-4 pt-6">
          <Input 
            type="email" 
            placeholder="Email Address" 
            className="h-14 text-base bg-secondary/30 border-white/5 rounded-2xl text-white focus:ring-primary focus:border-primary" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoggingIn}
          />
          <Input 
            type="password" 
            placeholder="Password" 
            className="h-14 text-base bg-secondary/30 border-white/5 rounded-2xl text-white focus:ring-primary focus:border-primary" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoggingIn}
          />
          <Button type="submit" className="w-full h-14 text-lg font-black uppercase rounded-2xl bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" disabled={isLoggingIn}>
            {isLoggingIn ? (
                <span className="flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> Authenticating...</span>
            ) : "Unlock Feed"}
          </Button>
        </form>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground font-medium">
            New here?{' '}
            <Link href="/signup" className="font-black text-primary hover:underline underline-offset-4">
              Create Account
            </Link>
          </p>
          <div className="flex items-center justify-center gap-2 pt-4 opacity-50">
             <ShieldCheck size={14} className="text-primary" />
             <span className="text-[10px] font-black uppercase tracking-widest">Secure Cloud Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
