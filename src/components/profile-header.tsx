import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/types";

type ProfileHeaderProps = {
  user: User;
  postCount: number;
};

export function ProfileHeader({ user, postCount }: ProfileHeaderProps) {
  return (
    <header className="p-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.avatar.imageUrl} alt={user.name} data-ai-hint={user.avatar.imageHint} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 items-center justify-around">
          <div className="text-center">
            <p className="text-lg font-bold">{postCount}</p>
            <p className="text-sm text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{user.followers}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{user.following}</p>
            <p className="text-sm text-muted-foreground">Following</p>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h1 className="font-semibold">{user.name}</h1>
        <p className="text-sm text-muted-foreground">@{user.username}</p>
      </div>
    </header>
  );
}
