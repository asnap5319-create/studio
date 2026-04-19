'use client';
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDoc, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { MoreVertical, Settings, Shield, LogOut, Grid3x3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { EditProfileSheet } from "@/components/edit-profile";
import Image from "next/image";

// Exporting type for use in other components
export type UserProfile = {
    name: string;
    username: string;
    profileImageUrl: string;
    email: string;
};

export default function ProfilePage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { firestore, auth } = useFirebase();
    
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const handleLogout = async () => {
        if (!auth) return;
        await signOut(auth);
        router.push('/login');
    };

    if (isUserLoading || isProfileLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-background text-white">
                <p>Loading profile...</p>
            </div>
        );
    }

    if (!user) {
        // This should be handled by the useUser hook redirecting, but as a fallback
        router.push('/login');
        return null;
    }
    
    return (
        <>
            <div className="h-full bg-background text-white">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold">{userProfile?.username || 'Profile'}</h1>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                                <DropdownMenuItem><Shield className="mr-2 h-4 w-4" /> Privacy</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Logout</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="px-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-primary">
                            <AvatarImage src={userProfile?.profileImageUrl} />
                            <AvatarFallback>{userProfile?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center justify-around flex-1">
                            <div className="text-center">
                                <p className="font-bold text-lg">0</p>
                                <p className="text-sm text-muted-foreground">Posts</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-lg">0</p>
                                <p className="text-sm text-muted-foreground">Followers</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-lg">0</p>
                                <p className="text-sm text-muted-foreground">Following</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="font-bold">{userProfile?.name}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            Welcome to A.snap! This is your bio.
                        </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button className="flex-1" onClick={() => setIsEditSheetOpen(true)}>Edit Profile</Button>
                        <Button className="flex-1" variant="secondary">Share Profile</Button>
                    </div>
                </div>
                
                <div className="border-t border-border mt-4">
                    <div className="flex justify-center p-2 border-b border-border">
                        <Grid3x3 className="text-primary"/>
                    </div>
                    <div className="grid grid-cols-3 gap-0.5">
                        {/* Placeholder for reels grid - using 9 placeholders */}
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="aspect-square bg-secondary relative">
                                <Image 
                                    src={`https://picsum.photos/seed/${user?.uid}-${i}/300/300`}
                                    alt="User Reel"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <EditProfileSheet 
                open={isEditSheetOpen} 
                onOpenChange={setIsEditSheetOpen}
                userProfile={userProfile}
            />
        </>
    );
}
