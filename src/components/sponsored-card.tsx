
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Heart, MessageCircle, Share2, MoreVertical, BadgeCheck, Loader2 } from 'lucide-react';
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
      }
    }, { threshold: 0.5 });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isInView) return;

    // Use a unique ID for the container for each ad instance
    const adUnitId = ad.adUnitId || '286ef4dc1c3c9afc429b42567c2d2b99';
    const uniqueContainerId = `container-${adUnitId}-${ad.id}`;
    
    const parent = containerRef.current;
    parent.innerHTML = ''; 

    const adWrapper = document.createElement('div');
    adWrapper.id = uniqueContainerId;
    adWrapper.className = "w-full flex justify-center items-center overflow-hidden min-h-[250px]";
    parent.appendChild(adWrapper);

    const script = document.createElement('script');
    script.src = `https://pl29411112.profitablecpmratenetwork.com/${adUnitId}/invoke.js`;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => {
      // Small delay to let the ad script render into the DOM
      setTimeout(() => setIsLoaded(true), 1500);
    };
    script.onerror = () => {
      setHasError(true);
    };

    try {
      parent.appendChild(script);
    } catch (e) {
      setHasError(true);
    }

    // Protection: If ad doesn't load in 5 seconds, show fallback
    const timer = setTimeout(() => {
      if (!isLoaded) setHasError(true);
    }, 5000);

    return () => {
      clearTimeout(timer);
      if (parent) parent.innerHTML = '';
    };
  }, [ad.id, ad.adUnitId, isInView, isLoaded]);

  return (
    <div ref={cardRef} className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden select-none">
      
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-12 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black italic tracking-tighter text-primary drop-shadow-[0_2px_10px_rgba(var(--primary),0.5)]">A.snap</h2>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
            Sponsored
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        
        {/* Real Adsterra Container */}
        <div 
          ref={containerRef} 
          className={cn(
            "w-full flex justify-center items-center transition-all duration-1000",
            isLoaded && !hasError ? "opacity-100 scale-100" : "opacity-0 scale-95 absolute"
          )} 
        />

        {/* Premium Fallback/Loading UI */}
        {(!isLoaded || hasError) && (
          <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#1a1a1a] to-black">
             <div className="relative flex-1 flex flex-col items-center justify-center p-6">
                <div className="absolute inset-0 opacity-40">
                    <Image 
                      src={`https://picsum.photos/seed/${ad.id}-bg/800/1200`} 
                      alt="" fill className="object-cover blur-sm" 
                    />
                </div>

                <div className="relative z-20 text-center space-y-4 mb-8">
                    <div className="inline-block px-3 py-1 bg-primary rounded-lg shadow-lg animate-bounce">
                        <p className="text-[10px] font-black uppercase text-white">Featured Offer</p>
                    </div>
                    <h1 className="text-5xl font-black text-white italic leading-[0.9] drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] uppercase">
                        PREMIUM <br/> <span className="text-primary text-7xl">SALE</span> <br/> LIVE NOW
                    </h1>
                </div>

                <div className="relative w-full aspect-square max-w-[340px] group transition-transform hover:scale-105 duration-500">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-125 animate-pulse"></div>
                    <Image 
                        src={`https://picsum.photos/seed/${ad.id}/600/600`} 
                        alt="Product" 
                        fill 
                        className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.7)]"
                    />
                </div>

                <div className="mt-12 w-full max-w-[340px] z-20">
                    <Button 
                      onClick={() => window.open(ad.ctaUrl || '#', '_blank')} 
                      className="w-full h-16 bg-white text-black hover:bg-white/90 rounded-2xl font-black flex justify-between px-8 items-center shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
                    >
                        <span className="text-sm uppercase tracking-widest">{ad.ctaText || 'Shop Collection'}</span>
                        <ChevronRight className="h-6 w-6 text-primary" />
                    </Button>
                </div>
             </div>

             <div className="p-6 pb-24 bg-gradient-to-t from-black via-black/60 to-transparent text-white">
                <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-11 w-11 border-2 border-primary shadow-lg">
                        <AvatarImage src="/logo.svg" />
                        <AvatarFallback className="bg-primary text-white font-bold">A</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm tracking-tight">asnap_premium</span>
                            <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />
                        </div>
                    </div>
                </div>
                <p className="text-xs font-bold leading-relaxed drop-shadow-md pr-16 line-clamp-2 opacity-90">
                    {ad.caption}
                </p>
             </div>
          </div>
        )}

        {!isLoaded && !hasError && isInView && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="relative">
                <div className="absolute inset-0 blur-xl bg-primary/30 animate-pulse rounded-full"></div>
                <Loader2 className="animate-spin h-10 w-10 text-primary relative z-10" />
            </div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 animate-pulse">
                Loading Official Ad...
            </p>
          </div>
        )}
      </div>

      {/* Social Sidebar */}
      <div className="absolute right-4 bottom-28 flex flex-col gap-7 z-40 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center cursor-pointer group" onClick={toggleLike}>
                <div className="relative">
                    {isLiked && <div className="absolute inset-0 blur-lg bg-primary/40 animate-pulse rounded-full"></div>}
                    <Heart className={cn("h-9 w-9 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition-all active:scale-150", isLiked ? "fill-primary text-primary" : "text-white")} />
                </div>
                <span className="text-[11px] font-black mt-1.5 drop-shadow-md">{likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer group" onClick={incrementComment}>
                <MessageCircle className="h-9 w-9 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] group-active:scale-125 transition-transform" />
                <span className="text-[11px] font-black mt-1.5 drop-shadow-md">{commentCount}</span>
            </div>
            
            <div className="flex flex-col items-center cursor-pointer group" onClick={incrementShare}>
                <Share2 className="h-9 w-9 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] group-active:rotate-12 transition-transform" />
                <span className="text-[11px] font-black mt-1.5 drop-shadow-md">{shareCount}</span>
            </div>
            
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-transparent">
                <MoreVertical className="h-6 w-6 text-white drop-shadow-md" />
            </Button>
      </div>
    </div>
  );
}
