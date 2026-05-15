
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Heart, MessageCircle, Share2, BadgeCheck, Loader2, Sparkles } from 'lucide-react';
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
    adUnitId: string;
    adScriptDomain: string;
  };
}

export function SponsoredCard({ ad }: SponsoredCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  
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

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, { threshold: 0.5 });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [ad.id]);

  useEffect(() => {
    if (!containerRef.current || !isInView || isLoaded) return;

    const adUnitId = ad.adUnitId;
    const adScriptDomain = ad.adScriptDomain;
    const uniqueContainerId = `container-${adUnitId}-${ad.id}`;
    
    const parent = containerRef.current;
    parent.innerHTML = ''; 

    const adWrapper = document.createElement('div');
    adWrapper.id = uniqueContainerId;
    adWrapper.className = "w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/5 min-h-[300px]";
    parent.appendChild(adWrapper);

    const scriptPath = adUnitId.match(/.{1,2}/g)?.slice(0, 3).join('/') || '';
    const scriptUrl = `https://${adScriptDomain}/${scriptPath}/${adUnitId}.js`;

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => {
      console.log(`[Adsterra] Ad Script Loaded: ${adUnitId}`);
      setTimeout(() => {
        if (adWrapper.children.length > 0) {
          setIsLoaded(true);
        }
      }, 2000);
    };

    script.onerror = () => {
      console.error(`[Adsterra] Script Failed: ${adUnitId}`);
      setHasError(true);
    };

    parent.appendChild(script);

    return () => {
      if (parent) parent.innerHTML = '';
    };
  }, [ad.id, ad.adUnitId, ad.adScriptDomain, isInView, isLoaded]);

  return (
    <div ref={cardRef} className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <Image 
          src={ad.mediaUrl || `https://picsum.photos/seed/${ad.id}/1080/1920`} 
          alt="Ad Background" 
          fill 
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/95" />
      </div>

      {/* Ad Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-6 pt-12 flex items-center justify-between pointer-events-none">
        <h2 className="text-4xl font-black italic tracking-tighter text-primary drop-shadow-[0_2px_15px_rgba(var(--primary),0.7)] pointer-events-auto">A.snap</h2>
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-3xl px-5 py-2 rounded-full border border-white/10 pointer-events-auto">
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Sponsored</p>
        </div>
      </div>

      {/* Content Area - Ad Script Target */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12 mb-20 z-10">
        <div 
          ref={containerRef} 
          className={cn(
            "w-full max-w-sm transition-all duration-1000 transform",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          )} 
        />

        {!isLoaded && !hasError && isInView && (
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-primary/40 animate-pulse rounded-full"></div>
                <Loader2 className="animate-spin h-14 w-14 text-primary relative z-10" />
            </div>
            <p className="mt-8 text-[11px] font-black uppercase tracking-[0.5em] text-white/80 animate-pulse">
                Fetching Exclusive Offer...
            </p>
          </div>
        )}
        
        {(hasError || (!isLoaded && !isInView)) && (
          <div className="text-center p-8 bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 max-w-xs shadow-2xl animate-in zoom-in-95 duration-700">
            <div className="w-16 h-16 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-black uppercase text-lg mb-2 tracking-tight">Premium Deal</h3>
            <p className="text-[10px] text-muted-foreground mb-8 uppercase tracking-widest leading-relaxed">Unlock special rewards curated just for you.</p>
            <Button className="w-full h-14 rounded-2xl bg-primary font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all" onClick={() => window.open(ad.ctaUrl, '_blank')}>
              Explore Now
            </Button>
          </div>
        )}
      </div>

      {/* Social Sidebar */}
      <div className="absolute right-4 bottom-44 flex flex-col gap-8 z-40 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center cursor-pointer group" onClick={toggleLike}>
                <div className="p-3 bg-black/50 backdrop-blur-3xl rounded-full border border-white/10 group-active:scale-150 transition-all shadow-xl">
                    <Heart className={cn("h-7 w-7 transition-colors", isLiked ? "fill-primary text-primary" : "text-white")} />
                </div>
                <span className="text-[11px] font-black mt-2 text-white drop-shadow-lg">{likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer group" onClick={incrementComment}>
                <div className="p-3 bg-black/50 backdrop-blur-3xl rounded-full border border-white/10 group-active:scale-125 transition-all shadow-xl">
                  <MessageCircle className="h-7 w-7 text-white" />
                </div>
                <span className="text-[11px] font-black mt-2 text-white drop-shadow-lg">{commentCount}</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer group" onClick={incrementShare}>
                <div className="p-3 bg-black/50 backdrop-blur-3xl rounded-full border border-white/10 group-active:rotate-12 transition-all shadow-xl">
                  <Share2 className="h-7 w-7 text-white" />
                </div>
                <span className="text-[11px] font-black mt-2 text-white drop-shadow-lg">{shareCount}</span>
            </div>
      </div>

      {/* Bottom Information and CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-28 bg-gradient-to-t from-black via-black/40 to-transparent text-white z-30 space-y-5">
          <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary shadow-2xl">
                  <AvatarImage src="/logo.svg" />
                  <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight">{ad.brandName}</span>
                  <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />
              </div>
          </div>
          
          <p className="text-sm font-bold leading-relaxed pr-20 line-clamp-2 opacity-90 drop-shadow-md">
              {ad.caption}
          </p>

          <Button 
            onClick={() => window.open(ad.ctaUrl || '#', '_blank')} 
            className="w-full h-16 bg-white text-black hover:bg-white/95 rounded-2xl font-black flex justify-between px-8 items-center shadow-2xl active:scale-95 transition-all"
          >
              <span className="text-[10px] uppercase tracking-[0.3em]">{ad.ctaText || 'Learn More'}</span>
              <ChevronRight className="h-5 w-5 text-primary" />
          </Button>
      </div>
    </div>
  );
}
