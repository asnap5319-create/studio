
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

/**
 * A.snap Splash Screen
 * Optimized for stability to fix the white screen error.
 */
export default function Splash() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch (White screen fix)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isUserLoading) return;

    // Wait for 3.5 seconds then redirect based on login status
    const timer = setTimeout(() => {
      if (user) {
        router.replace('/feed');
      } else {
        router.replace('/login');
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [user, isUserLoading, router, mounted]);

  // Return a solid black background until the component is fully mounted
  if (!mounted) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black overflow-hidden select-none">
      <div className="flex flex-col items-center space-y-12 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* The 3D Dark Squircle Box */}
        <div className="relative">
            {/* Soft Glow behind the box */}
            <div className="absolute -inset-10 bg-primary/20 rounded-[4.5rem] blur-3xl opacity-30"></div>
            
            {/* The Main 3D Box Container as per the user's photo */}
            <div className="relative w-48 h-48 bg-[#0a0a0a] rounded-[3.8rem] flex items-center justify-center 
                            shadow-[25px_25px_50px_rgba(0,0,0,0.9),-5px_-5px_20px_rgba(255,255,255,0.02)] 
                            border-[8px] border-[#161616] overflow-hidden">
                
                {/* Glossy top-down overlay for 3D depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent pointer-events-none"></div>

                {/* Stylized 'A' with Pink Dot */}
                <svg viewBox="0 0 100 100" className="w-32 h-28 drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]">
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
                      r="9" 
                      fill="#ff3366" 
                      className="animate-pulse"
                      style={{ filter: 'drop-shadow(0 0 15px #ff3366)' }}
                    />
                </svg>
            </div>
        </div>
        
        {/* Branding Typography */}
        <div className="text-center space-y-4">
            <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#ffd26f] via-[#ff3366] to-white italic">
                A.snap
            </h1>
            <div className="h-1.5 w-16 bg-primary/40 mx-auto rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-12 flex flex-col items-center opacity-50">
          <p className="text-[10px] uppercase tracking-[0.7em] font-bold text-white/40 mb-1">powered by</p>
          <p className="text-[12px] font-black text-primary italic tracking-tight">ASNAP CORE</p>
      </div>
    </main>
  );
}
