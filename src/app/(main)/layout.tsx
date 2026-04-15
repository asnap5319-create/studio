'use client';

import { BottomNav } from "@/components/bottom-nav";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This will be briefly visible before the redirect kicks in.
    return null;
  }

  return (
    <div className="h-screen w-screen bg-black">
      <div className="relative mx-auto h-full max-w-md bg-black">
        <main className="h-full">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
