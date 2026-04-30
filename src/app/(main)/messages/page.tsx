
'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import type { Chat } from '@/models/chat';
import type { UserProfile } from '@/models/user';
import { useDoc } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Database, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

function ChatItem({ chat, currentUserId }: { chat: Chat; currentUserId: string }) {
  const { firestore } = useFirebase();
  const otherUserId = chat.participants.find(id => id !== currentUserId);

  const otherUserRef = useMemoFirebase(() => {
    if (!firestore || !otherUserId) return null;
    return doc(firestore, 'users', otherUserId);
  }, [firestore, otherUserId]);

  const { data: otherUser } = useDoc<UserProfile>(otherUserRef);

  if (!otherUser) return null;

  return (
    <Link 
      href={`/messages/${chat.id}`}
      className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
    >
      <Avatar className="h-14 w-14 border border-border">
        <AvatarImage src={otherUser.profileImageUrl} />
        <AvatarFallback>{otherUser.username?.[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-sm truncate">{otherUser.username}</span>
          {chat.lastMessageAt && (
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: false })}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
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
                    इनबॉक्स देखने के लिए Google को एक इंडेक्स चाहिए। नीचे दिए गए लिंक पर क्लिक करें और 'Create Index' दबाएं।
                </p>
                <Button variant="default" onClick={handleRefresh} className="w-full gap-2">
                    <RefreshCw className="h-4 w-4" />
                    बनाने के बाद रिफ्रेश करें
                </Button>
                <div className="mt-4 text-[10px] opacity-30 break-all font-mono text-left bg-black p-2 rounded">
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
