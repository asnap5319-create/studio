
'use client';
import { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
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
import { collection, doc, query, orderBy, deleteDoc, writeBatch, serverTimestamp, setDoc, where, getDocs, documentId } from "firebase/firestore";
import { MoreVertical, LogOut, Grid3x3, Trash2, Play, Users, ShieldCheck, BadgeCheck, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { EditProfileSheet } from "@/components/edit-profile";
import Image from "next/image";
import type { Post } from "@/models/post";
import type { UserProfile } from "@/models/user";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "asnap5319@gmail.com";

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

    // Blue Badge Check
    const isProfileAdmin = userProfile?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const userPostsQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'posts'), orderBy('createdAt', 'desc'));
    }, [firestore, userId]);

    const { data: posts } = useCollection<Post>(userPostsQuery);

    const followCheckRef = useMemoFirebase(() => {
        if (!firestore || !user || !userId || isOwnProfile) return null;
        return doc(firestore, 'user_followers', userId, 'followers', user.uid);
    }, [firestore, user, userId, isOwnProfile]);
    const { data: followCheck } = useDoc(followCheckRef);
    const isFollowing = !!followCheck;

    const handleLogout = async () => {
        if (!auth) return;
        await signOut(auth);
        router.push('/login?auth=true');
    };

    const handleFollowToggle = async () => {
        if (!firestore || !user || isOwnProfile || !userId) return;
        const batch = writeBatch(firestore);
        const followerDocRef = doc(firestore, 'user_followers', userId, 'followers', user.uid);
        const followingDocRef = doc(firestore, 'user_following', user.uid, 'following', userId);

        if (isFollowing) {
            batch.delete(followerDocRef);
            batch.delete(followingDocRef);
        } else {
            batch.set(followerDocRef, { createdAt: serverTimestamp() });
            batch.set(followingDocRef, { createdAt: serverTimestamp() });
            const notificationRef = doc(collection(firestore, 'users', userId, 'notifications'));
            batch.set(notificationRef, {
                type: 'follow', senderId: user.uid, recipientId: userId, read: false, createdAt: serverTimestamp(),
            });
        }
        await batch.commit();
    };

    const confirmDeletePost = async () => {
        if (!firestore || !user || !postToDelete) return;
        await deleteDoc(doc(firestore, 'users', user.uid, 'posts', postToDelete.id));
        setIsDeleteDialogOpen(false);
        setPostToDelete(null);
    };

    if (isUserLoading || isProfileLoading) return <div className="h-full flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>;
    
    return (
        <div className="h-full bg-background text-white overflow-y-auto pb-20">
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <h1 className="text-xl font-bold">{userProfile?.username}</h1>
                    {isProfileAdmin && <BadgeCheck className="h-5 w-5 text-blue-400 fill-blue-400/20" />}
                </div>
                {isOwnProfile && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-secondary text-white">
                            <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Logout</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="px-4">
                <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20 border-2 border-primary">
                        <AvatarImage src={userProfile?.profileImageUrl} />
                        <AvatarFallback>{userProfile?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 justify-around text-center">
                        <div><p className="font-bold">{posts?.length || 0}</p><p className="text-xs text-muted-foreground">Posts</p></div>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="flex items-center gap-1.5"><p className="font-bold">{userProfile?.name}</p>{isProfileAdmin && <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />}</div>
                    <p className="text-sm text-muted-foreground">{userProfile?.bio || "A.snap User"}</p>
                </div>
                <div className="flex gap-2 mt-6">
                    {isOwnProfile ? (
                        <Button className="flex-1 font-bold rounded-xl" onClick={() => setIsEditSheetOpen(true)}>Edit Profile</Button>
                    ) : (
                        <>
                            <Button className="flex-1 font-bold rounded-xl" onClick={handleFollowToggle} variant={isFollowing ? "secondary" : "default"}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Button>
                            <Button className="flex-1 font-bold rounded-xl" variant="secondary" onClick={() => router.push(`/messages/${[user?.uid, userId].sort().join('_')}`)}>Message</Button>
                        </>
                    )}
                </div>
            </div>
            
            <div className="border-t border-border mt-8 grid grid-cols-3 gap-0.5">
                {posts?.map((post) => (
                    <div key={post.id} className="aspect-square bg-secondary relative cursor-pointer" onClick={() => setSelectedPost(post)}>
                        {post.mediaUrl.includes('video') || post.mediaUrl.includes('.mp4') ? (
                            <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
                        ) : (
                            <Image src={post.mediaUrl} alt="" fill className="object-cover" />
                        )}
                    </div>
                ))}
            </div>

            {isOwnProfile && userProfile && <EditProfileSheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} userProfile={userProfile} />}
            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black/90 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center">
                    {selectedPost && <PostCard post={selectedPost} />}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-background text-white rounded-2xl">
                    <AlertDialogHeader><AlertDialogTitle>Delete Video?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive">Delete</AlertDialogAction>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
