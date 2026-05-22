'use client';

import { ExternalLink, Sparkles, Gift, Zap } from 'lucide-react';
import { Logo } from './pwa-install-prompt';
import { Button } from './ui/button';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import placeholderData from '@/lib/placeholder-images.json';

export function NativeAdCard() {
  const SMART_LINK = "https://www.effectivecpmnetwork.com/s7vnb4svx?key=6fbe7d0fbbc6272dd7abe4042e76a4e0";
  const [adImage, setAdImage] = useState(placeholderData.placeholderImages[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * placeholderData.placeholderImages.length);
    setAdImage(placeholderData.placeholderImages[randomIndex]);
  }, []);

  const handleAdClick = () => {
    window.open(SMART_LINK, '_blank');
  };

  return (
    <div className="h-screen w-full snap-start snap-always bg-black flex flex-col items-center justify-center relative overflow-hidden" onClick={handleAdClick}>
      <div className="absolute inset-0 z-0">
        <Image 
          src={adImage.url} 
          alt={adImage.alt}
          fill
          className="object-cover opacity-60 scale-105 animate-pulse-soft"
          data-ai-hint={adImage.hint}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black z-10" />
      </div>

      <div className="absolute top-10 left-8 flex items-center gap-2 z-30 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-1">
          <Logo className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">Sponsored Post</span>
      </div>

      <div className="w-[85%] max-w-sm aspect-[9/16] bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/20 flex flex-col items-center justify-end overflow-hidden shadow-[0_0_100px_rgba(255,51,102,0.3)] relative group cursor-pointer animate-in fade-in zoom-in duration-500">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/30 blur-[80px] rounded-full pointer-events-none group-hover:bg-primary/50 transition-colors" />

        <div className="w-full p-8 flex flex-col items-center gap-6 text-center z-20 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-20">
          <div className="flex items-center gap-2 bg-yellow-400 text-black px-3 py-1 rounded-full animate-bounce">
             <Zap size={12} className="fill-black" />
             <span className="text-[10px] font-black uppercase">Limited Time Deal</span>
          </div>

          <div className="space-y-3">
            <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] leading-tight">
              {adImage.alt}
            </h3>
            <p className="text-xs font-bold text-primary-foreground/80 uppercase tracking-[0.15em] leading-relaxed">
              Unlock exclusive rewards & gifts specially for you! 🎁
            </p>
          </div>

          <Button 
            className="w-full h-16 text-lg bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-[0_15px_40px_rgba(255,51,102,0.5)] group-hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Gift className="h-6 w-6 animate-pulse" /> 
            Claim Now
            <ExternalLink className="h-5 w-5 opacity-50" />
          </Button>

          <div className="pb-2">
             <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white/40">Tap to explore offer</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 right-10 z-20 opacity-30 animate-bounce delay-700">
         <Sparkles className="text-primary h-12 w-12" />
      </div>
      <div className="absolute top-40 left-10 z-20 opacity-30 animate-pulse">
         <Zap className="text-yellow-400 h-10 w-10 fill-yellow-400" />
      </div>
    </div>
  );
}
