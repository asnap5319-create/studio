'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { countries, type Country } from "@/lib/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import parsePhoneNumber from 'libphonenumber-js';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: ConfirmationResult;
  }
}

function getFlagEmoji(countryCode: string) {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function LoginPage() {
  const [nationalNumber, setNationalNumber] = useState("");
  const [country, setCountry] = useState<Country>(countries.find(c => c.code === 'IN')!);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState('phone');
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': () => {},
    });
  }, [auth]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        toast({ title: "Error", description: "Firebase not initialized.", variant: "destructive" });
        return;
    }
    if (!country || !nationalNumber) {
        toast({ title: "Error", description: "Please select a country and enter your phone number.", variant: "destructive" });
        return;
    }

    const phoneNumber = parsePhoneNumber(nationalNumber, country.code as any);

    if (!phoneNumber?.isValid()) {
      toast({ title: "Invalid Phone Number", description: "Please enter a valid phone number for the selected country.", variant: "destructive" });
      return;
    }

    const formattedPhoneNumber = phoneNumber.format('E.164');

    const appVerifier = window.recaptchaVerifier;
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
      window.confirmationResult = confirmationResult;
      setStep('otp');
      toast({ title: "OTP Sent", description: "Check your phone for the OTP." });
    } catch (error: any) {
      console.error("Error sending OTP: ", error);
      let errorMessage = "Could not send OTP. Please try again later.";
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = "The phone number is not valid.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many requests. Please try again later.";
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
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
            <div className="flex gap-2">
                <Select
                    value={country.code}
                    onValueChange={(code) => {
                        const newCountry = countries.find(c => c.code === code);
                        if (newCountry) setCountry(newCountry);
                    }}
                >
                    <SelectTrigger className="h-12 w-[140px]">
                        <SelectValue placeholder="Country">
                            <span className="flex items-center gap-2">
                              {getFlagEmoji(country.code)} {country.dial_code}
                            </span>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-72">
                        {countries.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                                <span className="flex items-center gap-2">
                                    {getFlagEmoji(c.code)} {c.name} ({c.dial_code})
                                </span>
                            </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                </Select>
                <Input 
                  type="tel" 
                  placeholder="Phone number" 
                  className="h-12 text-base flex-1" 
                  value={nationalNumber}
                  onChange={(e) => setNationalNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
            </div>
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
