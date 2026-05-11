
'use client';

import { useState } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, orderBy, where, limit } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search as SearchIcon, Play, X, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { UserProfile } from '@/models/user';
import type { Post } from '@/models/post';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PostCard } from "@/components/post-card";

const ADMIN_EMAIL = "asnap5319@gmail.com";

export default function SearchPage() {
  const { firestore } = useFirebase();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const explorePostsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(30));
  }, [firestore]);

  const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(explorePostsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || searchQuery.length < 1) return null;
    const lowerQuery = searchQuery.toLowerCase().trim();
    return query(
      collection(firestore, 'users'),
      where('username_lowercase', '>=', lowerQuery),
      where('username_lowercase', '<=', lowerQuery + '\uf8ff'),
      limit(10)
    );
  }, [firestore, searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useCollection<UserProfile>(usersQuery);

  return (
    <div className="flex h-full flex-col bg-background text-white overflow-hidden">
      <div className="p-4 bg-background/80 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search username..."
            className="pl-10 h-10 bg-secondary border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {searchQuery.length >= 1 && (
          <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2">
            <h2 className="text-sm font-bold text-muted-foreground my-4 uppercase tracking-wider">Users</h2>
            <div className="space-y-4">
                {searchResults?.map((user) => (
                  <Link key={user.id} href={`/profile/${user.id}`} className="flex items-center gap-3 p-2 hover:bg-secondary rounded-xl transition-colors">
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={user.profileImageUrl} />
                      <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm">{user.username}</span>
                          {user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && <BadgeCheck className="h-3 w-3 text-blue-400 fill-blue-400/20" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{user.name}</span>
                    </div>
                  </Link>
                ))}
            </div>
            <div className="h-px bg-border my-6" />
          </div>
        )}

        <div className="px-0.5 pb-20">
          <div className="grid grid-cols-3 gap-0.5">
            {posts?.map((post) => (
              <div key={post.id} className="aspect-[9/16] relative bg-secondary cursor-pointer" onClick={() => setSelectedPost(post)}>
                 {post.mediaUrl.includes('video') || post.mediaUrl.includes('.mp4') ? (
                  <video src={post.mediaUrl} className="w-full h-full object-cover" muted loop playsInline />
                ) : (
                  <Image src={post.mediaUrl} alt="" fill className="object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
        <DialogContent className="p-0 border-0 bg-black/90 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center">
            {selectedPost && <PostCard post={selectedPost} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
