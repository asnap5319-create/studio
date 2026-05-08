'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Sparkles } from 'lucide-react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (!isStandalone) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registered: ', registration);
          },
          (registrationError) => {
            console.log('SW registration failed: ', registrationError);
          }
        );
      });
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsVisible(false);
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
  };

  if (!isMounted || !isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-gradient-to-r from-[#1a1a1a] to-black border border-white/10 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 shrink-0 shadow-lg">
             <svg viewBox="0 0 512 512" className="w-8 h-8">
                <defs>
                  <linearGradient id="promptGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff0080" stopOpacity="1" />
                    <stop offset="50%" stopColor="#ff3366" stopOpacity="1" />
                    <stop offset="100%" stopColor="#ffcc33" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path 
                  d="M150 400 L256 100 L362 400 M210 320 L302 320" 
                  stroke="url(#promptGrad)" 
                  strokeWidth="50" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <circle cx="390" cy="120" r="35" fill="#ff0080" />
             </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
               <h4 className="text-sm font-black text-white uppercase italic">Install A.snap</h4>
               <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Fast & Smooth Experience</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                onClick={handleInstall} 
                className="h-10 px-4 bg-primary text-white font-black uppercase text-xs rounded-xl shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:scale-105 transition-transform"
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