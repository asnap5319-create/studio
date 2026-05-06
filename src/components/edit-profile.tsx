'use client';

import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function EditProfileSheet({ open, onOpenChange, userProfile }: EditProfileSheetProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [name, setName] = useState(userProfile?.name || '');
  const [username, setUsername] = useState(userProfile?.username || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile && open) {
      setName(userProfile.name || '');
      setUsername(userProfile.username || '');
      setBio(userProfile.bio || '');
      setImagePreviewUrl(userProfile.profileImageUrl || '');
      setImageFile(null);
    }
  }, [userProfile, open]);
  
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const localUrl = URL.createObjectURL(file);
      setImagePreviewUrl(localUrl);
    }
  };

  const handleSaveChanges = async () => {
    if (!user || !firestore) return;
    if (!username.trim()) {
        toast({ variant: 'destructive', title: 'त्रुटि', description: 'यूजरनेम जरूरी है।' });
        return;
    }

    setIsSaving(true);

    try {
      let profileImageUrl = userProfile?.profileImageUrl || `https://picsum.photos/seed/${user.uid}/400/400`;

      if (imageFile) {
        const cloudName = "dipz5jsls";
        const uploadPreset = "video_upload";

        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', uploadPreset);
        
        toast({ title: "फोटो अपलोड हो रही है... 🚀" });
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.secure_url) {
            profileImageUrl = data.secure_url;
            toast({ title: "फोटो सफलतापूर्वक अपडेट हो गई! ✅" });
        } else {
            console.error("Cloudinary Error Log:", data);
            const errorDetail = data?.error?.message || "Upload Preset Settings Error.";
            toast({ 
              variant: 'destructive', 
              title: 'अपलोड फेल ❌', 
              description: errorDetail
            });
        }
      }

      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        name: name.trim(),
        username: username.trim(),
        username_lowercase: username.trim().toLowerCase(),
        bio: bio.trim(),
        profileImageUrl,
      }, { merge: true });

      toast({ title: 'प्रोफाइल सुरक्षित हो गई! ✅' });
      onOpenChange(false);

    } catch (error: any) {
      console.error('Update Profile Error:', error);
      toast({
        variant: 'destructive',
        title: 'गलती ❌',
        description: error.message || 'कुछ गड़बड़ हो गई।',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-background text-white border-white/10 p-0 overflow-hidden h-[90vh]">
        <SheetHeader className="p-6 border-b border-white/5">
          <SheetTitle className="text-center text-xl font-black italic uppercase">Edit Profile</SheetTitle>
        </SheetHeader>
        
        <div className="p-6 space-y-8 overflow-y-auto h-full pb-32">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-32 w-32 border-4 border-primary shadow-lg cursor-pointer hover:scale-105 transition-transform">
                  <AvatarImage src={imagePreviewUrl ?? userProfile?.profileImageUrl} className="object-cover" />
                  <AvatarFallback className="text-2xl font-black">{userProfile?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black uppercase text-white">बदलें</span>
                </div>
            </div>
            
            <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*"
                disabled={isSaving}
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">नाम</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} className="h-12 bg-secondary/50 border-white/10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">यूजरनेम</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={isSaving} className="h-12 bg-secondary/50 border-white/10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">बायो</Label>
              <Textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder="अपने बारे में लिखें..."
                className="min-h-[120px] bg-secondary/50 border-white/10 rounded-xl resize-none"
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t border-white/5 flex gap-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-14 rounded-2xl font-black uppercase" disabled={isSaving}>
            रद्द करें
          </Button>
          <Button onClick={handleSaveChanges} disabled={isSaving} className="flex-1 h-14 rounded-2xl font-black uppercase bg-primary">
            {isSaving ? 'सेव हो रहा है...' : 'सेव करें'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
