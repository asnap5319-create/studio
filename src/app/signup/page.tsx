'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, UserCredential, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Camera, Loader2, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Register');

  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

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
          profileImageUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/400/400`,
          createdAt: serverTimestamp(),
          bio: "A.snap Creator🎬",
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
      let profileImageUrl = `https://picsum.photos/seed/${user.uid}/400/400`;

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', "video_upload");
        const response = await fetch(`https://api.cloudinary.com/v1_1/dipz5jsls/image/upload`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.secure_url) profileImageUrl = data.secure_url;
      }

      await setDoc(doc(firestore, "users", user.uid), {
        id: user.uid,
        name,
        username,
        username_lowercase: username.toLowerCase(),
        email: user.email,
        profileImageUrl,
        createdAt: serverTimestamp(),
        bio: "A.snap Creator🎬",
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

        <div className="flex justify-center pt-2">
            <div className="relative">
                <label htmlFor="photo-upload" className="cursor-pointer">
                    <Avatar className="h-24 w-24 border-2 border-dashed border-primary/50 bg-secondary/20">
                        <AvatarImage src={imagePreviewUrl} className="object-cover" />
                        <AvatarFallback className="bg-transparent">
                            <Camera className="h-8 w-8 text-primary opacity-50" />
                        </AvatarFallback>
                    </Avatar>
                </label>
                <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading}/>
            </div>
        </div>
        
        <form onSubmit={handleSignup} className="w-full space-y-4 px-2">
          <div className="space-y-3">
              <Input placeholder="Email Address" className="h-12 bg-secondary/30 border-white/5 rounded-xl px-6" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading}/>
              <Input type="password" placeholder="Password (min. 6 char)" className="h-12 bg-secondary/30 border-white/5 rounded-xl px-6" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading}/>
              <Input placeholder="Full Name" className="h-12 bg-secondary/30 border-white/5 rounded-xl px-6" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading}/>
              <Input placeholder="Choose Username" className="h-12 bg-secondary/30 border-white/5 rounded-xl px-6" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={isLoading}/>
          </div>

          <Button type="submit" className="w-full h-16 text-xl font-black uppercase rounded-full bg-primary text-white shadow-lg active:scale-95 transition-all mt-4" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : statusMessage}
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
