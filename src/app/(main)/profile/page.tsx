'use client';
import Image from "next/image";
import { ProfileHeader } from "@/components/profile-header";
import { ProfileMenu } from "@/components/profile-menu";
import { Post, UserProfile } from "@/lib/types";

const mockUser: UserProfile = {
  id: '1',
  username: 'asnap_user',
  profilePictureUrl: 'https://picsum.photos/seed/1/100/100',
  bio: 'This is a mock profile!',
  followerIds: ['2', '3'],
  followingIds: ['2', '3', '4'],
};

const mockPosts: Post[] = [
  {
    id: 'p1',
    userId: '1',
    mediaUrl: 'https://picsum.photos/seed/101/600/600',
    mediaType: 'image',
    caption: 'My first post!',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p2',
    userId: '1',
    mediaUrl: 'https://picsum.photos/seed/102/600/600',
    mediaType: 'image',
    caption: 'Another one!',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  }
];

export default function ProfilePage() {
  return (
    <div>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm">
        <h1 className="text-lg font-semibold font-headline">@{mockUser.username}</h1>
        <ProfileMenu />
      </header>
      <ProfileHeader user={mockUser} postCount={mockPosts.length} />
      <main>
        <div className="grid grid-cols-3 gap-0.5">
          {mockPosts.map((post) => (
            <div key={post.id} className="relative aspect-square">
              <Image
                src={post.mediaUrl}
                alt={post.caption || 'user post'}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {mockPosts.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-lg font-semibold">No active posts</p>
            <p className="text-muted-foreground">Your posts disappear after 48 hours.</p>
          </div>
        )}
      </main>
    </div>
  );
}
