'use client';

import { useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, Loader2, X, Type, Palette } from 'lucide-react';
import Image from 'next/image';
import { BottomNav } from "@/components/bottom-nav";
import { cn } from '@/lib/utils';

const COLORS = [
    { name: 'White', value: '#ffffff' },
    { name: 'Primary', value: 'hsl(var(--primary))' },
    { name: 'Yellow', value: '#fbbf24' },
    { name: 'Cyan', value: '#22d3ee' },
    { name: 'Green', value: '#4ade80' }
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
  const [error, setError] = useState<string | null>(null);

  // Text Overlay State
  const [overlayText, setOverlayText] = useState('');
  const [overlayColor, setOverlayColor] = useState('#ffffff');
  const [overlayPosition, setOverlayPosition] = useState(50);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image or video file.' });
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
    setError(null);

    try {
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('upload_preset', "video_upload");
        
        const resourceType = mediaFile.type.startsWith('video') ? 'video' : 'image';
        const response = await fetch(`https://api.cloudinary.com/v1_1/dipz5jsls/${resourceType}/upload`, {
            method: 'POST',
            body: formData
        });

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
            overlayPosition
        });

        toast({ title: "Live! 🎬", description: "Your post is now visible." });
        router.push('/');

    } catch (e: any) {
        setError(e.message || "Something went wrong.");
        toast({ variant: 'destructive', title: 'Failed ❌', description: e.message });
    } finally {
        setIsUploading(false);
    }
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="flex min-h-screen flex-col p-4 text-white bg-background max-w-lg mx-auto pb-24">
      <header className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()}><X className="h-6 w-6" /></button>
          <h1 className="text-xl font-black uppercase italic text-primary">New Post</h1>
          <div className="w-6" />
      </header>
      
      <div className="space-y-6">
        {/* Media Preview Area */}
        <div className="relative flex flex-col items-center justify-center w-full h-[450px] border-2 border-dashed rounded-[2.5rem] bg-secondary/20 border-white/10 overflow-hidden shadow-2xl">
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
                            className="absolute left-0 right-0 px-6 text-center pointer-events-none transition-all duration-300"
                            style={{ 
                                top: `${overlayPosition}%`, 
                                transform: 'translateY(-50%)',
                                color: overlayColor,
                                textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                            }}
                        >
                            <p className="text-2xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
                                {overlayText}
                            </p>
                        </div>
                    )}

                    <button 
                        onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                        className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white"
                    >
                        <X size={20} />
                    </button>
                </>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer group">
                    <div className="text-center group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-16 h-16 mb-4 mx-auto text-primary animate-bounce" />
                        <p className="text-sm font-black uppercase tracking-[0.3em]">Pick Video</p>
                    </div>
                    <input type="file" className="hidden" accept="video/*,image/*" onChange={handleFileChange} disabled={isUploading} />
                </label>
            )}
        </div>

        {/* Text Overlay Controls */}
        {mediaPreview && (
            <div className="space-y-4 p-4 bg-secondary/30 rounded-3xl border border-white/5 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-2">
                    <Type className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Add Overlay Text</span>
                </div>
                
                <Input 
                    placeholder="Type something cool..."
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    className="h-12 bg-black/40 border-white/10 rounded-xl"
                    maxLength={100}
                />

                {overlayText && (
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground">Position</span>
                            </div>
                            <Slider 
                                value={[overlayPosition]} 
                                onValueChange={(v) => setOverlayPosition(v[0])} 
                                max={100} 
                                step={1} 
                                className="py-2"
                            />
                        </div>

                        <div className="space-y-2">
                            <span className="text-[9px] font-bold uppercase text-muted-foreground">Color</span>
                            <div className="flex gap-3">
                                {COLORS.map((c) => (
                                    <button 
                                        key={c.name}
                                        onClick={() => setOverlayColor(c.value)}
                                        className={cn(
                                            "w-8 h-8 rounded-full border-2 transition-transform active:scale-90",
                                            overlayColor === c.value ? "border-white scale-110" : "border-transparent"
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

        <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Caption</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tell everyone what's happening... #trending"
              className="min-h-[100px] bg-secondary/30 border-white/5 rounded-2xl resize-none"
              disabled={isUploading}
            />
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-2xl bg-destructive/10 border-destructive/20">
            <AlertTitle className="font-bold">Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handlePost} disabled={isUploading || !mediaFile} className="w-full h-14 text-lg font-black uppercase rounded-2xl bg-primary shadow-xl shadow-primary/20">
          {isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Post Now'}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
