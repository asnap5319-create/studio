
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
 * SponsoredCard Component
 * Uses an isolated DOM container for Adsterra injection to prevent 
 * "removeChild" errors caused by conflicts between React and external scripts.
 */
export function SponsoredCard({ ad }: SponsoredCardProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Ensure we are on the client and the ref is available
    if (typeof window === 'undefined' || !adContainerRef.current) return;

    const container = adContainerRef.current;
    
    // Clear any previous injections to avoid duplicates
    container.innerHTML = '';
    
    // Create the placeholder div that Adsterra's invoke.js looks for
    const adPlaceholder = document.createElement('div');
    adPlaceholder.id = 'container-286ef4dc1c3c9afc429b42567c2d2b99';
    adPlaceholder.style.width = '100%';
    adPlaceholder.style.display = 'flex';
    adPlaceholder.style.justifyContent = 'center';
    adPlaceholder.style.alignItems = 'center';
    adPlaceholder.style.minHeight = '250px';

    // Create the script tag
    const script = document.createElement('script');
    script.src = 'https://pl29411112.profitablecpmratenetwork.com/286ef4dc1c3c9afc429b42567c2d2b99/invoke.js';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    // Append to our isolated ref container
    container.appendChild(adPlaceholder);
    container.appendChild(script);
    
    setIsLoaded(true);

    // Cleanup: React will handle removing the 'container' div itself,
    // but we manually clear internal content to be safe.
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

      <div className="w-full max-w-md px-4 flex flex-col justify-center items-center min-h-[250px] z-10">
        {!isLoaded && (
          <div className="text-xs text-muted-foreground animate-pulse mb-4">
            Loading Ad...
          </div>
        )}
        
        {/* 
            CRITICAL FIX: This div is isolated. React manages the 'adContainerRef' node, 
            but we manage its children via useEffect. By keeping 'isLoaded' logic 
            outside of this specific node, we prevent "node not found" child removal errors.
        */}
        <div ref={adContainerRef} className="w-full flex justify-center items-center" />
      </div>

      <div className="absolute bottom-24 left-0 right-0 p-4 text-center z-10">
        <div className="flex items-center justify-center gap-2 opacity-40">
          <Info size={12} className="text-white" />
          <p className="text-[10px] text-white uppercase tracking-widest font-bold">Advertisement</p>
        </div>
      </div>
    </div>
  );
}
