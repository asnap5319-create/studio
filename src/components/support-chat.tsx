'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAiSupport } from '@/ai/flows/support-flow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles, Info, RefreshCw, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'ai' | 'error';
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
    { role: 'ai', text: `नमस्ते ${userProfile?.name || 'दोस्त'}! A.snap Help Center में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूँ? आप अपनी प्रोफाइल या अर्निंग के बारे में कुछ भी पूछ सकते हैं।` }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        const scrollContainer = scrollRef.current.closest('.os-viewport') || scrollRef.current;
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user || isLoading) return;

    const userQuery = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setIsLoading(true);

    let aiResponseText = "";

    try {
      // 1. Call AI Support Flow
      const aiResult = await getAiSupport({
        query: userQuery,
        userName: userProfile?.name || 'User',
        stats: stats
      });

      aiResponseText = aiResult.response + "\n\n" + (aiResult.suggestions?.map(s => `• ${s}`).join('\n') || "");
      setMessages(prev => [...prev, { role: 'ai', text: aiResponseText }]);

    } catch (error: any) {
      console.error("AI Support Error:", error);
      aiResponseText = "ओह! गूगल के सर्वर अभी बहुत बिजी हैं (503 Error)। लेकिन घबराइए मत, आपकी रिक्वेस्ट एडमिन के पास पहुँच गई है। आप चाहें तो 1-2 मिनट बाद दोबारा 'Retry' कर सकते हैं।";
      
      setMessages(prev => [...prev, { 
        role: 'error', 
        text: aiResponseText
      }]);
      
      toast({ variant: 'destructive', title: "Server Busy", description: "Google AI is overloaded. Admin notified." });
    } finally {
      // 2. ALWAYS log to Admin support collection, even if AI failed
      if (firestore) {
        try {
          await addDoc(collection(firestore, 'support_tickets'), {
            userId: user.uid,
            userName: userProfile?.username || user.displayName || 'user',
            userEmail: user.email || '',
            query: userQuery,
            aiResponse: aiResponseText || "AI Failed to respond (Server Busy)",
            status: 'pending',
            createdAt: serverTimestamp(),
            statsAtTime: {
              followers: stats.followers,
              posts: stats.posts,
              views: stats.views,
              earnings: stats.earnings
            }
          });
        } catch (dbError) {
          console.error("Failed to log support ticket:", dbError);
        }
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-white/5 bg-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-xl text-primary">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic">AI Assistant</h3>
            <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest">Online & Admin Notified</p>
          </div>
        </div>
        <div className="flex gap-2">
            <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-1">
                <Info size={10} className="text-muted-foreground" />
                <span className="text-[8px] font-bold text-muted-foreground uppercase">24/7 Support</span>
            </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={cn(
              "max-w-[85%] p-4 rounded-[20px] text-sm leading-relaxed shadow-sm animate-in fade-in slide-in-from-bottom-2",
              m.role === 'user' 
                ? "ml-auto bg-primary text-white rounded-tr-none" 
                : m.role === 'error'
                ? "mr-auto bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-none"
                : "mr-auto bg-secondary/50 text-white rounded-tl-none border border-white/5"
            )}>
              {m.text.split('\n').map((line, li) => (
                <p key={li} className={line.startsWith('•') ? "ml-2" : ""}>{line}</p>
              ))}
              {m.role === 'error' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                        setInputText(messages[messages.length - 2].text);
                        handleSendMessage();
                    }} 
                    className="mt-2 h-7 text-[10px] uppercase font-bold text-destructive hover:bg-destructive/10"
                  >
                    <RefreshCw size={10} className="mr-1" /> Retry AI response
                  </Button>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="mr-auto bg-secondary/30 p-4 rounded-[20px] rounded-tl-none flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">AI is checking your stats & notifying Admin...</span>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-background/80 backdrop-blur-md">
        <div className="flex gap-2">
          <Input 
            placeholder="Ask anything..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="flex-1 h-12 bg-secondary/50 border-none rounded-2xl px-6 focus-visible:ring-primary"
          />
          <Button 
            type="submit" 
            disabled={!inputText.trim() || isLoading}
            className="h-12 w-12 rounded-2xl bg-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-90 transition-all"
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
}
