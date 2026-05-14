'use client';
import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useCollection, useDoc, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, deleteDoc, writeBatch, serverTimestamp, where } from "firebase/firestore";
import { MoreVertical, LogOut, Grid3x3, Trash2, Play, BadgeCheck, Loader2, Search, Eye } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { EditProfileSheet } from "@/components/edit-profile";
import Image from "next/image";
import type { Post } from "@/models/post";
import type { UserProfile } from "@/models/user";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ScrollArea } from "@/components/ui/scroll-area";

const ADMIN_EMAIL = "asnap5319@gmail.com";

function UserListItem({ targetUserId, currentUserId, searchTerm }: { targetUserId: string, currentUserId?: string, searchTerm: string }) {
    const { firestore } = useFirebase();
    const router = useRouter();
    
    const userRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', targetUserId) : null, [firestore, targetUserId]);
    const { data: profile } = useDoc<UserProfile>(userRef);

    const followCheckRef = useMemoFirebase(() => {
        if (!firestore || !currentUserId || targetUserId === currentUserId) return null;
        return doc(firestore, 'user_followers', targetUserId, 'followers', currentUserId);
    }, [firestore, currentUserId, targetUserId]);
    const { data: followCheck } = useDoc(followCheckRef);
    const isFollowing = !!followCheck;

    const isTargetAdmin = profile?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (searchTerm && profile) {
        const lowerSearch = searchTerm.toLowerCase();
        const matchesUsername = profile.username?.toLowerCase().includes(lowerSearch);
        const matchesName = profile.name?.toLowerCase().includes(lowerSearch);
        if (!matchesUsername && !matchesName) return null;
    }

    if (!profile) return null;

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!firestore || !currentUserId || targetUserId === currentUserId) return;
        const batch = writeBatch(firestore);
        const followerDocRef = doc(firestore, 'user_followers', targetUserId, 'followers', currentUserId);
        const followingDocRef = doc(firestore, 'user_following', currentUserId, 'following', targetUserId);

        if (isFollowing) {
            batch.delete(followerDocRef);
            batch.delete(followingDocRef);
        } else {
            batch.set(followerDocRef, { createdAt: serverTimestamp() });
            batch.set(followingDocRef, { createdAt: serverTimestamp() });
            const notificationRef = doc(collection(firestore, 'users', targetUserId, 'notifications'));
            batch.set(notificationRef, {
                type: 'follow', senderId: currentUserId, recipientId: targetUserId, read: false, createdAt: serverTimestamp(),
            });
        }
        await batch.commit();
    };

    return (
        <div className="flex items-center justify-between p-3 hover:bg-secondary/20 rounded-2xl transition-colors cursor-pointer" onClick={() => router.push(`/profile/${targetUserId}`)}>
            <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-12 w-12 border border-white/5">
                    <AvatarImage src={profile.profileImageUrl} className="object-cover" />
                    <AvatarFallback>{profile.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <div className="flex items-center gap-1">
                        <p className="font-bold text-sm truncate">{profile.username}</p>
                        {isTargetAdmin && <BadgeCheck className="h-3.5 w-3.5 text-blue-400 fill-blue-400/20" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{profile.name}</p>
                </div>
            </div>
            {currentUserId && targetUserId !== currentUserId && (
                <Button size="sm" variant={isFollowing ? "secondary" : "default"} onClick={handleFollowToggle} className="h-8 rounded-xl font-bold px-4">
                    {isFollowing ? 'Following' : 'Follow'}
                </Button>
            )}
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
    
    const [listType, setListType] = useState<'followers' | 'following' | null>(null);
    const [listSearch, setListSearch] = useState('');

    const isOwnProfile = user?.uid === userId;
    
    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);

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
        toast({ title: isFollowing ? "Unfollowed" : "Following" });
    };

    const confirmDeletePost = async () => {
        if (!firestore || !user || !postToDelete) return;
        try {
            await deleteDoc(doc(firestore, 'users', user.uid, 'posts', postToDelete.id));
            setIsDeleteDialogOpen(false);
            setPostToDelete(null);
            setSelectedPost(null);
            toast({ title: "सफलता ✅", description: "वीडियो डिलीट हो गया।" });
        } catch (error) {
            console.error("Delete error:", error);
            toast({ variant: "destructive", title: "गलती ❌", description: "वीडियो डिलीट नहीं हो पाया।" });
        }
    };

    const activeList = listType === 'followers' ? followers : following;

    if (isUserLoading || isProfileLoading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>;
    
    return (
        <div className="min-h-screen bg-background text-white overflow-y-auto pb-24">
            <div className="p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-1.5">
                    <h1 className="text-xl font-bold">{userProfile?.username || "Profile"}</h1>
                    {isProfileAdmin && <BadgeCheck className="h-5 w-5 text-blue-400 fill-blue-400/20" />}
                </div>
                {isOwnProfile && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl min-w-[160px] p-2">
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive font-bold p-3 rounded-xl focus:bg-destructive/10"><LogOut className="mr-2 h-4 w-4" /> Logout</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="px-4">
                <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20 border-2 border-primary">
                        <AvatarImage src={userProfile?.profileImageUrl} className="object-cover" />
                        <AvatarFallback>{userProfile?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 justify-around text-center">
                        <div className="cursor-default">
                          <p className="font-bold text-lg">{posts?.length || 0}</p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Posts</p>
                        </div>
                        <div className="cursor-pointer group active:scale-95 transition-transform" onClick={() => { setListType('followers'); setListSearch(''); }}>
                          <p className="font-bold text-lg group-hover:text-primary transition-colors">{followers?.length || 0}</p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Followers</p>
                        </div>
                        <div className="cursor-pointer group active:scale-95 transition-transform" onClick={() => { setListType('following'); setListSearch(''); }}>
                          <p className="font-bold text-lg group-hover:text-primary transition-colors">{following?.length || 0}</p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Following</p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold">{userProfile?.name}</p>
                      {isProfileAdmin && <BadgeCheck className="h-4 w-4 text-blue-400 fill-blue-400/20" />}
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug whitespace-pre-wrap">{userProfile?.bio || "A.snap User"}</p>
                </div>
                <div className="flex gap-2 mt-6">
                    {isOwnProfile ? (
                        <Button className="flex-1 font-black uppercase text-xs rounded-xl h-11 bg-secondary hover:bg-secondary/80" onClick={() => setIsEditSheetOpen(true)}>Edit Profile</Button>
                    ) : (
                        <>
                            <Button className="flex-1 font-black uppercase text-xs rounded-xl h-11 shadow-lg" onClick={handleFollowToggle} variant={isFollowing ? "secondary" : "default"}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Button>
                            <Button className="flex-1 font-black uppercase text-xs rounded-xl h-11 bg-secondary hover:bg-secondary/80" onClick={() => router.push(`/messages/${[user?.uid, userId].sort().join('_')}`)}>Message</Button>
                        </>
                    )}
                </div>
            </div>
            
            <div className="border-t border-white/5 mt-8 grid grid-cols-3 gap-0.5">
                {posts?.map((post) => (
                    <div key={post.id} className="aspect-square bg-secondary/50 relative cursor-pointer group" onClick={() => setSelectedPost(post)}>
                        {post.mediaUrl.includes('video') || post.mediaUrl.includes('.mp4') ? (
                            <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
                        ) : (
                            <Image src={post.mediaUrl} alt="" fill className="object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="text-white h-6 w-6 fill-white" />
                        </div>

                        {/* 3-Dots Menu on every Grid Video */}
                        <div className="absolute top-1 right-1 z-10">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 bg-black/30 backdrop-blur-md rounded-full text-white border border-white/10 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-xl min-w-[140px] p-1 shadow-2xl">
                                    <DropdownMenuItem className="p-2 text-xs rounded-lg focus:bg-white/10 cursor-default flex items-center gap-2">
                                        <Eye className="h-3 w-3" /> 
                                        <span>{post.viewCount || 0} Views</span>
                                    </DropdownMenuItem>
                                    
                                    {isOwnProfile && (
                                        <>
                                            <DropdownMenuSeparator className="bg-white/5" />
                                            <DropdownMenuItem 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPostToDelete(post);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                                className="p-2 text-xs rounded-lg focus:bg-destructive/10 text-destructive font-bold cursor-pointer flex items-center gap-2"
                                            >
                                                <Trash2 className="h-3 w-3" /> 
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Instagram style View Count overlay */}
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] font-black text-white drop-shadow-md">
                            <Eye className="h-3 w-3" />
                            {post.viewCount || 0}
                        </div>
                    </div>
                ))}
                {(!posts || posts.length === 0) && (
                  <div className="col-span-3 flex flex-col items-center justify-center py-20 opacity-20">
                    <Grid3x3 className="h-12 w-12 mb-2" />
                    <p className="text-sm font-bold uppercase tracking-widest">No Posts Yet</p>
                  </div>
                )}
            </div>

            <Sheet open={!!listType} onOpenChange={(open) => !open && setListType(null)}>
                <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl bg-background border-white/10 p-0 overflow-hidden">
                    <SheetHeader className="p-4 border-b border-white/5 flex flex-row items-center justify-center">
                        <SheetTitle className="text-center text-lg font-black uppercase italic">
                            {listType === 'followers' ? 'Followers' : 'Following'}
                        </SheetTitle>
                    </SheetHeader>
                    
                    <div className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search..." 
                                className="pl-10 h-10 bg-secondary/50 border-none rounded-xl text-sm"
                                value={listSearch}
                                onChange={(e) => setListSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1 px-2 h-full">
                        <div className="space-y-1 pb-20">
                            {activeList && activeList.length > 0 ? (
                                activeList.map((item) => (
                                    <UserListItem 
                                        key={item.id} 
                                        targetUserId={item.id} 
                                        currentUserId={user?.uid} 
                                        searchTerm={listSearch}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-20 opacity-30 text-sm font-bold uppercase tracking-widest">
                                    No {listType} yet
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            {isOwnProfile && userProfile && <EditProfileSheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} userProfile={userProfile} />}
            
            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black/95 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center overflow-hidden">
                    {selectedPost && (
                      <div className="w-full h-full relative">
                        <DialogTitle className="sr-only">Post Preview</DialogTitle>
                        <PostCard post={selectedPost} />
                        
                        {/* 3-Dots Menu Overlay on Preview */}
                        <div className="absolute top-4 right-4 z-50">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 bg-black/20 backdrop-blur-md rounded-full text-white border border-white/10">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl min-w-[180px] p-2 shadow-2xl">
                                    <DropdownMenuItem className="p-3 rounded-xl focus:bg-white/10 cursor-pointer flex items-center gap-3">
                                        <Eye className="h-4 w-4" /> 
                                        <span>{selectedPost.viewCount || 0} Views</span>
                                    </DropdownMenuItem>
                                    
                                    {isOwnProfile && (
                                        <>
                                            <div className="h-px bg-white/5 my-1" />
                                            <DropdownMenuItem 
                                                onClick={() => {
                                                    setPostToDelete(selectedPost);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                                className="p-3 rounded-xl focus:bg-destructive/10 text-destructive font-black cursor-pointer flex items-center gap-3"
                                            >
                                                <Trash2 className="h-4 w-4" /> 
                                                <span>Delete Post</span>
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-[#121212] text-white rounded-3xl border-white/10 max-w-[85vw] sm:max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl font-black uppercase italic text-center">डिलीट करें?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground text-center">
                        क्या आप वाकई इस वीडियो को डिलीट करना चाहते हैं? यह वापस नहीं आएगा।
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-row mt-4">
                        <AlertDialogCancel className="rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5 h-12">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black h-12">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <PwaInstallPrompt />
            <BottomNav />
        </div>
    );
}
