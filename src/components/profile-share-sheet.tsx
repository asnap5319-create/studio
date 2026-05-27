'use client';

import { useState } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, doc, serverTimestamp, setDoc, addDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, Check, Share2, Copy } from 'lucide-react';
import type { UserProfile } from '@/models/user';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProfileShareSheetProps {
  targetUserId: string;
  targetUsername: string;
  targetProfileImage: string;
  onClose: () => void;
}

export function ProfileShareSheet({ targetUserId, targetUsername, targetProfileImage, onClose }: ProfileShareSheetProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sentTo, setSentTo] = useState<string[]>([]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const lowerQuery = searchQuery.toLowerCase().trim();
    if (lowerQuery === '') {
        return query(collection(firestore, 'users'), limit(15));
    }
    return query(
      collection(firestore, 'users'),
      where('username_lowercase', '>=', lowerQuery),
      where('username_lowercase', '<=', lowerQuery + '\uf8ff'),
      limit(10)
    );
  }, [firestore, searchQuery]);

  const { data: searchResults, isLoading } = useCollection<UserProfile>(usersQuery);

  const handleInternalShare = async (recipientId: string) => {
    if (!user || !firestore || sentTo.includes(recipientId)) return;

    const participants = [user.uid, recipientId].sort();
    const chatId = participants.join('_');
    const chatRef = doc(firestore, 'chats', chatId);
    const messagesRef = collection(firestore, 'chats', chatId, 'messages');

    try {
      await setDoc(chatRef, {
        id: chatId,
        participants,
        lastMessage: `Shared @${targetUsername}'s profile`,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await addDoc(messagesRef, {
        senderId: user.uid,
        recipientId: recipientId,
        text: '',
        sharedProfileId: targetUserId,
        sharedProfileName: targetUsername,
        sharedProfileImage: targetProfileImage,
        createdAt: serverTimestamp(),
        read: false,
      });

      setSentTo(prev => [...prev, recipientId]);
      toast({ title: "Sent!", description: "Profile shared with friend." });
    } catch (error) {
      console.error("Error sharing profile:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to share profile." });
    }
  };

  const handleExternalShare = async () => {
    const shareUrl = window.location.origin + `/profile/${targetUserId}`;
    const shareText = `Check out @${targetUsername} on A.snap! 🎬\n\n${shareUrl}`;
    
    const shareData = {
      title: `A.snap - @${targetUsername}`,
      text: `Check out @${targetUsername} on A.snap! 🎬`,
      url: shareUrl,
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        throw new Error('Native share not supported');
      }
    } catch (err) {
      console.warn("Native share failed, falling back to clipboard:", err);
      try {
        await navigator.clipboard.writeText(shareText);
        toast({ title: "Profile Message Copied! 🔗", description: "Now paste it on WhatsApp or Instagram." });
      } catch (clipErr) {
        toast({ variant: "destructive", title: "Share Failed", description: "Could not copy message." });
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="p-6 border-b border-white/5 space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-black italic uppercase text-lg">Share Profile</h3>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">✕</button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search username..."
            className="pl-10 bg-secondary/50 border-none h-12 rounded-2xl"
          />
        </div>

        <Button 
            onClick={handleExternalShare}
            className="w-full h-14 bg-primary text-white font-black uppercase rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
            <Copy size={20} /> Copy Profile Link
        </Button>
      </div>

      <ScrollArea className="flex-1 px-6">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Send className="animate-pulse text-primary h-8 w-8" />
          </div>
        ) : (
          <div className="space-y-4 py-4 pb-20">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Suggestions</p>
            {searchResults?.filter(u => u.id !== user?.uid).map((u) => (
              <div key={u.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-white/10">
                    <AvatarImage src={u.profileImageUrl} className="object-cover" />
                    <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{u.username}</span>
                    <span className="text-xs text-muted-foreground">{u.name}</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant={sentTo.includes(u.id) ? "secondary" : "default"}
                  onClick={() => handleInternalShare(u.id)}
                  className="rounded-full px-5 font-bold h-8 transition-all active:scale-90"
                  disabled={sentTo.includes(u.id)}
                >
                  {sentTo.includes(u.id) ? (
                    <span className="flex items-center gap-1 text-green-500"><Check className="h-3 w-3" /> Sent</span>
                  ) : 'Send'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
