'use client';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
        toast({ title: "Error", description: "Firebase not ready.", variant: "destructive" });
        return;
    };

    if (password.length < 6) {
        toast({ title: "Error", description: "Password must be at least 6 characters long.", variant: "destructive" });
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userProfile = {
            uid: user.uid,
            name,
            username,
            email: user.email,
            profileImageUrl: `https://picsum.photos/seed/${user.uid}/400/400`, // Placeholder image
            createdAt: serverTimestamp(),
            bio: "", // Initialize bio as empty
        };

        await setDoc(doc(firestore, "users", user.uid), userProfile);
        
        toast({ title: "Success", description: "Account created successfully!" });
        router.push('/feed');
    } catch (error: any) {
        console.error("Error creating account: ", error);
        let errorMessage = "Could not create account. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email address is already in use.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Please enter a valid email address.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "The password is too weak.";
        }
        toast({ title: "Signup Failed", description: errorMessage, variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-5xl font-bold text-primary [filter:drop-shadow(0_0_8px_hsl(var(--primary)))]">
          Create Account
        </h1>
        <p className="text-muted-foreground">Join A.snap today.</p>
        
        <div className="flex justify-center pt-4">
            <div className="relative">
                <label htmlFor="photo-upload" className="cursor-pointer">
                    <Avatar className="h-24 w-24 border-2 border-dashed border-border">
                        <AvatarFallback className="bg-transparent">
                            <Camera className="h-10 w-10 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                </label>
                <Input id="photo-upload" type="file" className="hidden" accept="image/*"/>
            </div>
        </div>
        
        <form onSubmit={handleSignup} className="w-full space-y-3 pt-2">
          <Input 
            type="email" 
            placeholder="Email" 
            className="h-12 text-base" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input 
            type="password" 
            placeholder="Password (min. 6 characters)" 
            className="h-12 text-base" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input 
            type="text" 
            placeholder="Name" 
            className="h-12 text-base" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            />
          <Input 
            type="text" 
            placeholder="Username" 
            className="h-12 text-base" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Button type="submit" className="w-full h-12 text-lg font-bold">
            Sign Up
          </Button>
        </form>

        <p className="px-8 text-center text-xs text-muted-foreground">
            By signing up, you agree to our Terms, Privacy Policy and Cookies Policy.
        </p>

        <div className="border-t border-border mt-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
