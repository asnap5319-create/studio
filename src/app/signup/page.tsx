'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, UserCredential, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Camera, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Sign Up');

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
      
      toast({ title: "Welcome! 🚀", description: "Account created successfully with Google." });
      router.push('/');
    } catch (error: any) {
      console.error("Google signup error:", error);
      let errorMsg = error.message;
      if (error.code === 'auth/operation-not-allowed') {
        errorMsg = "Google Sign-in is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.";
      }
      toast({ title: "Google Signup Failed", description: errorMsg, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
      toast({ title: "Error", description: "Firebase not ready. Please try again.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Signup Failed", description: "Password must be at least 6 characters long.", variant: "destructive" });
      return;
    }

    const cloudName = "dipz5jsls";
    const uploadPreset = "video_upload";

    setIsLoading(true);
    setStatusMessage('Creating account...');

    let userCredential: UserCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error creating auth user: ", error);
      let errorMessage = "Could not create account. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak.";
      }
      toast({ title: "Signup Failed", description: errorMessage, variant: "destructive" });
      setIsLoading(false);
      setStatusMessage('Sign Up');
      return;
    }

    const user = userCredential.user;
    let profileImageUrl = `https://picsum.photos/seed/${user.uid}/400/400`;

    if (imageFile) {
      setStatusMessage('Uploading photo...');
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', uploadPreset);
      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.secure_url) {
          profileImageUrl = data.secure_url;
        } else {
          throw new Error(data.error?.message || 'Cloudinary upload failed.');
        }
      } catch (uploadError: any) {
        console.error('Cloudinary upload error:', uploadError);
        toast({ title: "Signup Failed", description: `Photo upload failed: ${uploadError.message}. Profile not saved.`, variant: "destructive" });
        setIsLoading(false);
        setStatusMessage('Sign Up');
        return;
      }
    }

    setStatusMessage('Saving profile...');
    const userProfile = {
      id: user.uid,
      name,
      username,
      username_lowercase: username.toLowerCase(),
      email: user.email,
      profileImageUrl,
      createdAt: serverTimestamp(),
      bio: "A.snap Creator🎬",
    };
    const userDocRef = doc(firestore, "users", user.uid);

    setDoc(userDocRef, userProfile)
      .then(() => {
        toast({ title: "Success", description: "Welcome to A.snap!" });
        router.push('/');
      })
      .catch((serverError) => {
        console.error("Firestore setDoc error: ", serverError);
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'create',
          requestResourceData: userProfile,
        });
        errorEmitter.emit('permission-error', permissionError);
        
        toast({ title: "Signup Failed", description: "Failed to save profile due to a database error.", variant: "destructive" });
        setIsLoading(false);
        setStatusMessage('Sign Up');
      });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-5xl font-black italic text-primary [filter:drop-shadow(0_0_8px_hsl(var(--primary)))]">
          Join A.snap
        </h1>
        <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.3em]">Premium Visual Sharing</p>
        
        <div className="pt-4 space-y-4">
          <Button 
            variant="outline" 
            className="w-full h-14 text-base font-bold rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-black px-4 text-muted-foreground font-bold tracking-widest">or email signup</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
            <div className="relative">
                <label htmlFor="photo-upload" className="cursor-pointer">
                    <Avatar className="h-24 w-24 border-2 border-dashed border-primary/50 hover:border-primary transition-colors">
                        <AvatarImage src={imagePreviewUrl} className="object-cover" />
                        <AvatarFallback className="bg-secondary/50">
                            <Camera className="h-8 w-8 text-primary" />
                        </AvatarFallback>
                    </Avatar>
                </label>
                <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading}/>
            </div>
        </div>
        
        <form onSubmit={handleSignup} className="w-full space-y-3">
          <Input 
            type="email" 
            placeholder="Email" 
            className="h-12 bg-secondary/30 border-white/5 rounded-xl" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading || isGoogleLoading}
          />
          <Input 
            type="password" 
            placeholder="Password (min. 6 characters)" 
            className="h-12 bg-secondary/30 border-white/5 rounded-xl" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading || isGoogleLoading}
          />
          <Input 
            type="text" 
            placeholder="Full Name" 
            className="h-12 bg-secondary/30 border-white/5 rounded-xl" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading || isGoogleLoading}
            />
          <Input 
            type="text" 
            placeholder="Username" 
            className="h-12 bg-secondary/30 border-white/5 rounded-xl" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading || isGoogleLoading}
          />
          <Button type="submit" className="w-full h-14 text-lg font-black uppercase rounded-2xl bg-primary shadow-lg shadow-primary/20" disabled={isLoading || isGoogleLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : statusMessage}
          </Button>
        </form>

        <p className="px-8 text-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">
            By signing up, you agree to our Terms, Privacy Policy and Cookies Policy.
        </p>

        <div className="border-t border-white/10 mt-4 pt-4">
          <p className="text-sm text-muted-foreground font-medium">
            Already have an account?{' '}
            <Link href="/login" className="font-black text-primary hover:underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
