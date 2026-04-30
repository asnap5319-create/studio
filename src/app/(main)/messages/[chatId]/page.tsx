'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Message } from '@/models/message';
import type { Chat } from '@/models/chat';
import type { UserProfile } from '@/models/user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Play } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Image from 'next/image';

export default function ChatPage() {
  const { chatId } = useParams();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatRef = useMemoFirebase(() => {
    if (!firestore || !chatId) return null;
    return doc(firestore, 'chats', chatId as string);
  }, [firestore, chatId]);

  const { data: chat } = useDoc<Chat>(chatRef);

  const otherUserId = chat?.participants.find(id => id !== user?.uid);
  const otherUserRef = useMemoFirebase(() => {
    if (!firestore || !otherUserId) return null;
    return doc(firestore, 'users', otherUserId);
  }, [firestore, otherUserId]);

  const { data: otherUser } = useDoc<UserProfile>(otherUserRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !chatId) return null;
    return query(
      collection(firestore, 'chats', chatId as string, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, chatId]);

  const { data: messages } = useCollection<Message>(messagesQuery);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText('');
    
    const messagesRef = collection(firestore, 'chats', chatId as string, 'messages');
    const chatDocRef = doc(firestore, 'chats', chatId as string);

    addDocumentNonBlocking(messagesRef, {
      senderId: user.uid,
      text,
      createdAt: serverTimestamp(),
    });

    setDocumentNonBlocking(chatDocRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      participants: chat?.participants || [user.uid, (chatId as string).replace(user.uid, '').replace('_', '')],
    }, { merge: true });
  };

  if (!user) return null;

  return (
    <div className="flex h-full flex-col text-white bg-background max-w-lg mx-auto border-x border-border">
      <header className="flex items-center gap-3 p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft />
        </button>
        {otherUser ? (
          <Link href={`/profile/${otherUser.id}`} className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser.profileImageUrl} />
              <AvatarFallback>{otherUser.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-bold text-sm">{otherUser.username}</span>
              <span className="text-[10px] text-green-500">Active now</span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 animate-pulse">
             <div className="h-10 w-10 rounded-full bg-secondary" />
             <div className="h-4 w-20 bg-secondary rounded" />
          </div>
        )}
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages?.map((msg, index) => {
          const isMine = msg.senderId === user.uid;
          const isSharedPost = !!msg.sharedPostId;

          return (
            <div 
              key={msg.id} 
              className={cn(
                "flex flex-col max-w-[80%]",
                isMine ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              {isSharedPost ? (
                <Link 
                  href="/feed"
                  className={cn(
                    "rounded-2xl overflow-hidden border border-border shadow-lg transition-transform active:scale-95 group",
                    isMine ? "bg-primary/20" : "bg-secondary/40"
                  )}
                >
                  <div className="relative aspect-[9/16] w-48 bg-black">
                     {msg.sharedPostMediaUrl?.includes('video') || msg.sharedPostMediaUrl?.includes('cloudinary') ? (
                       <video 
                         src={msg.sharedPostMediaUrl} 
                         className="h-full w-full object-cover" 
                         muted 
                         autoPlay 
                         loop 
                         playsInline
                       />
                     ) : (
                       <Image 
                         src={msg.sharedPostMediaUrl || ''} 
                         alt="Shared Post" 
                         fill 
                         className="object-cover"
                       />
                     )}
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <Play className="h-10 w-10 text-white fill-white/20" />
                     </div>
                  </div>
                  <div className="p-2 text-[10px] font-bold text-center bg-black/40 text-muted-foreground uppercase tracking-widest">
                    View Post
                  </div>
                </Link>
              ) : (
                <div 
                  className={cn(
                    "px-4 py-2 rounded-2xl text-sm break-words",
                    isMine 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-secondary text-white rounded-tl-none"
                  )}
                >
                  {msg.text}
                </div>
              )}
              <span className="text-[9px] text-muted-foreground mt-1 px-1">
                {msg.createdAt && format(msg.createdAt.toDate(), 'HH:mm')}
              </span>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-secondary border-none rounded-full px-4 focus-visible:ring-1"
            disabled={isSending}
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost" 
            className="text-primary hover:bg-transparent"
            disabled={!inputText.trim() || isSending}
          >
            <Send className="h-6 w-6" />
          </Button>
        </form>
      </div>
    </div>
  );
}
