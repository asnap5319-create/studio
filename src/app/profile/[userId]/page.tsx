'use client';
import { useState, useMemo, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCollection, useDoc, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, deleteDoc, writeBatch, serverTimestamp, addDoc, where } from "firebase/firestore";
import { MoreVertical, LogOut, Grid3x3, Trash2, Play, BadgeCheck, Loader2, ShieldCheck, Wallet, Eye, Zap, TrendingUp, X, CreditCard, DollarSign, History, AlertCircle, CheckCircle2, Lock, Sparkles, Target, Youtube, Instagram, HelpCircle, Users2, BarChart3, Settings, Trophy, Shield } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { EditProfileSheet } from "@/components/edit-profile";
import type { Post } from "@/models/post";
import type { UserProfile } from "@/models/user";
import type { PayoutRequest } from "@/models/payout";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { SupportChat } from "@/components/support-chat";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProfileShareSheet } from "@/components/profile-share-sheet";

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
    const [isMonetizationOpen, setIsMonetizationOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

    const isOwnProfile = user?.uid === userId;
    const isCurrentUserAdmin = user?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    
    const userProfileRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile & { virtualBalance?: number }>(userProfileRef);
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

    const earningsStats = useMemo(() => {
        if (!posts) return { totalViews: 0, totalLikes: 0 };
        return posts.reduce((acc, post) => {
            acc.totalViews += post.viewCount || 0;
            acc.totalLikes += post.likeCount || 0;
            return acc;
        }, { totalViews: 0, totalLikes: 0 });
    }, [posts]);

    const handleLogout = async () => {
        await signOut(auth!);
        router.push('/login?auth=true');
    };

    const confirmDelete = async () => {
        if (!firestore || !postToDelete) return;
        await deleteDoc(doc(firestore, 'users', postToDelete.userId, 'posts', postToDelete.id));
        setIsDeleteDialogOpen(false); setPostToDelete(null);
    };

    if (isUserLoading || isProfileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
    
    return (
        <div className="min-h-screen bg-background text-foreground pb-24 select-none">
            {/* Custom Game Header */}
            <header className="p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border/50">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black italic text-white shadow-lg shadow-primary/20">A</div>
                   <h1 className="text-xl font-black italic tracking-tighter uppercase">Account</h1>
                </div>
                <div className="flex items-center gap-2">
                    {isOwnProfile && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50"><MoreVertical /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover text-popover-foreground border-border rounded-2xl min-w-[220px] p-2 shadow-2xl z-[100]">
                                <DropdownMenuItem onSelect={() => setIsEditSheetOpen(true)} className="font-black p-4 rounded-xl focus:bg-accent cursor-pointer">
                                    <Settings className="mr-3 h-5 w-5 text-primary" /> Edit Account
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setIsShareSheetOpen(true)} className="font-black p-4 rounded-xl focus:bg-accent cursor-pointer">
                                    <Trophy className="mr-3 h-5 w-5 text-yellow-500" /> Share Profile
                                </DropdownMenuItem>
                                {isCurrentUserAdmin && (
                                    <DropdownMenuItem onSelect={() => router.push('/admin')} className="font-black p-4 rounded-xl focus:bg-accent cursor-pointer">
                                        <ShieldCheck className="mr-3 h-5 w-5 text-blue-600" /> Master Panel
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-border my-2" />
                                <DropdownMenuItem onSelect={handleLogout} className="text-destructive font-black p-4 rounded-xl focus:bg-destructive/10 cursor-pointer">
                                    <LogOut className="mr-3 h-5 w-5" /> Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </header>

            <main className="w-full space-y-8 mt-6">
                {/* Profile Card Section */}
                <div className="px-4">
                    <div className="bg-secondary/40 border border-border p-8 rounded-[3rem] relative overflow-hidden flex flex-col items-center text-center gap-4">
                        <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                            <Shield size={140} />
                        </div>
                        
                        <div className="relative">
                            <Avatar className="h-32 w-32 border-4 border-primary shadow-2xl">
                                <AvatarImage src={userProfile?.profileImageUrl} className="object-cover" />
                                <AvatarFallback className="text-4xl font-black">{userProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-2 right-0 bg-primary text-white p-2 rounded-xl shadow-lg border-2 border-background">
                                <BadgeCheck size={20} />
                            </div>
                        </div>

                        <div className="space-y-1 z-10">
                            <h2 className="text-2xl font-black italic tracking-tighter uppercase flex items-center justify-center gap-2">
                                {userProfile?.username}
                                {isProfileAdmin && <BadgeCheck className="h-5 w-5 text-blue-400" />}
                            </h2>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Elite Player • Level 12</p>
                            <p className="text-sm text-muted-foreground font-medium max-w-xs">{userProfile?.bio || "A.snap Pro Creator🎬"}</p>
                        </div>
                    </div>
                </div>

                {/* Gaming Wallet Section */}
                {isOwnProfile && (
                    <div className="px-4">
                        <div className="bg-money-pattern p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                              <Wallet size={120} />
                           </div>
                           
                           <div className="relative z-10 space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 flex items-center gap-2">
                                    <Sparkles size={10} className="text-yellow-400" /> Current Assets
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-white/80">₹</span>
                                    <h2 className="text-5xl font-black italic tracking-tighter drop-shadow-lg">
                                        {userProfile?.virtualBalance?.toLocaleString() || '0'}
                                    </h2>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md flex items-center gap-2">
                                        <TrendingUp size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">+12% Win Rate</span>
                                    </div>
                                </div>
                           </div>
                        </div>
                    </div>
                )}

                {/* Account Stats Grid */}
                <div className="px-4 grid grid-cols-2 gap-4">
                    <div className="bg-secondary/30 p-6 rounded-[2.5rem] border border-border flex flex-col items-center text-center gap-2">
                        <p className="text-2xl font-black text-foreground italic">{followers?.length || 0}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Active Fans</p>
                    </div>
                    <div className="bg-secondary/30 p-6 rounded-[2.5rem] border border-border flex flex-col items-center text-center gap-2">
                        <p className="text-2xl font-black text-foreground italic">{posts?.length || 0}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Reel Content</p>
                    </div>
                </div>

                {/* Gaming Features List */}
                <div className="px-4 space-y-3">
                    <button 
                        onClick={() => setIsMonetizationOpen(true)}
                        className="w-full p-6 bg-secondary/50 hover:bg-secondary rounded-3xl border border-border transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                                <Target size={24} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-black uppercase italic text-foreground tracking-tighter">Monetization</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Check Rewards Eligibility</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center border border-border text-muted-foreground group-hover:text-primary transition-colors">
                             <Play size={12} className="ml-0.5" />
                        </div>
                    </button>

                    <button 
                        onClick={() => setIsEarningsOpen(true)}
                        className="w-full p-6 bg-secondary/50 hover:bg-secondary rounded-3xl border border-border transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-600/10 rounded-2xl text-green-600 group-hover:scale-110 transition-transform">
                                <Zap size={24} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-black uppercase italic text-foreground tracking-tighter">Creator Studio</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Analyze Content Performance</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center border border-border text-muted-foreground group-hover:text-primary transition-colors">
                             <Play size={12} className="ml-0.5" />
                        </div>
                    </button>

                    <button 
                        onClick={() => setIsSupportOpen(true)}
                        className="w-full p-6 bg-secondary/50 hover:bg-secondary rounded-3xl border border-border transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-600/10 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform">
                                <HelpCircle size={24} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-black uppercase italic text-foreground tracking-tighter">Support Center</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Help & Admin Chat</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center border border-border text-muted-foreground group-hover:text-primary transition-colors">
                             <Play size={12} className="ml-0.5" />
                        </div>
                    </button>
                </div>
            </main>

            <EditProfileSheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} userProfile={userProfile} />
            
            <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
                <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-[3rem] overflow-hidden bg-background border-t-0 shadow-2xl z-[150]">
                    <SheetHeader className="sr-only"><SheetTitle>Share Account</SheetTitle></SheetHeader>
                    {userProfile && (
                        <ProfileShareSheet 
                            targetUserId={userProfile.id} 
                            targetUsername={userProfile.username} 
                            targetProfileImage={userProfile.profileImageUrl} 
                            onClose={() => setIsShareSheetOpen(false)} 
                        />
                    )}
                </SheetContent>
            </Sheet>

            <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                <DialogContent className="bg-background border-border p-0 rounded-[2.5rem] max-w-lg w-[95%] h-[85vh] overflow-hidden z-[300]">
                    <DialogHeader className="sr-only"><DialogTitle>Game Support</DialogTitle></DialogHeader>
                    <SupportChat 
                        userProfile={userProfile} 
                        stats={{
                            followers: followers?.length || 0,
                            posts: posts?.length || 0,
                            views: earningsStats.totalViews,
                            earnings: userProfile?.virtualBalance || 0
                        }} 
                    />
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
}
