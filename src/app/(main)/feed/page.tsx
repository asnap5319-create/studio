'use client';
import { AsnapLogo } from "@/components/icons";
import { PostCard } from "@/components/post-card";
import { StoriesBar } from "@/components/stories-bar";
import { Post } from "@/lib/types";

const mockPosts: Post[] = [
    {
        id: 'p1',
        userId: '2',
        mediaUrl: 'https://picsum.photos/seed/101/600/600',
        mediaType: 'image',
        caption: 'Beautiful sunset!',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
        user: { id: '2', username: 'sarah', profilePictureUrl: 'https://picsum.photos/seed/2/100/100', followerIds:[], followingIds:[] },
        likesCount: 120,
    },
    {
        id: 'p2',
        userId: '3',
        mediaUrl: 'https://picsum.photos/seed/103/600/600',
        mediaType: 'image',
        caption: 'City lights.',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 43 * 60 * 60 * 1000).toISOString(),
        user: { id: '3', username: 'tom', profilePictureUrl: 'https://picsum.photos/seed/3/100/100', followerIds:[], followingIds:[] },
        likesCount: 34,
    }
];

export default function FeedPage() {
  return (
    <div>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
        <h1 className="text-2xl font-bold font-headline text-primary">Asnap</h1>
        <AsnapLogo className="h-8 w-8" />
      </header>
      <main className="p-0">
        <StoriesBar />
        <div className="space-y-4">
            {mockPosts.map((post: Post) => (
              <PostCard key={post.id} post={post} />
            ))}
        </div>
      </main>
    </div>
  );
}
