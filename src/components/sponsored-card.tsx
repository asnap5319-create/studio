
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { ExternalLink, Volume2, VolumeX, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

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
 * Optimized for high CTR (Click-Through Rate) to maximize revenue.
 */
export function SponsoredCard({ ad }: SponsoredCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.7 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      if (isInView) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isInView]);

  return (
    <div ref={cardRef} className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-center">
      {/* Ad Tracking Metadata */}
      <div className="hidden" data-ad-unit-id={ad.adUnitId} data-ad-slot-id={ad.id}></div>

      {ad.isVideo ? (
        <video
          ref={videoRef}
          src={ad.mediaUrl}
          className="object-contain w-full h-full"
          loop
          muted={isMuted}
          playsInline
        />
      ) : (
        <div className="relative w-full h-full">
          <Image
            src={ad.mediaUrl}
            alt={ad.brandName}
            fill
            className="object-contain"
          />
        </div>
      )}

      {/* Ad Overlay - Designed to maximize clicks and earning */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black via-black/60 to-transparent text-white z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary bg-secondary flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.3)]">
              <Image src={ad.brandLogo} alt={ad.brandName} width={48} height={48} className="object-cover" />
            </div>
            <div>
              <p className="font-bold text-[16px] flex items-center gap-2">
                {ad.brandName}
                <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-primary/30 flex items-center gap-1">
                  <Sparkles className="h-2 w-2" /> Sponsored
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">Verified Ad Partner</p>
            </div>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><Info size={18} className="text-white/40" /></button>
        </div>

        <p className="text-sm leading-relaxed mb-6 drop-shadow-lg pr-8 line-clamp-2">{ad.caption}</p>

        {/* Call to Action Button - Ultra Premium Style to encourage clicks (CPC Revenue) */}
        <Button 
          asChild 
          className="w-full bg-primary hover:bg-primary/90 text-white font-black h-14 rounded-2xl text-lg group transition-all transform active:scale-95 shadow-[0_10px_30px_-10px_rgba(var(--primary),0.6)] border-t border-white/20"
        >
          <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3">
            {ad.ctaText}
            <ExternalLink className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </a>
        </Button>
      </div>

      {/* Mute toggle for ads */}
      {ad.isVideo && (
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-20 right-4 z-20 p-3 bg-black/60 backdrop-blur-xl rounded-full text-white border border-white/10 shadow-lg"
        >
          {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </button>
      )}
    </div>
  );
}
