'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useFirebase } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const router = useRouter();
  const { auth, firestore, storage } = useFirebase();
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
    if (!auth || !firestore || !storage) {
      toast({ title: "Error", description: "Firebase not ready. Please try again.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Signup Failed", description: "Password must be at least 6 characters long.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setStatusMessage('Creating account...');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      let profileImageUrl = `https://picsum.photos/seed/${user.uid}/400/400`;

      if (imageFile) {
        setStatusMessage('Uploading photo...');
        const photoRef = storageRef(storage, `profile-images/${user.uid}`);
        const uploadTask = uploadBytesResumable(photoRef, imageFile);

        profileImageUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setStatusMessage(`Uploading: ${Math.round(progress)}%`);
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload failed during signup:", error);
              reject(error); // Reject the promise on upload error
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              } catch (getUrlError) {
                console.error("Error getting download URL:", getUrlError);
                reject(getUrlError); // Reject on failure to get URL
              }
            }
          );
        });
      }

      setStatusMessage('Saving profile...');
      const userProfile = {
        uid: user.uid,
        name,
        username,
        email: user.email,
        profileImageUrl,
        createdAt: serverTimestamp(),
        bio: "",
      };
      await setDoc(doc(firestore, "users", user.uid), userProfile);

      toast({ title: "Success", description: "Welcome to A.snap!" });
      router.push('/feed');

    } catch (error: any) {
      console.error("Error during signup process: ", error);
      let errorMessage = "Could not create account. Please try again.";
      if (error.code?.startsWith('auth/')) {
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = "This email address is already in use.";
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = "Please enter a valid email address.";
        } else if (error.code === 'auth/weak-password') {
          errorMessage = "The password is too weak.";
        }
      } else if (error.code?.startsWith('storage/')) {
        switch (error.code) {
          case 'storage/retry-limit-exceeded':
            errorMessage = "Photo upload failed. Please check your internet and try signing up again.";
            break;
          default:
            errorMessage = "Account could not be created due to a photo upload error. Please try again.";
            break;
        }
      }
      toast({ title: "Signup Failed", description: errorMessage, variant: "destructive" });
      setIsLoading(false);
      setStatusMessage('Sign Up');
      setUploadProgress(null);
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
          {uploadProgress !== null && <Progress value={uploadProgress} className="w-full" />}
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
