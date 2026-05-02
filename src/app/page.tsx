"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function Splash() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (isUserLoading) {
      // Wait while firebase auth state is loading
      return;
    }

    const timer = setTimeout(() => {
      if (user) {
        router.push('/feed');
      } else {
        router.push('/login');
      }
    }, 3000); // 3 second delay for better visual effect

    return () => clearTimeout(timer);
  }, [user, isUserLoading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black overflow-hidden">
      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        {/* Instagram style Squircle Box for the 'A' logo */}
        <div className="relative group animate-pulse">
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary via-[#bc1888] to-[#962fbf] rounded-[2.5rem] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-32 h-32 bg-gradient-to-tr from-primary via-[#bc1888] to-[#962fbf] rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                <h1 className="text-7xl font-black text-white italic tracking-tighter drop-shadow-lg">
                    A
                </h1>
            </div>
        </div>
        
        {/* App Name Text */}
        <div className="mt-8 text-center">
            <p className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-white italic">
                A.snap
            </p>
            <div className="mt-2 h-1 w-12 bg-primary mx-auto rounded-full"></div>
        </div>
      </div>
      
      {/* Subtle branding at bottom */}
      <div className="absolute bottom-12 flex flex-col items-center opacity-40">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white">from</p>
          <p className="text-sm font-black text-primary italic">ASNAP TEAM</p>
      </div>
    </main>
  );
}
