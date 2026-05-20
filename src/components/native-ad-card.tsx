'use client';

import { useEffect, useRef } from 'react';
import { Logo } from './pwa-install-prompt';

/**
 * NativeAdCard handles the injection of Adsterra Native Banner ads.
 * It uses direct DOM manipulation to ensure scripts are executed and not shown as text.
 */
export function NativeAdCard() {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current || !adContainerRef.current) return;
    
    const containerId = 'container-286ef4dc1c3c9afc429b42567c2d2b99';
    
    // Clear existing content to be sure
    adContainerRef.current.innerHTML = '';
    
    // 1. Create the div that the ad will be injected into
    const adDiv = document.createElement('div');
    adDiv.id = containerId;
    adContainerRef.current.appendChild(adDiv);

    // 2. Create and append the script element
    // This script must be appended to the DOM to execute correctly
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://pl29411112.effectivecpmnetwork.com/286ef4dc1c3c9afc429b42567c2d2b99/invoke.js';
    
    // Append the script to the adContainerRef div
    adContainerRef.current.appendChild(script);
    
    isInitialized.current = true;

    return () => {
      // Cleanup
      if (adContainerRef.current) {
        adContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="h-screen w-full snap-start snap-always bg-black flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-8 left-8 flex items-center gap-2 opacity-50">
        <Logo className="w-8 h-8" />
        <span className="text-xs font-black uppercase tracking-widest text-white italic">Sponsored Content</span>
      </div>
      
      <div className="w-full max-w-sm aspect-[9/16] bg-secondary/10 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden shadow-2xl relative">
        <div ref={adContainerRef} className="w-full h-full flex items-center justify-center min-h-[250px]">
          {/* Adsterra script will populate this container. If script fails or lags, we show a loader */}
          <div className="text-center p-10 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">
              Loading Sponsored Reel...
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center px-10">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Watch more content to support creators
        </p>
      </div>
    </div>
  );
}