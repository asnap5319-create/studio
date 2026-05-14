'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Info, Loader2, Play } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const parent = containerRef.current;
    const adUnitId = ad.adUnitId || '286ef4dc1c3c9afc429b42567c2d2b99';
    // Adsterra strictly looks for "container-[id]"
    const containerId = `container-${adUnitId}`;
    
    // Clear previous content
    parent.innerHTML = ''; 

    const adWrapper = document.createElement('div');
    adWrapper.id = containerId;
    adWrapper.style.width = '100%';
    adWrapper.style.minHeight = '250px';
    adWrapper.style.display = 'flex';
    adWrapper.style.justifyContent = 'center';
    adWrapper.style.alignItems = 'center';

    const script = document.createElement('script');
    script.src = `//pl29411112.profitablecpmratenetwork.com/${adUnitId}/invoke.js`;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => {
      console.log("Adsterra script loaded successfully");
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error("Adsterra script failed to load");
      setHasError(true);
    };

    parent.appendChild(adWrapper);
    
    // Inject script into the head or the container to trigger Adsterra's invoke
    const timeoutId = setTimeout(() => {
        try {
            parent.appendChild(script);
        } catch (e) {
            setHasError(true);
        }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      if (parent) parent.innerHTML = '';
    };
  }, [ad.id, ad.adUnitId]);

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Sponsored Badge */}
      <div className="absolute top-20 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white">Sponsored</span>
      </div>

      {/* Main Ad Area */}
      <div className="w-full h-full flex flex-col items-center justify-center z-10 p-4">
        {!isLoaded && !hasError && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Loading Premium Ad...</p>
          </div>
        )}

        {/* This div will hold the actual Ad from the script */}
        <div 
          ref={containerRef} 
          className={cn(
            "w-full flex justify-center items-center transition-opacity duration-700",
            isLoaded ? "opacity-100" : "opacity-0"
          )} 
        />

        {/* Fallback Content if Ad fails or is loading */}
        {(hasError || !isLoaded) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-full aspect-[9/16] max-h-[70vh] rounded-3xl overflow-hidden border border-white/10 bg-secondary/20 flex flex-col shadow-2xl">
              <div className="flex-1 relative bg-black">
                 <Image 
                  src={ad.mediaUrl || "https://picsum.photos/seed/asnap-ad/600/1000"} 
                  alt="" 
                  fill 
                  className="object-cover opacity-60"
                  data-ai-hint="premium advertisement"
                 />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-16 h-16 text-white/20" />
                 </div>
              </div>
              <div className="p-6 bg-secondary/40 backdrop-blur-xl border-t border-white/5">
                 <h2 className="text-xl font-black uppercase italic text-primary mb-2">{ad.brandName}</h2>
                 <p className="text-xs text-muted-foreground mb-6 line-clamp-3">{ad.caption}</p>
                 <a 
                  href={ad.ctaUrl} 
                  className="block w-full py-4 bg-primary text-white font-black uppercase text-sm rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.4)] active:scale-95 transition-all"
                 >
                  {ad.ctaText}
                 </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-24 left-0 right-0 p-4 text-center z-20">
        <div className="flex items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity cursor-help">
          <Info size={12} className="text-white" />
          <p className="text-[10px] text-white uppercase tracking-widest font-bold">Adsterra Premium Network</p>
        </div>
      </div>
    </div>
  );
}
