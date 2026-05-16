
'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Share2, BadgeCheck, Loader2, Volume2, VolumeX, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SponsoredCardProps {
  ad: {
    id: string;
    brandName: string;
    brandLogo: string;
    ctaText: string;
    ctaUrl: string;
    caption: string;
    videoUrl: string;
  };
}

let globalMuted = true;

export function SponsoredCard({ ad }: SponsoredCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [isInView, setIsInView] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isMuted, setIsMuted] = useState(globalMuted);
  const [isBuffering, setIsBuffering] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, { threshold: 0.6 });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isInView) {
      video.muted = globalMuted;
      setIsMuted(globalMuted);
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    } else {
      video.pause();
    }
  }, [isInView]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMute = !isMuted;
    globalMuted = newMute;
    setIsMuted(newMute);
    
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => { v.muted = newMute; });
  };

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Safety check: if ctaUrl is a script, don't open as page
    const finalUrl = ad.ctaUrl.endsWith('.js') 
      ? ad.ctaUrl.replace('.js', '') // Fallback or handle appropriately
      : ad.ctaUrl;
    
    window.open(finalUrl, '_blank');
  };

  return (
    <div 
      ref={cardRef} 
      className="relative w-full h-full bg-black overflow-hidden flex flex-col snap-start snap-always"
      onClick={handleCtaClick}
    >
      <video 
        ref={videoRef}
        src={ad.videoUrl}
        className="absolute inset-0 w-full h-full object-contain z-0"
        loop
        playsInline
        muted={isMuted}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onLoadedData={() => setIsBuffering(false)}
      />

      {isBuffering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-black/20">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      <div className="absolute top-12 right-4 z-30">
        <button onClick={toggleMute} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white active:scale-90 transition-transform">
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      <div className="absolute right-3 bottom-32 flex flex-col gap-6 z-20 items-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center">
          <button 
            className="text-white transition-all active:scale-125"
            onClick={() => {
              setIsLiked(!isLiked);
              setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
            }}
          >
            <Heart className={cn("h-9 w-9 drop-shadow-lg", isLiked ? "fill-primary text-primary" : "text-white")} />
          </button>
          <span className="text-[11px] font-bold mt-1 text-white uppercase drop-shadow-md">5.4K</span>
        </div>
        
        <div className="flex flex-col items-center">
          <button className="text-white">
            <MessageCircle className="h-9 w-9 drop-shadow-lg" />
          </button>
          <span className="text-[11px] font-bold mt-1 text-white uppercase drop-shadow-md">241</span>
        </div>

        <div className="flex flex-col items-center">
          <button className="text-white">
            <Share2 className="h-9 w-9 drop-shadow-lg" />
          </button>
          <span className="text-[11px] font-bold mt-1 text-white uppercase drop-shadow-md">Share</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black via-black/60 to-transparent z-20" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border-2 border-primary shadow-lg">
              <AvatarImage src={ad.brandLogo} className="object-cover" />
              <AvatarFallback className="bg-primary text-white font-black">{ad.brandName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[15px] text-white drop-shadow-md">{ad.brandName}</span>
                <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest drop-shadow-md">Sponsored</span>
                <Sparkles className="h-2.5 w-2.5 text-primary animate-pulse" />
              </div>
            </div>
          </div>

          <p className="text-sm text-white/95 px-1 mb-2 line-clamp-2 drop-shadow-md font-medium">
            {ad.caption}
          </p>

          <Button 
            className="w-full h-12 bg-white text-black hover:bg-white/90 rounded-xl font-black flex justify-between px-5 items-center shadow-2xl active:scale-[0.98] transition-all"
            onClick={handleCtaClick}
          >
            <span className="text-xs uppercase tracking-tighter">{ad.ctaText}</span>
            <ChevronRight className="h-5 w-5 text-primary" />
          </Button>
        </div>
      </div>
    </div>
  );
}
