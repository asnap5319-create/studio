'use client';

import { useState } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, doc, serverTimestamp, setDoc, addDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, Check } from 'lucide-react';
import type { UserProfile } from '@/models/user';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShareSheetProps {
  postId: string;
  postOwnerId: string;
  mediaUrl: string;
  onClose: () => void;
}

export function ShareSheet({ postId, postOwnerId, mediaUrl, onClose }: ShareSheetProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sentTo, setSentTo] = useState<string[]>([]);

  // Query for users based on search
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

  const handleSendPost = async (recipientId: string) => {
    if (!user || !firestore || sentTo.includes(recipientId)) return;

    // Generate a deterministic chat ID
    const participants = [user.uid, recipientId].sort();
    const chatId = participants.join('_');
    const chatRef = doc(firestore, 'chats', chatId);
    const messagesRef = collection(firestore, 'chats', chatId, 'messages');

    const postLink = `${window.location.origin}/feed?post=${postId}`;
    const messageText = `Check out this post: ${postLink}`;

    try {
      // Ensure chat document exists
      await setDoc(chatRef, {
        id: chatId,
        participants,
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Add the message
      await addDoc(messagesRef, {
        senderId: user.uid,
        text: messageText,
        createdAt: serverTimestamp(),
      });

      setSentTo(prev => [...prev, recipientId]);
      toast({ title: "Sent!", description: "Post shared successfully." });
    } catch (error) {
      console.error("Error sharing post:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to share post." });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="p-4 border-b border-border">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends..."
            className="pl-10 bg-secondary border-none h-10 rounded-xl"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {searchResults?.filter(u => u.id !== user?.uid).map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={u.profileImageUrl} />
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
                  onClick={() => handleSendPost(u.id)}
                  className="rounded-full px-5 font-bold h-8"
                  disabled={sentTo.includes(u.id)}
                >
                  {sentTo.includes(u.id) ? (
                    <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Sent</span>
                  ) : 'Send'}
                </Button>
              </div>
            ))}
            {searchResults?.length === 0 && (
                <p className="text-center text-muted-foreground py-10 text-sm">No users found.</p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
