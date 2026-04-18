'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth, useDoc, useFirebase, useUser } from "@/firebase";
import { doc, getFirestore } from "firebase/firestore";
import { MoreVertical, Settings, Shield, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useMemo } from "react";

type UserProfile = {
    name: string;
    username: string;
    profileImageUrl: string;
};

export default function ProfilePage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { firestore, auth } = useFirebase();

    const userProfileRef = useMemo(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    if (isUserLoading || isProfileLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-white">
                <p>Loading profile...</p>
            </div>
        );
    }

    if (!user) {
        router.push('/login');
        return null;
    }
    
    return (
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

            <div className="p-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-24 w-24 border-2 border-primary">
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
                    <p className="text-sm text-muted-foreground">Welcome to A.snap!</p>
                </div>
                <div className="flex gap-2 mt-4">
                    <Button className="flex-1">Edit Profile</Button>
                    <Button className="flex-1">Share Profile</Button>
                </div>
            </div>
            
            <div className="border-t border-border mt-4">
                <div className="grid grid-cols-3 gap-0.5">
                    {/* Placeholder for reels grid */}
                </div>
            </div>
        </div>
    );
}
