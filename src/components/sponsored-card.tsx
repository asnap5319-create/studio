
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

    const adUnitId = ad.adUnitId || '286ef4dc1c3c9afc429b42567c2d2b99';
    const uniqueContainerId = `container-${adUnitId}-${ad.id}`;
    
    const parent = containerRef.current;
    parent.innerHTML = ''; 

    // Create a wrapper for the ad
    const adWrapper = document.createElement('div');
    adWrapper.id = uniqueContainerId;
    adWrapper.className = "w-full min-h-[300px] flex items-center justify-center overflow-hidden z-20";
    parent.appendChild(adWrapper);

    // Create the Adsterra script
    const script = document.createElement('script');
    script.src = `https://pl29411112.profitablecpmratenetwork.com/${adUnitId}/invoke.js`;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => {
      console.log(`[Adsterra] Ad script loaded for ${ad.id}`);
      // Give it some time to render
      setTimeout(() => {
        if (adWrapper.children.length > 0) {
          setIsLoaded(true);
        }
      }, 2000);
    };

    script.onerror = () => {
      console.error(`[Adsterra] Script failed to load for ${ad.id}`);
      setHasError(true);
    };

    parent.appendChild(script);

    return () => {
      if (parent) parent.innerHTML = '';
    };
  }, [ad.id, ad.adUnitId, isInView, isLoaded]);

  return (
    <div ref={cardRef} className="relative w-full h-screen bg-black overflow-hidden select-none">
      
      {/* Background Layer (Fallback/Poster) */}
      <div className="absolute inset-0 z-0">
        <Image 
          src={ad.mediaUrl || `https://picsum.photos/seed/${ad.id}-bg/1080/1920`} 
          alt="Ad Visual" 
          fill 
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
      </div>

      {/* Header Info */}
      <div className="absolute top-0 left-0 right-0 z-30 p-6 pt-12 flex items-center justify-between pointer-events-none">
        <h2 className="text-3xl font-black italic tracking-tighter text-primary drop-shadow-[0_2px_15px_rgba(var(--primary),0.6)] pointer-events-auto">A.snap</h2>
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 pointer-events-auto">
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          <p className="text-[10px] font-black text-white uppercase tracking-widest">Sponsored</p>
        </div>
      </div>

      {/* Main Ad Area */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
        <div 
          ref={containerRef} 
          className={cn(
            "w-full transition-all duration-700",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          )} 
        />

        {!isLoaded && !hasError && isInView && (
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-primary/40 animate-pulse rounded-full"></div>
                <Loader2 className="animate-spin h-14 w-14 text-primary relative z-10" />
            </div>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-white animate-pulse">
                Fetching Best Offer...
            </p>
          </div>
        )}
        
        {hasError && (
          <div className="text-center p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 max-w-xs">
            <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-black uppercase text-sm mb-2">Exclusive Offer</h3>
            <p className="text-xs text-muted-foreground mb-4">Click below to check out this premium collection.</p>
            <Button className="w-full rounded-xl bg-primary" onClick={() => window.open(ad.ctaUrl, '_blank')}>
              View More
            </Button>
          </div>
        )}
      </div>

      {/* Social Sidebar */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-6 z-40 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center cursor-pointer" onClick={toggleLike}>
                <div className="p-3 bg-black/30 backdrop-blur-md rounded-full border border-white/10 active:scale-150 transition-transform">
                    <Heart className={cn("h-8 w-8", isLiked ? "fill-primary text-primary" : "text-white")} />
                </div>
                <span className="text-[11px] font-black mt-1.5 text-white">{likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer" onClick={incrementComment}>
                <div className="p-3 bg-black/30 backdrop-blur-md rounded-full border border-white/10 active:scale-125 transition-transform">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <span className="text-[11px] font-black mt-1.5 text-white">{commentCount}</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer" onClick={incrementShare}>
                <div className="p-3 bg-black/30 backdrop-blur-md rounded-full border border-white/10 active:rotate-12 transition-transform">
                  <Share2 className="h-8 w-8 text-white" />
                </div>
                <span className="text-[11px] font-black mt-1.5 text-white">{shareCount}</span>
            </div>
      </div>

      {/* Bottom CTA Area */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-20 bg-gradient-to-t from-black via-black/40 to-transparent text-white z-30 space-y-4">
          <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary">
                  <AvatarImage src="/logo.svg" />
                  <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight">{ad.brandName}</span>
                  <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />
              </div>
          </div>
          
          <p className="text-sm font-bold leading-relaxed pr-16 line-clamp-2 opacity-90">
              {ad.caption}
          </p>

          <Button 
            onClick={() => window.open(ad.ctaUrl || '#', '_blank')} 
            className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-black flex justify-between px-6 items-center shadow-2xl active:scale-95 transition-transform"
          >
              <span className="text-xs uppercase tracking-[0.2em]">{ad.ctaText || 'Explore Now'}</span>
              <ChevronRight className="h-5 w-5 text-primary" />
          </Button>
      </div>
    </div>
  );
}
