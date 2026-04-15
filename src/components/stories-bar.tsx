'use client';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Story } from "@/lib/types";

const mockStories: Story[] = [
  { id: 's1', userId: '2', mediaUrl: "https://picsum.photos/seed/11/600/800", mediaType: 'image', user: { id: '2', username: 'sarah', profilePictureUrl: 'https://picsum.photos/seed/2/100/100', followerIds:[], followingIds:[] } },
  { id: 's2', userId: '3', mediaUrl: "https://picsum.photos/seed/12/600/800", mediaType: 'image', user: { id: '3', username: 'tom', profilePictureUrl: 'https://picsum.photos/seed/3/100/100', followerIds:[], followingIds:[] } },
  { id: 's3', userId: '4', mediaUrl: "https://picsum.photos/seed/13/600/800", mediaType: 'image', user: { id: '4', username: 'maria', profilePictureUrl: 'https://picsum.photos/seed/4/100/100', followerIds:[], followingIds:[] } },
  { id: 's4', userId: '5', mediaUrl: "https://picsum.photos/seed/14/600/800", mediaType: 'image', user: { id: '5', username: 'david', profilePictureUrl: 'https://picsum.photos/seed/5/100/100', followerIds:[], followingIds:[] } },
  { id: 's5', userId: '6', mediaUrl: "https://picsum.photos/seed/15/600/800", mediaType: 'image', user: { id: '6', username: 'chloe', profilePictureUrl: 'https://picsum.photos/seed/6/100/100', followerIds:[], followingIds:[] } },
];


export function StoriesBar() {
    if (mockStories.length === 0) {
        return null;
    }

    return (
        <div className="border-b py-3">
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-4 px-4">
            {mockStories.map((story) => (
                <div key={story.id} className="flex flex-col items-center space-y-1">
                <div className="rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500">
                    <Avatar className="h-16 w-16 border-2 border-background">
                    <AvatarImage src={story.user.profilePictureUrl} alt={story.user.username} />
                    <AvatarFallback>{story.user.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                    {story.user.username}
                </span>
                </div>
            ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
        </div>
    );
}
