"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function Splash() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isUserLoading) return;

    const timer = setTimeout(() => {
      if (user) {
        router.replace('/feed');
      } else {
        router.replace('/login');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, isUserLoading, router, mounted]);

  if (!mounted) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black overflow-hidden select-none">
      <div className="flex flex-col items-center space-y-12 animate-in fade-in zoom-in-95 duration-700">
        <div className="relative">
            <div className="absolute -inset-16 bg-primary/20 rounded-full blur-[80px] opacity-40"></div>
            <div className="relative w-56 h-56 bg-[#0a0a0a] rounded-[3.5rem] flex items-center justify-center 
                            shadow-[inset_0_2px_8px_rgba(255,255,255,0.05),30px_30px_60px_rgba(0,0,0,1),-10px_-10px_30px_rgba(255,255,255,0.02)] 
                            border-[8px] border-[#1a1a1a] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none"></div>
                <div className="relative w-40 h-40">
                   <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_20px_rgba(255,51,102,0.6)]">
                      <defs>
                        <linearGradient id="splashGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" style={{ stopColor: '#ff0080', stopOpacity: 1 }} />
                          <stop offset="50%" style={{ stopColor: '#ff3366', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#ffcc33', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M150 400 L256 100 L362 400 M210 320 L302 320" 
                        stroke="url(#splashGrad)" 
                        strokeWidth="50" 
                        fill="none" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                      <circle cx="390" cy="120" r="35" fill="#ff0080" />
                   </svg>
                </div>
            </div>
        </div>
        <div className="text-center space-y-4">
            <h1 className="text-6xl font-black tracking-tighter text-white italic">
                A.snap
            </h1>
            <div className="h-1.5 w-24 bg-gradient-to-r from-primary to-yellow-400 mx-auto rounded-full animate-pulse"></div>
        </div>
      </div>
      <div className="absolute bottom-12 flex flex-col items-center opacity-30">
          <p className="text-[11px] uppercase tracking-[0.8em] font-bold text-white mb-1">Premium</p>
          <p className="text-[13px] font-black text-primary italic tracking-tight">CORE EXPERIENCE</p>
      </div>
    </main>
  );
}