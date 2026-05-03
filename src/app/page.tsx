
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

/**
 * Splash Screen Component
 * Designed to show the 3D A.snap logo and handle initial navigation.
 * Simplified to prevent white screen or chunk errors.
 */
export default function Splash() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Safety timeout: Redirect after 4 seconds even if loading hangs
    const timer = setTimeout(() => {
      if (!isUserLoading) {
        if (user) {
          router.push('/feed');
        } else {
          router.push('/login');
        }
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [user, isUserLoading, router, mounted]);

  // Prevent hydration mismatch: show solid black initially
  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black overflow-hidden select-none">
      <div className="flex flex-col items-center space-y-12 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* The 3D Dark Squircle Frame - Exact design from your reference */}
        <div className="relative">
            {/* Soft Glow behind the box */}
            <div className="absolute -inset-8 bg-primary/20 rounded-[4rem] blur-3xl opacity-20"></div>
            
            {/* The Main 3D Box Container */}
            <div className="relative w-44 h-44 bg-[#0d0d0d] rounded-[3.5rem] flex items-center justify-center 
                            shadow-[20px_20px_40px_rgba(0,0,0,0.8),-5px_-5px_20px_rgba(255,255,255,0.02)] 
                            border-[6px] border-[#1a1a1a] overflow-hidden group">
                
                {/* Glossy top-down overlay for 3D depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none"></div>

                {/* Stylized 'A' with Pink Dot - Precise Ribbon Loop Design */}
                <svg viewBox="0 0 100 100" className="w-28 h-24 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]">
                    <defs>
                        <linearGradient id="a-gradient-splash" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff9a9e" /> 
                            <stop offset="50%" stopColor="#ff3366" /> 
                            <stop offset="100%" stopColor="#9d50bb" />
                        </linearGradient>
                    </defs>
                    
                    {/* The Ribbon Loop 'A' */}
                    <path 
                        d="M25 75 C 25 30, 40 18, 50 18 C 60 18, 75 30, 75 75 M30 54 L70 54" 
                        fill="none" 
                        stroke="url(#a-gradient-splash)" 
                        strokeWidth="11" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                    
                    {/* The Iconic Pink Dot from photo */}
                    <circle 
                      cx="78" 
                      cy="22" 
                      r="8" 
                      fill="#ff3366" 
                      className="animate-pulse"
                      style={{ filter: 'drop-shadow(0 0 12px #ff3366)' }}
                    />
                </svg>
            </div>
        </div>
        
        {/* Branding Typography */}
        <div className="text-center space-y-3">
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#ffd26f] via-[#ff3366] to-white italic">
                A.snap
            </h1>
            <div className="h-1 w-12 bg-primary/40 mx-auto rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-10 flex flex-col items-center opacity-40">
          <p className="text-[9px] uppercase tracking-[0.6em] font-bold text-white/50 mb-1">powered by</p>
          <p className="text-[11px] font-black text-primary italic tracking-tight">ASNAP CORE</p>
      </div>
    </main>
  );
}
