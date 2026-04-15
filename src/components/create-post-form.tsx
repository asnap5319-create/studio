"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function CreatePostForm() {
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const { toast } = useToast();
  const router = useRouter();


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
  
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) {
        toast({
            title: "No Image Selected",
            description: "Please select an image to post.",
            variant: "destructive"
        });
        return;
    }
    toast({
      title: "Post Submitted!",
      description: "Your post is now live for 48 hours (not really, this is a demo).",
    });
    router.push('/feed');
  }

  return (
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
              <Label>Image or Video</Label>
              <Card>
                <CardContent className="p-2">
                  {preview ? (
                    <div className="relative aspect-square w-full">
                       {preview.startsWith('data:video') ? (
                        <video src={preview} controls className="rounded-md w-full h-full object-cover" />
                      ) : (
                        <Image src={preview} alt="Image preview" fill className="rounded-md object-cover" />
                      )}
                    </div>
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-md border-2 border-dashed">
                      <p className="text-muted-foreground">Preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleImageChange}
                  className="mt-2"
                />
        </div>
        <div>
              <Label>Caption</Label>
              <Textarea placeholder="Write a caption..." value={caption} onChange={e => setCaption(e.target.value)} rows={4} />
        </div>

        <Button type="submit" className="w-full" size="lg">
          Post
        </Button>
      </form>
  );
}
