'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirebase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
      // If user is already logged in, or if they visited /login without the explicit auth=true flag,
      // push them to the video feed immediately.
      if (user || !showAuth) {
        router.replace('/');
      } else {
        setIsRedirecting(false);
      }
    }
  }, [user, isUserLoading, router, showAuth]);

  if (isUserLoading || isRedirecting || !showAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
        <p className="font-bold tracking-widest uppercase text-[10px] text-primary animate-pulse">A.snap Security...</p>
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
      toast({ title: "Login Failed", description: "Invalid email or password.", variant: "destructive" });
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
            className="h-12 text-base bg-secondary/50 border-white/10 rounded-xl text-white" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoggingIn}
          />
          <Input 
            type="password" 
            placeholder="Password" 
            className="h-12 text-base bg-secondary/50 border-white/10 rounded-xl text-white" 
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginForm />
    </Suspense>
  );
}
