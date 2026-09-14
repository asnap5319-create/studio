'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase } from "@/firebase";
import { doc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Loader2, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function GameBallsHeader() {
    return (
        <div className="flex gap-2 justify-center mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-red-500 border border-white/20 flex items-center justify-center text-[10px] font-black text-white shadow-lg">0</div>
            <div className="w-8 h-8 rounded-full bg-green-500 border border-white/20 flex items-center justify-center text-[10px] font-black text-white shadow-lg">7</div>
            <div className="w-8 h-8 rounded-full bg-red-500 border border-white/20 flex items-center justify-center text-[10px] font-black text-white shadow-lg">8</div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-green-500 border border-white/20 flex items-center justify-center text-[10px] font-black text-white shadow-lg">5</div>
        </div>
    );
}

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Register');

  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  const handleGoogleSignup = async () => {
    if (!auth || !firestore) return;
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const generatedUsername = user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`;
        await setDoc(userDocRef, {
          id: user.uid,
          name: user.displayName || generatedUsername,
          username: generatedUsername,
          username_lowercase: generatedUsername.toLowerCase(),
          email: user.email,
          profileImageUrl: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          createdAt: serverTimestamp(),
          bio: "A.snap Creator🎬",
          virtualBalance: 28,
          hasDeposited: false
        });
      }
      
      toast({ title: "Welcome! 🚀", description: "Account created successfully." });
      router.push('/');
    } catch (error: any) {
      console.error("Google signup error:", error);
      toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    if (password.length < 6) {
      toast({ title: "Signup Failed", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setStatusMessage('Creating...');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Default icon since manual photo upload is removed
      const profileImageUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;
      const displayName = username; 

      await setDoc(doc(firestore, "users", user.uid), {
        id: user.uid,
        name: displayName,
        username,
        username_lowercase: username.toLowerCase(),
        email: user.email,
        profileImageUrl,
        createdAt: serverTimestamp(),
        bio: "A.snap Creator🎬",
        virtualBalance: 28,
        hasDeposited: false
      });

      toast({ title: "Success", description: "Welcome to A.snap!" });
      router.push('/');
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setStatusMessage('Register');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 overflow-y-auto scrollbar-hide">
      <div className="w-full max-w-sm space-y-8 text-center py-8">
        <div className="space-y-2 px-4">
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
        
        <form onSubmit={handleSignup} className="w-full space-y-4 px-2 pt-4">
          <div className="space-y-3">
              <Input placeholder="Email Address" className="h-14 bg-secondary/30 border-white/5 rounded-2xl px-6" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading}/>
              <Input type="password" placeholder="Password (min. 6 char)" className="h-14 bg-secondary/30 border-white/5 rounded-2xl px-6" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading}/>
              <Input placeholder="Choose Username" className="h-14 bg-secondary/30 border-white/5 rounded-2xl px-6" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={isLoading}/>
          </div>

          <Button type="submit" className="w-full h-16 text-xl font-black uppercase rounded-full bg-primary text-white shadow-lg active:scale-95 transition-all mt-4" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : statusMessage}
          </Button>

          <Button 
              type="button"
              variant="outline" 
              className="w-full h-16 text-base font-bold rounded-full border-white/10 bg-secondary/20 hover:bg-secondary/40 transition-all flex items-center justify-center gap-3"
              onClick={handleGoogleSignup}
              disabled={isGoogleLoading || isLoading}
          >
              {isGoogleLoading ? <Loader2 className="animate-spin" /> : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google Quick Register
                </>
              )}
          </Button>
        </form>

        <div className="px-2 space-y-4">
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-background px-4 text-muted-foreground font-bold tracking-[0.3em]">Already a member?</span>
            </div>
          </div>

          <Link href="/login?auth=true">
              <button className="w-full border-2 border-primary h-16 rounded-full bg-white/5 active:scale-95 transition-all flex items-center justify-center gap-1">
                  <span className="text-white/60 font-bold text-sm">I have an account</span>
                  <span className="text-primary font-black text-xl ml-1">Login</span>
              </button>
          </Link>
        </div>

        <div className="pt-6 opacity-30 flex items-center justify-center gap-2">
             <ShieldCheck size={14} className="text-primary" />
             <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Secure Cloud System</span>
        </div>
      </div>
    </div>
  );
}
