
'use client';

import { useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, Loader2 } from 'lucide-react';
import Image from 'next/image';

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


  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image or video file.' });
        return;
      }
      setMediaFile(file);
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
      setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
    }
  };

  const handlePost = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Login Required', description: 'Please login to post.' });
      return;
    }
    if (!mediaFile) {
        toast({ variant: 'destructive', title: 'No Media', description: 'Please select a photo or video.' });
        return;
    }
    if (!firestore) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo";
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "unsigned_preset";

    setIsUploading(true);
    setError(null);

    try {
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('upload_preset', uploadPreset);
        
        const resourceType = mediaFile.type.startsWith('video') ? 'video' : 'image';
        const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        
        toast({ title: "Media Uploading... 🚀", description: "Wait a moment." });
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Cloudinary Detailed Error:", data);
            throw new Error(data.error?.message || 'Media upload failed. Check Cloudinary settings.');
        }

        const mediaUrl = data.secure_url;
        toast({ title: "Upload Success! ✅", description: "Saving to feed..." });

        const postCollectionRef = collection(firestore, 'users', user.uid, 'posts');
        
        const newPost = {
            userId: user.uid,
            mediaUrl,
            caption,
            hashtags: caption.match(/#\w+/g) || [],
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), 
            likeCount: 0,
            commentCount: 0,
            viewCount: 0,
        };

        await addDoc(postCollectionRef, newPost);

        toast({ title: "Live! 🎬", description: "Your post is now visible." });
        router.push('/feed');

    } catch (e: any) {
        console.error("Post Creation Error:", e);
        setError(e.message || "Something went wrong.");
        toast({ variant: 'destructive', title: 'Failed ❌', description: e.message });
    } finally {
        setIsUploading(false);
    }
  };

  if (isUserLoading) return <div className="flex h-full items-center justify-center text-white"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex h-full flex-col p-4 text-white bg-background max-w-lg mx-auto pb-24">
      <h1 className="text-2xl font-black mb-6 text-center uppercase italic text-primary">Create New Post</h1>
      
      <div className="space-y-6">
        <div className="flex items-center justify-center w-full">
            <label htmlFor="dropzone-file" className="relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-3xl cursor-pointer bg-secondary/50 border-white/10 hover:border-primary/50 transition-colors">
                {mediaPreview ? (
                    <div className="relative w-full h-full overflow-hidden rounded-3xl">
                        {mediaType === 'video' ? (
                            <video src={mediaPreview} className="object-cover w-full h-full" controls autoPlay loop muted playsInline />
                        ) : (
                            <Image src={mediaPreview} alt="Preview" fill className="object-cover" />
                        )}
                        <div className="absolute top-2 right-2 bg-black/50 p-2 rounded-full backdrop-blur-md">
                            <UploadCloud className="h-4 w-4" />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-12 h-12 mb-4 text-primary animate-bounce" />
                        <p className="mb-2 text-sm font-bold uppercase tracking-widest">Click to upload</p>
                        <p className="text-xs text-muted-foreground">Video or Image (Max 100MB)</p>
                    </div>
                )}
                <input id="dropzone-file" type="file" className="hidden" accept="video/*,image/*" onChange={handleFileChange} disabled={isUploading} />
            </label>
        </div>

        <div>
            <label htmlFor="caption" className="block text-xs font-black uppercase text-muted-foreground mb-2 ml-1">Caption</label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening? #asnap #viral"
              className="min-h-[120px] bg-secondary/50 border-white/10 rounded-2xl resize-none focus:ring-primary"
              disabled={isUploading}
            />
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-2xl border-destructive/50">
            <AlertTitle className="font-bold">Upload Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handlePost} disabled={isUploading || !mediaFile} className="w-full h-14 text-lg font-black uppercase rounded-2xl bg-primary shadow-[0_0_20px_rgba(var(--primary),0.4)]">
          {isUploading ? (
            <span className="flex items-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" /> Posting...
            </span>
          ) : 'Create Post'}
        </Button>
      </div>
    </div>
  );
}
