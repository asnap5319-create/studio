
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

export function SponsoredCard({ ad }: SponsoredCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const parent = containerRef.current;
    const containerId = `at-container-${ad.id}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Safety check to prevent removeChild crash
    parent.innerHTML = ''; 

    const adWrapper = document.createElement('div');
    adWrapper.id = containerId;
    adWrapper.style.width = '100%';
    adWrapper.style.minHeight = '250px';
    adWrapper.style.display = 'flex';
    adWrapper.style.justifyContent = 'center';
    adWrapper.style.alignItems = 'center';

    const script = document.createElement('script');
    script.src = `https://pl29411112.profitablecpmratenetwork.com/${ad.adUnitId || '286ef4dc1c3c9afc429b42567c2d2b99'}/invoke.js`;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    parent.appendChild(adWrapper);
    
    const timeoutId = setTimeout(() => {
        parent.appendChild(script);
        setIsLoaded(true);
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      if (parent) {
        parent.innerHTML = ''; // Safer clean up
      }
    };
  }, [ad.id, ad.adUnitId]);

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-20 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white">Sponsored</span>
      </div>

      <div className="w-full max-w-md px-4 flex flex-col items-center justify-center z-10">
        {!isLoaded && <Loader2 className="h-6 w-6 text-primary animate-spin" />}
        <div ref={containerRef} className="w-full flex justify-center items-center" style={{ minHeight: '250px' }} />
      </div>

      <div className="absolute bottom-24 left-0 right-0 p-4 text-center z-10">
        <div className="flex items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity">
          <Info size={12} className="text-white" />
          <p className="text-[10px] text-white uppercase tracking-widest font-bold">Premium Sponsored Content</p>
        </div>
      </div>
    </div>
  );
}
