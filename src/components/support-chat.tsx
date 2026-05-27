'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Info, Clock, User, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'system' | 'status';
  text: string;
}

interface SupportChatProps {
  userProfile: any;
  stats: {
    followers: number;
    posts: number;
    views: number;
    earnings: number;
  };
}

export function SupportChat({ userProfile, stats }: SupportChatProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', text: `नमस्ते ${userProfile?.name || 'दोस्त'}! A.snap Help Center में आपका स्वागत है। आपको क्या दिक्कत आ रही है? यहाँ लिखें, हम आपकी मदद करेंगे।` }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        const scrollContainer = scrollRef.current.closest('.os-viewport') || scrollRef.current;
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user || isLoading || isSent) return;

    const userQuery = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setIsLoading(true);

    try {
      // Log to Admin support collection
      if (firestore) {
        await addDoc(collection(firestore, 'support_tickets'), {
          userId: user.uid,
          userName: userProfile?.username || user.displayName || 'user',
          userEmail: user.email || '',
          query: userQuery,
          aiResponse: "Waiting for Admin response...",
          status: 'pending',
          createdAt: serverTimestamp(),
          statsAtTime: {
            followers: stats.followers,
            posts: stats.posts,
            views: stats.views,
            earnings: stats.earnings
          }
        });

        // Custom Waiting Message as requested
        setTimeout(() => {
            setMessages(prev => [...prev, { 
                role: 'status', 
                text: "Wait karo Aap message A.snap ke paas ja rha hai bhai 5 se 6 khnte lag sakte hai. Admin aapki help jald hi karenge. ✅" 
            }]);
            setIsSent(true);
            setIsLoading(false);
        }, 1000);
      }
    } catch (dbError) {
      console.error("Failed to log support ticket:", dbError);
      toast({ variant: 'destructive', title: "Error", description: "Message bhejne me dikkat hui. Phir koshish karein." });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-white/5 bg-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-xl text-primary">
            <User size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic">Admin Support</h3>
            <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest">Active & Secure</p>
          </div>
        </div>
        <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-1">
            <Clock size={10} className="text-muted-foreground" />
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Response in 5-6h</span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={cn(
              "max-w-[85%] p-4 rounded-[20px] text-sm leading-relaxed shadow-sm animate-in fade-in slide-in-from-bottom-2",
              m.role === 'user' 
                ? "ml-auto bg-primary text-white rounded-tr-none" 
                : m.role === 'status'
                ? "mr-auto bg-green-500/10 text-green-400 border border-green-500/20 rounded-tl-none font-bold"
                : "mr-auto bg-secondary/50 text-white rounded-tl-none border border-white/5"
            )}>
              {m.text}
            </div>
          ))}
          {isLoading && (
            <div className="mr-auto bg-secondary/30 p-4 rounded-[20px] rounded-tl-none flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Sending message to A.snap...</span>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-background/80 backdrop-blur-md">
        <div className="flex gap-2">
          <Input 
            placeholder={isSent ? "Message Sent! ✅" : "Apni problem yahan likhein..."} 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading || isSent}
            className="flex-1 h-12 bg-secondary/50 border-none rounded-2xl px-6 focus-visible:ring-primary"
          />
          <Button 
            type="submit" 
            disabled={!inputText.trim() || isLoading || isSent}
            className="h-12 w-12 rounded-2xl bg-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-90 transition-all"
          >
            {isSent ? <CheckCircle2 size={18} /> : <Send size={18} />}
          </Button>
        </div>
        {isSent && (
            <p className="text-[8px] text-center text-muted-foreground uppercase font-black tracking-widest mt-2">
                Aapka ticket admin panel me save ho gaya hai.
            </p>
        )}
      </form>
    </div>
  );
}
