'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Message } from '@/models/message';
import type { Chat } from '@/models/chat';
import type { UserProfile } from '@/models/user';
import type { Post } from '@/models/post';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Play, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PostCard } from "@/components/post-card";
import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const { chatId } = useParams();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // States for shared post viewing
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(false);

  // States for long-press delete
  const [msgToDelete, setMsgToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

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
      isDeleted: false,
    });

    updateDocumentNonBlocking(chatDocRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      participants: chat?.participants || [user.uid, (chatId as string).replace(user.uid, '').replace('_', '')],
    });
  };

  const handleViewSharedPost = async (postId: string, ownerId: string) => {
    if (!firestore) return;
    setIsLoadingPost(true);
    try {
      const postRef = doc(firestore, 'users', ownerId, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        setSelectedPost({ ...postSnap.data(), id: postSnap.id } as Post);
      } else {
        toast({ variant: "destructive", title: "Video Unavailable", description: "This video may have been deleted." });
      }
    } catch (error) {
      console.error("Error fetching post:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load video." });
    } finally {
      setIsLoadingPost(false);
    }
  };

  const handleLongPress = (messageId: string, senderId: string, isDeleted?: boolean) => {
    if (senderId !== user?.uid || isDeleted) return;

    if (pressTimer.current) clearTimeout(pressTimer.current);

    pressTimer.current = setTimeout(() => {
      setMsgToDelete(messageId);
      setIsDeleteDialogOpen(true);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 1000); 
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const confirmUnsendMessage = async () => {
    if (!firestore || !chatId || !msgToDelete) return;
    const messageDocRef = doc(firestore, 'chats', chatId as string, 'messages', msgToDelete);
    try {
      updateDocumentNonBlocking(messageDocRef, {
        text: "This message was deleted",
        isDeleted: true,
        sharedPostId: null,
        sharedPostMediaUrl: null,
        sharedPostOwnerId: null,
      });
      toast({ title: "Message Unsent" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not unsend message." });
    } finally {
      setIsDeleteDialogOpen(false);
      setMsgToDelete(null);
    }
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
        {messages?.map((msg) => {
          const isMine = msg.senderId === user.uid;
          const isSharedPost = !!msg.sharedPostId;
          const isDeleted = msg.isDeleted;

          return (
            <div 
              key={msg.id} 
              className={cn(
                "flex flex-col max-w-[80%] group relative",
                isMine ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              {isDeleted ? (
                <div className={cn(
                  "px-4 py-2 rounded-2xl text-xs italic opacity-50 border border-white/10",
                  isMine ? "bg-black/20" : "bg-black/20"
                )}>
                  {msg.text}
                </div>
              ) : isSharedPost ? (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (msg.sharedPostId && msg.sharedPostOwnerId) {
                        handleViewSharedPost(msg.sharedPostId, msg.sharedPostOwnerId);
                    }
                  }}
                  onPointerDown={() => handleLongPress(msg.id, msg.senderId)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  className={cn(
                    "rounded-2xl overflow-hidden border border-border shadow-lg transition-transform active:scale-95 group/post cursor-pointer",
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
                     <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/post:opacity-100 transition-opacity">
                        <Play className="h-10 w-10 text-white fill-white/20" />
                     </div>
                  </div>
                  <div className="p-2 text-[10px] font-bold text-center bg-black/40 text-muted-foreground uppercase tracking-widest">
                    {isLoadingPost && selectedPost?.id === msg.sharedPostId ? <Loader2 className="animate-spin h-3 w-3 mx-auto" /> : 'View Post'}
                  </div>
                </div>
              ) : (
                <div 
                  onPointerDown={() => handleLongPress(msg.id, msg.senderId)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  className={cn(
                    "px-4 py-2 rounded-2xl text-sm break-words transition-opacity active:opacity-70",
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

      {/* Video Viewer Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
        <DialogContent className="p-0 border-0 bg-black/90 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center overflow-hidden">
            {selectedPost && (
                <div className="relative w-full h-full">
                   <DialogTitle className="sr-only">Video Player</DialogTitle>
                    <PostCard 
                      key={selectedPost.id} 
                      post={selectedPost} 
                      isFocused={true} 
                    />
                </div>
            )}
        </DialogContent>
      </Dialog>

      {/* Unsend Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[300px] rounded-2xl border-border bg-background text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Unsend Message?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs">
              This will remove the message for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction 
              onClick={confirmUnsendMessage}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl h-11"
            >
              Unsend
            </AlertDialogAction>
            <AlertDialogCancel className="bg-secondary border-none hover:bg-secondary/80 text-white rounded-xl h-11 m-0">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
