'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Info } from 'lucide-react';

interface SponsoredCardProps {
  ad: {
    id: string;
    brandName: string;
    brandLogo: string;
    mediaUrl: string;
    caption: string;
    ctaText: string;
    ctaUrl: string;
    isVideo?: boolean;
    adUnitId?: string;
  };
}

/**
 * SponsoredCard Component - Adsterra Edition
 * Isolated DOM node injection to prevent React "removeChild" crashes.
 */
export function SponsoredCard({ ad }: SponsoredCardProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !adContainerRef.current) return;

    const container = adContainerRef.current;
    
    // Clear any previous artifacts manually
    container.innerHTML = '';
    
    // Create an isolated wrapper that React's reconciliation engine won't touch
    const wrapper = document.createElement('div');
    wrapper.id = 'container-286ef4dc1c3c9afc429b42567c2d2b99';
    wrapper.style.width = '100%';
    wrapper.style.minHeight = '250px';
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'center';
    wrapper.style.alignItems = 'center';

    const script = document.createElement('script');
    script.src = 'https://pl29411112.profitablecpmratenetwork.com/286ef4dc1c3c9afc429b42567c2d2b99/invoke.js';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    // Append manually to the stable DOM ref
    container.appendChild(wrapper);
    container.appendChild(script);
    
    setIsLoaded(true);

    // Cleanup: Completely wipe the container on unmount to prevent React/DOM conflicts
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-center items-center">
      {/* Ad Label */}
      <div className="absolute top-20 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-tighter text-white">Sponsored</span>
      </div>

      {/* Main Ad Display Area - Isolated Ref */}
      <div className="w-full max-w-md px-4 flex flex-col justify-center items-center z-10">
        {!isLoaded && (
          <div className="text-xs text-muted-foreground animate-pulse mb-4 font-bold uppercase tracking-widest">
            Loading Premium Ad...
          </div>
        )}
        
        {/* Isolated node for Adsterra to prevent removeChild crash */}
        <div 
          ref={adContainerRef} 
          className="w-full flex justify-center items-center" 
          style={{ minHeight: '250px' }}
        />
      </div>

      {/* Brand Footer */}
      <div className="absolute bottom-24 left-0 right-0 p-4 text-center z-10">
        <div className="flex items-center justify-center gap-2 opacity-40">
          <Info size={12} className="text-white" />
          <p className="text-[10px] text-white uppercase tracking-widest font-bold">A.snap Sponsored Content</p>
        </div>
      </div>
    </div>
  );
}
