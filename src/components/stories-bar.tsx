import Image from "next/image";
import { stories } from "@/lib/data";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function StoriesBar() {
  return (
    <div className="border-b py-3">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-4 px-4">
          {stories.map((story) => (
            <div key={story.id} className="flex flex-col items-center space-y-1">
              <div className="rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500">
                <Avatar className="h-16 w-16 border-2 border-background">
                  <AvatarImage src={story.user.avatar.imageUrl} alt={story.user.name} data-ai-hint={story.user.avatar.imageHint} />
                  <AvatarFallback>{story.user.name.charAt(0)}</AvatarFallback>
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
