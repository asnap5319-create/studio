
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

  if (!mounted) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#1a1a1a] overflow-hidden select-none">
      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        
        {/* The 3D Dark Squircle Frame from the Image */}
        <div className="relative">
            {/* Soft outer glow for depth */}
            <div className="absolute -inset-10 bg-black/60 rounded-[4rem] blur-3xl opacity-50"></div>
            
            {/* The Main 3D Squircle Box */}
            <div className="relative w-52 h-52 bg-[#0d0d0d] rounded-[3.8rem] flex items-center justify-center 
                            shadow-[inset_0_4px_8px_rgba(255,255,255,0.08),inset_0_-8px_20px_rgba(0,0,0,0.9),25px_25px_50px_rgba(0,0,0,0.7),-5px_-5px_20px_rgba(255,255,255,0.02)] 
                            border-[8px] border-[#181818] overflow-hidden group">
                
                {/* Glossy top highlight for 3D effect */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

                {/* The Stylized 'A' with Dot (SVG) - Perfect Match to Image */}
                <svg viewBox="0 0 100 100" className="w-36 h-32 drop-shadow-[0_0_20px_rgba(255,51,102,0.5)]">
                    <defs>
                        <linearGradient id="a-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffd26f" /> {/* Yellow at start */}
                            <stop offset="30%" stopColor="#ffb347" /> {/* Orange */}
                            <stop offset="65%" stopColor="#ff3366" /> {/* Pink */}
                            <stop offset="100%" stopColor="#9d50bb" /> {/* Purple at end */}
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    
                    {/* Stylized 'A' - Ribbon style looping path */}
                    <path 
                        d="M20 75 C 20 25, 45 15, 50 15 C 55 15, 80 25, 80 75 M25 58 L75 58" 
                        fill="none" 
                        stroke="url(#a-gradient)" 
                        strokeWidth="14" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        filter="url(#glow)"
                        className="animate-draw"
                    />
                    
                    {/* The Iconic Pink Dot from the image */}
                    <circle 
                      cx="78" 
                      cy="22" 
                      r="9" 
                      fill="#ff3366" 
                      className="animate-pulse shadow-[0_0_15px_#ff3366]" 
                      filter="url(#glow)"
                    />
                </svg>
            </div>
        </div>
        
        {/* App Name Text with Premium Gradient */}
        <div className="mt-16 text-center">
            <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#ffd26f] via-[#ff3366] to-white italic drop-shadow-lg">
                A.snap
            </h1>
            <div className="mt-4 h-2 w-20 bg-gradient-to-r from-[#ff3366] to-[#9d50bb] mx-auto rounded-full shadow-[0_0_20px_#ff3366] animate-pulse"></div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-12 flex flex-col items-center opacity-30">
          <p className="text-[10px] uppercase tracking-[0.6em] font-bold text-white mb-2">from</p>
          <p className="text-sm font-black text-[#ff3366] italic tracking-tight">ASNAP TEAM</p>
      </div>

      <style jsx>{`
        @keyframes draw {
          from { stroke-dasharray: 0 500; }
          to { stroke-dasharray: 500 500; }
        }
        .animate-draw {
          stroke-dasharray: 500;
          animation: draw 2.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </main>
  );
}
