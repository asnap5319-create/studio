'use client';

import { ExternalLink, Sparkles } from 'lucide-react';
import { Logo } from './pwa-install-prompt';
import { Button } from './ui/button';

export function NativeAdCard() {
  const SMART_LINK = "https://www.effectivecpmnetwork.com/s7vnb4svx?key=6fbe7d0fbbc6272dd7abe4042e76a4e0";

  const handleAdClick = () => {
    window.open(SMART_LINK, '_blank');
  };

  return (
    <div className="h-screen w-full snap-start snap-always bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden" onClick={handleAdClick}>
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse pointer-events-none" />

      <div className="absolute top-8 left-8 flex items-center gap-2 opacity-80 z-20">
        <Logo className="w-8 h-8" />
        <span className="text-xs font-black uppercase tracking-widest text-white italic drop-shadow-lg">Sponsored</span>
      </div>
      
      <div className="w-full max-w-sm aspect-[9/16] bg-secondary/10 rounded-[3rem] border border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
        
        {/* Ad Content */}
        <div className="flex flex-col items-center gap-6 p-8 text-center z-20">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30 shadow-2xl group-hover:scale-110 transition-transform duration-500">
             <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Hot Offer! 🎬</h3>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-tight">
              Exclusive Content & Rewards Waiting for You
            </p>
          </div>

          <Button 
            className="mt-4 h-14 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase rounded-2xl shadow-2xl shadow-primary/30 group-hover:translate-y-[-5px] transition-all"
          >
            <ExternalLink className="mr-2 h-5 w-5" /> Open Now
          </Button>
        </div>

        <div className="absolute bottom-10 left-0 right-0 px-6 z-20 opacity-40">
           <p className="text-[8px] font-black uppercase tracking-[0.4em] text-center text-white">Click to view full video</p>
        </div>
      </div>
    </div>
  );
}
