
'use client';
import { useState, useMemo, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCollection, useDoc, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { MoreVertical, LogOut, Grid3x3, Trash2, Play, BadgeCheck, Loader2, ShieldCheck, Wallet, Eye, Zap, TrendingUp, Calendar, X } from "lucide-react";
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
    const [isEarningsOpen, setIsEarningsOpen] = useState(false);

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

    // Advanced Earnings Calculation
    const earningsStats = useMemo(() => {
        if (!posts) return { total: 0, impressions: 0, today: 0, monthly: 0, totalViews: 0 };
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return posts.reduce((acc, post) => {
            const earnings = post.estimatedEarnings || 0;
            const impressions = post.adImpressions || 0;
            const views = post.viewCount || 0;
            const postTime = post.createdAt?.toMillis() || 0;

            acc.total += earnings;
            acc.impressions += impressions;
            acc.totalViews += views;

            if (postTime >= startOfToday) {
                acc.today += earnings;
            }
            if (postTime >= startOfMonth) {
                acc.monthly += earnings;
            }

            return acc;
        }, { total: 0, impressions: 0, today: 0, monthly: 0, totalViews: 0 });
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
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <MoreVertical />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl min-w-[220px] p-2 shadow-2xl z-[100]">
                            <DropdownMenuItem 
                                onSelect={(e) => {
                                    e.preventDefault();
                                    // Small delay to ensure menu closes properly
                                    setTimeout(() => setIsEarningsOpen(true), 150);
                                }}
                                className="font-black p-4 rounded-xl text-green-400 focus:bg-green-400/10 cursor-pointer"
                            >
                                <Zap className="mr-3 h-5 w-5 fill-green-400" /> Creator Studio
                            </DropdownMenuItem>
                            
                            {isCurrentUserAdmin && (
                                <DropdownMenuItem 
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        router.push('/admin');
                                    }} 
                                    className="font-black p-4 rounded-xl text-primary focus:bg-primary/10 cursor-pointer"
                                >
                                    <ShieldCheck className="mr-3 h-5 w-5" /> Master Panel
                                </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator className="bg-white/5 my-2" />
                            
                            <DropdownMenuItem onSelect={handleLogout} className="text-destructive font-black p-4 rounded-xl focus:bg-destructive/10 cursor-pointer">
                                <LogOut className="mr-3 h-5 w-5" /> Logout
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
                        <div className="flex flex-col">
                            <p className="font-black text-xl">{posts?.length || 0}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Posts</p>
                        </div>
                        <Link href={`/profile/${userId}/followers`} className="flex flex-col hover:opacity-70 transition-opacity">
                            <p className="font-black text-xl">{followers?.length || 0}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Followers</p>
                        </Link>
                        <Link href={`/profile/${userId}/following`} className="flex flex-col hover:opacity-70 transition-opacity">
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
                    <div className="flex gap-2 mt-6">
                        <Button className="flex-1 h-12 rounded-2xl bg-secondary/80 font-bold uppercase text-xs" onClick={() => setIsEditSheetOpen(true)}>Edit Profile</Button>
                        <Button className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-500 hover:bg-green-500/20" onClick={() => setIsEarningsOpen(true)}>
                            <Wallet className="h-5 w-5" />
                        </Button>
                    </div>
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
                                    <div className="absolute top-1 left-1 bg-green-500/80 backdrop-blur-md px-2 py-0.5 rounded-full z-10 shadow-lg">
                                        <p className="text-[9px] font-black text-white italic">₹{post.estimatedEarnings.toFixed(2)}</p>
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

            {/* Premium Creator Dashboard */}
            <Dialog open={isEarningsOpen} onOpenChange={setIsEarningsOpen}>
                <DialogContent className="bg-[#0a0a0a] border-white/10 p-0 rounded-[2.5rem] max-w-lg w-[95%] overflow-hidden h-[85vh] flex flex-col z-[110] outline-none">
                    <DialogHeader className="p-6 border-b border-white/5 bg-gradient-to-br from-green-500/10 via-transparent to-transparent">
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500 rounded-xl">
                                    <Zap size={20} className="text-white fill-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-white">Creator Studio</DialogTitle>
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-0.5">Monetization Active</p>
                                </div>
                             </div>
                             <Button variant="ghost" size="icon" onClick={() => setIsEarningsOpen(false)} className="rounded-full hover:bg-white/10">
                                <X className="h-6 w-6" />
                             </Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                        {/* Main Balance Card */}
                        <div className="bg-gradient-to-br from-green-600 to-green-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none">
                                <Wallet size={120} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-2">Current Balance</p>
                            <h2 className="text-6xl font-black italic text-white tracking-tighter">₹{earningsStats.total.toFixed(2)}</h2>
                            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/10">
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-white/50 uppercase">Today</p>
                                    <p className="text-lg font-black text-white">₹{earningsStats.today.toFixed(2)}</p>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-white/50 uppercase">Monthly</p>
                                    <p className="text-lg font-black text-white">₹{earningsStats.monthly.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-secondary/20 p-5 rounded-3xl border border-white/5">
                                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                                    <TrendingUp size={14} className="text-blue-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Total Views</span>
                                </div>
                                <p className="text-2xl font-black">{earningsStats.totalViews.toLocaleString()}</p>
                            </div>
                            <div className="bg-secondary/20 p-5 rounded-3xl border border-white/5">
                                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                                    <Eye size={14} className="text-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Ad Impressions</span>
                                </div>
                                <p className="text-2xl font-black">{earningsStats.impressions.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Recent Performance Breakdown */}
                        <div className="bg-secondary/10 p-6 rounded-[2rem] border border-white/5">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-green-500" />
                                    <h3 className="text-xs font-black uppercase tracking-wider">Performance Breakdown</h3>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-bold">Recent Posts</span>
                            </div>
                            
                            <div className="space-y-4">
                                {posts && posts.length > 0 ? posts.slice(0, 5).map(post => (
                                    <div key={post.id} className="flex items-center justify-between p-3 bg-black/40 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-10 w-10 bg-secondary rounded-xl overflow-hidden shrink-0">
                                                <video src={post.mediaUrl} className="object-cover w-full h-full" muted />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold truncate opacity-60">"{post.caption?.slice(0,20)}..."</p>
                                                <p className="text-[9px] font-black text-green-500 mt-1 uppercase">{post.viewCount} Views</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-white">₹{post.estimatedEarnings?.toFixed(2) || '0.00'}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-6 opacity-30 italic text-xs">No posts yet</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5">
                        <Button 
                            onClick={() => setIsEarningsOpen(false)} 
                            className="w-full h-14 rounded-2xl font-black uppercase bg-secondary hover:bg-white/10 tracking-widest transition-all"
                        >
                            Return to Profile
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            
            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center overflow-hidden z-[110]">
                    <DialogTitle className="sr-only">Post Preview</DialogTitle>
                    {selectedPost && <PostCard post={selectedPost} isFocused />}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-[#121212] text-white rounded-[2rem] border-white/10 z-[120]">
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
