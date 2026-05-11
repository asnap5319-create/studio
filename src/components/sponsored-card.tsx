
'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Info, Loader2 } from 'lucide-react';

interface SponsoredCardProps {
  ad: {
    id: string;
    brandName: string;
    brandLogo: string;
    mediaUrl: string;
    caption: string;
    ctaText: string;
    ctaUrl: string;
    adUnitId?: string;
  };
}

/**
 * SponsoredCard Component - Adsterra Edition
 * Using an isolated container and strict cleanup to prevent React "removeChild" crashes.
 */
export function SponsoredCard({ ad }: SponsoredCardProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !adContainerRef.current) return;

    const container = adContainerRef.current;
    
    // 1. Manually clean up any previous script or content to ensure a fresh start
    container.innerHTML = '';
    
    // 2. Create a specific wrapper that matches Adsterra's expected ID
    // We keep this DOM node separate from React's internal tree as much as possible.
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
    
    // Append nodes manually
    container.appendChild(wrapper);
    container.appendChild(script);
    
    setIsLoaded(true);

    // 3. Robust Cleanup: Completely wipe the DOM container on unmount.
    // This prevents React from trying to remove nodes that the script might have already deleted.
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-center items-center">
      {/* Sponsored Header */}
      <div className="absolute top-20 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white">Sponsored</span>
      </div>

      {/* Ad Area */}
      <div className="w-full max-w-md px-4 flex flex-col justify-center items-center z-10">
        {!isLoaded && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Loading Ad...</span>
          </div>
        )}
        
        {/* React "Black Box" for script injection */}
        <div 
          ref={adContainerRef} 
          className="w-full flex justify-center items-center" 
          style={{ minHeight: '250px' }}
        />
      </div>

      {/* Sponsored Footer */}
      <div className="absolute bottom-24 left-0 right-0 p-4 text-center z-10">
        <div className="flex items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity cursor-help">
          <Info size={12} className="text-white" />
          <p className="text-[10px] text-white uppercase tracking-widest font-bold">Premium Sponsored Content</p>
        </div>
      </div>
    </div>
  );
}
