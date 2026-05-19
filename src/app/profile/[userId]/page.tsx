'use client';
import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useCollection, useDoc, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { MoreVertical, LogOut, Grid3x3, Trash2, Play, BadgeCheck, Loader2, ShieldCheck, Wallet, Eye, TrendingUp } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { EditProfileSheet } from "@/components/edit-profile";
import type { Post } from "@/models/post";
import type { UserProfile } from "@/models/user";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
    const isCurrentUserAdmin = user?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    
    const userProfileRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const isProfileAdmin = userProfile?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const userPostsQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'posts'), orderBy('createdAt', 'desc'));
    }, [firestore, userId]);
    const { data: posts } = useCollection<Post>(userPostsQuery);

    const followersQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'user_followers', userId, 'followers'));
    }, [firestore, userId]);
    const { data: followers } = useCollection(followersQuery);

    const followingQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'user_following', userId, 'following'));
    }, [firestore, userId]);
    const { data: following } = useCollection(followingQuery);

    const followCheckRef = useMemoFirebase(() => {
        if (!firestore || !user || !userId || isOwnProfile) return null;
        return doc(firestore, 'user_followers', userId, 'followers', user.uid);
    }, [firestore, user, userId, isOwnProfile]);
    const { data: followData } = useDoc(followCheckRef);
    const isFollowing = !!followData;

    // Calculate total earnings and impressions
    const earningsStats = useMemo(() => {
        if (!posts) return { total: 0, impressions: 0 };
        return posts.reduce((acc, post) => ({
            total: acc.total + (post.estimatedEarnings || 0),
            impressions: acc.impressions + (post.adImpressions || 0)
        }), { total: 0, impressions: 0 });
    }, [posts]);

    const handleLogout = async () => {
        await signOut(auth!);
        router.push('/login?auth=true');
    };

    const handleFollowToggle = async () => {
        if (!firestore || !user || !userId || isOwnProfile) return;
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
                type: 'follow',
                senderId: user.uid,
                recipientId: userId,
                read: false,
                createdAt: serverTimestamp(),
            });
        }
        try {
            await batch.commit();
            toast({ title: isFollowing ? `Unfollowed ${userProfile?.username}` : `Following ${userProfile?.username}` });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Something went wrong." });
        }
    };

    const handleMessage = () => {
        if (!user || !userId) return;
        const chatId = [user.uid, userId].sort().join('_');
        router.push(`/messages/${chatId}`);
    };

    const confirmDeletePost = async () => {
        if (!firestore || !postToDelete) return;
        try {
            await deleteDoc(doc(firestore, 'users', postToDelete.userId, 'posts', postToDelete.id));
            setIsDeleteDialogOpen(false);
            setPostToDelete(null);
            toast({ title: "Deleted Successfully" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Delete Failed" });
        }
    };

    if (isUserLoading || isProfileLoading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>;
    
    return (
        <div className="min-h-screen bg-background text-white pb-24">
            <header className="p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-1.5">
                    <h1 className="text-xl font-bold">{userProfile?.username}</h1>
                    {isProfileAdmin && <BadgeCheck className="h-5 w-5 text-blue-400 fill-blue-400/20" />}
                </div>
                {isOwnProfile && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl min-w-[180px] p-2">
                            {isCurrentUserAdmin && (
                                <DropdownMenuItem onClick={() => router.push('/admin')} className="font-bold p-3 rounded-xl text-primary cursor-pointer">
                                    <ShieldCheck className="mr-2 h-4 w-4" /> Master Panel
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive font-bold p-3 rounded-xl cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" /> Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </header>

            <div className="px-4 mt-4">
                <div className="flex items-center gap-8">
                    <Avatar className="h-24 w-24 border-4 border-primary shadow-xl">
                        <AvatarImage src={userProfile?.profileImageUrl} className="object-cover" />
                        <AvatarFallback>{userProfile?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 justify-around text-center">
                        <div>
                            <p className="font-black text-xl">{posts?.length || 0}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Posts</p>
                        </div>
                        <Link href={`/profile/${userId}/followers`} className="hover:opacity-70 transition-opacity">
                            <p className="font-black text-xl">{followers?.length || 0}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Followers</p>
                        </Link>
                        <Link href={`/profile/${userId}/following`} className="hover:opacity-70 transition-opacity">
                            <p className="font-black text-xl">{following?.length || 0}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Following</p>
                        </Link>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="font-bold text-lg">{userProfile?.name}</p>
                    <p className="text-sm text-muted-foreground">{userProfile?.bio || "A.snap Creator🎬"}</p>
                </div>
                
                {isOwnProfile ? (
                    <Button className="w-full mt-6 h-12 rounded-2xl bg-secondary/80 font-bold uppercase text-xs" onClick={() => setIsEditSheetOpen(true)}>Edit Profile</Button>
                ) : user && (
                    <div className="flex gap-2 mt-6">
                        <Button 
                            className={cn("flex-1 h-12 rounded-2xl font-bold uppercase text-xs", isFollowing ? "bg-secondary/50" : "bg-primary")}
                            onClick={handleFollowToggle}
                        >
                            {isFollowing ? 'Following' : 'Follow'}
                        </Button>
                        <Button 
                            variant="outline"
                            className="flex-1 h-12 rounded-2xl font-bold uppercase text-xs border-white/10"
                            onClick={handleMessage}
                        >
                            Message
                        </Button>
                    </div>
                )}
            </div>

            {/* Creator Earnings Dashboard - Visible only to owner */}
            {isOwnProfile && (
                <div className="px-4 mt-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
                        <TrendingUp size={14} /> Creator Dashboard
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-secondary/30 border-white/5 rounded-[1.5rem] overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Wallet size={12} className="text-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Estimated Earnings</span>
                                </div>
                                <p className="text-xl font-black italic text-white">${earningsStats.total.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-secondary/30 border-white/5 rounded-[1.5rem] overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Eye size={12} className="text-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ad Impressions</span>
                                </div>
                                <p className="text-xl font-black italic text-white">{earningsStats.impressions.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            <Tabs defaultValue="posts" className="mt-8">
                <TabsList className="grid w-full grid-cols-1 bg-transparent border-t border-white/5 rounded-none h-14">
                    <TabsTrigger value="posts" className="data-[state=active]:bg-transparent data-[state=active]:border-t-2 border-white"><Grid3x3 className="h-6 w-6" /></TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="mt-0">
                    <div className="grid grid-cols-3 gap-0.5">
                        {posts?.map((post) => (
                            <div key={post.id} className="aspect-square bg-secondary/30 relative cursor-pointer group" onClick={() => setSelectedPost(post)}>
                                <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
                                
                                {isOwnProfile && post.estimatedEarnings !== undefined && (
                                    <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full z-10">
                                        <p className="text-[8px] font-black text-green-400 italic">${post.estimatedEarnings.toFixed(2)}</p>
                                    </div>
                                )}

                                {(isOwnProfile || isCurrentUserAdmin) && (
                                    <div className="absolute top-1 right-1 z-10">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 bg-black/60 hover:bg-destructive rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPostToDelete(post);
                                                setIsDeleteDialogOpen(true);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 text-white" />
                                        </Button>
                                    </div>
                                )}

                                <div className="absolute bottom-1 left-1.5 flex items-center gap-1 text-white text-[10px] font-bold">
                                    <Play className="h-3 w-3 fill-white" /> {post.viewCount || 0}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <EditProfileSheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} userProfile={userProfile} />
            
            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center overflow-hidden">
                    <DialogTitle className="sr-only">Post Preview</DialogTitle>
                    {selectedPost && <PostCard post={selectedPost} isFocused />}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-[#121212] text-white rounded-[2rem] border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black italic">Delete Post?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2">This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-3 mt-4">
                        <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive hover:bg-destructive/90 rounded-xl h-12 font-bold uppercase text-xs">Delete</AlertDialogAction>
                        <AlertDialogCancel className="bg-secondary/50 rounded-xl h-12 border-none font-bold uppercase text-xs">Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <BottomNav />
        </div>
    );
}
