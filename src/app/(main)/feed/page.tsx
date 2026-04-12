import { AsnapLogo } from "@/components/icons";
import { PostCard } from "@/components/post-card";
import { StoriesBar } from "@/components/stories-bar";
import { posts } from "@/lib/data";
import type { Post } from "@/lib/types";

export default function FeedPage() {
  // Filter for posts that have not expired (less than 48 hours old)
  const activePosts = posts.filter(post => {
    const postDate = new Date(post.createdAt);
    const expiryDate = new Date(postDate.getTime() + 48 * 60 * 60 * 1000);
    return new Date() < expiryDate;
  });

  return (
    <div>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
        <h1 className="text-2xl font-bold font-headline text-primary">Asnap</h1>
        <AsnapLogo className="h-8 w-8" />
      </header>
      <main className="p-0">
        <StoriesBar />
        <div className="space-y-4">
          {activePosts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </main>
    </div>
  );
}
