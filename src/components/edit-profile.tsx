'use client';

import { useState, useEffect } from 'react';
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
import { useFirebase, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import { Youtube, Instagram, Info, ShieldCheck } from 'lucide-react';

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function EditProfileSheet({ open, onOpenChange, userProfile }: EditProfileSheetProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [username, setUsername] = useState(userProfile?.username || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [youtubeUrl, setYoutubeUrl] = useState(userProfile?.youtubeUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(userProfile?.instagramUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile && open) {
      setUsername(userProfile.username || '');
      setBio(userProfile.bio || '');
      setYoutubeUrl(userProfile.youtubeUrl || '');
      setInstagramUrl(userProfile.instagramUrl || '');
    }
  }, [userProfile, open]);

  const handleSaveChanges = async () => {
    if (!user || !firestore) return;
    if (!username.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Username is required.' });
        return;
    }

    setIsSaving(true);

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        username: username.trim(),
        username_lowercase: username.trim().toLowerCase(),
        bio: bio.trim(),
        youtubeUrl: youtubeUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast({ title: 'Profile Saved! ✅' });
      onOpenChange(false);

    } catch (error: any) {
      console.error('Update Profile Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error ❌',
        description: error.message || 'Something went wrong.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[3rem] bg-background text-white border-none p-0 overflow-hidden h-[85vh]">
        <SheetHeader className="p-6 border-b border-white/5 bg-secondary/20">
          <SheetTitle className="text-center text-xl font-black italic uppercase tracking-tighter text-white">Account Settings</SheetTitle>
        </SheetHeader>
        
        <div className="p-6 space-y-8 overflow-y-auto h-full pb-32 scrollbar-hide">
          <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-[2rem] flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
                <ShieldCheck size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black uppercase italic text-sm tracking-tight">Identity Protected</h4>
                <p className="text-[10px] text-blue-300 font-bold leading-relaxed uppercase opacity-70">
                    Your Name and Profile Picture are managed automatically by Google Security.
                </p>
              </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={isSaving} className="h-14 bg-secondary/50 border-white/10 rounded-2xl px-6 font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Channel Bio</Label>
              <Textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder="Tell us about yourself..."
                className="min-h-[120px] bg-secondary/50 border-white/10 rounded-2xl p-6 resize-none"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Connected Links</h3>
               
               <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <Youtube className="h-3 w-3 text-red-500" /> YouTube URL
                    </Label>
                    <Input 
                      value={youtubeUrl} 
                      onChange={(e) => setYoutubeUrl(e.target.value)} 
                      placeholder="https://youtube.com/@channel"
                      disabled={isSaving} 
                      className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 text-xs" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <Instagram className="h-3 w-3 text-pink-500" /> Instagram User
                    </Label>
                    <Input 
                      value={instagramUrl} 
                      onChange={(e) => setInstagramUrl(e.target.value)} 
                      placeholder="@username"
                      disabled={isSaving} 
                      className="h-12 bg-secondary/50 border-white/10 rounded-xl px-4 text-xs" 
                    />
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t border-white/5 flex gap-4 backdrop-blur-xl">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-xs" disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSaveChanges} disabled={isSaving} className="flex-1 h-16 rounded-2xl font-black uppercase text-xs bg-primary shadow-lg shadow-primary/20">
            {isSaving ? 'Updating...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
