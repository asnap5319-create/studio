'use client';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { Story, UserProfile } from "@/lib/types";
import { collectionGroup, query, orderBy, doc, getDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function StoriesBar() {
    const firestore = useFirestore();
    const [storiesWithUsers, setStoriesWithUsers] = useState<(Story & {user: UserProfile})[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const storiesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'stories'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: stories, isLoading: storiesLoading } = useCollection<Story>(storiesQuery);

    useEffect(() => {
        if (storiesLoading) return;
        if (!stories || !firestore) {
            setIsLoading(false);
            return;
        }

        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const fetchStoryUsers = async () => {
            const storiesWithUserDetails = (await Promise.all(
                stories
                .filter(story => (story.createdAt as Timestamp).toDate() > twentyFourHoursAgo)
                .map(async (story) => {
                    const userRef = doc(firestore, 'users', story.userId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const user = { ...userSnap.data(), id: userSnap.id } as UserProfile;
                        return { ...story, user };
                    }
                    return null;
                })
            )).filter(Boolean) as (Story & {user: UserProfile})[];
            setStoriesWithUsers(storiesWithUserDetails);
            setIsLoading(false);
        };

        fetchStoryUsers();
    }, [stories, firestore, storiesLoading]);
    
    if (isLoading) {
        return (
             <div className="border-b py-3">
                <div className="flex w-max space-x-4 px-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center space-y-1">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="border-b py-3">
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-4 px-4">
            {storiesWithUsers.map((story) => (
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
