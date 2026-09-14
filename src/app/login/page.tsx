'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useFirebase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

function GameBallsHeader() {
    return (
        <div className="flex gap-2 justify-center mb-4">
            <div className="w-8 h-8 rounded-full bg-green-500 border border-white/20 flex items-center justify-center text-[10px] font-black text-white shadow-lg">1</div>
            <div className="w-8 h-8 rounded-full bg-red-500 border border-white/20 flex items-center justify-center text-[10px] font-black text-white shadow-lg">4</div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-red-500 border border-white/20 flex items-center justify-center text-[10px] font-black text-white shadow-lg">0</div>
            <div className="w-8 h-8 rounded-full bg-blue-500 border border-white/20 flex items-center justify-center text-[10px] font-black text-white shadow-lg">9</div>
        </div>
    );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const showAuth = searchParams.get('auth') === 'true';

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.replace('/');
      } else if (!showAuth) {
        router.replace('/');
      } else {
        setIsRedirecting(false);
      }
    }
  }, [user, isUserLoading, router, showAuth]);

  const handleGoogleLogin = async () => {
    if (!auth || !firestore) return;
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const username = user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`;
        await setDoc(userDocRef, {
          id: user.uid,
          name: user.displayName || username,
          username: username,
          username_lowercase: username.toLowerCase(),
          email: user.email,
          profileImageUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/400/400`,
          createdAt: serverTimestamp(),
          bio: "A.snap Creator🎬",
        });
      }
      
      toast({ title: "Welcome Back! 👋", description: "Logged in successfully." });
      router.push('/');
    } catch (error: any) {
      console.error("Google login error:", error);
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

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

  if (isUserLoading || isRedirecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
        <p className="mt-6 font-bold tracking-widest uppercase text-[10px] text-primary/80 animate-pulse">Syncing...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 overflow-y-auto scrollbar-hide">
      <div className="w-full max-w-sm space-y-10 text-center py-8">
        <div className="space-y-4 px-4">
            <GameBallsHeader />
            <div className="px-6">
                <h1 className="text-5xl font-black italic animate-shimmer-text tracking-normal drop-shadow-[0_0_20px_rgba(255,51,102,0.4)] px-6">
                    WinGo
                </h1>
            </div>
            <div className="flex items-center justify-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px] bg-primary/10 py-2 rounded-full border border-primary/20 mt-4">
                <Zap size={14} className="fill-primary" /> FAST WITHDRAWAL
            </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 px-2">
            <div className="space-y-3">
                <Input 
                  type="email" 
                  placeholder="Email Address" 
                  className="h-14 text-base bg-secondary/30 border-white/5 rounded-2xl text-foreground focus:ring-primary px-6" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoggingIn || isGoogleLoading}
                />
                <div className="space-y-2">
                  <Input 
                    type="password" 
                    placeholder="Password" 
                    className="h-14 text-base bg-secondary/30 border-white/5 rounded-2xl text-foreground focus:ring-primary px-6" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoggingIn || isGoogleLoading}
                  />
                  <div className="text-right px-2">
                    <Link href="/forgot-password" university-style="true" className="text-[10px] font-black uppercase text-muted-foreground hover:text-primary transition-colors">
                      Forgot Password?
                    </Link>
                  </div>
                </div>
            </div>

            <Button type="submit" className="w-full h-16 text-xl font-black uppercase rounded-full bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-all" disabled={isLoggingIn || isGoogleLoading}>
              {isLoggingIn ? (
                  <span className="flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> CHECKING...</span>
              ) : "Login"}
            </Button>
        </form>

        <div className="px-2 space-y-6">
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-background px-4 text-muted-foreground font-bold tracking-[0.3em]">OR REGISTER</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
                <Link href="/signup">
                   <button className="w-full bg-primary h-16 rounded-full text-white font-black uppercase text-xl shadow-lg active:scale-95 transition-all">
                      Register
                   </button>
                </Link>

                <Button 
                    variant="outline" 
                    className="w-full h-16 text-base font-bold rounded-full border-white/10 bg-secondary/20 hover:bg-secondary/40 transition-all flex items-center justify-center gap-3"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading || isLoggingIn}
                >
                    {isGoogleLoading ? <Loader2 className="animate-spin" /> : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google Login
                      </>
                    )}
                </Button>
            </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-4 opacity-30">
           <ShieldCheck size={14} className="text-primary" />
           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Secure Encryption Active</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
