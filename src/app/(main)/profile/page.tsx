import Image from "next/image";
import { ProfileHeader } from "@/components/profile-header";
import { mainUser, posts } from "@/lib/data";

export default function ProfilePage() {
  const userPosts = posts.filter(post => post.user.id === mainUser.id);
  
  // Filter for posts that have not expired (less than 48 hours old)
  const activePosts = userPosts.filter(post => {
    const postDate = new Date(post.createdAt);
    const expiryDate = new Date(postDate.getTime() + 48 * 60 * 60 * 1000);
    return new Date() < expiryDate;
  });

  return (
    <div>
      <ProfileHeader user={mainUser} postCount={activePosts.length} />
      <main>
        <div className="grid grid-cols-3 gap-0.5">
          {activePosts.map((post) => (
            <div key={post.id} className="relative aspect-square">
              <Image
                src={post.image.imageUrl}
                alt={post.caption}
                fill
                className="object-cover"
                data-ai-hint={post.image.imageHint}
              />
            </div>
          ))}
        </div>
        {activePosts.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-lg font-semibold">No active posts</p>
            <p className="text-muted-foreground">Your posts disappear after 48 hours.</p>
          </div>
        )}
      </main>
    </div>
  );
}
