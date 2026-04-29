
'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import { PostCard } from '@/components/post-card';
import type { Post } from '@/models/post';
import Link from 'next/link';
import { Heart, Database, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function FeedPage() {
  const { firestore } = useFirebase();
  const router = useRouter();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: posts, isLoading, error } = useCollection<Post>(postsQuery);

  const handleRefresh = () => {
    router.refresh();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mb-4"></div>
        <p>Loading your feed...</p>
      </div>
    );
  }

  // Handle Index missing error specifically in UI
  if (error && (error.message.includes('index') || error.message.includes('INDEX'))) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white bg-black p-8 text-center max-w-lg mx-auto">
        <div className="p-4 bg-primary/10 rounded-full mb-6">
          <Database className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-4">बस थोड़ा सा इंतज़ार, भाई!</h2>
        <p className="text-muted-foreground mb-6 text-lg">
          आपने 'Create Index' पर क्लिक कर दिया है, यह बहुत अच्छी बात है! 
          अब Google के सर्वर इंडेक्स बना रहे हैं। इसमें <strong>2 से 5 मिनट</strong> का समय लगता है।
        </p>
        
        <div className="flex flex-col gap-4 w-full">
            <Button onClick={handleRefresh} className="w-full py-6 text-lg font-bold flex gap-2">
                <RefreshCw className="h-5 w-5" />
                अभी चेक करें (Refresh Now)
            </Button>
            
            <p className="text-sm text-muted-foreground italic">
                अगर रिफ्रेश करने पर भी यही दिख रहा है, तो 2 मिनट और रुकें।
            </p>

            <div className="mt-8 p-4 bg-secondary/30 rounded-xl border border-border text-[10px] font-mono text-left opacity-50 break-all overflow-hidden max-h-24">
                {error.message}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full max-w-lg mx-auto flex flex-col text-white bg-black">
       <header className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md sticky top-0 z-20 shrink-0">
            <h1 className="text-2xl font-bold text-primary font-sans" style={{filter: 'drop-shadow(0 0 5px hsl(var(--primary)))'}}>
                A.snap
            </h1>
            <Link href="/notifications" aria-label="Notifications" className="relative hover:scale-110 transition-transform">
                <Heart className="h-7 w-7 text-white" />
            </Link>
      </header>

      <div className="flex-1 w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide">
        {error && (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-2" />
                <h2 className="text-xl font-bold text-destructive">Could not load feed</h2>
                <p className="text-muted-foreground">{error.message}</p>
                <Button onClick={handleRefresh} variant="outline" className="mt-4">Try Again</Button>
            </div>
        )}
        {!isLoading && !error && (!posts || posts.length === 0) && (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <h2 className="text-2xl font-bold">Welcome to A.snap!</h2>
                <p className="text-muted-foreground mt-2">It's a bit quiet here. Be the first to create a post!</p>
                <Button asChild className="mt-6" variant="secondary">
                  <Link href="/create">Create First Post</Link>
                </Button>
            </div>
        )}
        {posts && posts.map((post) => (
            <div key={post.id} className="h-full w-full snap-start flex items-center justify-center bg-black">
                <PostCard post={post} />
            </div>
        ))}
      </div>
    </div>
  );
}
