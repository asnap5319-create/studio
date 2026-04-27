'use client';

import { useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud } from 'lucide-react';
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
      // Basic validation
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
      toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to create a post.' });
      return;
    }
    if (!mediaFile) {
        toast({ variant: 'destructive', title: 'No File Selected', description: 'Please select a video or image to upload.' });
        return;
    }
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Connection Error', description: 'Database connection not available.' });
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      const errorMessage = "Cloudinary is not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env file.";
      toast({ title: "Configuration Error", description: errorMessage, variant: "destructive" });
      console.error(errorMessage);
      setError(errorMessage);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('upload_preset', uploadPreset);
        
        const resourceType = mediaFile.type.startsWith('video') ? 'video' : 'image';
        const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        
        toast({ title: "Uploading media...", description: "Please wait." });
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Cloudinary upload failed.');
        }

        const mediaUrl = data.secure_url;
        toast({ title: "Upload complete!", description: "Saving your post..." });

        const postCollectionRef = collection(firestore, 'users', user.uid, 'posts');
        
        const newPost = {
            userId: user.uid,
            mediaUrl,
            caption,
            hashtags: caption.match(/#\w+/g) || [],
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
            likeCount: 0,
            commentCount: 0,
            viewCount: 0,
        };

        await addDoc(postCollectionRef, newPost);

        toast({ title: "Success!", description: "Your post is live!" });
        router.push('/feed');

    } catch (e: any) {
        console.error("Failed to create post:", e);
        setError(e.message || "An unexpected error occurred.");
        toast({ variant: 'destructive', title: 'Post Creation Failed', description: e.message });
    } finally {
        setIsUploading(false);
    }
  };

  if (isUserLoading) {
    return <div className="flex h-full flex-col items-center justify-center text-white"><p>Loading...</p></div>
  }

  if (!user) {
    router.push('/login'); // Redirect if not logged in
    return <div className="flex h-full flex-col items-center justify-center text-white"><p>Redirecting to login...</p></div>
  }

  return (
    <div className="flex h-full flex-col p-4 text-white bg-background max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Create New Post</h1>
      
      <div className="space-y-6">
        <div className="flex items-center justify-center w-full">
            <label htmlFor="dropzone-file" className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-secondary border-border hover:bg-muted">
                {mediaPreview ? (
                    <div className="relative w-full h-full">
                        {mediaType === 'video' ? (
                            <video src={mediaPreview} className="object-contain w-full h-full rounded-lg" controls autoPlay loop muted/>
                        ) : (
                            <Image src={mediaPreview} alt="Selected media" fill className="object-contain rounded-lg" />
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span></p>
                        <p className="text-xs text-muted-foreground">Video or Image</p>
                    </div>
                )}
                <input id="dropzone-file" type="file" className="hidden" accept="video/*,image/*" onChange={handleFileChange} disabled={isUploading} />
            </label>
        </div>

        <div>
            <label htmlFor="caption" className="block text-sm font-medium text-muted-foreground mb-2">Caption</label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption... #cool #awesome"
              className="min-h-[100px] bg-secondary border-border"
              disabled={isUploading}
            />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handlePost} disabled={isUploading || !mediaFile} className="w-full h-12 text-lg font-bold">
          {isUploading ? 'Posting...' : 'Create Post'}
        </Button>
      </div>
    </div>
  );
}

    