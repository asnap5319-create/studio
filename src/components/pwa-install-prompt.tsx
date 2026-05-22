'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Sparkles, Smartphone } from 'lucide-react';

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path 
        d="M150 400 L256 100 L362 400 M210 320 L302 320" 
        stroke="#ff3366" 
        strokeWidth="64" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle cx="390" cy="120" r="42" fill="#ff3366" />
    </svg>
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Logic to detect if we can show the install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (!isStandalone) {
        // Show after a short delay for better UX
        setTimeout(() => setIsVisible(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

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

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 duration-700 max-w-lg mx-auto">
      <div className="bg-gradient-to-r from-[#0a0a0a] to-[#1a1a1a] border border-white/10 p-5 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center justify-between gap-4 backdrop-blur-2xl relative overflow-hidden">
        {/* Money Pattern Background Overlay */}
        <div className="absolute inset-0 bg-money-pattern opacity-5 pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative w-14 h-14 bg-money-pattern rounded-2xl flex items-center justify-center border border-white/10 shrink-0 shadow-2xl overflow-hidden">
             <Logo className="w-10 h-10 drop-shadow-sm" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
               <h4 className="text-sm font-black text-white uppercase italic truncate">Install A.snap</h4>
               <Sparkles className="h-3 w-3 text-primary animate-pulse shrink-0" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate">Premium Video Feed</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 relative z-10">
            <Button 
                onClick={handleInstall} 
                className="h-12 px-6 bg-primary text-white font-black uppercase text-xs rounded-xl shadow-[0_10px_25px_rgba(255,51,102,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
                <Download className="h-4 w-4" /> Install
            </Button>
            <button onClick={() => setIsVisible(false)} className="p-2 text-muted-foreground hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>
      </div>
    </div>
  );
}