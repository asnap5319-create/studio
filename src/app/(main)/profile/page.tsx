'use client';
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCollection, useDoc, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, deleteDoc } from "firebase/firestore";
import { MoreVertical, Settings, Shield, LogOut, Grid3x3, Clapperboard, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { EditProfileSheet } from "@/components/edit-profile";
import Image from "next/image";
import type { Post } from "@/models/post";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/hooks/use-toast";

// Exporting type for use in other components
export type UserProfile = {
    id: string;
    name: string;
    username: string;
    profileImageUrl: string;
    email: string;
    bio?: string;
    followerIds?: string[];
    followingIds?: string[];
};

export default function ProfilePage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { firestore, auth } = useFirebase();
    const { toast } = useToast();
    
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const userPostsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        const postsCollectionRef = collection(firestore, 'users', user.uid, 'posts');
        return query(postsCollectionRef, orderBy('createdAt', 'desc'));
    }, [firestore, user]);

    const { data: posts, isLoading: arePostsLoading } = useCollection<Post>(userPostsQuery);

    const handleLogout = async () => {
        if (!auth) return;
        await signOut(auth);
        router.push('/login');
    };

    const handleDeletePost = async () => {
        if (!firestore || !user || !selectedPost) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not delete the post. Please try again.",
            });
            return;
        }

        try {
            const postRef = doc(firestore, 'users', user.uid, 'posts', selectedPost.id);
            await deleteDoc(postRef);
            toast({
                title: "Post Deleted",
                description: "Your post has been removed successfully.",
            });
            setSelectedPost(null); // Close the dialog
        } catch (error) {
            console.error("Error deleting post:", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "There was a problem deleting your post.",
            });
        }
    };

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [isUserLoading, user, router]);

    if (isUserLoading || isProfileLoading || !user) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-background text-white">
                <p>Loading profile...</p>
            </div>
        );
    }
    
    return (
        <>
            <div className="h-full bg-background text-white overflow-y-auto">
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
                                <p className="font-bold text-lg">{posts?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Posts</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-lg">{userProfile?.followerIds?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Followers</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-lg">{userProfile?.followingIds?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Following</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="font-bold">{userProfile?.name}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {userProfile?.bio || "Welcome to A.snap! Edit your profile to add a bio."}
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
                    {arePostsLoading ? (
                         <div className="grid grid-cols-3 gap-0.5">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="aspect-square bg-secondary animate-pulse"></div>
                            ))}
                        </div>
                    ) : posts && posts.length > 0 ? (
                        <div className="grid grid-cols-3 gap-0.5">
                            {posts.map((post) => (
                                <button key={post.id} className="aspect-square bg-secondary relative focus:outline-none" onClick={() => setSelectedPost(post)}>
                                    {post.mediaUrl.includes('video') ? (
                                        <video
                                            src={post.mediaUrl}
                                            className="w-full h-full object-cover"
                                            muted
                                            loop
                                            playsInline
                                        />
                                    ) : (
                                        <Image 
                                            src={post.mediaUrl}
                                            alt="User post"
                                            fill
                                            className="object-cover"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-10 text-center">
                            <Clapperboard className="w-16 h-16 text-muted-foreground mb-4"/>
                            <h3 className="text-lg font-bold">No Posts Yet</h3>
                            <p className="text-muted-foreground">When you create posts, they'll appear here.</p>
                        </div>
                    )}
                </div>
            </div>
            <EditProfileSheet 
                open={isEditSheetOpen} 
                onOpenChange={setIsEditSheetOpen}
                userProfile={userProfile}
            />

            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black/80 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center">
                    {selectedPost && (
                        <>
                            <DialogTitle className="sr-only">{`Post by ${userProfile?.username}: ${selectedPost.caption || 'No caption'}`}</DialogTitle>
                            <div className="relative w-full h-full">
                                <PostCard post={selectedPost} />
                                
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon" className="absolute top-4 right-4 z-10">
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete your
                                                post from our servers.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
