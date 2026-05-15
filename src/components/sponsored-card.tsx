
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Heart, MessageCircle, Share2, BadgeCheck, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SponsoredCardProps {
  ad: {
    id: string;
    brandName: string;
    brandLogo: string;
    ctaText: string;
    ctaUrl: string;
    adUnitId: string;
    adScriptDomain: string;
  };
}

export function SponsoredCard({ ad }: SponsoredCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 5000) + 1000);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, { threshold: 0.6 });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Adsterra Script Injection Logic
  useEffect(() => {
    if (!containerRef.current || !isInView || isLoaded) return;

    console.log(`[Adsterra] Initializing Ad Unit: ${ad.adUnitId}`);
    
    const parent = containerRef.current;
    parent.innerHTML = ''; 

    // Create the Ad Container with Full Screen CSS
    const adWrapper = document.createElement('div');
    adWrapper.id = `at-container-${ad.adUnitId}`;
    adWrapper.style.width = '100%';
    adWrapper.style.height = '100%';
    adWrapper.style.display = 'flex';
    adWrapper.style.justifyContent = 'center';
    adWrapper.style.alignItems = 'center';
    adWrapper.style.overflow = 'hidden';
    adWrapper.style.position = 'relative';
    adWrapper.style.zIndex = '1';
    
    // Construct the script URL
    const scriptPath = ad.adUnitId.match(/.{1,2}/g)?.slice(0, 3).join('/') || '';
    const scriptUrl = `https://${ad.adScriptDomain}/${scriptPath}/${ad.adUnitId}.js`;

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => {
      console.log(`[Adsterra] Script loaded for ${ad.adUnitId}`);
      setIsLoaded(true);
    };

    script.onerror = (e) => {
      console.error(`[Adsterra] Script load failed for ${ad.adUnitId}`, e);
    };

    adWrapper.appendChild(script);
    parent.appendChild(adWrapper);

    return () => {
      if (parent) parent.innerHTML = '';
    };
  }, [ad.id, ad.adUnitId, ad.adScriptDomain, isInView, isLoaded]);

  return (
    <div 
      ref={cardRef} 
      className="relative w-full h-screen bg-black overflow-hidden flex flex-col snap-start snap-always" 
      onClick={() => window.open(ad.ctaUrl, '_blank')}
    >
      {/* Real Ad Creative Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-10"
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#000'
        }} 
      />

      {/* Loading State Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-black">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Fetching Premium Content...</p>
        </div>
      )}

      {/* Insta-style Overlay UI */}
      <div className="absolute top-0 left-0 right-0 z-30 p-6 pt-12 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-10 h-10 rounded-full bg-secondary border border-white/10 flex items-center justify-center overflow-hidden">
                <div className="font-black text-[10px] text-primary">ADS</div>
            </div>
            <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm tracking-tight text-white drop-shadow-md">{ad.brandName}</span>
                    <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />
                </div>
                <div className="flex items-center gap-1 opacity-80">
                    <Sparkles className="h-2 w-2 text-primary" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Sponsored</span>
                </div>
            </div>
        </div>
      </div>

      {/* Sidebar Controls (TikTok Style) */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-6 z-40 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white h-12 w-12 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLiked(!isLiked);
                    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
                  }}
                >
                    <Heart className={cn("h-9 w-9 transition-all active:scale-125", isLiked ? "fill-primary text-primary" : "text-white drop-shadow-md")} />
                </Button>
                <span className="text-xs font-bold mt-1 text-white drop-shadow-md">{likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center">
                <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-transparent" onClick={(e) => e.stopPropagation()}>
                  <MessageCircle className="h-9 w-9 drop-shadow-md" />
                </Button>
                <span className="text-xs font-bold mt-1 text-white drop-shadow-md">{Math.floor(likeCount/15)}</span>
            </div>

            <div className="flex flex-col items-center">
                <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-transparent" onClick={(e) => e.stopPropagation()}>
                  <Share2 className="h-9 w-9 drop-shadow-md" />
                </Button>
                <span className="text-xs font-bold mt-1 text-white drop-shadow-md">Share</span>
            </div>
      </div>

      {/* Bottom CTA Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black via-transparent to-transparent z-30 pointer-events-none">
          <Button 
            className="w-full h-14 bg-white text-black hover:bg-white/95 rounded-2xl font-black flex justify-between px-6 items-center shadow-2xl pointer-events-auto active:scale-95 transition-all"
            onClick={() => window.open(ad.ctaUrl, '_blank')}
          >
              <span className="text-[11px] uppercase tracking-[0.2em]">{ad.ctaText}</span>
              <ChevronRight className="h-5 w-5 text-primary" />
          </Button>
      </div>
    </div>
  );
}
