'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, addDoc, setDoc, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Message } from '@/models/message';
import type { Chat } from '@/models/chat';
import type { UserProfile } from '@/models/user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, BadgeCheck, Loader2, Play, MoreVertical, Trash2, Reply, Smile, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ADMIN_EMAIL = "asnap5319@gmail.com";
const REACTIONS = ["❤️", "😂", "😮", "😡", "👍"];

export default function ChatPage() {
  const { chatId } = useParams();
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isUserParticipant = useMemo(() => {
    if (!user || !chatId) return false;
    const idStr = chatId as string;
    return idStr.split('_').includes(user.uid);
  }, [user, chatId]);

  const otherUserId = useMemo(() => {
    if (!chatId || !user) return null;
    const parts = (chatId as string).split('_');
    return parts.find(id => id !== user.uid) || null;
  }, [chatId, user]);
  
  const { data: otherUser } = useDoc<UserProfile>(useMemoFirebase(() => 
    (firestore && otherUserId) ? doc(firestore, 'users', otherUserId) : null, [firestore, otherUserId]));

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !chatId || !isUserParticipant) return null;
    return query(collection(firestore, 'chats', chatId as string, 'messages'), orderBy('createdAt', 'asc'));
  }, [firestore, chatId, isUserParticipant]);

  const { data: messages } = useCollection<Message>(messagesQuery);

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

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !firestore || !inputText.trim() || !otherUserId || !isUserParticipant) return;
    const text = inputText.trim();
    setInputText('');
    const currentReply = replyingTo;
    setReplyingTo(null);
    
    const participants = [user.uid, otherUserId].sort();
    
    try {
      const chatRef = doc(firestore, 'chats', chatId as string);
      await setDoc(chatRef, {
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
        replyToId: currentReply?.id || null,
        replyToText: currentReply?.text || null,
        replyToSenderName: currentReply?.senderId === user.uid ? 'You' : otherUser?.username || 'User',
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleUnsend = async (msg: Message) => {
    if (!firestore || !chatId || msg.senderId !== user?.uid) return;
    try {
      await deleteDoc(doc(firestore, 'chats', chatId as string, 'messages', msg.id));
      setMessageToDelete(null);
    } catch (err) {
      console.error("Error unsending message:", err);
    }
  };

  const handleReaction = async (msg: Message, emoji: string) => {
    if (!firestore || !chatId || !user) return;
    const reactions = { ...(msg.reactions || {}) };
    if (reactions[user.uid] === emoji) {
      delete reactions[user.uid];
    } else {
      reactions[user.uid] = emoji;
    }
    try {
      await updateDoc(doc(firestore, 'chats', chatId as string, 'messages', msg.id), { reactions });
    } catch (err) {
      console.error("Error reacting:", err);
    }
  };

  if (isUserLoading || !hasMounted) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user || !isUserParticipant) return null;

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
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active Now</span>
            </div>
          </Link>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages?.map((msg) => (
          <div 
            key={msg.id} 
            className={cn("flex flex-col max-w-[85%] relative group", msg.senderId === user.uid ? "ml-auto items-end" : "mr-auto items-start")}
            onContextMenu={(e) => {
              if (msg.senderId === user.uid) {
                e.preventDefault();
                setMessageToDelete(msg);
              }
            }}
          >
            {/* Reply Info */}
            {msg.replyToText && (
              <div className={cn(
                "px-3 py-1 text-[10px] bg-secondary/30 text-muted-foreground rounded-t-xl border-l-2 border-primary mb-[-4px] max-w-full truncate",
                msg.senderId === user.uid ? "mr-2" : "ml-2"
              )}>
                <span className="font-bold">{msg.replyToSenderName}:</span> {msg.replyToText}
              </div>
            )}

            {/* Bubble */}
            <div className={cn(
              "rounded-[20px] overflow-hidden shadow-lg transition-all active:scale-95", 
              msg.senderId === user.uid ? "bg-primary text-white rounded-tr-none" : "bg-secondary text-white rounded-tl-none"
            )}>
              {msg.sharedPostMediaUrl && (
                <div 
                  className="aspect-[9/16] w-48 relative bg-black cursor-pointer group/reel"
                  onClick={() => router.push(`/?postId=${msg.sharedPostId}`)}
                >
                  <video src={msg.sharedPostMediaUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/reel:opacity-100 transition-opacity">
                    <Play className="text-white h-10 w-10" />
                  </div>
                </div>
              )}
              {msg.text && <div className="px-4 py-2 text-sm whitespace-pre-wrap">{msg.text}</div>}
            </div>

            {/* Reactions */}
            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
              <div className="flex -mt-2 mb-1 gap-1">
                {Object.entries(msg.reactions).map(([uid, emoji]) => (
                  <div key={uid} className="bg-secondary/80 backdrop-blur-md rounded-full px-1.5 py-0.5 text-[10px] border border-white/10 shadow-sm">
                    {emoji}
                  </div>
                ))}
              </div>
            )}

            {/* Actions (Reply/React) - Visible on Hover */}
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all flex gap-1",
              msg.senderId === user.uid ? "right-full mr-2 flex-row-reverse" : "left-full ml-2"
            )}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-secondary/50" onClick={() => setReplyingTo(msg)}><Reply size={14} /></Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-secondary/50"><Smile size={14} /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1 bg-secondary border-white/10 rounded-full flex gap-1">
                  {REACTIONS.map(emoji => (
                    <button key={emoji} onClick={() => handleReaction(msg, emoji)} className="hover:scale-125 transition-transform p-1 text-lg">{emoji}</button>
                  ))}
                </PopoverContent>
              </Popover>
              {msg.senderId === user.uid && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-secondary/50 text-destructive" onClick={() => setMessageToDelete(msg)}><Trash2 size={14} /></Button>
              )}
            </div>

            <span className="text-[8px] text-muted-foreground mt-1 px-1">
              {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : ''}
              {msg.senderId === user.uid && msg.read && <span className="ml-1 opacity-50">• Seen</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="bg-secondary/50 p-3 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="w-1 bg-primary h-8 rounded-full" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-primary">Replying to {replyingTo.senderId === user.uid ? 'yourself' : otherUser?.username}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[250px]">{replyingTo.text || 'Reel'}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)} className="rounded-full"><X size={16} /></Button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-2 items-center bg-background">
        <Input 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)} 
          placeholder="Message..." 
          className="flex-1 bg-secondary border-none rounded-full h-12 px-6 focus-visible:ring-primary" 
        />
        <Button 
          type="submit" 
          disabled={!inputText.trim()}
          className="bg-primary text-white h-12 w-12 rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-90 transition-all"
        >
          <Send size={18} />
        </Button>
      </form>

      {/* Delete Dialog */}
      <Dialog open={!!messageToDelete} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <DialogContent className="max-w-xs bg-secondary rounded-[30px] border-white/10">
          <DialogHeader><DialogTitle className="text-center font-black uppercase italic text-sm">Unsend message?</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button variant="destructive" className="rounded-2xl h-12 font-bold" onClick={() => messageToDelete && handleUnsend(messageToDelete)}>Unsend</Button>
            <Button variant="ghost" className="rounded-2xl h-12" onClick={() => setMessageToDelete(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
