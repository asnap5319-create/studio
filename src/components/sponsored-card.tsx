
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

  // Intersection Observer to detect when the ad is in view
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        console.log(`[AdDebug] Ad ${ad.id} is now in view. Starting load...`);
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

    // Create a specific container that the script expects
    const adWrapper = document.createElement('div');
    adWrapper.id = uniqueContainerId;
    adWrapper.className = "w-full flex justify-center items-center overflow-hidden min-h-[300px]";
    parent.appendChild(adWrapper);

    // Create the Adsterra script
    const script = document.createElement('script');
    script.src = `https://pl29411112.profitablecpmratenetwork.com/${adUnitId}/invoke.js`;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => {
      console.log(`[AdDebug] Script loaded for ${ad.id}. Waiting for rendering...`);
      // Give it time to render the iframe
      setTimeout(() => {
        const hasContent = adWrapper.innerHTML.length > 0;
        if (hasContent) {
          setIsLoaded(true);
          console.log(`[AdDebug] Ad ${ad.id} rendered successfully.`);
        } else {
          console.warn(`[AdDebug] Ad ${ad.id} script loaded but no content rendered.`);
        }
      }, 3000);
    };

    script.onerror = (e) => {
      console.error(`[AdDebug] Script failed to load for ${ad.id}:`, e);
      setHasError(true);
    };

    try {
      parent.appendChild(script);
    } catch (e) {
      console.error(`[AdDebug] Error appending script for ${ad.id}:`, e);
      setHasError(true);
    }

    // Safety timeout: If ad doesn't load in 8 seconds, show fallback
    const timer = setTimeout(() => {
      if (!isLoaded) {
        console.warn(`[AdDebug] Ad ${ad.id} timed out. Showing fallback.`);
        setHasError(true);
      }
    }, 8000);

    return () => {
      clearTimeout(timer);
      if (parent) parent.innerHTML = '';
    };
  }, [ad.id, ad.adUnitId, isInView, isLoaded]);

  return (
    <div ref={cardRef} className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden select-none">
      
      {/* Background Poster (Prevents Black Screen) */}
      <div className="absolute inset-0 z-0">
        <Image 
          src={`https://picsum.photos/seed/${ad.id}-reel/1080/1920`} 
          alt="Ad Background" 
          fill 
          className="object-cover opacity-60 blur-[2px]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-12 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black italic tracking-tighter text-primary drop-shadow-[0_2px_15px_rgba(var(--primary),0.6)]">A.snap</h2>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 bg-primary/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            <p className="text-[11px] font-black text-white uppercase tracking-widest">Sponsored</p>
          </div>
        </div>
      </div>

      {/* Main Ad Content Area */}
      <div className="w-full h-full flex flex-col items-center justify-center relative z-10 px-4">
        
        {/* Real Adsterra Container */}
        <div 
          ref={containerRef} 
          className={cn(
            "w-full flex justify-center items-center transition-all duration-1000 transform",
            isLoaded && !hasError ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-10 absolute pointer-events-none"
          )} 
        />

        {/* Premium Fallback UI (Ensures NO BLACK SCREEN) */}
        {(!isLoaded || hasError) && (
          <div className="w-full max-w-[360px] animate-in fade-in zoom-in duration-500">
             <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] bg-secondary/20 backdrop-blur-xl">
                
                <div className="relative aspect-[4/5] w-full">
                    <Image 
                      src={`https://picsum.photos/seed/${ad.id}-prod/800/1000`} 
                      alt="Product" 
                      fill 
                      className="object-cover" 
                      data-ai-hint="luxury product"
                    />
                    <div className="absolute top-4 left-4">
                        <span className="bg-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase text-white shadow-xl">Top Deal</span>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black uppercase italic text-white leading-none">PREMIUM COLLECTION</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Available Exclusively on A.snap</p>
                    </div>

                    <Button 
                      onClick={() => window.open(ad.ctaUrl || '#', '_blank')} 
                      className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-black flex justify-between px-6 items-center shadow-2xl transition-transform active:scale-95"
                    >
                        <span className="text-xs uppercase tracking-widest">{ad.ctaText || 'Claim Offer Now'}</span>
                        <ChevronRight className="h-5 w-5 text-primary" />
                    </Button>
                </div>
             </div>
          </div>
        )}

        {/* Loading Spinner State */}
        {!isLoaded && !hasError && isInView && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
            <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-primary/40 animate-pulse rounded-full"></div>
                <Loader2 className="animate-spin h-14 w-14 text-primary relative z-10" />
            </div>
            <p className="mt-6 text-[12px] font-black uppercase tracking-[0.4em] text-primary animate-pulse drop-shadow-lg">
                Fetching Best Offer...
            </p>
          </div>
        )}
      </div>

      {/* Social Sidebar */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-6 z-40 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center cursor-pointer group" onClick={toggleLike}>
                <div className="relative p-3 bg-black/20 backdrop-blur-md rounded-full border border-white/5 hover:bg-black/40 transition-all">
                    {isLiked && <div className="absolute inset-0 blur-lg bg-primary/40 animate-pulse rounded-full"></div>}
                    <Heart className={cn("h-8 w-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition-all active:scale-150", isLiked ? "fill-primary text-primary" : "text-white")} />
                </div>
                <span className="text-[11px] font-black mt-1.5 drop-shadow-md text-white">{likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer group" onClick={incrementComment}>
                <div className="p-3 bg-black/20 backdrop-blur-md rounded-full border border-white/5 hover:bg-black/40 transition-all">
                  <MessageCircle className="h-8 w-8 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] group-active:scale-125 transition-transform" />
                </div>
                <span className="text-[11px] font-black mt-1.5 drop-shadow-md text-white">{commentCount}</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer group" onClick={incrementShare}>
                <div className="p-3 bg-black/20 backdrop-blur-md rounded-full border border-white/5 hover:bg-black/40 transition-all">
                  <Share2 className="h-8 w-8 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] group-active:rotate-12 transition-transform" />
                </div>
                <span className="text-[11px] font-black mt-1.5 drop-shadow-md text-white">{shareCount}</span>
            </div>
            
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-transparent">
                <MoreVertical className="h-6 w-6 text-white drop-shadow-md opacity-50" />
            </Button>
      </div>

      {/* Bottom Ad Description */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-24 bg-gradient-to-t from-black via-black/80 to-transparent text-white z-30">
          <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 border-2 border-primary shadow-lg">
                  <AvatarImage src="/logo.svg" />
                  <AvatarFallback className="bg-primary text-white font-bold">A</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm tracking-tight drop-shadow-lg">asnap_ads</span>
                      <BadgeCheck className="h-3.5 w-3.5 text-blue-400 fill-blue-400/20" />
                  </div>
              </div>
          </div>
          <p className="text-xs font-bold leading-relaxed drop-shadow-md pr-16 line-clamp-2 opacity-90">
              {ad.caption}
          </p>
      </div>
    </div>
  );
}
