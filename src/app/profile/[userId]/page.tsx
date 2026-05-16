'use client';
import { useState, useEffect } from "react";
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
import { collection, doc, query, orderBy, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { MoreVertical, LogOut, Grid3x3, Trash2, Play, BadgeCheck, Loader2, Search, Eye, ShieldCheck } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { EditProfileSheet } from "@/components/edit-profile";
import Image from "next/image";
import type { Post } from "@/models/post";
import type { UserProfile } from "@/models/user";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import { ScrollArea } from "@/components/ui/scroll-area";

const ADMIN_EMAIL = "asnap5319@gmail.com";

function UserListItem({ targetUserId, currentUserId, searchTerm }: { targetUserId: string, currentUserId?: string, searchTerm: string }) {
    const { firestore } = useFirebase();
    const router = useRouter();
    
    const userRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', targetUserId) : null, [firestore, targetUserId]);
    const { data: profile } = useDoc<UserProfile>(userRef);

    if (searchTerm && profile) {
        const lowerSearch = searchTerm.toLowerCase();
        const matchesUsername = profile.username?.toLowerCase().includes(lowerSearch);
        const matchesName = profile.name?.toLowerCase().includes(lowerSearch);
        if (!matchesUsername && !matchesName) return null;
    }

    if (!profile) return null;

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
                        {profile.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && <BadgeCheck className="h-3.5 w-3.5 text-blue-400 fill-blue-400/20" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{profile.name}</p>
                </div>
            </div>
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
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => { setHasMounted(true); }, []);

    const isOwnProfile = user?.uid === userId;
    const isCurrentUserAdmin = user?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    
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

    const handleLogout = async () => {
        if (!auth) return;
        await signOut(auth);
        router.push('/login?auth=true');
    };

    const confirmDeletePost = async () => {
        if (!firestore || !postToDelete) return;
        try {
            await deleteDoc(doc(firestore, 'users', postToDelete.userId, 'posts', postToDelete.id));
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

    if (!hasMounted || isUserLoading || isProfileLoading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>;
    
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
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl min-w-[180px] p-2">
                            <SheetTitle className="sr-only">Menu</SheetTitle>
                            {isCurrentUserAdmin && (
                                <DropdownMenuItem onClick={() => router.push('/admin')} className="font-bold p-3 rounded-xl text-primary focus:bg-primary/10 cursor-pointer">
                                    <ShieldCheck className="mr-2 h-4 w-4" /> Master Panel
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive font-bold p-3 rounded-xl focus:bg-destructive/10 cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" /> Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="px-4">
                <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-primary shadow-lg">
                        <AvatarImage src={userProfile?.profileImageUrl} className="object-cover" />
                        <AvatarFallback>{userProfile?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 justify-around text-center">
                        <div>
                          <p className="font-black text-xl">{posts?.length || 0}</p>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Posts</p>
                        </div>
                        <div className="cursor-pointer" onClick={() => setListType('followers')}>
                          <p className="font-black text-xl">{followers?.length || 0}</p>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Followers</p>
                        </div>
                        <div className="cursor-pointer" onClick={() => setListType('following')}>
                          <p className="font-black text-xl">{following?.length || 0}</p>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Following</p>
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="font-black text-lg italic uppercase">{userProfile?.name}</p>
                    <p className="text-sm text-muted-foreground font-medium">{userProfile?.bio || "A.snap User 🎬"}</p>
                </div>
                <div className="flex gap-2.5 mt-6">
                    {isOwnProfile ? (
                        <Button className="flex-1 font-black uppercase text-xs rounded-2xl h-12 bg-secondary/80" onClick={() => setIsEditSheetOpen(true)}>Edit Profile</Button>
                    ) : (
                        <Button className="flex-1 font-black uppercase text-xs rounded-2xl h-12 bg-primary">Follow</Button>
                    )}
                </div>
            </div>
            
            <div className="border-t border-white/5 mt-8 grid grid-cols-3 gap-0.5">
                {posts?.map((post) => (
                    <div key={post.id} className="aspect-square bg-secondary/30 relative cursor-pointer group" onClick={() => setSelectedPost(post)}>
                        {post.mediaUrl.includes('video') || post.mediaUrl.includes('.mp4') ? (
                            <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
                        ) : (
                            <Image src={post.mediaUrl} alt="" fill className="object-cover" />
                        )}

                        {/* GRID DELETE BUTTON (3-DOTS) */}
                        {(isOwnProfile || isCurrentUserAdmin) && (
                            <div className="absolute top-1 right-1 z-10" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white border-none">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-xl min-w-[140px] p-1">
                                        <DialogTitle className="sr-only">Options</DialogTitle>
                                        <DropdownMenuItem 
                                            onClick={() => {
                                                setPostToDelete(post);
                                                setIsDeleteDialogOpen(true);
                                            }}
                                            className="text-destructive font-bold text-xs p-3 rounded-lg focus:bg-destructive/10 cursor-pointer"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Video
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}

                        {/* VIEW COUNT OVERLAY IN GRID - Instagram Style */}
                        <div className="absolute bottom-1 left-1.5 flex items-center gap-1 text-white text-[10px] font-bold drop-shadow-md">
                            <Play className="h-3 w-3 fill-white" />
                            <span>{post.viewCount || 0}</span>
                        </div>

                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                            <Play className="text-white h-7 w-7 fill-white" />
                        </div>
                    </div>
                ))}
            </div>

            <Sheet open={!!listType} onOpenChange={(open) => !open && setListType(null)}>
                <SheetContent side="bottom" className="h-[80vh] rounded-t-[2.5rem] bg-background p-0">
                    <SheetHeader className="p-6 border-b border-white/5">
                        <SheetTitle className="text-center font-black uppercase italic">
                            {listType === 'followers' ? 'Followers' : 'Following'}
                        </SheetTitle>
                    </SheetHeader>
                    <div className="p-4">
                        <Input 
                            placeholder="Search..." 
                            className="bg-secondary/40 border-none rounded-2xl h-12"
                            value={listSearch}
                            onChange={(e) => setListSearch(e.target.value)}
                        />
                    </div>
                    <ScrollArea className="flex-1 px-4 h-full pb-20">
                        {activeList?.map((item) => (
                            <UserListItem key={item.id} targetUserId={item.id} currentUserId={user?.uid} searchTerm={listSearch} />
                        ))}
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            <EditProfileSheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} userProfile={userProfile} />
            
            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black/95 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center overflow-hidden">
                    {selectedPost && (
                        <div className="w-full h-full relative">
                            <DialogTitle className="sr-only">Preview</DialogTitle>
                            <PostCard post={selectedPost} isFocused />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-[#121212] text-white rounded-[2.5rem] border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black uppercase italic">Delete Post?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-muted-foreground">
                            क्या आप वाकई इस वीडियो को डिलीट करना चाहते हैं?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-3 mt-4">
                        <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-14 font-black">Delete Forever</AlertDialogAction>
                        <AlertDialogCancel className="bg-secondary/50 rounded-2xl h-14 border-none font-black">Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <BottomNav />
        </div>
    );
}
