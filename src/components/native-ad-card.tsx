'use client';

import { useEffect, useRef } from 'react';
import { Logo } from './pwa-install-prompt';

/**
 * NativeAdCard handles the injection of Adsterra Native Banner ads.
 * It uses a ref to ensure the script is injected only once into the specific container.
 */
export function NativeAdCard() {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (adContainerRef.current && adContainerRef.current.childNodes.length === 0) {
      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://pl29411112.effectivecpmnetwork.com/286ef4dc1c3c9afc429b42567c2d2b99/invoke.js';
      
      const containerId = 'container-286ef4dc1c3c9afc429b42567c2d2b99';
      const div = document.createElement('div');
      div.id = containerId;
      
      adContainerRef.current.appendChild(script);
      adContainerRef.current.appendChild(div);
    }
  }, []);

  return (
    <div className="h-screen w-full snap-start snap-always bg-black flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-8 left-8 flex items-center gap-2 opacity-50">
        <Logo className="w-8 h-8" />
        <span className="text-xs font-black uppercase tracking-widest text-white italic">Sponsored Content</span>
      </div>
      
      <div className="w-full max-w-sm aspect-[9/16] bg-secondary/10 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden shadow-2xl relative">
        <div ref={adContainerRef} className="w-full h-full flex items-center justify-center">
          {/* Adsterra script will populate this */}
          <div className="text-center p-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-4"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Ad...</p>
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
