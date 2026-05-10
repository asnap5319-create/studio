
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirebase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

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
    if (!isUserLoading && user) {
      router.replace('/');
      return;
    }

    // If accessed without ?auth=true, always go to root (Video Feed)
    if (!isUserLoading && !showAuth) {
      router.replace('/');
    } else if (!isUserLoading) {
      setIsRedirecting(false);
    }
  }, [user, isUserLoading, router, showAuth]);

  if (isUserLoading || isRedirecting || !showAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mb-4"></div>
        <p className="font-bold tracking-widest uppercase text-[10px] text-primary animate-pulse">Entering A.snap...</p>
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
      toast({ title: "Success", description: "Logged in successfully!" });
      router.push('/');
    } catch (error: any) {
      console.error("Error signing in: ", error);
      toast({ title: "Login Failed", description: "गलत ईमेल या पासवर्ड! कृपया दोबारा चेक करें।", variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
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
          <Button type="submit" className="w-full h-14 text-lg font-black uppercase rounded-2xl bg-primary" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging in..." : "Log In"}
          </Button>
        </form>
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
