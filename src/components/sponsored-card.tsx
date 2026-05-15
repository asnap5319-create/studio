
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Heart, MessageCircle, Share2, BadgeCheck, Sparkles, Loader2, Volume2, VolumeX } from 'lucide-react';
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

// Global mute state synchronized with post-card.tsx
let globalMuted = true;

export function SponsoredCard({ ad }: SponsoredCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 8000) + 2000);
  const [isMuted, setIsMuted] = useState(globalMuted);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, { threshold: 0.6 });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView) {
      setIsMuted(globalMuted);
    }
  }, [isInView]);

  // Adsterra Script Injection Logic - Optimized for stability
  useEffect(() => {
    if (!containerRef.current || !isInView || isLoaded) return;

    const parent = containerRef.current;
    parent.innerHTML = ''; 

    const adWrapper = document.createElement('div');
    adWrapper.id = `at-container-${ad.adUnitId}`;
    adWrapper.style.width = '100%';
    adWrapper.style.height = '100%';
    adWrapper.style.display = 'flex';
    adWrapper.style.justifyContent = 'center';
    adWrapper.style.alignItems = 'center';
    adWrapper.style.overflow = 'hidden';
    adWrapper.style.position = 'absolute';
    adWrapper.style.inset = '0';
    adWrapper.style.zIndex = '1';
    
    // Constructing the script URL from ID parts
    const id = ad.adUnitId;
    const scriptPath = `${id.substring(0,2)}/${id.substring(2,4)}/${id.substring(4,6)}`;
    const scriptUrl = `https://${ad.adScriptDomain}/${scriptPath}/${id}.js`;

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setIsLoaded(true);

    adWrapper.appendChild(script);
    parent.appendChild(adWrapper);

    return () => {
      if (parent) parent.innerHTML = '';
    };
  }, [ad.id, ad.adUnitId, ad.adScriptDomain, isInView, isLoaded]);

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Directly open the CTA URL which is now formatted as a landing page
    window.open(ad.ctaUrl, '_blank');
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMute = !isMuted;
    globalMuted = newMute;
    setIsMuted(newMute);
    
    // Sync all video elements on screen
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => { v.muted = newMute; });
  };

  return (
    <div 
      ref={cardRef} 
      className="relative w-full h-full bg-black overflow-hidden flex flex-col snap-start snap-always"
      onClick={handleCtaClick}
    >
      {/* Background Layer to prevent black screen */}
      <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
        <img 
          src={`https://picsum.photos/seed/${ad.id}/1080/1920`} 
          className="w-full h-full object-cover opacity-20 grayscale" 
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      {/* Adsterra Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Ad UI Controls (Insta Style) */}
      {!isLoaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">Premium Ad Loading...</p>
        </div>
      )}

      {/* Brand Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-6 pt-12 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    <span className="font-black text-[10px] text-white italic">SNAP</span>
                </div>
            </div>
            <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm tracking-tight text-white drop-shadow-md">{ad.brandName}</span>
                    <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />
                </div>
                <div className="flex items-center gap-1 opacity-90">
                    <Sparkles className="h-2 w-2 text-primary" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Sponsored</span>
                </div>
            </div>
        </div>
        
        <div className="pointer-events-auto">
            <button onClick={toggleMute} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
        </div>
      </div>

      {/* Social Sidebar */}
      <div className="absolute right-3 bottom-28 flex flex-col gap-6 z-40 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
                <button 
                  className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white transition-all active:scale-125"
                  onClick={() => {
                    setIsLiked(!isLiked);
                    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
                  }}
                >
                    <Heart className={cn("h-7 w-7", isLiked ? "fill-primary text-primary" : "text-white")} />
                </button>
                <span className="text-[10px] font-black mt-1 text-white uppercase">{likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center">
                <button className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white">
                  <MessageCircle className="h-7 w-7" />
                </button>
                <span className="text-[10px] font-black mt-1 text-white uppercase">{Math.floor(likeCount/12)}</span>
            </div>

            <div className="flex flex-col items-center">
                <button className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white">
                  <Share2 className="h-7 w-7" />
                </button>
                <span className="text-[10px] font-black mt-1 text-white uppercase">Share</span>
            </div>
      </div>

      {/* Premium CTA Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black via-black/20 to-transparent z-30 pointer-events-none">
          <Button 
            className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-black flex justify-between px-6 items-center shadow-2xl pointer-events-auto active:scale-95 transition-all mb-4"
            onClick={handleCtaClick}
          >
              <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold text-black/60 uppercase tracking-widest leading-none mb-1">Explore Now</span>
                  <span className="text-[13px] uppercase tracking-tighter">{ad.ctaText}</span>
              </div>
              <ChevronRight className="h-6 w-6 text-primary" />
          </Button>
      </div>
    </div>
  );
}
