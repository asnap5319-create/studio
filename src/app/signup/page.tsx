'use client';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    // If auth is loading, wait. If it's done and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) {
        toast({ title: "Error", description: "User not authenticated or Firebase not ready.", variant: "destructive" });
        return;
    };

    try {
        const userProfile = {
            uid: user.uid,
            name,
            username,
            phoneNumber: user.phoneNumber,
            profileImageUrl: `https://picsum.photos/seed/${user.uid}/400/400`, // Placeholder image
            createdAt: serverTimestamp(),
        };

        await setDoc(doc(firestore, "users", user.uid), userProfile);
        toast({ title: "Success", description: "Profile created successfully!" });
        router.push('/feed');
    } catch (error: any) {
        console.error("Error creating profile: ", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isUserLoading || !user) {
    return <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white"><p>Loading...</p></div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-5xl font-bold text-primary [filter:drop-shadow(0_0_8px_hsl(var(--primary)))]">
          Complete Profile
        </h1>
        <p className="text-muted-foreground">Tell us a bit about yourself.</p>
        
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
