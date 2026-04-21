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
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/app/(main)/profile/page';

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function EditProfileSheet({ open, onOpenChange, userProfile }: EditProfileSheetProps) {
  const { firestore, storage } = useFirebase();
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
    if (userProfile) {
      setName(userProfile.name);
      setUsername(userProfile.username);
      setBio(userProfile.bio || '');
    }
    // When sheet opens/closes, reset the local preview and file
    if (!open) {
      setImagePreviewUrl(null);
      setImageFile(null);
    }
  }, [userProfile, open]);
  
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file); // Store the file object
      const localUrl = URL.createObjectURL(file);
      setImagePreviewUrl(localUrl); // Show preview immediately
    }
  };

  const handleSaveChanges = async () => {
    if (!user || !firestore || !storage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to edit your profile.',
      });
      return;
    }

    setIsSaving(true);
    const userDocRef = doc(firestore, 'users', user.uid);

    try {
      const dataToUpdate: { name: string; username: string; bio: string; profileImageUrl?: string } = {
        name,
        username,
        bio,
      };

      if (imageFile) {
        const photoRef = storageRef(storage, `profile-images/${user.uid}`);
        const uploadResult = await uploadBytes(photoRef, imageFile);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        dataToUpdate.profileImageUrl = downloadURL;
      }
      
      await setDoc(userDocRef, dataToUpdate, { merge: true });

      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error updating profile: ', error);
      let description = 'Could not update your profile.';
      if (error.code === 'storage/unauthorized') {
          description = "You don't have permission to upload files.";
      } else if (error.message) {
        description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-lg bg-background text-white border-border">
        <SheetHeader className="text-center">
          <SheetTitle>Edit Profile</SheetTitle>
        </SheetHeader>
        <div className="py-8 px-4 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={imagePreviewUrl ?? userProfile?.profileImageUrl} />
              <AvatarFallback>{userProfile?.name?.[0]}</AvatarFallback>
            </Avatar>
            
            <Button 
                variant="link" 
                className="text-primary p-0 h-auto" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
            >
                Change profile photo
            </Button>
            
            <Input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/png, image/jpeg, image/webp"
                disabled={isSaving}
            />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isSaving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder="Write a little bit about yourself..."
                className="min-h-[100px]"
                disabled={isSaving}
              />
            </div>
          </div>
        </div>
        <SheetFooter className="flex-row gap-2">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1" disabled={isSaving}>Cancel</Button>
          </SheetClose>
          <Button onClick={handleSaveChanges} disabled={isSaving} className="flex-1">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
