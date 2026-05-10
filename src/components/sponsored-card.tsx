'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, Info } from 'lucide-react';
import Script from 'next/script';

interface SponsoredCardProps {
  ad: {
    id: string;
    brandName: string;
    brandLogo: string;
    mediaUrl: string;
    caption: string;
    ctaText: string;
    ctaUrl: string;
    isVideo?: boolean;
    adUnitId?: string;
  };
}

/**
 * SponsoredCard Component
 * Updated to render Adsterra Ads as per user request.
 */
export function SponsoredCard({ ad }: SponsoredCardProps) {
  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-center items-center">
      {/* Ad Label for Transparency */}
      <div className="absolute top-20 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-tighter text-white">Sponsored</span>
      </div>

      <div className="w-full max-w-md px-4 flex justify-center items-center min-h-[250px]">
        {/* Adsterra Ad Container */}
        <div id="container-286ef4dc1c3c9afc429b42567c2d2b99" className="w-full"></div>
        
        {/* Adsterra Script */}
        <Script 
          async 
          src="https://pl29411112.profitablecpmratenetwork.com/286ef4dc1c3c9afc429b42567c2d2b99/invoke.js" 
          strategy="afterInteractive"
          data-cfasync="false"
        />
      </div>

      {/* Footer info to maintain the feed aesthetic */}
      <div className="absolute bottom-24 left-0 right-0 p-4 text-center">
        <div className="flex items-center justify-center gap-2 opacity-40">
          <Info size={12} className="text-white" />
          <p className="text-[10px] text-white uppercase tracking-widest font-bold">Advertisement</p>
        </div>
      </div>
    </div>
  );
}
