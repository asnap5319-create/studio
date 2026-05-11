
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
 * SponsoredCard loads Adsterra ads in a completely isolated way
 * to prevent React "removeChild" crashes.
 */
export function SponsoredCard({ ad }: SponsoredCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Use a unique ID for each ad unit to avoid script conflicts
    const containerId = `at-container-${ad.adUnitId || ad.id}`;
    const parent = containerRef.current;
    
    // Clear the parent completely before each injection
    parent.innerHTML = ''; 

    // Create a safe wrapper div that the script will target
    const adWrapper = document.createElement('div');
    adWrapper.id = containerId;
    adWrapper.style.width = '100%';
    adWrapper.style.minHeight = '250px';
    adWrapper.style.display = 'flex';
    adWrapper.style.justifyContent = 'center';
    adWrapper.style.alignItems = 'center';

    const script = document.createElement('script');
    script.src = `https://pl29411112.profitablecpmratenetwork.com/${ad.adUnitId}/invoke.js`;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    // Append wrapper first, then script
    parent.appendChild(adWrapper);
    parent.appendChild(script);
    
    setIsLoaded(true);

    return () => {
      // Safe cleanup: just empty the innerHTML of our managed parent
      if (parent) {
        parent.innerHTML = '';
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
        {!isLoaded && (
          <div className="flex flex-col items-center gap-3 mb-4">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        )}
        
        {/* Isolated container for Adsterra's script - React will NOT manage children of this div */}
        <div 
          ref={containerRef} 
          className="w-full flex justify-center items-center" 
          style={{ minHeight: '250px' }}
        />
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
