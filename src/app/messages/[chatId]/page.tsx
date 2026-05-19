'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, addDoc, setDoc, writeBatch } from 'firebase/firestore';
import type { Message } from '@/models/message';
import type { Chat } from '@/models/chat';
import type { UserProfile } from '@/models/user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, BadgeCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const ADMIN_EMAIL = "asnap5319@gmail.com";

export default function ChatPage() {
  const { chatId } = useParams();
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isUserParticipant = useMemo(() => {
    if (!user || !chatId) return false;
    const uid = user.uid;
    const idStr = chatId as string;
    return idStr.split('_').includes(uid);
  }, [user, chatId]);

  const chatRef = useMemoFirebase(() => {
    if (!firestore || !chatId || !isUserParticipant) return null;
    return doc(firestore, 'chats', chatId as string);
  }, [firestore, chatId, isUserParticipant]);

  const { data: chat, isLoading: isChatLoading } = useDoc<Chat>(chatRef);
  
  const otherUserId = useMemo(() => {
    if (!chatId || !user) return null;
    const parts = (chatId as string).split('_');
    return parts.find(id => id !== user.uid) || null;
  }, [chatId, user]);
  
  const otherUserRef = useMemoFirebase(() => {
    if (!firestore || !otherUserId) return null;
    return doc(firestore, 'users', otherUserId);
  }, [firestore, otherUserId]);

  const { data: otherUser } = useDoc<UserProfile>(otherUserRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !chatId || !isUserParticipant) return null;
    return query(collection(firestore, 'chats', chatId as string, 'messages'), orderBy('createdAt', 'asc'));
  }, [firestore, chatId, isUserParticipant]);

  const { data: messages, error: messagesError } = useCollection<Message>(messagesQuery);

  useEffect(() => {
    if (!firestore || !user || !chatId || !messages || !isUserParticipant) return;

    const unreadMessages = messages.filter(m => m.recipientId === user.uid && !m.read);
    if (unreadMessages.length > 0) {
      const batch = writeBatch(firestore);
      unreadMessages.forEach(m => {
        const msgRef = doc(firestore, 'chats', chatId as string, 'messages', m.id);
        batch.update(msgRef, { read: true });
      });
      batch.commit().catch(err => console.error("Error marking messages as read:", err));
    }
  }, [firestore, user, chatId, messages, isUserParticipant]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !inputText.trim() || !otherUserId || !isUserParticipant) return;
    const text = inputText.trim();
    setInputText('');
    
    const participants = [user.uid, otherUserId].sort();
    
    try {
      await setDoc(doc(firestore, 'chats', chatId as string), {
          id: chatId,
          participants,
          lastMessage: text,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
      }, { merge: true });

      await addDoc(collection(firestore, 'chats', chatId as string, 'messages'), {
        senderId: user.uid, 
        recipientId: otherUserId, 
        text, 
        createdAt: serverTimestamp(), 
        read: false,
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  if (isUserLoading || !hasMounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  if (!user || !isUserParticipant) {
    if (hasMounted) router.replace('/');
    return null;
  }

  const isOtherAdmin = otherUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <div className="flex h-screen flex-col text-white bg-background max-w-lg mx-auto border-x border-border">
      <header className="flex items-center gap-3 p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2"><ArrowLeft /></button>
        {otherUser && (
          <Link href={`/profile/${otherUser.id}`} className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser.profileImageUrl} className="object-cover" />
              <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">{otherUser.username}</span>
                {isOtherAdmin && <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />}
              </div>
              <span className="text-[10px] text-green-500">Online</span>
            </div>
          </Link>
        )}
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messagesError && (
          <div className="p-4 bg-destructive/10 text-destructive text-center rounded-xl text-xs font-bold">
            Unable to load messages. Please check permissions.
          </div>
        )}
        {messages?.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col max-w-[80%]", msg.senderId === user.uid ? "ml-auto items-end" : "mr-auto items-start")}>
            <div className={cn("px-4 py-2 rounded-2xl text-sm", msg.senderId === user.uid ? "bg-primary text-white rounded-tr-none" : "bg-secondary text-white rounded-tl-none")}>
              {msg.text}
            </div>
            <span className="text-[8px] text-muted-foreground mt-1 px-1">
              {msg.createdAt && hasMounted ? format(msg.createdAt.toDate(), 'HH:mm') : ''}
              {msg.senderId === user.uid && (
                <span className="ml-1">{msg.read ? '• Seen' : ''}</span>
              )}
            </span>
          </div>
        ))}
        {messages?.length === 0 && !isChatLoading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 pt-20">
            <Send className="h-12 w-12 mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Start a new chat</p>
          </div>
        )}
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-2 mb-safe">
        <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Message..." className="flex-1 bg-secondary border-none rounded-full h-12" />
        <Button type="submit" size="icon" variant="ghost" className="text-primary h-12 w-12"><Send /></Button>
      </form>
    </div>
  );
}