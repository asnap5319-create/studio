
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Heart, MessageCircle, Share2, BadgeCheck, Loader2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

// Global variable to sync mute state from PostCard
let globalMuted = true;

interface SponsoredCardProps {
  ad: {
    id: string;
    brandName: string;
    brandLogo: string;
    mediaUrl: string;
    caption: string;
    ctaText: string;
    ctaUrl: string;
    adUnitId: string;
    adScriptDomain: string;
  };
}

export function SponsoredCard({ ad }: SponsoredCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(globalMuted);
  const [showVolumeIcon, setShowVolumeIcon] = useState(false);
  
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 5000) + 1000);

  // Sync mute state globally
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteState = !isMuted;
    // Update global reference for other cards
    (window as any).globalMuted = newMuteState;
    globalMuted = newMuteState;

    // Update all video elements
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => { v.muted = newMuteState; });
    
    setIsMuted(newMuteState);
    setShowVolumeIcon(true);
    setTimeout(() => setShowVolumeIcon(false), 800);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, { threshold: 0.6 });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle Video Playback & Mute Sync
  useEffect(() => {
    if (videoRef.current) {
      if (isInView) {
        setIsMuted((window as any).globalMuted ?? globalMuted);
        videoRef.current.muted = (window as any).globalMuted ?? globalMuted;
        videoRef.current.play().catch(() => {
            videoRef.current!.muted = true;
            videoRef.current!.play().catch(() => {});
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isInView]);

  // Load Adsterra Script
  useEffect(() => {
    if (!containerRef.current || !isInView || isLoaded) return;

    const adUnitId = ad.adUnitId;
    const adScriptDomain = ad.adScriptDomain;
    const uniqueContainerId = `container-${adUnitId}-${ad.id}`;
    
    const parent = containerRef.current;
    parent.innerHTML = ''; 

    const adWrapper = document.createElement('div');
    adWrapper.id = uniqueContainerId;
    adWrapper.className = "absolute inset-0 opacity-0 z-50 pointer-events-none"; // Invisible but clickable overlay
    parent.appendChild(adWrapper);

    const scriptPath = adUnitId.match(/.{1,2}/g)?.slice(0, 3).join('/') || '';
    const scriptUrl = `https://${adScriptDomain}/${scriptPath}/${adUnitId}.js`;

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => {
      console.log(`[Adsterra] Loaded: ${adUnitId}`);
      setIsLoaded(true);
    };

    parent.appendChild(script);

    return () => {
      if (parent) parent.innerHTML = '';
    };
  }, [ad.id, ad.adUnitId, ad.adScriptDomain, isInView, isLoaded]);

  return (
    <div ref={cardRef} className="relative w-full h-full bg-black overflow-hidden flex flex-col snap-start snap-always" onClick={() => window.open(ad.ctaUrl, '_blank')}>
      {/* Immersive Video/Media Content */}
      <div className="absolute inset-0 z-0">
        <video 
          ref={videoRef}
          src={ad.mediaUrl} 
          className="w-full h-full object-cover"
          loop
          muted={isMuted}
          playsInline
          poster={`https://picsum.photos/seed/${ad.id}/1080/1920`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      {/* Hidden Adsterra Script Container */}
      <div ref={containerRef} />

      {/* Mute Toggle Overlay */}
      {showVolumeIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="p-5 rounded-full bg-black/40 backdrop-blur-md">
            {isMuted ? <VolumeX size={40} className="text-white" /> : <Volume2 size={40} className="text-white" />}
          </div>
        </div>
      )}

      {/* Ad Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-6 pt-12 flex items-center justify-between pointer-events-none">
        <h2 className="text-3xl font-black italic tracking-tighter text-primary drop-shadow-[0_2px_15px_rgba(var(--primary),0.7)]">A.snap</h2>
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-3xl px-4 py-1.5 rounded-full border border-white/10">
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          <p className="text-[10px] font-black text-white uppercase tracking-widest">Sponsored</p>
        </div>
      </div>

      {/* Social Sidebar */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-6 z-40 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white h-12 w-12 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLiked(!isLiked);
                    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
                  }}
                >
                    <Heart className={cn("h-9 w-9 transition-all active:scale-125", isLiked ? "fill-primary text-primary" : "text-white drop-shadow-md")} />
                </Button>
                <span className="text-xs font-bold mt-1 text-white drop-shadow-md">{likeCount}</span>
            </div>
            
            <div className="flex flex-col items-center">
                <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-transparent" onClick={(e) => e.stopPropagation()}>
                  <MessageCircle className="h-9 w-9 drop-shadow-md" />
                </Button>
                <span className="text-xs font-bold mt-1 text-white drop-shadow-md">{Math.floor(likeCount/10)}</span>
            </div>

            <div className="flex flex-col items-center" onClick={toggleMute}>
                <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-transparent">
                  {isMuted ? <VolumeX className="h-9 w-9 drop-shadow-md" /> : <Volume2 className="h-9 w-9 drop-shadow-md" />}
                </Button>
                <span className="text-xs font-bold mt-1 text-white drop-shadow-md">{isMuted ? 'Muted' : 'Sound'}</span>
            </div>
            
            <div className="flex flex-col items-center" onClick={(e) => { e.stopPropagation(); window.open(ad.ctaUrl, '_blank'); }}>
                <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-transparent">
                  <Share2 className="h-9 w-9 drop-shadow-md" />
                </Button>
                <span className="text-xs font-bold mt-1 text-white drop-shadow-md">Share</span>
            </div>
      </div>

      {/* Bottom Information and CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black via-black/20 to-transparent text-white z-30 space-y-4 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
              <Avatar className="h-10 w-10 border-2 border-primary shadow-2xl">
                  <AvatarImage src={ad.brandLogo} className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary">AD</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5">
                  <span className="font-black text-[15px] tracking-tight">{ad.brandName}</span>
                  <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />
              </div>
          </div>
          
          <p className="text-sm font-bold leading-relaxed pr-20 line-clamp-2 opacity-90 drop-shadow-md pointer-events-auto">
              {ad.caption}
          </p>

          <Button 
            className="w-full h-14 bg-white text-black hover:bg-white/95 rounded-2xl font-black flex justify-between px-6 items-center shadow-2xl pointer-events-auto active:scale-95 transition-all"
          >
              <span className="text-[11px] uppercase tracking-[0.2em]">{ad.ctaText}</span>
              <ChevronRight className="h-5 w-5 text-primary" />
          </Button>
      </div>
    </div>
  );
}
