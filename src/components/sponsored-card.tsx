
'use client';

import { useEffect, useRef } from 'react';
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
 * SponsoredCard Component
 * Updated to use manual script injection for Adsterra to ensure reliability in Next.js.
 */
export function SponsoredCard({ ad }: SponsoredCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptInjectedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || scriptInjectedRef.current) return;

    // Use a unique ID for the container to avoid conflicts when multiple ads are rendered
    const containerId = `container-286ef4dc1c3c9afc429b42567c2d2b99-${Math.random().toString(36).substr(2, 9)}`;
    
    // Clear the container first to avoid duplicates
    containerRef.current.innerHTML = '';

    // Create the container div that Adsterra script expects
    const adDiv = document.createElement('div');
    adDiv.id = 'container-286ef4dc1c3c9afc429b42567c2d2b99'; // Adsterra expects this specific ID
    adDiv.style.width = '100%';
    adDiv.style.minHeight = '250px';
    adDiv.style.display = 'flex';
    adDiv.style.justifyContent = 'center';
    adDiv.style.alignItems = 'center';

    // Create the script element manually
    const script = document.createElement('script');
    script.src = 'https://pl29411112.profitablecpmratenetwork.com/286ef4dc1c3c9afc429b42567c2d2b99/invoke.js';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    // Append both to the local container
    containerRef.current.appendChild(adDiv);
    containerRef.current.appendChild(script);
    
    scriptInjectedRef.current = true;

    return () => {
      // Cleanup when the card leaves the screen
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      scriptInjectedRef.current = false;
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-center items-center">
      {/* Ad Label for Transparency */}
      <div className="absolute top-20 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-tighter text-white">Sponsored</span>
      </div>

      {/* Adsterra Ad Container (Injected via useEffect) */}
      <div ref={containerRef} className="w-full max-w-md px-4 flex justify-center items-center min-h-[250px] z-10">
        {/* The ad will be placed here by the script */}
        <div className="text-xs text-muted-foreground animate-pulse">Loading Advertisement...</div>
      </div>

      {/* Footer info to maintain the feed aesthetic */}
      <div className="absolute bottom-24 left-0 right-0 p-4 text-center z-10">
        <div className="flex items-center justify-center gap-2 opacity-40">
          <Info size={12} className="text-white" />
          <p className="text-[10px] text-white uppercase tracking-widest font-bold">Advertisement</p>
        </div>
      </div>
    </div>
  );
}
