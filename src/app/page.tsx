
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

/**
 * A.snap Splash Screen
 * Optimized for maximum stability to prevent the white screen error.
 * Features a high-end 3D Dark Box Logo with a stylized 'A' and Pink Dot.
 */
export default function Splash() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  // Critical fix for hydration mismatch and white screen
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isUserLoading) return;

    // Show the premium splash for 3.5 seconds before navigating
    const timer = setTimeout(() => {
      if (user) {
        router.replace('/feed');
      } else {
        router.replace('/login');
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [user, isUserLoading, router, mounted]);

  // Render nothing until client-side mount to avoid hydration errors
  if (!mounted) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black overflow-hidden select-none">
      <div className="flex flex-col items-center space-y-12 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* The 3D Dark Squircle Box (Premium Design) */}
        <div className="relative">
            {/* Soft Ambient Glow */}
            <div className="absolute -inset-16 bg-primary/20 rounded-[5rem] blur-[80px] opacity-40"></div>
            
            {/* The Main 3D Box Container */}
            <div className="relative w-52 h-52 bg-[#0a0a0a] rounded-[4rem] flex items-center justify-center 
                            shadow-[30px_30px_60px_rgba(0,0,0,1),-10px_-10px_30px_rgba(255,255,255,0.02)] 
                            border-[10px] border-[#1a1a1a] overflow-hidden">
                
                {/* Glossy Reflection Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none"></div>

                {/* The Stylized 'A' Icon */}
                <svg viewBox="0 0 100 100" className="w-36 h-32 drop-shadow-[0_15px_25px_rgba(0,0,0,0.7)]">
                    <defs>
                        <linearGradient id="a-gradient-premium" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff9a9e" /> 
                            <stop offset="40%" stopColor="#ff3366" /> 
                            <stop offset="100%" stopColor="#9d50bb" />
                        </linearGradient>
                    </defs>
                    
                    {/* The Ribbon Loop 'A' */}
                    <path 
                        d="M25 75 C 25 30, 40 18, 50 18 C 60 18, 75 30, 75 75 M30 54 L70 54" 
                        fill="none" 
                        stroke="url(#a-gradient-premium)" 
                        strokeWidth="11" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                    
                    {/* The Iconic Pink Dot */}
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
            <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#ffd26f] via-[#ff3366] to-white italic">
                A.snap
            </h1>
            <div className="h-1.5 w-20 bg-primary/40 mx-auto rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Premium Footer Branding */}
      <div className="absolute bottom-12 flex flex-col items-center opacity-40">
          <p className="text-[11px] uppercase tracking-[0.8em] font-bold text-white/50 mb-1">powered by</p>
          <p className="text-[13px] font-black text-primary italic tracking-tight">ASNAP CORE</p>
      </div>
    </main>
  );
}
