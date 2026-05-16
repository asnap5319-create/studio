
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Sparkles } from 'lucide-react';

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className}>
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff0080" stopOpacity="1" />
          <stop offset="50%" stopColor="#ff3366" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffcc33" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path 
        d="M150 400 L256 100 L362 400 M210 320 L302 320" 
        stroke="url(#logoGrad)" 
        strokeWidth="50" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle cx="390" cy="120" r="35" fill="#ff0080" />
    </svg>
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (!isStandalone) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsVisible(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  if (!isVisible || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 duration-700 max-w-lg mx-auto">
      <div className="bg-gradient-to-r from-[#1a1a1a] to-black border border-white/10 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 bg-[#0a0a0a] rounded-xl flex items-center justify-center border border-white/10 shrink-0 shadow-lg overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none"></div>
             <Logo className="w-8 h-8 drop-shadow-[0_0_5px_rgba(255,51,102,0.5)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
               <h4 className="text-sm font-black text-white uppercase italic truncate">Install A.snap</h4>
               <Sparkles className="h-3 w-3 text-primary animate-pulse shrink-0" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate">Get the Full App Experience</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                onClick={handleInstall} 
                className="h-10 px-4 bg-primary text-white font-black uppercase text-xs rounded-xl shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:scale-105 active:scale-95 transition-all"
            >
                <Download className="mr-2 h-4 w-4" /> Install
            </Button>
            <button onClick={() => setIsVisible(false)} className="p-2 text-muted-foreground hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>
      </div>
    </div>
  );
}
