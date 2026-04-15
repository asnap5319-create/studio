'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth, initiateEmailSignIn } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { AsnapLogo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    initiateEmailSignIn(auth, data.email, data.password);
  };
  
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });
        router.push('/feed');
      }
      setIsLoading(false);
    }, (error) => {
        setIsLoading(false);
        const errorMessage = error.code === 'auth/invalid-credential'
          ? 'Invalid email or password. Please try again.'
          : error.message;
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: errorMessage,
        });
    });

    return () => unsubscribe();
  }, [auth, router, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Card className="border-border/40">
          <CardHeader className="text-center">
            <AsnapLogo className="mx-auto h-16 w-16" />
            <CardTitle className="mt-6 font-headline text-3xl">
              A.sanp
            </CardTitle>
          </CardHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} className="bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-300/60 dark:border-zinc-700/60"/>
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
                        <Input type="password" placeholder="Password" {...field} className="bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-300/60 dark:border-zinc-700/60" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Log In'}
                </Button>
              </CardContent>
            </form>
          </FormProvider>
        </Card>
        <Card className="mt-4 border-border/40">
          <CardContent className="p-4">
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
