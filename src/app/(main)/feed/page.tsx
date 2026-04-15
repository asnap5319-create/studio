'use client';
import { VideoCard } from '@/components/video-card';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Post } from '@/lib/types';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import React from 'react';

export default function FeedPage() {
  const { firestore, user, isUserLoading } = useFirebase();

  const videosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'videos'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [firestore]);

  const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(videosQuery);
  const { data: usersData, isLoading: isUsersLoading } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]));

  const videos = React.useMemo(() => {
    if (!posts || !usersData) return [];
    return posts.map(post => ({
      ...post,
      user: usersData.find(u => u.id === post.userId),
    }));
  }, [posts, usersData]);
  
  const isLoading = isUserLoading || isPostsLoading || isUsersLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }
  
  if (!videos || videos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-white">
        <p>No videos yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide">
      {videos.map((video, index) => (
        <div key={video.id} className="h-full w-full snap-start snap-always">
          <VideoCard post={video} />
        </div>
      ))}
    </div>
  );
}
