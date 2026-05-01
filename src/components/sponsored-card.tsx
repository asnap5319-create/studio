
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { ExternalLink, MoreVertical, Volume2, VolumeX, Info } from 'lucide-react';
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
      {/* Hidden Ad Metadata for reference */}
      <div className="hidden" data-ad-unit-id={ad.adUnitId}></div>

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

      {/* Ad Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/95 via-black/40 to-transparent text-white z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-primary/50 bg-secondary flex items-center justify-center">
              <Image src={ad.brandLogo} alt={ad.brandName} width={44} height={44} className="object-cover" />
            </div>
            <div>
              <p className="font-bold text-[15px] flex items-center gap-2">
                {ad.brandName}
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-sm font-black uppercase tracking-widest text-white/90">Sponsored</span>
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">Verified Ad Partner</p>
            </div>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><Info size={18} className="text-white/60" /></button>
        </div>

        <p className="text-sm leading-relaxed mb-5 drop-shadow-lg pr-10">{ad.caption}</p>

        {/* Call to Action Button - Premium Style */}
        <Button 
          asChild 
          className="w-full bg-primary hover:bg-primary/90 text-white font-black h-14 rounded-xl text-lg group transition-all transform active:scale-95 shadow-[0_0_15px_rgba(var(--primary),0.4)]"
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
          className="absolute top-20 right-4 z-20 p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white border border-white/10"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      )}
    </div>
  );
}
