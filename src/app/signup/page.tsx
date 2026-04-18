'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { AsnapLogo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  username: z.string().min(3, { message: 'Full name must be at least 3 characters.' }).max(30),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (!user) {
        throw new Error("User creation failed.");
      }

      const userProfile = {
        id: user.uid,
        username: data.username,
        email: data.email,
        profilePictureUrl: `https://picsum.photos/seed/${user.uid}/100/100`,
        bio: 'Welcome to A.snap!',
        followerIds: [],
        followingIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const userDocRef = doc(firestore, 'users', user.uid);
      setDocumentNonBlocking(userDocRef, userProfile, { merge: true });

    } catch (error: any) {
      setIsLoading(false);
      const errorMessage = error.code === 'auth/email-already-in-use'
        ? 'This email is already registered.'
        : error.message;
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: errorMessage,
      });
    }
  };
  
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoading(false);
        toast({
          title: 'Account Created!',
          description: "Welcome to A.snap!",
        });
        router.push('/feed');
      }
    });

    return () => unsubscribe();
  }, [auth, router, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Card className="border-border/40 bg-card">
          <CardHeader className="text-center px-8">
            <AsnapLogo className="mx-auto h-16 w-16" />
            <CardDescription className="mt-4 text-base font-semibold text-muted-foreground">
              Sign up to see photos and videos from your friends.
            </CardDescription>
          </CardHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-3 px-8">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} className="bg-zinc-900/80 border-zinc-700/60" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Full Name" {...field} className="bg-zinc-900/80 border-zinc-700/60" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} className="bg-zinc-900/80 border-zinc-700/60"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {error && <p className="pt-2 text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full !mt-4" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign Up'}
                </Button>
              </CardContent>
            </form>
          </FormProvider>
        </Card>
        <Card className="mt-4 border-border/40 bg-card">
            <CardContent className="p-4">
                <p className="text-center text-sm text-muted-foreground">
                    Have an account?{' '}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                    Log in
                    </Link>
                </p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
