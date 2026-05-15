
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Heart, MessageCircle, Share2, BadgeCheck, Sparkles, Loader2, Volume2, VolumeX, Gift } from 'lucide-react';
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

  // Adsterra Script Injection Logic
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
    adWrapper.style.zIndex = '10';
    
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
    window.open(ad.ctaUrl, '_blank');
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMute = !isMuted;
    globalMuted = newMute;
    setIsMuted(newMute);
    
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => { v.muted = newMute; });
  };

  return (
    <div 
      ref={cardRef} 
      className="relative w-full h-full bg-black overflow-hidden flex flex-col snap-start snap-always"
      onClick={handleCtaClick}
    >
      {/* BACKGROUND CREATIVE: Matches the "Lucky Draw" theme from user screenshot */}
      <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
        {/* Using a specific seed that looks like a lucky wheel or gaming background */}
        <img 
          src={`https://picsum.photos/seed/lucky-draw-99/1080/1920`} 
          className="w-full h-full object-cover opacity-60" 
          alt="Ad Creative"
          data-ai-hint="lucky draw gaming"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        
        {/* Animated Spin Wheel Overlay for extra realism */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="w-64 h-64 border-8 border-dashed border-primary/40 rounded-full animate-[spin_10s_linear_infinite]" />
        </div>
      </div>

      {/* Adsterra Script Injection Layer */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Brand Header (Instagram Style) */}
      <div className="absolute top-0 left-0 right-0 z-40 p-6 pt-12 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#FFD700] to-primary p-[2px] shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    <Gift className="w-6 h-6 text-[#FFD700] animate-bounce" />
                </div>
            </div>
            <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm tracking-tight text-white drop-shadow-md">LUCKY WINNER</span>
                    <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />
                </div>
                <div className="flex items-center gap-1 opacity-90">
                    <Sparkles className="h-2.5 w-2.5 text-[#FFD700] animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Sponsored</span>
                </div>
            </div>
        </div>
        
        <div className="pointer-events-auto">
            <button onClick={toggleMute} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white active:scale-90 transition-transform">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
        </div>
      </div>

      {/* Social Sidebar (Instagram Style) */}
      <div className="absolute right-3 bottom-28 flex flex-col gap-6 z-50 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center group">
                <button 
                  className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white transition-all active:scale-125 group-hover:bg-primary/20"
                  onClick={() => {
                    setIsLiked(!isLiked);
                    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
                  }}
                >
                    <Heart className={cn("h-7 w-7 transition-colors", isLiked ? "fill-primary text-primary" : "text-white")} />
                </button>
                <span className="text-[11px] font-black mt-1 text-white uppercase drop-shadow-md">{(likeCount/1000).toFixed(1)}K</span>
            </div>
            
            <div className="flex flex-col items-center group">
                <button className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white group-hover:bg-white/10">
                  <MessageCircle className="h-7 w-7" />
                </button>
                <span className="text-[11px] font-black mt-1 text-white uppercase drop-shadow-md">{Math.floor(likeCount/12)}</span>
            </div>

            <div className="flex flex-col items-center group">
                <button className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white group-hover:bg-white/10">
                  <Share2 className="h-7 w-7" />
                </button>
                <span className="text-[11px] font-black mt-1 text-white uppercase drop-shadow-md">Share</span>
            </div>
      </div>

      {/* Premium CTA Button (Instagram Style) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black via-black/30 to-transparent z-40 pointer-events-none">
          <div className="mb-4 pointer-events-auto">
              <p className="text-sm font-medium text-white/90 px-2 mb-3 line-clamp-2 drop-shadow-md">
                🎉 Congratulations! You have been selected for today's lucky draw. Spin the wheel to win big prizes! 🎁
              </p>
              <Button 
                className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-black flex justify-between px-6 items-center shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
                onClick={handleCtaClick}
              >
                  <div className="flex flex-col items-start">
                      <span className="text-[10px] font-bold text-black/60 uppercase tracking-widest leading-none mb-1">Play & Win</span>
                      <span className="text-[14px] uppercase tracking-tighter">{ad.ctaText}</span>
                  </div>
                  <ChevronRight className="h-6 w-6 text-primary animate-[bounce-x_1s_infinite]" />
              </Button>
          </div>
      </div>

      <style jsx global>{`
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
