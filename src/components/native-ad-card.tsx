'use client';

import { useEffect, useRef } from 'react';
import { Logo } from './pwa-install-prompt';

export function NativeAdCard() {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current || !adContainerRef.current) return;
    
    const containerId = 'container-286ef4dc1c3c9afc429b42567c2d2b99';
    adContainerRef.current.innerHTML = '';
    
    const adDiv = document.createElement('div');
    adDiv.id = containerId;
    adContainerRef.current.appendChild(adDiv);

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://pl29411112.effectivecpmnetwork.com/286ef4dc1c3c9afc429b42567c2d2b99/invoke.js';
    
    adContainerRef.current.appendChild(script);
    isInitialized.current = true;

    return () => {
      if (adContainerRef.current) adContainerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div className="h-screen w-full snap-start snap-always bg-black flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-8 left-8 flex items-center gap-2 opacity-50">
        <Logo className="w-8 h-8" />
        <span className="text-xs font-black uppercase tracking-widest text-white italic">Sponsored</span>
      </div>
      
      <div className="w-full max-w-sm aspect-[9/16] bg-secondary/10 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
        <div ref={adContainerRef} className="w-full h-full flex items-center justify-center min-h-[300px]">
          <div className="text-center p-10 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Loading Sponsored Reel...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}