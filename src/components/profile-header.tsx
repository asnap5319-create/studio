import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfile } from "@/lib/types";

type ProfileHeaderProps = {
  user: UserProfile;
  postCount: number;
};

export function ProfileHeader({ user, postCount }: ProfileHeaderProps) {
  return (
    <header className="p-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.profilePictureUrl} alt={user.username} />
          <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 items-center justify-around">
          <div className="text-center">
            <p className="text-lg font-bold">{postCount}</p>
            <p className="text-sm text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{user.followerIds?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{user.followingIds?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Following</p>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h1 className="font-semibold">{user.username}</h1>
        <p className="text-sm text-muted-foreground">{user.bio || 'Ephemeral moments collector.'}</p>
      </div>
    </header>
  );
}
