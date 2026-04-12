'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AsnapLogo } from '@/components/icons';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      toast({
        title: 'Sign Up Failed',
        description: 'Please enter your email and password.',
        variant: 'destructive',
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: 'Sign Up Failed',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // It's good practice to check if the user object exists
      if (!user) {
        throw new Error('Failed to create user. Please try again.');
      }

      // Create a user profile document in Firestore
      if (firestore) {
        const userRef = doc(firestore, 'users', user.uid);

        const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');

        const newUserProfileData = {
          username: username,
          email: user.email!,
          profilePictureUrl: `https://picsum.photos/seed/${user.uid}/100/100`,
          bio: 'Ephemeral moments collector.',
          totalEarnings: 0,
          followerIds: [],
          followingIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          id: user.uid,
        };

        await setDoc(userRef, newUserProfileData);
      }

      toast({
        title: 'Account Created',
        description: 'You have been successfully signed up!',
      });

      router.push('/feed');
    } catch (error: any) {
      let description = error.message;
      if (error.code === 'auth/email-already-in-use') {
        description = 'This email is already in use. Please try logging in.';
      }
      toast({
        title: 'Sign Up Failed',
        description: description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <AsnapLogo className="h-12 w-12" />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">
            Create an Account
          </CardTitle>
          <CardDescription>Join Asnap to share your moments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSignUp}
              type="submit"
              className="w-full bg-accent hover:bg-accent/90"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/" className="underline" prefetch={false}>
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
