'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { ExternalLink, MoreVertical, Volume2, VolumeX } from 'lucide-react';
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
    <div ref={cardRef} className="relative w-full h-full bg-black overflow-hidden">
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
        <Image
          src={ad.mediaUrl}
          alt={ad.brandName}
          fill
          className="object-contain"
        />
      )}

      {/* Ad Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/90 via-black/20 to-transparent text-white z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center">
              <Image src={ad.brandLogo} alt={ad.brandName} width={40} height={40} className="object-cover" />
            </div>
            <div>
              <p className="font-bold text-sm flex items-center gap-2">
                {ad.brandName}
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded uppercase tracking-tighter">Sponsored</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Ad</p>
            </div>
          </div>
          <button className="p-1"><MoreVertical size={20} /></button>
        </div>

        <p className="text-sm line-clamp-2 mb-4 pr-10">{ad.caption}</p>

        {/* Call to Action Button */}
        <Button 
          asChild 
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl group transition-all"
        >
          <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
            {ad.ctaText}
            <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </Button>
      </div>

      {/* Mute toggle for ads */}
      {ad.isVideo && (
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 z-20 p-2 bg-black/40 backdrop-blur-md rounded-full text-white"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}
    </div>
  );
}
