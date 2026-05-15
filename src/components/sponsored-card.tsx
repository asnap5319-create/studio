'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Info, Loader2, Play, Heart, MessageCircle, Share2, MoreVertical, ChevronRight, BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

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

    const adWrapper = document.createElement('div');
    adWrapper.id = containerId;
    adWrapper.style.width = '100%';
    adWrapper.style.minHeight = '300px';
    adWrapper.style.display = 'flex';
    adWrapper.style.justifyContent = 'center';
    adWrapper.style.alignItems = 'center';

    const script = document.createElement('script');
    script.src = `//pl29411112.profitablecpmratenetwork.com/${adUnitId}/invoke.js`;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => {
      console.log("Adsterra script loaded");
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error("Adsterra script failed");
      setHasError(true);
    };

    parent.appendChild(adWrapper);
    
    // Small delay to ensure container is in DOM
    const timeoutId = setTimeout(() => {
        try {
            parent.appendChild(script);
        } catch (e) {
            setHasError(true);
        }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (parent) parent.innerHTML = '';
    };
  }, [ad.id, ad.adUnitId]);

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden select-none">
      
      {/* Top Brand Header (Like Screenshot) */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black italic tracking-tighter text-white drop-shadow-md">AJIO</h2>
        </div>
        <div className="flex items-center gap-1">
            <h2 className="text-2xl font-black italic tracking-tighter text-white drop-shadow-md">PUMA</h2>
            <div className="w-8 h-8 relative">
                 <Image src="https://picsum.photos/seed/puma/100/100" alt="Puma" fill className="object-contain filter invert" />
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full h-full flex flex-col items-center justify-center z-10">
        
        {/* Adsterra Container */}
        <div 
          ref={containerRef} 
          className={cn(
            "w-full flex justify-center items-center transition-opacity duration-700",
            isLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
          )} 
        />

        {/* Fallback Premium UI (Matching Screenshot Style) */}
        {(hasError || !isLoaded) && (
          <div className="absolute inset-0 flex flex-col bg-sky-400">
             {/* Main Image Section */}
             <div className="relative flex-1 flex flex-col items-center justify-center p-6">
                <div className="absolute top-24 left-6 z-20 max-w-[200px]">
                    <h1 className="text-4xl font-black text-white italic leading-tight drop-shadow-xl">MADE TO MOVE</h1>
                    <p className="text-[10px] text-white font-bold mt-2">Free Shipping & Returns*</p>
                </div>

                <div className="absolute top-24 right-6 z-20 text-right">
                    <p className="text-white font-black text-sm italic">MIN.</p>
                    <h2 className="text-7xl font-black text-white italic leading-none">55<span className="text-3xl">%</span></h2>
                    <p className="text-white font-black text-sm italic">OFF*</p>
                    <p className="text-[10px] text-white font-bold">+EXTRA 10% OFF*</p>
                </div>

                <div className="relative w-full aspect-square max-w-[340px] mt-20">
                    <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-110"></div>
                    <Image 
                        src="https://picsum.photos/seed/puma-shoes/600/600" 
                        alt="Puma Shoes" 
                        fill 
                        className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                    />
                </div>

                <div className="mt-8 w-full max-w-[350px]">
                    <Button className="w-full h-12 bg-[#0077b6] hover:bg-[#023e8a] text-white rounded-xl font-black flex justify-between px-6 items-center shadow-2xl">
                        <span>Get 30% OFF on 1st order | Code: NEW30</span>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
             </div>

             {/* Bottom Info Section (Instagram Style) */}
             <div className="p-4 bg-gradient-to-t from-black/80 to-transparent text-white pb-24">
                <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10 border border-white/20">
                        <AvatarImage src="https://picsum.photos/seed/ajio/100/100" />
                        <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                            <span className="font-black text-sm">ajiolife</span>
                            <BadgeCheck className="h-3 w-3 text-white fill-white/20" />
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="ml-2 h-7 rounded-lg border-white/40 bg-transparent text-white text-[10px] font-black uppercase">Follow</Button>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-white/10 mb-4 cursor-pointer" onClick={() => window.open(ad.ctaUrl || '#', '_blank')}>
                    <span className="font-bold text-sm">Shop now</span>
                    <ChevronRight className="h-4 w-4" />
                </div>

                <p className="text-xs font-bold drop-shadow-md">Best brands at the best prices — only on AJIO!!</p>
                
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-5 w-5 rounded-full border border-black bg-secondary relative overflow-hidden">
                                <Image src={`https://picsum.photos/seed/user-${i}/50/50`} alt="" fill className="object-cover" />
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] font-medium text-white/80">Followed by <span className="font-black">ankitpatel_7723</span> and <span className="font-black">4.7M others</span></p>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Side Action Buttons (Like Screenshot) */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-6 z-40 items-center">
            <div className="flex flex-col items-center">
                <Heart className="h-8 w-8 text-white drop-shadow-lg" />
                <span className="text-[10px] font-black mt-1">3,981</span>
            </div>
            <div className="flex flex-col items-center">
                <MessageCircle className="h-8 w-8 text-white drop-shadow-lg" />
                <span className="text-[10px] font-black mt-1">8</span>
            </div>
            <div className="flex flex-col items-center">
                <Share2 className="h-8 w-8 text-white drop-shadow-lg" />
                <span className="text-[10px] font-black mt-1">20</span>
            </div>
            <MoreVertical className="h-6 w-6 text-white drop-shadow-lg" />
      </div>

      {/* Ad Label (Bottom Left) */}
      <div className="absolute bottom-20 left-4 z-40">
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Ad</p>
      </div>
    </div>
  );
}
