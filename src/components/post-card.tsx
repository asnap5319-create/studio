import Image from "next/image";
import { Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import type { Post } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Countdown } from "./countdown";
import { Timestamp } from "firebase/firestore";

type PostCardProps = {
  post: Post;
};

export function PostCard({ post }: PostCardProps) {
  if (!post.createdAt) {
    return null;
  }
  const expiryDate = new Date(
    (post.createdAt as Timestamp).toDate().getTime() + 48 * 60 * 60 * 1000
  ).toISOString();

  return (
    <Card className="rounded-none border-x-0 border-t-0 shadow-none">
      <CardHeader className="flex flex-row items-center gap-3 p-3">
        <Avatar>
          <AvatarImage src={post.user?.profilePictureUrl} alt={post.user?.username} />
          <AvatarFallback>{post.user?.username?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{post.user?.username}</p>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-square w-full">
          <Image
            src={post.mediaUrl}
            alt={post.caption || "Post image"}
            fill
            className="object-cover"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 p-3">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Heart className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon">
              <MessageCircle className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon">
              <Send className="h-6 w-6" />
            </Button>
          </div>
          <Countdown expiryTimestamp={expiryDate} />
        </div>
        <p className="font-semibold">{post.likesCount || 0} likes</p>
        <div>
          <span className="font-semibold">{post.user?.username}</span>
          <span className="ml-2">{post.caption}</span>
        </div>
        { (post.comments?.length || 0) > 0 && (
          <p className="text-sm text-muted-foreground">
            View all {post.comments?.length} comments
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
