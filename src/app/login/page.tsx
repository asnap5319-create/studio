'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirebase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * LoginPage Component
 * Handles user authentication. Redirects to feed if accessed without ?auth=true
 * to ensure users see content first.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const showAuth = searchParams.get('auth') === 'true';

  useEffect(() => {
    // If user is already logged in, send to feed immediately
    if (!isUserLoading && user) {
      router.replace('/');
      return;
    }

    // CRITICAL: If someone lands on /login without ?auth=true, 
    // send them to the feed (root) to watch videos first.
    // This satisfies the "Show videos first, login later" requirement.
    if (!isUserLoading && !showAuth) {
      router.replace('/');
    } else if (!isUserLoading) {
      setIsRedirecting(false);
    }
  }, [user, isUserLoading, router, showAuth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
      toast({ title: "Error", description: "Firebase not initialized.", variant: "destructive" });
      return;
    }

    setIsLoggingIn(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      toast({ title: "Success", description: "Logged in successfully!" });
      router.push('/');
    } catch (error: any) {
      console.error("Error signing in: ", error);
      let errorMessage = "Could not log in. Please check your credentials.";
      
      if (
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/invalid-email'
      ) {
        errorMessage = "गलत ईमेल या पासवर्ड! कृपया दोबारा चेक करें।";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "बहुत सारे गलत प्रयास! कृपया कुछ देर बाद कोशिश करें।";
      }
      
      toast({ title: "Login Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Prevent showing the login form even for a fraction of a second if we are redirecting
  if (isUserLoading || isRedirecting || !showAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mb-4"></div>
        <p className="font-bold tracking-widest uppercase text-[10px] text-primary animate-pulse">Entering A.snap...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="relative w-24 h-24 bg-[#0a0a0a] rounded-3xl flex items-center justify-center shadow-[inset_0_1px_4px_rgba(255,255,255,0.1),10px_10px_20px_rgba(0,0,0,0.5)] border-4 border-[#1a1a1a] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none"></div>
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,51,102,0.5)]">
                <defs>
                  <linearGradient id="loginGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#ff0080', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#ff3366', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#ffcc33', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                <path 
                  d="M150 400 L256 100 L362 400 M210 320 L302 320" 
                  stroke="url(#loginGrad)" 
                  strokeWidth="55" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <circle cx="390" cy="120" r="35" fill="#ff0080" />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-5xl font-black text-primary italic [filter:drop-shadow(0_0_8px_hsl(var(--primary)))] tracking-tighter">
          A.snap
        </h1>
        
        <form onSubmit={handleLogin} className="w-full space-y-4 pt-4">
          <Input 
            type="email" 
            placeholder="Email" 
            className="h-12 text-base bg-secondary/50 border-white/10 rounded-xl" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoggingIn}
          />
          <Input 
            type="password" 
            placeholder="Password" 
            className="h-12 text-base bg-secondary/50 border-white/10 rounded-xl" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoggingIn}
          />
          <Button type="submit" className="w-full h-14 text-lg font-black uppercase rounded-2xl bg-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black px-2 text-muted-foreground">
              OR
            </span>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-bold text-primary hover:underline">
              Sign up
            </Link>
          </p>
          <Button asChild variant="link" className="mt-2 text-xs text-muted-foreground">
             <Link href="/">Back to Videos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
