'use client';

import { useState, ChangeEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, Loader2, X, Type, Palette, ChevronLeft, Check, Sparkles, Move } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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

  // Text Overlay State
  const [overlayText, setOverlayText] = useState('');
  const [overlayColor, setOverlayColor] = useState('#ffffff');
  const [overlayY, setOverlayY] = useState(50);
  const [overlayX, setOverlayX] = useState(50);
  const [showTextSettings, setShowTextSettings] = useState(false);

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
        
        // Simulate progress for better UX
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
    <div className="flex min-h-screen flex-col bg-background text-white max-w-lg mx-auto overflow-hidden">
      {/* Top Navigation */}
      <header className="flex items-center justify-between p-4 border-b border-white/5 sticky top-0 bg-background/95 backdrop-blur-md z-50">
          <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em] italic text-primary">New Reel</h1>
          <Button 
            onClick={handlePost} 
            disabled={isUploading || !mediaFile} 
            variant="ghost" 
            className="text-primary font-black uppercase text-sm hover:bg-transparent"
          >
            {isUploading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Share'}
          </Button>
      </header>
      
      {isUploading && <Progress value={uploadProgress} className="h-1 rounded-none bg-secondary" />}

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6 pb-12">
        {/* Media Preview Area - Instagram Inspired */}
        <div className="relative aspect-[9/16] w-full max-h-[60vh] bg-secondary/20 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
            {mediaPreview ? (
                <>
                    {mediaType === 'video' ? (
                        <video src={mediaPreview} className="object-cover w-full h-full" autoPlay loop muted />
                    ) : (
                        <Image src={mediaPreview} alt="Preview" fill className="object-cover" />
                    )}
                    
                    {/* Real-time Overlay Preview */}
                    {overlayText && (
                        <div 
                            className="absolute px-4 text-center pointer-events-none z-10"
                            style={{ 
                                top: `${overlayY}%`, 
                                left: `${overlayX}%`,
                                transform: 'translate(-50%, -50%)',
                                color: overlayColor,
                                textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                            }}
                        >
                            <p className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
                                {overlayText}
                            </p>
                        </div>
                    )}

                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <button 
                            onClick={() => { setMediaFile(null); setMediaPreview(null); setShowTextSettings(false); }}
                            className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-black/80 transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <button 
                            onClick={() => setShowTextSettings(!showTextSettings)}
                            className={cn(
                                "p-3 backdrop-blur-md rounded-full text-white border border-white/10 transition-all",
                                showTextSettings ? "bg-primary text-white scale-110" : "bg-black/60"
                            )}
                        >
                            <Type size={18} />
                        </button>
                    </div>
                </>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer group bg-gradient-to-br from-secondary/10 to-background">
                    <div className="text-center group-hover:scale-110 transition-transform duration-500">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto border border-primary/30">
                            <UploadCloud className="w-10 h-10 text-primary animate-pulse" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Select Reel</p>
                        <p className="text-[8px] text-muted-foreground mt-2 uppercase opacity-50">Image or Video</p>
                    </div>
                    <input type="file" className="hidden" accept="video/*,image/*" onChange={handleFileChange} disabled={isUploading} />
                </label>
            )}
        </div>

        {/* Caption Area */}
        <div className="space-y-4">
            <div className="flex items-start gap-3 bg-secondary/30 p-4 rounded-3xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption... #trending #reels"
                    className="flex-1 bg-transparent border-none p-0 focus-visible:ring-0 resize-none text-sm min-h-[80px]"
                    disabled={isUploading}
                />
            </div>
        </div>

        {/* Advanced Text Settings Overlay - Animated */}
        {showTextSettings && mediaPreview && (
            <div className="space-y-6 p-6 bg-secondary/40 rounded-[2.5rem] border border-white/10 animate-in fade-in slide-in-from-bottom-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Type className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Edit Text</span>
                    </div>
                    <button onClick={() => setShowTextSettings(false)} className="text-[10px] font-bold text-primary uppercase">Done</button>
                </div>
                
                <Input 
                    placeholder="Type something cool..."
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    className="h-14 bg-black/40 border-white/10 rounded-2xl text-center font-bold"
                    maxLength={100}
                />

                {overlayText && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Vertical</span>
                                <Slider 
                                    value={[overlayY]} 
                                    onValueChange={(v) => setOverlayY(v[0])} 
                                    max={100} 
                                    step={1} 
                                />
                            </div>
                            <div className="space-y-3">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Horizontal</span>
                                <Slider 
                                    value={[overlayX]} 
                                    onValueChange={(v) => setOverlayX(v[0])} 
                                    max={100} 
                                    step={1} 
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <span className="text-[9px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                                <Palette className="h-3 w-3" /> Pick Color
                            </span>
                            <div className="flex justify-between bg-black/20 p-3 rounded-2xl">
                                {COLORS.map((c) => (
                                    <button 
                                        key={c.name}
                                        onClick={() => setOverlayColor(c.value)}
                                        className={cn(
                                            "w-8 h-8 rounded-full border-2 transition-all transform active:scale-90",
                                            overlayColor === c.value ? "border-white scale-125 shadow-lg shadow-white/20" : "border-transparent opacity-60"
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

        {!showTextSettings && mediaFile && (
            <Button 
                onClick={handlePost} 
                disabled={isUploading} 
                className="w-full h-16 text-lg font-black uppercase rounded-3xl bg-primary shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
            >
                {isUploading ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin h-5 w-5" />
                        <span>Uploading Reel... {uploadProgress}%</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Check className="h-5 w-5" />
                        <span>Share to Feed</span>
                    </div>
                )}
            </Button>
        )}
      </div>
    </div>
  );
}
