'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, limit, doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Plus, Loader2 } from 'lucide-react';
import type { UserProfile } from '@/models/user';
import { cn } from '@/lib/utils';

export function StoryBar() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  // Current user profile for the "Your Story" item
  const currentUserRef = useMemoFirebase(() => 
    (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: currentUserProfile } = useDoc<UserProfile>(currentUserRef);

  // Suggested users for story items (placeholder for real stories logic)
  const suggestionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), limit(10));
  }, [firestore]);

  const { data: users, isLoading } = useCollection<UserProfile>(suggestionsQuery);

  if (!user) return null;

  return (
    <div className="w-full bg-background border-b border-border/50 py-4">
      <div className="flex items-center gap-4 px-4 overflow-x-auto scrollbar-hide">
        {/* Your Story Add Button */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="relative">
            <div className="w-16 h-16 rounded-full p-[2px] bg-secondary border border-border">
              <Avatar className="w-full h-full border-2 border-background">
                <AvatarImage src={currentUserProfile?.profileImageUrl} className="object-cover" />
                <AvatarFallback className="bg-secondary text-xs">{currentUserProfile?.username?.[0]}</AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" strokeWidth={4} />
            </div>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Your story</span>
        </div>

        {/* Other Users Stories (Mock) */}
        {isLoading ? (
            <div className="flex gap-4">
                {[1,2,3].map(i => <div key={i} className="w-16 h-16 rounded-full bg-secondary animate-pulse" />)}
            </div>
        ) : (
            users?.filter(u => u.id !== user.uid).map((u) => (
                <div key={u.id} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-transform">
                  <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                    <div className="w-full h-full rounded-full p-[2px] bg-background">
                        <Avatar className="w-full h-full">
                            <AvatarImage src={u.profileImageUrl} className="object-cover" />
                            <AvatarFallback className="bg-secondary text-xs">{u.username?.[0]}</AvatarFallback>
                        </Avatar>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium truncate w-16 text-center">{u.username}</span>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
