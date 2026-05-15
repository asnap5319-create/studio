
'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Share2, BadgeCheck, Loader2, Volume2, VolumeX, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 5000) + 1000);
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
    // Safety check: Don't open if it's just a raw script link
    if (ad.ctaUrl.endsWith('.js')) {
        const domain = ad.ctaUrl.split('/')[2];
        window.open(`https://${domain}`, '_blank');
    } else {
        window.open(ad.ctaUrl, '_blank');
    }
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
      {/* AD BACKGROUND - Neutral Premium Look */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-zinc-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
             <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        )}
      </div>

      {/* Adsterra Content Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden pointer-events-none"
      />

      {/* Header Controls (Mute button only) */}
      <div className="absolute top-12 right-4 z-50">
        <button onClick={toggleMute} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white active:scale-90 transition-transform">
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Instagram Style Social Sidebar */}
      <div className="absolute right-3 bottom-32 flex flex-col gap-6 z-40 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
                <button 
                  className="text-white transition-all active:scale-125"
                  onClick={() => {
                    setIsLiked(!isLiked);
                    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
                  }}
                >
                    <Heart className={cn("h-9 w-9 drop-shadow-lg transition-colors", isLiked ? "fill-primary text-primary" : "text-white")} />
                </button>
                <span className="text-[11px] font-bold mt-1 text-white uppercase drop-shadow-md">{(likeCount/1000).toFixed(1)}K</span>
            </div>
            
            <div className="flex flex-col items-center">
                <button className="text-white">
                  <MessageCircle className="h-9 w-9 drop-shadow-lg" />
                </button>
                <span className="text-[11px] font-bold mt-1 text-white uppercase drop-shadow-md">{Math.floor(likeCount/10)}</span>
            </div>

            <div className="flex flex-col items-center">
                <button className="text-white">
                  <Share2 className="h-9 w-9 drop-shadow-lg" />
                </button>
                <span className="text-[11px] font-bold mt-1 text-white uppercase drop-shadow-md">Share</span>
            </div>
      </div>

      {/* Instagram Style Ad Info & CTA (Bottom Section) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black via-black/40 to-transparent z-40">
        <div className="flex flex-col gap-4">
            {/* Advertiser Info (Bottom Left) */}
            <div className="flex items-center gap-3 mb-2" onClick={(e) => e.stopPropagation()}>
                <Avatar className="h-10 w-10 border-2 border-primary shadow-lg">
                    <AvatarImage src={ad.brandLogo} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white font-bold">{ad.brandName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[15px] text-white drop-shadow-md">{ad.brandName}</span>
                        <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />
                    </div>
                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest drop-shadow-md">Sponsored</span>
                </div>
            </div>

            {/* Ad Caption */}
            <p className="text-sm text-white/90 px-1 mb-2 line-clamp-2 drop-shadow-md pointer-events-none">
                Get ready for the ultimate experience! Click below to explore more. 🚀
            </p>

            {/* Premium CTA Button (The Insta Bar) */}
            <Button 
                className="w-full h-12 bg-white text-black hover:bg-white/90 rounded-xl font-black flex justify-between px-5 items-center shadow-2xl active:scale-[0.98] transition-all"
                onClick={handleCtaClick}
            >
                <span className="text-sm uppercase tracking-tighter">{ad.ctaText}</span>
                <ChevronRight className="h-5 w-5 text-primary" />
            </Button>
        </div>
      </div>
    </div>
  );
}
