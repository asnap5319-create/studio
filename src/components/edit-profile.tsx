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
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/app/(main)/profile/page';
import { Progress } from '@/components/ui/progress';

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name);
      setUsername(userProfile.username);
      setBio(userProfile.bio || '');
    }
  }, [userProfile]);
  
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user || !storage || !firestore) return;

    const file = e.target.files[0];
    setIsUploading(true);
    setUploadProgress(0);

    const photoRef = storageRef(storage, `profile-images/${user.uid}`);
    console.log('Starting upload to:', photoRef.fullPath);
    const uploadTask = uploadBytesResumable(photoRef, file);
    
    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("!!! UPLOAD FAILED !!!", error);
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);
        
        let description = 'Could not upload your new profile photo.';
         switch (error.code) {
            case 'storage/unauthorized':
                description = "Permission denied. Please check storage security rules.";
                break;
            case 'storage/canceled':
                description = 'The upload was canceled.';
                break;
            case 'storage/unknown':
                description = 'An unknown error occurred. Check the console for details.';
                break;
            default:
                description = `An unexpected error occurred: ${error.code}`;
                break;
        }
        toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description,
        });
        setIsUploading(false);
        setUploadProgress(0);
      }, 
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, {
                profileImageUrl: downloadURL
            });
            toast({
                title: 'Profile Photo Updated',
                description: 'Your new photo has been saved.',
            });
        }).catch((error) => {
             console.error('Error saving photo URL: ', error);
             toast({
                variant: 'destructive',
                title: 'Save Error',
                description: 'The photo uploaded, but could not be saved to your profile.',
            });
        }).finally(() => {
            setIsUploading(false);
            setUploadProgress(0);
        });
      }
    );
  };

  const handleSaveChanges = async () => {
    if (!user || !firestore) {
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
      await updateDoc(userDocRef, {
        name,
        username,
        bio,
      });
      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not update your profile.',
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
              <AvatarImage src={userProfile?.profileImageUrl} />
              <AvatarFallback>{userProfile?.name?.[0]}</AvatarFallback>
            </Avatar>
            {isUploading && <Progress value={uploadProgress} className="w-[60%]" />}
            <Button 
                variant="link" 
                className="text-primary p-0 h-auto" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? `Uploading: ${Math.round(uploadProgress)}%` : 'Change profile photo'}
            </Button>
            <Input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/png, image/jpeg, image/webp"
                disabled={isUploading}
            />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isUploading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isUploading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder="Write a little bit about yourself..."
                className="min-h-[100px]"
                disabled={isUploading}
              />
            </div>
          </div>
        </div>
        <SheetFooter className="flex-row gap-2">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1" disabled={isUploading}>Cancel</Button>
          </SheetClose>
          <Button onClick={handleSaveChanges} disabled={isSaving || isUploading} className="flex-1">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
