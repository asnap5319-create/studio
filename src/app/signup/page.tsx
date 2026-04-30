'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, UserCredential } from "firebase/auth";
import { Camera } from "lucide-react";
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

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({ title: "Configuration Error", description: "Cloudinary is not configured. Please set environment variables.", variant: "destructive" });
      console.error("Cloudinary environment variables NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET are not set.");
      return;
    }

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
      bio: "",
    };
    const userDocRef = doc(firestore, "users", user.uid);

    setDoc(userDocRef, userProfile)
      .then(() => {
        toast({ title: "Success", description: "Welcome to A.snap!" });
        router.push('/feed');
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
        <h1 className="text-5xl font-bold text-primary [filter:drop-shadow(0_0_8px_hsl(var(--primary)))]">
          Create Account
        </h1>
        <p className="text-muted-foreground">Join A.snap today.</p>
        
        <div className="flex justify-center pt-4">
            <div className="relative">
                <label htmlFor="photo-upload" className="cursor-pointer">
                    <Avatar className="h-24 w-24 border-2 border-dashed border-border">
                        <AvatarImage src={imagePreviewUrl} />
                        <AvatarFallback className="bg-transparent">
                            <Camera className="h-10 w-10 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                </label>
                <Input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading}/>
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
            disabled={isLoading}
          />
          <Input 
            type="password" 
            placeholder="Password (min. 6 characters)" 
            className="h-12 text-base" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <Input 
            type="text" 
            placeholder="Name" 
            className="h-12 text-base" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
            />
          <Input 
            type="text" 
            placeholder="Username" 
            className="h-12 text-base" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
          />
          <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isLoading}>
            {statusMessage}
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
