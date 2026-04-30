'use client';

import { useState } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, orderBy, where, limit } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search as SearchIcon, Play, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { UserProfile } from '@/models/user';
import type { Post } from '@/models/post';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PostCard } from "@/components/post-card";

export default function SearchPage() {
  const { firestore } = useFirebase();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Query for all posts (Explore Grid)
  const explorePostsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(30));
  }, [firestore]);

  const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(explorePostsQuery);

  // Query for users based on search
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || searchQuery.length < 2) return null;
    // Basic search: starts with query
    return query(
      collection(firestore, 'users'),
      where('username', '>=', searchQuery.toLowerCase()),
      where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
      limit(10)
    );
  }, [firestore, searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useCollection<UserProfile>(usersQuery);

  return (
    <div className="flex h-full flex-col bg-background text-white overflow-hidden">
      {/* Search Header */}
      <div className="p-4 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-10 h-10 bg-secondary border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <h2 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">Search Results</h2>
            {isSearching ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-12 w-12 rounded-full bg-secondary" />
                    <div className="h-4 w-32 bg-secondary rounded" />
                  </div>
                ))}
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((user) => (
                  <Link 
                    key={user.id} 
                    href={`/profile/${user.id}`}
                    className="flex items-center gap-3 p-2 hover:bg-secondary rounded-xl transition-colors"
                  >
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={user.profileImageUrl} />
                      <AvatarFallback>{user.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{user.username}</span>
                      <span className="text-xs text-muted-foreground">{user.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center py-10 text-muted-foreground">No users found for &quot;{searchQuery}&quot;</p>
            )}
            <div className="h-px bg-border my-6" />
          </div>
        )}

        {/* Explore Grid (Hidden when searching unless results are empty) */}
        <div className="px-0.5">
          {!searchQuery && <h2 className="px-4 text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">Explore</h2>}
          
          {isPostsLoading ? (
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-[9/16] bg-secondary animate-pulse" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-0.5">
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  className="aspect-[9/16] relative bg-secondary cursor-pointer group"
                  onClick={() => setSelectedPost(post)}
                >
                   {post.mediaUrl.includes('video') || post.mediaUrl.includes('.mp4') ? (
                    <video
                        src={post.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        onMouseOver={(e) => e.currentTarget.play()}
                        onMouseOut={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                    />
                  ) : (
                    <Image 
                      src={post.mediaUrl}
                      alt={post.caption || 'Explore post'}
                      fill
                      className="object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2 text-white">
                    <Play className="h-4 w-4 fill-white opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center p-20 text-center opacity-50">
                <SearchIcon className="h-16 w-16 mb-4" />
                <p>No videos to explore yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Post Viewer Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
        <DialogContent className="p-0 border-0 bg-black/90 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center">
            {selectedPost && (
                <>
                   <DialogTitle className="sr-only">Video by user</DialogTitle>
                    <div className="relative w-full h-full">
                        <PostCard post={selectedPost} />
                    </div>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
