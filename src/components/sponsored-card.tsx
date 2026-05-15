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
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const parent = containerRef.current;
    const adUnitId = ad.adUnitId || '286ef4dc1c3c9afc429b42567c2d2b99';
    const containerId = `container-${adUnitId}`;
    
    // Clear previous content
    parent.innerHTML = ''; 

    // Create the container Adsterra expects
    const adWrapper = document.createElement('div');
    adWrapper.id = containerId;
    adWrapper.style.width = '100%';
    adWrapper.style.minHeight = '250px';
    adWrapper.style.display = 'flex';
    adWrapper.style.justifyContent = 'center';
    adWrapper.style.alignItems = 'center';
    parent.appendChild(adWrapper);

    // Create the Adsterra script
    const script = document.createElement('script');
    script.src = `//pl29411112.profitablecpmratenetwork.com/${adUnitId}/invoke.js`;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => {
      console.log("Adsterra script loaded for unit:", adUnitId);
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error("Adsterra script failed for unit:", adUnitId);
      setHasError(true);
    };

    // Small delay to ensure the container is fully in the DOM before script runs
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
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden select-none">
      
      {/* Top Brand Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black italic tracking-tighter text-white drop-shadow-md">A.snap</h2>
        </div>
        <div className="flex items-center gap-1">
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded-full border border-white/10">Sponsored</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full h-full flex flex-col items-center justify-center z-10">
        
        {/* Adsterra Container - This is where your earning ads will show */}
        <div 
          ref={containerRef} 
          className={cn(
            "w-full flex justify-center items-center transition-opacity duration-700",
            isLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
          )} 
        />

        {/* Fallback Premium UI if Adsterra is blocked/loading */}
        {(!isLoaded || hasError) && (
          <div className="absolute inset-0 flex flex-col bg-sky-500">
             {/* Poster Image Section */}
             <div className="relative flex-1 flex flex-col items-center justify-center p-6">
                <div className="absolute top-24 left-6 z-20 max-w-[200px]">
                    <h1 className="text-4xl font-black text-white italic leading-tight drop-shadow-2xl">PREMIUM DEALS</h1>
                    <p className="text-[10px] text-white font-bold mt-2 bg-black/20 w-fit px-2 py-1 rounded">Exclusive Collection</p>
                </div>

                <div className="absolute top-24 right-6 z-20 text-right">
                    <p className="text-white font-black text-sm italic">UP TO</p>
                    <h2 className="text-7xl font-black text-white italic leading-none">60<span className="text-3xl">%</span></h2>
                    <p className="text-white font-black text-sm italic">OFF*</p>
                </div>

                <div className="relative w-full aspect-square max-w-[320px] mt-20">
                    <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-110 animate-pulse"></div>
                    <Image 
                        src="https://picsum.photos/seed/premium-shoes/600/600" 
                        alt="Product" 
                        fill 
                        className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
                    />
                </div>

                <div className="mt-12 w-full max-w-[350px]">
                    <Button onClick={() => window.open(ad.ctaUrl || '#', '_blank')} className="w-full h-14 bg-white text-sky-600 hover:bg-white/90 rounded-2xl font-black flex justify-between px-6 items-center shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                        <span className="text-sm">Claim Your Discount Now</span>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
             </div>

             {/* Bottom Info Section */}
             <div className="p-4 bg-gradient-to-t from-black/90 to-transparent text-white pb-24">
                <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10 border-2 border-white/20">
                        <AvatarImage src="/logo.svg" />
                        <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                            <span className="font-black text-sm">asnap_premium</span>
                            <BadgeCheck className="h-3.5 w-3.5 text-white fill-white/20" />
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="ml-2 h-7 rounded-lg border-white/40 bg-transparent text-white text-[10px] font-black uppercase">Follow</Button>
                </div>

                <p className="text-xs font-bold drop-shadow-md pr-12 line-clamp-2">Get ready for the biggest sale of the season! Join millions of users and start earning today.</p>
                
                <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-5 w-5 rounded-full border border-black bg-secondary relative overflow-hidden">
                                <Image src={`https://picsum.photos/seed/ad-user-${i}/50/50`} alt="" fill className="object-cover" />
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] font-medium text-white/80">Followed by <span className="font-black">trending_now</span> and <span className="font-black">5.2M others</span></p>
                </div>
             </div>
          </div>
        )}

        {!isLoaded && !hasError && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Loading Offer...</p>
          </div>
        )}
      </div>

      {/* Side Action Buttons */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-6 z-40 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
                <Heart className="h-8 w-8 text-white drop-shadow-lg" />
                <span className="text-[10px] font-black mt-1">4.2K</span>
            </div>
            <div className="flex flex-col items-center">
                <MessageCircle className="h-8 w-8 text-white drop-shadow-lg" />
                <span className="text-[10px] font-black mt-1">12</span>
            </div>
            <div className="flex flex-col items-center">
                <Share2 className="h-8 w-8 text-white drop-shadow-lg" />
                <span className="text-[10px] font-black mt-1">45</span>
            </div>
            <MoreVertical className="h-6 w-6 text-white drop-shadow-lg" />
      </div>
    </div>
  );
}
