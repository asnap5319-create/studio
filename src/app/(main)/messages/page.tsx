
'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, collectionGroup } from 'firebase/firestore';
import type { Chat } from '@/models/chat';
import type { UserProfile } from '@/models/user';
import type { Message } from '@/models/message';
import { useDoc } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Database, RefreshCw, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ChatItem({ chat, currentUserId }: { chat: Chat; currentUserId: string }) {
  const { firestore } = useFirebase();
  const otherUserId = chat.participants.find(id => id !== currentUserId);

  const otherUserRef = useMemoFirebase(() => {
    if (!firestore || !otherUserId) return null;
    return doc(firestore, 'users', otherUserId);
  }, [firestore, otherUserId]);

  const { data: otherUser } = useDoc<UserProfile>(otherUserRef);

  // Check unread for this specific chat
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
        "flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors",
        isUnread && "bg-primary/5"
      )}
    >
      <div className="relative">
        <Avatar className="h-14 w-14 border border-border">
          <AvatarImage src={otherUser.profileImageUrl} />
          <AvatarFallback>{otherUser.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {isUnread && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full border-2 border-background animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className={cn("text-sm truncate", isUnread ? "font-black text-white" : "font-bold text-muted-foreground")}>
            {otherUser.username}
          </span>
          {chat.lastMessageAt && (
            <span className={cn("text-[10px]", isUnread ? "text-primary font-bold" : "text-muted-foreground")}>
              {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: false })}
            </span>
          )}
        </div>
        <p className={cn("text-xs truncate", isUnread ? "text-white font-bold" : "text-muted-foreground")}>
          {chat.lastMessage || 'Start a conversation'}
        </p>
      </div>
    </Link>
  );
}

export default function InboxPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const chatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
  }, [firestore, user]);

  const { data: chats, isLoading, error } = useCollection<Chat>(chatsQuery);

  const handleRefresh = () => {
    window.location.reload();
  };

  // Extract link from Firebase error message if available
  const indexLink = error?.message?.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];

  return (
    <div className="flex h-full flex-col text-white bg-background max-w-lg mx-auto border-x border-border">
      <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Link href="/feed" className="p-2 -ml-2">
          <ArrowLeft />
        </Link>
        <h1 className="text-xl font-bold ml-4">Messages</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {error && (error.message.includes('index') || error.message.includes('INDEX')) && (
            <div className="m-4 p-6 bg-primary/10 rounded-xl border border-primary/20 text-center">
                <Database className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">चैट लोड नहीं हो रही?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    इनबॉक्स देखने के लिए Google को एक इंडेक्स चाहिए। नीचे दिए गए बटन पर क्लिक करें और 'Create Index' दबाएं।
                </p>
                <div className="flex flex-col gap-3">
                    {indexLink && (
                        <Button asChild className="w-full gap-2 font-bold" variant="default">
                            <a href={indexLink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                1. यहाँ क्लिक करें (Create Index)
                            </a>
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleRefresh} className="w-full gap-2">
                        <RefreshCw className="h-4 w-4" />
                        2. इंडेक्स बनाने के बाद रिफ्रेश करें
                    </Button>
                </div>
                <div className="mt-4 text-[10px] opacity-30 break-all font-mono text-left bg-black p-2 rounded max-h-32 overflow-y-auto">
                    {error.message}
                </div>
            </div>
        )}

        {isLoading ? (
          <div className="p-4 space-y-4">
             {[1,2,3,4].map(i => (
               <div key={i} className="flex gap-4 animate-pulse">
                  <div className="h-14 w-14 rounded-full bg-secondary" />
                  <div className="flex-1 space-y-2 py-2">
                    <div className="h-4 w-24 bg-secondary rounded" />
                    <div className="h-3 w-48 bg-secondary rounded" />
                  </div>
               </div>
             ))}
          </div>
        ) : chats && chats.length > 0 ? (
          <div className="divide-y divide-border">
            {chats.map(chat => (
              <ChatItem key={chat.id} chat={chat} currentUserId={user?.uid || ''} />
            ))}
          </div>
        ) : !error && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-50 px-10">
            <MessageSquare className="h-20 w-20 mb-4" />
            <h2 className="text-xl font-bold">No Messages Yet</h2>
            <p className="text-sm">Start chatting by visiting someone's profile!</p>
          </div>
        )}
      </div>
    </div>
  );
}
