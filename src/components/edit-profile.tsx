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
import { getDownloadURL, ref as storageRef, uploadBytesResumable, type UploadTask } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/app/(main)/profile/page';
import { Progress } from './ui/progress';

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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
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
    setUploadProgress(0);

    const photoRef = storageRef(storage, `profile-images/${user.uid}`);
    const uploadTask: UploadTask = uploadBytesResumable(photoRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        },
        (error) => {
            setUploadProgress(null);
            console.error("!!! UPLOAD FAILED !!!", error);
            let description = 'Could not upload your new profile photo.';
            switch (error.code) {
                case 'storage/unauthorized':
                    description = "Permission denied. Please check your storage security rules.";
                    break;
                case 'storage/canceled':
                    description = 'The upload was canceled.';
                    break;
                case 'storage/unknown':
                    description = 'An unknown error occurred. Please try again.';
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
                setUploadProgress(null);
            }).catch((urlError) => {
                 console.error('Error getting download URL: ', urlError);
                 toast({
                    variant: 'destructive',
                    title: 'Save Error',
                    description: 'The photo uploaded, but could not be saved to your profile.',
                });
                setUploadProgress(null);
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

  const isUploading = uploadProgress !== null;

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
            {isUploading ? (
                <div className='w-full max-w-[200px] space-y-2'>
                    <p className='text-sm text-center text-muted-foreground'>Uploading: {Math.round(uploadProgress)}%</p>
                    <Progress value={uploadProgress} className="h-2" />
                </div>
            ) : (
                <Button 
                    variant="link" 
                    className="text-primary p-0 h-auto" 
                    onClick={() => fileInputRef.current?.click()}
                >
                    Change profile photo
                </Button>
            )}
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
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving || isUploading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isSaving || isUploading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder="Write a little bit about yourself..."
                className="min-h-[100px]"
                disabled={isSaving || isUploading}
              />
            </div>
          </div>
        </div>
        <SheetFooter className="flex-row gap-2">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1" disabled={isSaving || isUploading}>Cancel</Button>
          </SheetClose>
          <Button onClick={handleSaveChanges} disabled={isSaving || isUploading} className="flex-1">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
