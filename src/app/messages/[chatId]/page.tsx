'use client';

import { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, addDoc, setDoc, writeBatch, deleteDoc, updateDoc, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Message } from '@/models/message';
import type { Chat } from '@/models/chat';
import type { UserProfile } from '@/models/user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, BadgeCheck, Loader2, Play, Trash2, Reply, X, User, Smile, MoreVertical, Ban, Eraser, Unlock, Image as ImageIcon, Camera } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const ADMIN_EMAIL = "asnap5319@gmail.com";
const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export default function ChatPage() {
  const { chatId } = useParams();
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messageActionMenu, setMessageActionMenu] = useState<Message | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { data: chatData } = useDoc<Chat>(useMemoFirebase(() => 
    (firestore && chatId) ? doc(firestore, 'chats', chatId as string) : null, [firestore, chatId]));

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !chatId || !isUserParticipant) return null;
    return query(collection(firestore, 'chats', chatId as string, 'messages'), orderBy('createdAt', 'asc'));
  }, [firestore, chatId, isUserParticipant]);

  const { data: messages } = useCollection<Message>(messagesQuery);

  const isBlocked = useMemo(() => {
    if (!chatData?.blockedParticipants || !otherUserId) return false;
    return chatData.blockedParticipants.includes(otherUserId);
  }, [chatData, otherUserId]);

  const amIBlocked = useMemo(() => {
    if (!chatData?.blockedParticipants || !user) return false;
    return chatData.blockedParticipants.includes(user.uid);
  }, [chatData, user]);

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
    if (!user || !firestore || !inputText.trim() || !otherUserId || !isUserParticipant || isBlocked || amIBlocked) return;
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

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !firestore || !otherUserId || isBlocked || amIBlocked) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image.' });
        return;
    }

    setIsUploading(true);
    const cloudName = "dipz5jsls";
    const uploadPreset = "video_upload";

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Upload failed');

        const mediaUrl = data.secure_url;
        const participants = [user.uid, otherUserId].sort();
        const chatRef = doc(firestore, 'chats', chatId as string);
        
        await setDoc(chatRef, {
            id: chatId,
            participants,
            lastMessage: 'Shared a photo 📷',
            lastMessageAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        await addDoc(collection(firestore, 'chats', chatId as string, 'messages'), {
            senderId: user.uid,
            recipientId: otherUserId,
            text: '',
            mediaUrl,
            mediaType: 'image',
            createdAt: serverTimestamp(),
            read: false,
        });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Photo bhejte waqt dikkat hui.' });
    } finally {
        setIsUploading(false);
    }
  };

  const handleUnsend = async (msg: Message) => {
    if (!firestore || !chatId || msg.senderId !== user?.uid) return;
    try {
      await deleteDoc(doc(firestore, 'chats', chatId as string, 'messages', msg.id));
      setMessageActionMenu(null);
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
      setMessageActionMenu(null);
    } catch (err) {
      console.error("Error reacting:", err);
    }
  };

  const handleClearChat = async () => {
    if (!firestore || !chatId || !confirm("क्या आप वाकई पूरी चैट डिलीट करना चाहते हैं?")) return;
    try {
      const messagesRef = collection(firestore, 'chats', chatId as string, 'messages');
      const snapshot = await getDocs(messagesRef);
      const batch = writeBatch(firestore);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      toast({ title: "Chat Cleared! 🧹" });
    } catch (err) {
      console.error("Error clearing chat:", err);
      toast({ variant: 'destructive', title: "Failed to clear chat" });
    }
  };

  const handleToggleBlock = async () => {
    if (!firestore || !chatId || !otherUserId) return;
    const chatRef = doc(firestore, 'chats', chatId as string);
    try {
      if (isBlocked) {
        await updateDoc(chatRef, {
          blockedParticipants: arrayRemove(otherUserId)
        });
        toast({ title: "User Unblocked! ✅" });
      } else {
        if (!confirm(`क्या आप ${otherUser?.username || 'इस यूजर'} को ब्लॉक करना चाहते हैं?`)) return;
        await updateDoc(chatRef, {
          blockedParticipants: arrayUnion(otherUserId)
        });
        toast({ title: "User Blocked! 🚫" });
      }
    } catch (err) {
      console.error("Error toggling block:", err);
    }
  };

  if (isUserLoading || !hasMounted) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user || !isUserParticipant) return null;

  const isOtherAdmin = otherUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <div className="flex h-screen flex-col text-foreground bg-background max-w-lg mx-auto border-x border-border">
      <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
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
                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                  {amIBlocked ? 'Unavailable' : 'Active Now'}
                </span>
              </div>
            </Link>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreVertical size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border rounded-2xl p-2 min-w-[180px] shadow-2xl z-[50]">
            <DropdownMenuItem onClick={handleClearChat} className="p-3 rounded-xl focus:bg-accent cursor-pointer font-bold text-sm gap-3">
              <Eraser size={18} className="text-muted-foreground" /> Clear Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleBlock} className={cn(
              "p-3 rounded-xl focus:bg-accent cursor-pointer font-bold text-sm gap-3",
              isBlocked ? "text-green-500" : "text-destructive"
            )}>
              {isBlocked ? <Unlock size={18} /> : <Ban size={18} />}
              {isBlocked ? 'Unblock User' : 'Block User'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages?.map((msg) => (
          <div 
            key={msg.id} 
            className={cn("flex flex-col max-w-[85%] relative group", msg.senderId === user.uid ? "ml-auto items-end" : "mr-auto items-start")}
            onContextMenu={(e) => {
                e.preventDefault();
                setMessageActionMenu(msg);
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
              "rounded-[20px] overflow-hidden shadow-sm transition-all active:scale-95 border border-border/10", 
              msg.senderId === user.uid ? "bg-primary text-white rounded-tr-none" : "bg-secondary text-foreground rounded-tl-none"
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
              {msg.mediaUrl && msg.mediaType === 'image' && (
                <div className="w-56 aspect-square relative bg-secondary">
                    <Image src={msg.mediaUrl} alt="Shared photo" fill className="object-cover" />
                </div>
              )}
              {msg.sharedProfileId && (
                  <div 
                    className="p-4 bg-black/5 w-48 cursor-pointer hover:bg-black/10 transition-colors"
                    onClick={() => router.push(`/profile/${msg.sharedProfileId}`)}
                  >
                      <div className="flex flex-col items-center gap-2 text-center">
                          <Avatar className="h-16 w-16 border-2 border-primary">
                              <AvatarImage src={msg.sharedProfileImage} className="object-cover" />
                              <AvatarFallback><User /></AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                              <p className={cn("font-black text-xs italic uppercase tracking-tighter", msg.senderId === user.uid ? "text-white" : "text-foreground")}>@{msg.sharedProfileName}</p>
                              <p className="text-[8px] uppercase font-bold opacity-60">View Profile</p>
                          </div>
                      </div>
                  </div>
              )}
              {msg.text && <div className="px-4 py-2 text-sm whitespace-pre-wrap">{msg.text}</div>}
            </div>

            {/* Reactions Display */}
            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
              <div className="flex -mt-2 mb-1 gap-1">
                {Object.entries(msg.reactions).map(([uid, emoji]) => (
                  <div key={uid} className="bg-secondary/80 backdrop-blur-md rounded-full px-1.5 py-0.5 text-[10px] border border-border shadow-sm">
                    {emoji}
                  </div>
                ))}
              </div>
            )}

            <span className="text-[8px] text-muted-foreground mt-1 px-1">
              {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : ''}
              {msg.senderId === user.uid && msg.read && <span className="ml-1 opacity-50">• Seen</span>}
            </span>
          </div>
        ))}
        {isUploading && (
            <div className="flex flex-col items-end max-w-[85%] ml-auto animate-pulse">
                <div className="w-56 aspect-square bg-secondary rounded-2xl flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" />
                </div>
                <span className="text-[8px] text-muted-foreground mt-1 px-1 uppercase font-bold">Sending...</span>
            </div>
        )}
      </div>

      {/* Block Status Banner */}
      {(isBlocked || amIBlocked) && (
        <div className="p-4 bg-secondary/20 text-center border-t border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {isBlocked ? "You have blocked this user" : "You cannot message this user"}
          </p>
          {isBlocked && (
            <button onClick={handleToggleBlock} className="text-[10px] text-primary font-black uppercase mt-2 hover:underline">
              Unblock now
            </button>
          )}
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && !isBlocked && !amIBlocked && (
        <div className="bg-secondary/50 p-3 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="w-1 bg-primary h-8 rounded-full" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-primary">Replying to {replyingTo.senderId === user.uid ? 'yourself' : otherUser?.username}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[250px]">{replyingTo.text || 'Reel/Profile'}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)} className="rounded-full"><X size={16} /></Button>
        </div>
      )}

      {!isBlocked && !amIBlocked && (
        <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-2 items-center bg-background">
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*"
            disabled={isUploading}
          />
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full shrink-0 text-foreground hover:bg-secondary"
            disabled={isUploading}
          >
            <Camera size={24} />
          </Button>
          
          <Input 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            placeholder="Message..." 
            className="flex-1 bg-secondary border-none rounded-full h-12 px-6 focus-visible:ring-primary" 
          />
          
          <Button 
            type="submit" 
            disabled={!inputText.trim() || isUploading}
            className="bg-primary text-white h-12 w-12 rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-90 transition-all shrink-0"
          >
            <Send size={18} />
          </Button>
        </form>
      )}

      {/* Action Menu Dialog */}
      <Dialog open={!!messageActionMenu} onOpenChange={(open) => !open && setMessageActionMenu(null)}>
        <DialogContent className="max-w-[300px] bg-popover rounded-[30px] border-border p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Message Actions</DialogTitle></DialogHeader>
          
          {/* Reaction Bar */}
          <div className="p-4 bg-secondary/20 border-b border-border flex justify-between items-center gap-2">
            {REACTIONS.map(emoji => (
              <button 
                key={emoji} 
                onClick={() => messageActionMenu && handleReaction(messageActionMenu, emoji)}
                className="text-2xl hover:scale-125 active:scale-150 transition-transform duration-200"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Action List */}
          <div className="flex flex-col">
            <button 
                onClick={() => { setReplyingTo(messageActionMenu); setMessageActionMenu(null); }}
                className="flex items-center justify-between p-4 hover:bg-accent transition-colors border-b border-border"
            >
                <span className="font-bold text-sm">Reply</span>
                <Reply size={18} className="text-muted-foreground" />
            </button>

            {messageActionMenu?.senderId === user.uid && (
                <button 
                    onClick={() => messageActionMenu && handleUnsend(messageActionMenu)}
                    className="flex items-center justify-between p-4 hover:bg-destructive/10 transition-colors text-destructive"
                >
                    <span className="font-bold text-sm">Unsend</span>
                    <Trash2 size={18} />
                </button>
            )}

            <button 
                onClick={() => setMessageActionMenu(null)}
                className="p-4 text-center text-xs font-bold text-muted-foreground hover:bg-accent"
            >
                Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
