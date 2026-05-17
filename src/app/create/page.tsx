
'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp, query, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, Music, X } from 'lucide-react';
import Image from 'next/image';
import { BottomNav } from "@/components/bottom-nav";

export default function CreatePostPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedAudio, setSelectedAudio] = useState<string>("Original Audio");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedAudiosQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'saved_audios'));
  }, [firestore, user]);

  const { data: savedAudios } = useCollection(savedAudiosQuery);

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
        
        const finalCaption = selectedAudio !== "Original Audio" ? `${selectedAudio} - ${caption}` : caption;

        await addDoc(postCollectionRef, {
            userId: user.uid,
            mediaUrl,
            caption: finalCaption,
            hashtags: caption.match(/#\w+/g) || [],
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), 
            likeCount: 0,
            commentCount: 0,
            viewCount: 0,
            audioTitle: selectedAudio
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
        <label className="relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-[2rem] cursor-pointer bg-secondary/20 border-white/10 overflow-hidden">
            {mediaPreview ? (
                mediaType === 'video' ? (
                    <video src={mediaPreview} className="object-cover w-full h-full" autoPlay loop muted />
                ) : (
                    <Image src={mediaPreview} alt="Preview" fill className="object-cover" />
                )
            ) : (
                <div className="text-center">
                    <UploadCloud className="w-12 h-12 mb-4 mx-auto text-primary animate-bounce" />
                    <p className="text-sm font-bold uppercase tracking-widest">Select Media</p>
                </div>
            )}
            <input type="file" className="hidden" accept="video/*,image/*" onChange={handleFileChange} disabled={isUploading} />
        </label>

        <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Caption & Tags</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind? #trending"
              className="min-h-[100px] bg-secondary/30 border-white/5 rounded-2xl resize-none"
              disabled={isUploading}
            />
        </div>

        <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Select Audio</label>
            <Select value={selectedAudio} onValueChange={setSelectedAudio}>
                <SelectTrigger className="h-12 bg-secondary/30 border-white/5 rounded-2xl">
                    <Music className="h-4 w-4 mr-2 text-primary" />
                    <SelectValue placeholder="Original Audio" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white rounded-xl">
                    <SelectItem value="Original Audio">Original Audio</SelectItem>
                    {savedAudios?.map((audio: any) => (
                        <SelectItem key={audio.id} value={audio.title}>{audio.title}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-2xl bg-destructive/10 border-destructive/20">
            <AlertTitle className="font-bold">Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handlePost} disabled={isUploading || !mediaFile} className="w-full h-14 text-lg font-black uppercase rounded-2xl bg-primary">
          {isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Share Post'}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
