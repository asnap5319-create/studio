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
import { collection, doc, query, orderBy, deleteDoc, writeBatch, serverTimestamp, setDoc } from "firebase/firestore";
import { MoreVertical, LogOut, Grid3x3, Trash2, Play } from "lucide-react";
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
    const userId = params?.userId as string;
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
        if (!firestore || !userId) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const userPostsQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        const postsCollectionRef = collection(firestore, 'users', userId, 'posts');
        return query(postsCollectionRef, orderBy('createdAt', 'desc'));
    }, [firestore, userId]);

    const { data: posts, isLoading: arePostsLoading } = useCollection<Post>(userPostsQuery);

    const followersQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return collection(firestore, 'user_followers', userId, 'followers');
    }, [firestore, userId]);
    const { data: followersData } = useCollection(followersQuery);

    const followingQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return collection(firestore, 'user_following', userId, 'following');
    }, [firestore, userId]);
    const { data: followingData } = useCollection(followingQuery);

    const followCheckRef = useMemoFirebase(() => {
        if (!firestore || !user || !userId || isOwnProfile) return null;
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
        if (!firestore || !user || isOwnProfile || !userId) {
            toast({ variant: "destructive", title: "Error", description: "Could not complete follow action."});
            return;
        };

        const batch = writeBatch(firestore);
        const followedUserId = userId;
        const followerUserId = user.uid;

        const followerDocRef = doc(firestore, 'user_followers', followedUserId, 'followers', followerUserId);
        const followingDocRef = doc(firestore, 'user_following', followerUserId, 'following', followedUserId);

        if (isFollowing) {
            batch.delete(followerDocRef);
            batch.delete(followingDocRef);
        } else {
            batch.set(followerDocRef, { createdAt: serverTimestamp() });
            batch.set(followingDocRef, { createdAt: serverTimestamp() });
            
            const notificationRef = doc(collection(firestore, 'users', followedUserId, 'notifications'));
            batch.set(notificationRef, {
                type: 'follow',
                senderId: followerUserId,
                recipientId: followedUserId,
                read: false,
                createdAt: serverTimestamp(),
            });
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

    const handleMessageClick = () => {
        if (!firestore || !user || !userId || isOwnProfile) return;

        const participants = [user.uid, userId].sort();
        const chatId = participants.join('_');
        const chatRef = doc(firestore, 'chats', chatId);
        
        setDoc(chatRef, {
            id: chatId,
            participants,
            updatedAt: serverTimestamp(),
        }, { merge: true }).catch(err => {
            console.error("Error ensuring chat exists:", err);
        });

        router.push(`/messages/${chatId}`);
    };

    const handleDeleteClick = (e: React.MouseEvent, post: Post) => {
        e.stopPropagation();
        setPostToDelete(post);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeletePost = async () => {
        if (!firestore || !user || !postToDelete || !isOwnProfile) return;

        try {
            const postRef = doc(firestore, 'users', user.uid, 'posts', postToDelete.id);
            await deleteDoc(postRef);
            toast({ title: "Post Deleted Successfully" });
        } catch (error: any) {
            console.error("Error deleting post:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete post.' });
        } finally {
            setIsDeleteDialogOpen(false);
            setPostToDelete(null);
        }
    };

    if (isUserLoading || isProfileLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-background text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mb-4"></div>
                <p>Loading profile...</p>
            </div>
        );
    }
    
    return (
        <>
            <div className="h-full bg-background text-white overflow-y-auto pb-20">
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
                            <AvatarFallback>{userProfile?.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center justify-around flex-1 text-center">
                            <div>
                                <p className="font-bold">{posts?.length || 0}</p>
                                <p className="text-xs text-muted-foreground">Posts</p>
                            </div>
                            <div>
                                <p className="font-bold">{followersData?.length || 0}</p>
                                <p className="text-xs text-muted-foreground">Followers</p>
                            </div>
                            <div>
                                <p className="font-bold">{followingData?.length || 0}</p>
                                <p className="text-xs text-muted-foreground">Following</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="font-bold">{userProfile?.name}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{userProfile?.bio || "Welcome to A.snap!"}</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                         {isOwnProfile ? (
                            <Button className="flex-1" onClick={() => setIsEditSheetOpen(true)}>Edit Profile</Button>
                        ) : (
                            <>
                                <Button className="flex-1" onClick={handleFollowToggle} variant={isFollowing ? "secondary" : "default"}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Button>
                                <Button className="flex-1" variant="secondary" onClick={handleMessageClick}>Message</Button>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="border-t border-border mt-4">
                    <div className="flex justify-center p-2 border-b border-border">
                        <Grid3x3 className="text-primary"/>
                    </div>
                    <div className="grid grid-cols-3 gap-0.5">
                        {posts?.map((post) => {
                            const isVideo = post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.mov') || post.mediaUrl.includes('video') || post.mediaUrl.includes('cloudinary');
                            return (
                                <div key={post.id} className="aspect-square bg-secondary relative cursor-pointer group" onClick={() => setSelectedPost(post)}>
                                    {isVideo ? (
                                        <video 
                                            src={post.mediaUrl} 
                                            className="w-full h-full object-cover"
                                            muted
                                            playsInline
                                        />
                                    ) : (
                                        <Image src={post.mediaUrl} alt="" fill className="object-cover" />
                                    )}
                                    
                                    {/* Delete Button Overlay (Only for own profile) */}
                                    {isOwnProfile && (
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, post)}
                                            className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full hover:bg-destructive transition-colors z-10"
                                        >
                                            <Trash2 className="h-4 w-4 text-white" />
                                        </button>
                                    )}

                                    <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-[10px] bg-black/40 rounded px-1">
                                        <Play className="h-3 w-3 fill-white" />
                                        <span>{post.viewCount || 0}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {isOwnProfile && userProfile && <EditProfileSheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} userProfile={userProfile} />}
            
            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black/80 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center">
                    {selectedPost && (
                        <>
                            <DialogTitle className="sr-only">Post Details by {userProfile?.username}</DialogTitle>
                            <PostCard post={selectedPost} />
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Post Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[320px] rounded-2xl border-border bg-background text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center">Delete Video?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-xs">
                            This video will be permanently deleted from your profile.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                        <AlertDialogAction 
                            onClick={confirmDeletePost}
                            className="bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl h-11"
                        >
                            Delete
                        </AlertDialogAction>
                        <AlertDialogCancel className="bg-secondary border-none hover:bg-secondary/80 text-white rounded-xl h-11 m-0">
                            Cancel
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
