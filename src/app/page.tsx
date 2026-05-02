
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
    if (isUserLoading || !mounted) return;

    const timer = setTimeout(() => {
      if (user) {
        router.push('/feed');
      } else {
        router.push('/login');
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [user, isUserLoading, router, mounted]);

  if (!mounted) return (
    <div className="flex min-h-screen bg-black" />
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black overflow-hidden select-none">
      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        
        {/* The 3D Dark Squircle Frame */}
        <div className="relative">
            {/* Glow for depth */}
            <div className="absolute -inset-8 bg-pink-600/10 rounded-[4rem] blur-2xl opacity-40"></div>
            
            {/* The Main 3D Box */}
            <div className="relative w-48 h-48 bg-[#0d0d0d] rounded-[3.5rem] flex items-center justify-center 
                            shadow-[inset_0_4px_8px_rgba(255,255,255,0.05),inset_0_-8px_20px_rgba(0,0,0,0.8),20px_20px_40px_rgba(0,0,0,0.6),-4px_-4px_15px_rgba(255,255,255,0.01)] 
                            border-[6px] border-[#1a1a1a] overflow-hidden group">
                
                {/* Top highlight */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

                {/* Stylized 'A' with Pink Dot */}
                <svg viewBox="0 0 100 100" className="w-32 h-28 drop-shadow-[0_0_15px_rgba(255,51,102,0.4)]">
                    <defs>
                        <linearGradient id="a-gradient-v2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffd26f" /> 
                            <stop offset="30%" stopColor="#ffb347" /> 
                            <stop offset="65%" stopColor="#ff3366" /> 
                            <stop offset="100%" stopColor="#9d50bb" />
                        </linearGradient>
                    </defs>
                    
                    <path 
                        d="M20 75 C 20 25, 45 15, 50 15 C 55 15, 80 25, 80 75 M25 58 L75 58" 
                        fill="none" 
                        stroke="url(#a-gradient-v2)" 
                        strokeWidth="12" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                    
                    {/* Pink Dot */}
                    <circle 
                      cx="78" 
                      cy="22" 
                      r="8" 
                      fill="#ff3366" 
                      className="animate-pulse"
                    />
                </svg>
            </div>
        </div>
        
        {/* Branding */}
        <div className="mt-12 text-center">
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#ffd26f] via-[#ff3366] to-white italic">
                A.snap
            </h1>
            <div className="mt-3 h-1.5 w-16 bg-gradient-to-r from-[#ff3366] to-[#9d50bb] mx-auto rounded-full opacity-50 animate-pulse"></div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-12 flex flex-col items-center opacity-20">
          <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-white">from</p>
          <p className="text-xs font-black text-[#ff3366] italic">ASNAP TEAM</p>
      </div>
    </main>
  );
}
