'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, Info } from 'lucide-react';

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
 * Updated to render real Google AdSense In-Feed Ads.
 */
export function SponsoredCard({ ad }: SponsoredCardProps) {
  const adRef = useRef<boolean>(false);

  useEffect(() => {
    // Only initialize AdSense once per component mount
    if (typeof window !== 'undefined' && !adRef.current) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adRef.current = true;
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-center items-center">
      {/* Ad Label for Transparency */}
      <div className="absolute top-20 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-tighter text-white">Sponsored</span>
      </div>

      <div className="w-full max-w-md px-4">
        {/* AdSense In-Feed Unit */}
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-format="fluid"
          data-ad-layout-key="-6t+ed+2i-1n-4w"
          data-ad-client="ca-pub-6100214178274409"
          data-ad-slot="8763162045"
        ></ins>
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
