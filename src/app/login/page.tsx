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
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * Premium Logo for A.snap login page.
 */
function BrandLogo() {
  return (
    <div className="w-24 h-24 bg-[#16a34a] bg-money-pattern rounded-3xl flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(22,163,74,0.3)] overflow-hidden animate-in zoom-in duration-500">
        <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
          <path 
            d="M150 400 L256 100 L362 400 M210 320 L302 320" 
            stroke="#ff3366" 
            strokeWidth="64" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <circle cx="390" cy="120" r="42" fill="#ff3366" />
        </svg>
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
      
      toast({ title: "Welcome Back! 👋", description: "Logged in with Google successfully." });
      router.push('/');
    } catch (error: any) {
      console.error("Google login error:", error);
      let errorMsg = error.message;
      if (error.code === 'auth/operation-not-allowed') {
        errorMsg = "Google Sign-in is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.";
      }
      toast({ title: "Google Login Failed", description: errorMsg, variant: "destructive" });
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <div className="relative">
             <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse rounded-full"></div>
             <Loader2 className="animate-spin h-12 w-12 text-primary relative z-10" />
        </div>
        <p className="mt-6 font-bold tracking-widest uppercase text-[10px] text-primary/80 animate-pulse">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
            <BrandLogo />
            <div className="space-y-1">
                <h1 className="text-5xl font-black text-[#ff3366] italic tracking-tighter drop-shadow-lg">
                  A.snap
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-50">Premium Visual Sharing</p>
            </div>
        </div>

        <div className="w-full space-y-4 pt-6">
          <Button 
            variant="outline" 
            className="w-full h-14 text-base font-bold rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoggingIn}
          >
            {isGoogleLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-black px-4 text-muted-foreground font-bold tracking-widest">or email login</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              type="email" 
              placeholder="Email Address" 
              className="h-14 text-base bg-secondary/30 border-white/5 rounded-2xl text-white focus:ring-primary focus:border-primary" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoggingIn || isGoogleLoading}
            />
            <Input 
              type="password" 
              placeholder="Password" 
              className="h-14 text-base bg-secondary/30 border-white/5 rounded-2xl text-white focus:ring-primary focus:border-primary" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoggingIn || isGoogleLoading}
            />
            <Button type="submit" className="w-full h-14 text-lg font-black uppercase rounded-2xl bg-[#ff3366] shadow-lg shadow-[#ff3366]/20 hover:scale-[1.02] active:scale-95 transition-all" disabled={isLoggingIn || isGoogleLoading}>
              {isLoggingIn ? (
                  <span className="flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> Authenticating...</span>
              ) : "Unlock Feed"}
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground font-medium">
            New here?{' '}
            <Link href="/signup" className="font-black text-[#ff3366] hover:underline underline-offset-4">
              Create Account
            </Link>
          </p>
          <div className="flex items-center justify-center gap-2 pt-4 opacity-50">
             <ShieldCheck size={14} className="text-[#ff3366]" />
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
