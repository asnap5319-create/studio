'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Heart, MessageCircle, Share2, MoreVertical, BadgeCheck, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  
  // Real-time social interaction state
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const incrementComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentCount(prev => prev + 1);
  };

  const incrementShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareCount(prev => prev + 1);
  };

  // Intersection Observer to detect when the ad is in view for playback control
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
      if (entry.isIntersecting) {
        console.log(`[Adsterra] Ad ${ad.id} entered view. Injecting script...`);
      }
    }, { threshold: 0.5 });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [ad.id]);

  useEffect(() => {
    if (!containerRef.current || !isInView || isLoaded) return;

    const adUnitId = ad.adUnitId || '286ef4dc1c3c9afc429b42567c2d2b99';
    const uniqueContainerId = `container-${adUnitId}-${ad.id}`;
    
    const parent = containerRef.current;
    parent.innerHTML = ''; 

    const adWrapper = document.createElement('div');
    adWrapper.id = uniqueContainerId;
    adWrapper.className = "w-full flex justify-center items-center overflow-hidden min-h-[250px] z-20";
    parent.appendChild(adWrapper);

    const script = document.createElement('script');
    script.src = `https://pl29411112.profitablecpmratenetwork.com/${adUnitId}/invoke.js`;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => {
      setTimeout(() => {
        if (adWrapper.innerHTML.length > 0) {
          setIsLoaded(true);
          console.log(`[Adsterra] Script loaded and rendered for ${ad.id}`);
        }
      }, 3000);
    };

    script.onerror = () => {
      console.error(`[Adsterra] Script failed for ${ad.id}`);
      setHasError(true);
    };

    parent.appendChild(script);

    const timer = setTimeout(() => {
      if (!isLoaded) setHasError(true);
    }, 8000);

    return () => {
      clearTimeout(timer);
      if (parent) parent.innerHTML = '';
    };
  }, [ad.id, ad.adUnitId, isInView, isLoaded]);

  return (
    <div ref={cardRef} className="relative w-full h-screen bg-black overflow-hidden select-none">
      
      {/* FULL SCREEN BACKGROUND (Poster/Fallback Image) */}
      <div className="absolute inset-0 z-0">
        <Image 
          src={`https://picsum.photos/seed/${ad.id}-full/1080/1920`} 
          alt="Ad Visual" 
          fill 
          className="object-cover"
          priority
          data-ai-hint="premium fashion"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
      </div>

      {/* TOP BRANDING OVERLAY */}
      <div className="absolute top-0 left-0 right-0 z-30 p-6 pt-12 flex items-center justify-between">
        <h2 className="text-3xl font-black italic tracking-tighter text-primary drop-shadow-[0_2px_15px_rgba(var(--primary),0.6)]">A.snap</h2>
        <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10">
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          <p className="text-[10px] font-black text-white uppercase tracking-widest">Sponsored</p>
        </div>
      </div>

      {/* CENTER ADSTERRA CONTENT (Floating) */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
        <div 
          ref={containerRef} 
          className={cn(
            "w-full transition-all duration-1000 transform",
            isLoaded && !hasError ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none absolute"
          )} 
        />

        {/* LOADING STATE */}
        {!isLoaded && !hasError && isInView && (
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-primary/40 animate-pulse rounded-full"></div>
                <Loader2 className="animate-spin h-14 w-14 text-primary relative z-10" />
            </div>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-white animate-pulse drop-shadow-xl">
                Loading Offer...
            </p>
          </div>
        )}
      </div>

      {/* SOCIAL ACTIONS SIDEBAR (Right) */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-6 z-40 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center cursor-pointer group" onClick={toggleLike}>
                <div className="relative p-3 bg-black/20 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/40 transition-all">
                    {isLiked && <div className="absolute inset-0 blur-lg bg-primary/40 animate-pulse rounded-full"></div>}
                    <Heart className={cn("h-8 w-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition-all active:scale-150", isLiked ? "fill-primary text-primary" : "text-white")} />
                </div>
                <span className="text-[11px] font-black mt-1.5 drop-shadow-md text-white">{likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer group" onClick={incrementComment}>
                <div className="p-3 bg-black/20 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/40 transition-all">
                  <MessageCircle className="h-8 w-8 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] active:scale-125 transition-transform" />
                </div>
                <span className="text-[11px] font-black mt-1.5 drop-shadow-md text-white">{commentCount}</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer group" onClick={incrementShare}>
                <div className="p-3 bg-black/20 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/40 transition-all">
                  <Share2 className="h-8 w-8 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] active:rotate-12 transition-transform" />
                </div>
                <span className="text-[11px] font-black mt-1.5 drop-shadow-md text-white">{shareCount}</span>
            </div>
            
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-transparent">
                <MoreVertical className="h-6 w-6 text-white drop-shadow-md opacity-50" />
            </Button>
      </div>

      {/* BOTTOM DESCRIPTION & CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-20 bg-gradient-to-t from-black via-black/60 to-transparent text-white z-30 space-y-4">
          <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-primary shadow-xl">
                  <AvatarImage src="/logo.svg" />
                  <AvatarFallback className="bg-primary text-white font-bold">A</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm tracking-tight drop-shadow-lg">{ad.brandName}</span>
                      <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />
                  </div>
              </div>
          </div>
          
          <p className="text-sm font-bold leading-relaxed drop-shadow-md pr-16 line-clamp-2 opacity-90">
              {ad.caption}
          </p>

          <Button 
            onClick={() => window.open(ad.ctaUrl || '#', '_blank')} 
            className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-black flex justify-between px-6 items-center shadow-[0_15px_30px_rgba(0,0,0,0.4)] transition-transform active:scale-[0.98]"
          >
              <span className="text-xs uppercase tracking-[0.2em]">{ad.ctaText || 'Explore Now'}</span>
              <ChevronRight className="h-5 w-5 text-primary" />
          </Button>
      </div>
    </div>
  );
}
