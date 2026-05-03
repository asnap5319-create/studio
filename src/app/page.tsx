
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
        router.push('/feed');
      } else {
        router.push('/login');
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [user, isUserLoading, router, mounted]);

  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black overflow-hidden select-none">
      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        
        {/* The 3D Dark Squircle Frame (Exact design from photo) */}
        <div className="relative">
            {/* Glow for depth */}
            <div className="absolute -inset-10 bg-primary/10 rounded-[4rem] blur-3xl opacity-30"></div>
            
            {/* The Main 3D Box */}
            <div className="relative w-48 h-48 bg-[#0a0a0a] rounded-[3.5rem] flex items-center justify-center 
                            shadow-[inset_0_4px_12px_rgba(255,255,255,0.05),inset_0_-12px_24px_rgba(0,0,0,0.9),25px_25px_50px_rgba(0,0,0,0.7),-4px_-4px_20px_rgba(255,255,255,0.01)] 
                            border-[8px] border-[#161616] overflow-hidden group">
                
                {/* Top glossy highlight */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none"></div>

                {/* Stylized 'A' with Pink Dot - EXACT RIBBON DESIGN */}
                <svg viewBox="0 0 100 100" className="w-32 h-28 drop-shadow-[0_0_20px_rgba(255,51,102,0.5)]">
                    <defs>
                        <linearGradient id="a-gradient-final" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffd26f" /> 
                            <stop offset="40%" stopColor="#ff3366" /> 
                            <stop offset="100%" stopColor="#9d50bb" />
                        </linearGradient>
                    </defs>
                    
                    <path 
                        d="M25 75 C 25 35, 45 18, 50 18 C 55 18, 75 35, 75 75 M30 55 L70 55" 
                        fill="none" 
                        stroke="url(#a-gradient-final)" 
                        strokeWidth="11" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                    
                    {/* The Famous Pink Dot */}
                    <circle 
                      cx="78" 
                      cy="24" 
                      r="7.5" 
                      fill="#ff3366" 
                      className="animate-pulse"
                      style={{ filter: 'drop-shadow(0 0 8px #ff3366)' }}
                    />
                </svg>
            </div>
        </div>
        
        {/* Branding Text */}
        <div className="mt-12 text-center">
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#ffd26f] via-[#ff3366] to-white italic">
                A.snap
            </h1>
            <div className="mt-4 h-1.5 w-14 bg-gradient-to-r from-[#ff3366] to-[#9d50bb] mx-auto rounded-full opacity-40 animate-pulse"></div>
        </div>
      </div>
      
      {/* Premium Footer */}
      <div className="absolute bottom-12 flex flex-col items-center opacity-30">
          <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-white/70">developed by</p>
          <p className="text-xs font-black text-[#ff3366] italic tracking-tight">ASNAP TEAM</p>
      </div>
    </main>
  );
}
