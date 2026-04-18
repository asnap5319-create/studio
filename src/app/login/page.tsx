'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: any;
  }
}

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  }, [auth]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        toast({ title: "Error", description: "Firebase not initialized.", variant: "destructive" });
        return;
    }
    const appVerifier = window.recaptchaVerifier;
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, `+${phoneNumber}`, appVerifier);
      window.confirmationResult = confirmationResult;
      setStep('otp');
      toast({ title: "OTP Sent", description: "Check your phone for the OTP." });
    } catch (error: any) {
      console.error("Error sending OTP: ", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirmationResult) {
        toast({ title: "Error", description: "Please request an OTP first.", variant: "destructive" });
        return;
    }
    try {
      const result = await window.confirmationResult.confirm(otp);
      const user = result.user;
      
      // Check if user profile exists in Firestore
      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        router.push('/feed');
      } else {
        router.push('/signup');
      }
      toast({ title: "Success", description: "Logged in successfully!" });
    } catch (error: any) {
      console.error("Error verifying OTP: ", error);
      toast({ title: "Error", description: "Invalid OTP. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div id="recaptcha-container"></div>
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-5xl font-bold text-primary [filter:drop-shadow(0_0_8px_hsl(var(--primary)))]">
          A.snap
        </h1>
        
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="w-full space-y-4 pt-4">
            <Input 
              type="tel" 
              placeholder="Phone number (e.g., 91xxxxxxxxxx)" 
              className="h-12 text-center text-base" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <Button type="submit" className="w-full h-12 text-lg font-bold">
              Send OTP
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="w-full space-y-4 pt-4">
            <Input 
              type="text" 
              placeholder="Enter OTP" 
              className="h-12 text-center text-base" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <Button type="submit" className="w-full h-12 text-lg font-bold">
              Log In
            </Button>
          </form>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              OR
            </span>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
