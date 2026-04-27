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
} from "@/components/ui/alert-dialog";
import { useCollection, useDoc, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { MoreVertical, Settings, Shield, LogOut, Grid3x3, Clapperboard, Trash2, Play, UserPlus, UserCheck } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { EditProfileSheet } from "@/components/edit-profile";
import Image from "next/image";
import type { Post } from "@/models/post";
import type { UserProfile } from "@/models/user";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
    const params = useParams();
    const userId = params.userId as string;
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { firestore, auth } = useFirebase();
    const { toast } = useToast();
    
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<Post | null>(null);

    const isOwnProfile = user?.uid === userId;

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const userPostsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const postsCollectionRef = collection(firestore, 'users', userId, 'posts');
        return query(postsCollectionRef, orderBy('createdAt', 'desc'));
    }, [firestore, userId]);

    const { data: posts, isLoading: arePostsLoading } = useCollection<Post>(userPostsQuery);

    const followersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'user_followers', userId, 'followers');
    }, [firestore, userId]);
    const { data: followersData } = useCollection(followersQuery);

    const followingQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'user_following', userId, 'following');
    }, [firestore, userId]);
    const { data: followingData } = useCollection(followingQuery);

    const followCheckRef = useMemoFirebase(() => {
        if (!firestore || !user || isOwnProfile) return null;
        return doc(firestore, 'user_followers', userId, 'followers', user.uid);
    }, [firestore, user, userId, isOwnProfile]);
    const { data: followCheck } = useDoc(followCheckRef);
    const isFollowing = !!followCheck;

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [isUserLoading, user, router]);

    const handleLogout = async () => {
        if (!auth) return;
        await signOut(auth);
        router.push('/login');
    };

    const handleFollowToggle = async () => {
        if (!firestore || !user || isOwnProfile) {
            toast({ variant: "destructive", title: "Error", description: "You must be logged in to follow users."});
            return;
        };

        const batch = writeBatch(firestore);
        const followedUserId = userId;
        const followerUserId = user.uid;

        const followerDocRef = doc(firestore, 'user_followers', followedUserId, 'followers', followerUserId);
        const followingDocRef = doc(firestore, 'user_following', followerUserId, 'following', followedUserId);

        if (isFollowing) { // Action: Unfollow
            batch.delete(followerDocRef);
            batch.delete(followingDocRef);
        } else { // Action: Follow
            batch.set(followerDocRef, { createdAt: serverTimestamp() });
            batch.set(followingDocRef, { createdAt: serverTimestamp() });
        }

        try {
            await batch.commit();
            toast({
                title: isFollowing ? `Unfollowed ${userProfile?.username}` : `Following ${userProfile?.username}`,
            });
        } catch (error) {
            console.error("Error toggling follow:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not complete the action.' });
        }
    };

    const handleDeletePost = async () => {
        if (!firestore || !user || !postToDelete || !isOwnProfile) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not delete the post. Please try again.",
            });
            return;
        }

        try {
            const postRef = doc(firestore, 'users', user.uid, 'posts', postToDelete.id);
            await deleteDoc(postRef);
            toast({
                title: "Post Deleted",
                description: "Your post has been removed successfully.",
            });
        } catch (error) {
            console.error("Error deleting post:", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "There was a problem deleting your post.",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setPostToDelete(null);
            if (selectedPost && selectedPost.id === postToDelete?.id) {
                setSelectedPost(null);
            }
        }
    };

    if (isUserLoading || isProfileLoading) {
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
                        {isOwnProfile && (
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
                        )}
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
                                <p className="font-bold text-lg">{followersData?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Followers</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-lg">{followingData?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Following</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="font-bold">{userProfile?.name}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {userProfile?.bio || "Welcome to A.snap!"}
                        </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                         {isOwnProfile ? (
                            <>
                                <Button className="flex-1" onClick={() => setIsEditSheetOpen(true)}>Edit Profile</Button>
                                <Button className="flex-1" variant="secondary">Share Profile</Button>
                            </>
                        ) : (
                            <>
                                <Button className="flex-1" onClick={handleFollowToggle}>
                                    {isFollowing ? <UserCheck className="mr-2 h-4 w-4"/> : <UserPlus className="mr-2 h-4 w-4" />}
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Button>
                                <Button className="flex-1" variant="secondary">Message</Button>
                            </>
                        )}
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
                                <div 
                                    key={post.id} 
                                    className="aspect-square bg-secondary relative group cursor-pointer"
                                    onClick={() => setSelectedPost(post)}
                                >
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
                                    <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-bold bg-black/40 rounded px-1 py-0.5">
                                        <Play className="h-3 w-3 fill-white" />
                                        <span>{post.viewCount || 0}</span>
                                    </div>
                                     {isOwnProfile && (
                                        <div 
                                            className="absolute top-1 right-1 z-10"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/75 text-white">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem 
                                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                        onSelect={() => {
                                                            setPostToDelete(post);
                                                            setIsDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Delete</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-10 text-center">
                            <Clapperboard className="w-16 h-16 text-muted-foreground mb-4"/>
                            <h3 className="text-lg font-bold">No Posts Yet</h3>
                            <p className="text-muted-foreground">When this user creates posts, they'll appear here.</p>
                        </div>
                    )}
                </div>
            </div>
            {isOwnProfile && userProfile && (
                <EditProfileSheet 
                    open={isEditSheetOpen} 
                    onOpenChange={setIsEditSheetOpen}
                    userProfile={userProfile}
                />
            )}

            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black/80 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center">
                    {selectedPost && (
                        <>
                           <DialogTitle className="sr-only">{`Post by ${userProfile?.username}: ${selectedPost.caption || 'No caption'}`}</DialogTitle>
                            <div className="relative w-full h-full">
                                <PostCard post={selectedPost} />
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            post from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPostToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
