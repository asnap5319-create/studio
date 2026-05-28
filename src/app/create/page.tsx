'use client';

import { useState, ChangeEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  UploadCloud, Loader2, X, Type, Palette, 
  ChevronLeft, Check, Move, 
  Volume2, VolumeX, 
  ArrowRight, Star, UserCircle2, SendHorizonal 
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const COLORS = [
    { name: 'White', value: '#ffffff' },
    { name: 'Primary', value: 'hsl(var(--primary))' },
    { name: 'Yellow', value: '#fbbf24' },
    { name: 'Cyan', value: '#22d3ee' },
    { name: 'Green', value: '#4ade80' },
    { name: 'Orange', value: '#f97316' }
];

export default function CreatePostPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // UI State
  const [isPreviewMuted, setIsPreviewMuted] = useState(false); // Default to unmuted (sound on) as requested
  const [showTextSettings, setShowTextSettings] = useState(false);

  // Text Overlay State
  const [overlayText, setOverlayText] = useState('');
  const [overlayColor, setOverlayColor] = useState('#ffffff');
  const [overlayY, setOverlayY] = useState(50);
  const [overlayX, setOverlayX] = useState(50);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image or video.' });
        return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
      // Ensure sound is on for the new video
      setIsPreviewMuted(false);
    }
  };

  const handlePost = async () => {
    if (!user || !mediaFile || !firestore) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('upload_preset', "video_upload");
        
        const resourceType = mediaFile.type.startsWith('video') ? 'video' : 'image';
        
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => prev < 80 ? prev + 5 : prev);
        }, 300);

        const response = await fetch(`https://api.cloudinary.com/v1_1/dipz5jsls/${resourceType}/upload`, {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInterval);
        setUploadProgress(90);

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Upload failed.');

        const mediaUrl = data.secure_url;
        const postCollectionRef = collection(firestore, 'users', user.uid, 'posts');
        
        await addDoc(postCollectionRef, {
            userId: user.uid,
            mediaUrl,
            caption: caption,
            hashtags: caption.match(/#\w+/g) || [],
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), 
            likeCount: 0,
            commentCount: 0,
            viewCount: 0,
            overlayText: overlayText.trim() || null,
            overlayColor,
            overlayPosition: overlayY,
            overlayX
        });

        setUploadProgress(100);
        toast({ title: "Live! 🎬", description: "Your reel is now sharing." });
        router.push('/');

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed ❌', description: e.message });
        setUploadProgress(0);
    } finally {
        setIsUploading(false);
    }
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  return (
    <div className="flex h-screen flex-col bg-black text-white overflow-hidden select-none">
      {/* Background / Main Content Area */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {mediaPreview ? (
            <div className="relative w-full h-full">
                {mediaType === 'video' ? (
                    <video 
                      src={mediaPreview} 
                      className="w-full h-full object-cover" 
                      autoPlay 
                      loop 
                      muted={isPreviewMuted} 
                      playsInline
                    />
                ) : (
                    <Image src={mediaPreview} alt="Preview" fill className="object-cover" />
                )}

                {/* Real-time Overlay Preview */}
                {overlayText && (
                    <div 
                        className="absolute px-4 text-center pointer-events-none z-20"
                        style={{ 
                            top: `${overlayY}%`, 
                            left: `${overlayX}%`,
                            transform: 'translate(-50%, -50%)',
                            color: overlayColor,
                            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                        }}
                    >
                        <p className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
                            {overlayText}
                        </p>
                    </div>
                )}

                {/* Top Left Back Button (To Cancel/Go Back) */}
                <button 
                  onClick={() => mediaFile ? setMediaFile(null) : router.back()} 
                  className="absolute top-10 left-6 z-50 p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/60 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                {/* Right Side Vertical Toolbar - Simplified as requested */}
                <div className="absolute top-10 right-6 flex flex-col gap-4 z-50">
                    <button 
                      onClick={() => setShowTextSettings(!showTextSettings)}
                      className={cn("p-3 rounded-full transition-all bg-black/30 backdrop-blur-md border border-white/10", showTextSettings && "bg-white text-black")}
                    >
                        <span className="text-lg font-black italic">Aa</span>
                    </button>
                    
                    <button 
                      onClick={() => setIsPreviewMuted(!isPreviewMuted)}
                      className="p-3 rounded-full bg-black/30 backdrop-blur-md border border-white/10"
                    >
                        {isPreviewMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                    </button>
                </div>

                {/* Bottom Overlay Area (Caption) */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                    <div className="pointer-events-auto">
                        <Input 
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Add a caption..."
                            className="bg-transparent border-none text-white placeholder:text-white/60 p-0 h-12 text-lg font-medium focus-visible:ring-0"
                            disabled={isUploading}
                        />
                    </div>
                </div>

                {/* Bottom Controls Bar (Simplified Upload Button) */}
                <div className="absolute bottom-8 left-0 right-0 px-6 flex items-center justify-end z-50 pointer-events-auto">
                    <button 
                        onClick={handlePost}
                        disabled={isUploading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 h-14 rounded-full flex items-center gap-3 shadow-2xl active:scale-95 transition-all font-black uppercase tracking-widest text-sm"
                    >
                        {isUploading ? (
                          <>
                            <Loader2 className="animate-spin h-5 w-5" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <span>Upload</span>
                            <SendHorizonal className="h-5 w-5" />
                          </>
                        )}
                    </button>
                </div>
            </div>
        ) : (
            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer group bg-gradient-to-br from-neutral-900 to-black">
                <div className="text-center group-hover:scale-110 transition-transform duration-500">
                    <div className="w-24 h-24 bg-primary/20 rounded-[2rem] flex items-center justify-center mb-6 mx-auto border border-primary/30">
                        <UploadCloud className="w-12 h-12 text-primary animate-pulse" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-[0.2em] italic text-primary">New Reel</h2>
                    <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-[0.4em] opacity-50">Choose Video or Image</p>
                </div>
                <input type="file" className="hidden" accept="video/*,image/*" onChange={handleFileChange} disabled={isUploading} />
            </label>
        )}
      </div>

      {/* Advanced Text Settings Overlay */}
      {showTextSettings && mediaPreview && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-[100] p-6 bg-black/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 animate-in zoom-in duration-300">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Text Overlay</h3>
                    <button onClick={() => setShowTextSettings(false)} className="text-[10px] font-bold uppercase text-white/50">Done</button>
                </div>

                <Input 
                    placeholder="Type something cool..."
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl text-center font-bold text-lg"
                    maxLength={100}
                />

                {overlayText && (
                    <div className="mt-8 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <span className="text-[9px] font-bold uppercase text-white/40 ml-1">Vertical Pos</span>
                                <Slider 
                                    value={[overlayY]} 
                                    onValueChange={(v) => setOverlayY(v[0])} 
                                    max={100} 
                                    step={1} 
                                />
                            </div>
                            <div className="space-y-4">
                                <span className="text-[9px] font-bold uppercase text-white/40 ml-1">Horizontal Pos</span>
                                <Slider 
                                    value={[overlayX]} 
                                    onValueChange={(v) => setOverlayX(v[0])} 
                                    max={100} 
                                    step={1} 
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <span className="text-[9px] font-bold uppercase text-white/40 ml-1 flex items-center gap-1.5">
                                <Palette className="h-3 w-3" /> Color Palette
                            </span>
                            <div className="flex justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
                                {COLORS.map((c) => (
                                    <button 
                                        key={c.name}
                                        onClick={() => setOverlayColor(c.value)}
                                        className={cn(
                                            "w-9 h-9 rounded-full border-2 transition-all transform active:scale-90",
                                            overlayColor === c.value ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60"
                                        )}
                                        style={{ backgroundColor: c.value === 'hsl(var(--primary))' ? '#ff3366' : c.value }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
          </div>
      )}

      {/* Progress Bar (Visible during upload) */}
      {isUploading && (
          <div className="absolute top-0 left-0 right-0 z-[200]">
              <Progress value={uploadProgress} className="h-1 bg-white/10" />
          </div>
      )}
    </div>
  );
}
