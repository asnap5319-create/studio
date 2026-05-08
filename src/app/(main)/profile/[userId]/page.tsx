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
import { MoreVertical, LogOut, Grid3x3, Trash2, Play, Users, Search, X, ShieldCheck, Download } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { EditProfileSheet } from "@/components/edit-profile";
import Image from "next/image";
import type { Post } from "@/models/post";
import type { UserProfile } from "@/models/user";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "asnap5319@gmail.com";

function FollowListItem({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
    const { user } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const isOwn = user?.uid === profile.id;

    const followCheckRef = useMemoFirebase(() => {
        if (!firestore || !user || isOwn) return null;
        return doc(firestore, 'user_followers', profile.id, 'followers', user.uid);
    }, [firestore, user, profile.id, isOwn]);
    
    const { data: followCheck } = useDoc(followCheckRef);
    const isFollowing = !!followCheck;

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!firestore || !user || isOwn) return;

        const batch = writeBatch(firestore);
        const followerDocRef = doc(firestore, 'user_followers', profile.id, 'followers', user.uid);
        const followingDocRef = doc(firestore, 'user_following', user.uid, 'following', profile.id);

        if (isFollowing) {
            batch.delete(followerDocRef);
            batch.delete(followingDocRef);
        } else {
            batch.set(followerDocRef, { createdAt: serverTimestamp() });
            batch.set(followingDocRef, { createdAt: serverTimestamp() });
            
            const notificationRef = doc(collection(firestore, 'users', profile.id, 'notifications'));
            batch.set(notificationRef, {
                type: 'follow',
                senderId: user.uid,
                recipientId: profile.id,
                read: false,
                createdAt: serverTimestamp(),
            });
        }

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error toggling follow in list:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Action failed.' });
        }
    };

    return (
        <div className="flex items-center justify-between p-3 hover:bg-secondary/30 rounded-xl transition-colors group">
            <Link 
                href={`/profile/${profile.id}`} 
                onClick={onClose}
                className="flex items-center gap-3 flex-1 min-w-0"
            >
                <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={profile.profileImageUrl} />
                    <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                    <span className="font-bold text-sm truncate">{profile.username}</span>
                    <span className="text-xs text-muted-foreground truncate">{profile.name}</span>
                </div>
            </Link>
            {!isOwn && (
                <Button 
                    size="sm" 
                    variant={isFollowing ? "secondary" : "default"}
                    className={cn("h-8 px-4 font-bold text-xs rounded-lg transition-all", !isFollowing && "bg-primary hover:bg-primary/90")}
                    onClick={handleFollowToggle}
                >
                    {isFollowing ? 'Following' : 'Follow'}
                </Button>
            )}
        </div>
    );
}

function FollowList({ userIds, onClose }: { userIds: string[]; onClose: () => void }) {
    const { firestore } = useFirebase();
    const [searchQuery, setSearchQuery] = useState("");
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || userIds.length === 0) {
            setLoading(false);
            setProfiles([]);
            return;
        }

        const fetchProfiles = async () => {
            try {
                const fetched: UserProfile[] = [];
                const chunks = [];
                for (let i = 0; i < userIds.length; i += 10) {
                    chunks.push(userIds.slice(i, i + 10));
                }

                for (const chunk of chunks) {
                    const q = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
                    const snap = await getDocs(q);
                    snap.forEach(doc => fetched.push({ ...doc.data(), id: doc.id } as UserProfile));
                }
                setProfiles(fetched);
            } catch (error) {
                console.error("Error fetching follow profiles:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfiles();
    }, [firestore, userIds]);

    const filteredProfiles = useMemo(() => {
        if (!searchQuery.trim()) return profiles;
        const q = searchQuery.toLowerCase();
        return profiles.filter(p => 
            p.username?.toLowerCase().includes(q) || 
            p.name?.toLowerCase().includes(q)
        );
    }, [profiles, searchQuery]);

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="px-4 py-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search users..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-secondary border-none rounded-xl focus-visible:ring-1"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
                            <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                    )}
                </div>
            </div>
            <ScrollArea className="flex-1 px-2">
                <div className="space-y-1 py-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-10 gap-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
                            <span className="text-xs text-muted-foreground">Loading list...</span>
                        </div>
                    ) : filteredProfiles.length > 0 ? (
                        filteredProfiles.map(p => (
                            <FollowListItem key={p.id} profile={p} onClose={onClose} />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-10 text-center opacity-40">
                            <Users className="h-12 w-12 mb-2" />
                            <p className="text-sm">No users found</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

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
    const [showFollowList, setShowFollowList] = useState<'followers' | 'following' | null>(null);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    const isOwnProfile = user?.uid === userId;
    
    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallApp = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else {
            toast({ title: "Note", description: "Open browser menu and select 'Install' or 'Add to Home Screen'." });
        }
    };

    // Admin check using the standardized email
    const isAdmin = useMemo(() => {
        if (!user?.email) return false;
        return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    }, [user]);

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
            <div className="h-full bg-background text-white overflow-y-auto pb-20 scrollbar-hide">
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
                                <DropdownMenuContent align="end" className="bg-secondary border-border text-white min-w-[160px]">
                                    {isAdmin && (
                                        <>
                                            <DropdownMenuItem onClick={() => router.push('/admin')} className="focus:bg-primary/20">
                                                <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Admin Dashboard
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-border" />
                                        </>
                                    )}
                                    <DropdownMenuItem onClick={handleInstallApp} className="focus:bg-primary/20">
                                        <Download className="mr-2 h-4 w-4 text-primary" /> Install App
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border" />
                                    <DropdownMenuItem onClick={handleLogout} className="focus:bg-primary/20">
                                        <LogOut className="mr-2 h-4 w-4" /> Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                <div className="px-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-primary shadow-lg shadow-primary/20">
                            <AvatarImage src={userProfile?.profileImageUrl} />
                            <AvatarFallback>{userProfile?.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center justify-around flex-1 text-center">
                            <div className="cursor-default">
                                <p className="font-bold text-lg">{posts?.length || 0}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Posts</p>
                            </div>
                            <div 
                                className="cursor-pointer hover:opacity-70 transition-opacity"
                                onClick={() => setShowFollowList('followers')}
                            >
                                <p className="font-bold text-lg">{followersData?.length || 0}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Followers</p>
                            </div>
                            <div 
                                className="cursor-pointer hover:opacity-70 transition-opacity"
                                onClick={() => setShowFollowList('following')}
                            >
                                <p className="font-bold text-lg">{followingData?.length || 0}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Following</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="font-bold">{userProfile?.name}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{userProfile?.bio || "Welcome to A.snap!"}</p>
                    </div>
                    <div className="flex gap-2 mt-6">
                         {isOwnProfile ? (
                            <>
                                <Button className="flex-1 font-bold h-11 rounded-xl" onClick={() => setIsEditSheetOpen(true)}>Edit Profile</Button>
                                {isAdmin && (
                                    <Button 
                                        className="flex-1 font-bold h-11 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.4)]" 
                                        onClick={() => router.push('/admin')}
                                    >
                                        <ShieldCheck className="mr-2 h-4 w-4" /> Admin
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <Button className="flex-1 font-bold h-11 rounded-xl" onClick={handleFollowToggle} variant={isFollowing ? "secondary" : "default"}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Button>
                                <Button className="flex-1 font-bold h-11 rounded-xl" variant="secondary" onClick={handleMessageClick}>Message</Button>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="border-t border-border mt-8">
                    <div className="flex justify-center p-3 border-b border-border">
                        <Grid3x3 className={cn("h-6 w-6", posts && posts.length > 0 ? "text-primary" : "text-muted-foreground")}/>
                    </div>
                    {posts && posts.length > 0 ? (
                        <div className="grid grid-cols-3 gap-0.5">
                            {posts.map((post) => {
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
                                        
                                        {isOwnProfile && (
                                            <div className="absolute top-1 right-1 z-10" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1.5 bg-black/60 rounded-full hover:bg-white/20 transition-colors">
                                                            <MoreVertical className="h-4 w-4 text-white" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-secondary border-border text-white">
                                                        <DropdownMenuItem 
                                                            onClick={(e) => handleDeleteClick(e, post)}
                                                            className="text-destructive font-bold focus:text-destructive focus:bg-destructive/10"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Post
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        )}

                                        <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-[10px] bg-black/40 rounded px-1.5 py-0.5 backdrop-blur-sm">
                                            <Play className="h-3 w-3 fill-white" />
                                            <span className="font-bold">{post.viewCount || 0}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center opacity-30">
                            <Users className="h-16 w-16 mb-4" />
                            <p className="font-medium">No posts yet</p>
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
                <DialogContent className="p-0 border-0 bg-black/80 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center overflow-hidden">
                    {selectedPost && (
                        <>
                            <DialogTitle className="sr-only">Post Details by {userProfile?.username}</DialogTitle>
                            <PostCard post={selectedPost} />
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!showFollowList} onOpenChange={(open) => !open && setShowFollowList(null)}>
                <DialogContent className="bg-background border-border p-0 max-w-sm rounded-t-2xl sm:rounded-2xl h-[70vh] flex flex-col overflow-hidden">
                    <DialogHeader className="p-4 border-b border-border bg-background">
                        <DialogTitle className="text-center font-bold capitalize text-white">
                            {showFollowList}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        {showFollowList === 'followers' ? (
                            <FollowList userIds={followersData?.map(f => f.id) || []} onClose={() => setShowFollowList(null)} />
                        ) : (
                            <FollowList userIds={followingData?.map(f => f.id) || []} onClose={() => setShowFollowList(null)} />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

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