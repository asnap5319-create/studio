'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function CreatePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { firestore, user } = useFirebase();

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) {
      toast({
        title: 'No Image Selected',
        description: 'Please select an image to post.',
        variant: 'destructive',
      });
      return;
    }

    if (!firestore || !user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to post.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const randomPlaceholder = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

    const newPost = {
      userId: user.uid,
      caption: caption,
      videoUrl: randomPlaceholder.imageUrl,
      thumbnailUrl: randomPlaceholder.imageUrl,
      likeCount: 0,
      commentCount: 0,
      createdAt: serverTimestamp(),
    };

    try {
      const videosCollection = collection(firestore, 'videos');
      await addDocumentNonBlocking(videosCollection, newPost);
      
      toast({
        title: 'Post Created!',
        description: 'Your video is now live.',
      });
      router.push('/feed');
    } catch (error: any) {
      toast({
        title: 'Post Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b bg-background px-4">
        <h1 className="text-lg font-semibold font-headline">Create New Post</h1>
      </header>
      <main className="p-4">
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <Label>Image or Video</Label>
            <Card>
              <CardContent className="p-2">
                {preview ? (
                  <div className="relative aspect-[9/16] w-full">
                    {preview.startsWith('data:video') ? (
                      <video src={preview} controls className="h-full w-full rounded-md object-cover" />
                    ) : (
                      <Image src={preview} alt="Image preview" fill className="rounded-md object-cover" />
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-[9/16] w-full items-center justify-center rounded-md border-2 border-dashed">
                    <p className="text-muted-foreground">Media Preview</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={handleImageChange}
              className="mt-2"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label>Caption</Label>
            <Textarea 
              placeholder="Write a caption..." 
              value={caption} 
              onChange={e => setCaption(e.target.value)} 
              rows={3} 
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Post Video'}
          </Button>
        </form>
      </main>
    </div>
  );
}
