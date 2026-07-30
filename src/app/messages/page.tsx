'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import type { Chat } from '@/models/chat';
import type { UserProfile } from '@/models/user';
import type { Message } from '@/models/message';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { ArrowLeft, Send, BadgeCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { BottomNav } from "@/components/bottom-nav";
import { useState, useEffect } from 'react';

const ADMIN_EMAIL = "asnap5319@gmail.com";

function ChatItem({ chat, currentUserId, hasMounted }: { chat: Chat; currentUserId: string; hasMounted: boolean }) {
  const { firestore } = useFirebase();
  const otherUserId = chat.participants.find(id => id !== currentUserId);

  const { data: otherUser } = useDoc<UserProfile>(useMemoFirebase(() => 
    (firestore && otherUserId) ? doc(firestore, 'users', otherUserId) : null, [firestore, otherUserId]));

  const unreadQuery = useMemoFirebase(() => {
    if (!firestore || !currentUserId || !chat.id) return null;
    return query(
      collection(firestore, 'chats', chat.id, 'messages'),
      where('recipientId', '==', currentUserId),
      where('read', '==', false)
    );
  }, [firestore, currentUserId, chat.id]);

  const { data: unreadMessages } = useCollection<Message>(unreadQuery);
  const isUnread = unreadMessages && unreadMessages.length > 0;

  if (!otherUser) return null;

  return (
    <Link 
      href={`/messages/${chat.id}`}
      className={cn(
        "flex items-center gap-4 p-4 hover:bg-secondary/30 transition-all border-b border-border",
        isUnread && "bg-primary/5"
      )}
    >
      <div className="relative">
        <Avatar className="h-14 w-14 border-2 border-primary/20">
          <AvatarImage src={otherUser.profileImageUrl} className="object-cover" />
          <AvatarFallback>{otherUser.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {isUnread && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full border-4 border-background flex items-center justify-center text-[8px] font-black text-white">
            {unreadMessages.length}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1.5 truncate">
            <span className={cn("text-sm truncate font-bold", isUnread ? "text-foreground" : "text-muted-foreground")}>
              {otherUser.username}
            </span>
            {otherUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && <BadgeCheck className="h-3 w-3 text-blue-400" />}
          </div>
          {chat.lastMessageAt && hasMounted && (
            <span className={cn("text-[10px]", isUnread ? "text-primary font-black" : "text-muted-foreground")}>
              {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
            <p className={cn("text-xs truncate max-w-[200px]", isUnread ? "text-foreground font-black" : "text-muted-foreground")}>
                {chat.lastMessage || 'Sent a reel'}
            </p>
            {isUnread && <div className="h-2.5 w-2.5 bg-primary rounded-full" />}
        </div>
      </div>
    </Link>
  );
}

export default function InboxPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const chatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
  }, [firestore, user]);

  const { data: chats, isLoading } = useCollection<Chat>(chatsQuery);

  if (!hasMounted || isUserLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen flex-col text-foreground bg-background max-w-lg mx-auto border-x border-border pb-16">
      <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Link href="/" className="p-2 -ml-2"><ArrowLeft className="text-foreground" /></Link>
        <h1 className="text-xl font-black ml-4 uppercase italic tracking-tighter">Direct</h1>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="p-4 space-y-4">
             {[1,2,3,4,5].map(i => (
               <div key={i} className="flex gap-4 animate-pulse">
                  <div className="h-14 w-14 rounded-2xl bg-secondary" />
                  <div className="flex-1 space-y-3 py-2"><div className="h-4 w-24 bg-secondary rounded" /><div className="h-3 w-48 bg-secondary rounded" /></div>
               </div>
             ))}
          </div>
        ) : chats && chats.length > 0 ? (
          <div className="divide-y divide-border/50">
            {chats.map(chat => (
              <ChatItem key={chat.id} chat={chat} currentUserId={user?.uid || ''} hasMounted={hasMounted} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center p-10">
            <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mb-6 shadow-xl border border-border">
                <Send className="h-12 w-12 text-primary -rotate-12" />
            </div>
            <h2 className="text-2xl font-black italic uppercase text-foreground mb-2">Message Friends</h2>
            <p className="text-muted-foreground text-sm font-medium">Send photos and videos to a friend.</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}