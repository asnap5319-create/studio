
'use client';
import { useState, useMemo, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCollection, useDoc, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, deleteDoc, writeBatch, serverTimestamp, addDoc, where } from "firebase/firestore";
import { MoreVertical, LogOut, Grid3x3, Trash2, Play, BadgeCheck, Loader2, ShieldCheck, Wallet, Eye, Zap, TrendingUp, Calendar, X, CreditCard, DollarSign, History, AlertCircle, CheckCircle2, Lock, Sparkles, Target, Youtube, Instagram, HelpCircle, Users2, BarChart3, ArrowRight } from "lucide-react";
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

// Custom Instagram-style Share Icon
function CustomShareIcon({ className }: { className?: string }) {
  return (
    <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

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
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState<'bank' | 'paypal'>('bank');
    const [payoutDetails, setPayoutDetails] = useState({ accountNo: '', ifsc: '', holderName: '', paypalEmail: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const payoutsQuery = useMemoFirebase(() => {
        if (!firestore || !userId || !isOwnProfile) return null;
        return query(collection(firestore, 'payout_requests'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    }, [firestore, userId, isOwnProfile]);
    const { data: userPayouts } = useCollection<PayoutRequest>(payoutsQuery);

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

    const followedByThemCheckRef = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !userId || isOwnProfile) return null;
        return doc(firestore, 'user_followers', user.uid, 'followers', userId);
    }, [firestore, user?.uid, userId, isOwnProfile]);
    const { data: followedByThemData } = useDoc(followedByThemCheckRef);
    const doesAuthorFollowMe = !!followedByThemData;

    const earningsStats = useMemo(() => {
        if (!posts) return { total: 0, impressions: 0, today: 0, totalViews: 0, withdrawn: 0, available: 0 };
        const withdrawnTotal = userPayouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;

        const stats = posts.reduce((acc, post) => {
            acc.total += post.estimatedEarnings || 0;
            acc.impressions += post.adImpressions || 0;
            acc.totalViews += post.viewCount || 0;
            return acc;
        }, { total: 0, impressions: 0, today: 0, totalViews: 0 });

        return { ...stats, withdrawn: withdrawnTotal, available: Math.max(0, stats.total - withdrawnTotal) };
    }, [posts, userPayouts]);

    // Monetization Requirements
    const reqFollowers = 50;
    const reqViews = 2000;
    const reqEarnings = 100;
    const isMonetizationUnlocked = (followers?.length || 0) >= reqFollowers && earningsStats.totalViews >= reqViews && earningsStats.total >= reqEarnings;

    const forceUnlockUI = () => {
        if (typeof document !== 'undefined') {
            document.body.style.pointerEvents = 'auto';
            document.documentElement.style.pointerEvents = 'auto';
        }
    };

    useEffect(() => {
        forceUnlockUI();
    }, [isEarningsOpen, isWithdrawOpen, isDeleteDialogOpen, selectedPost, isEditSheetOpen, isMonetizationOpen, isSupportOpen, isShareSheetOpen]);

    const handleWithdrawRequest = async () => {
        if (!firestore || !user || !isOwnProfile) return;
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount < 10 || amount > earningsStats.available) {
            toast({ variant: 'destructive', title: "Invalid Request", description: "Minimum withdrawal is ₹10." });
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'payout_requests'), {
                userId: user.uid,
                username: userProfile?.username || 'user',
                amount,
                method: withdrawMethod,
                details: withdrawMethod === 'bank' ? { accountNo: payoutDetails.accountNo, ifsc: payoutDetails.ifsc, holderName: payoutDetails.holderName } : { paypalEmail: payoutDetails.paypalEmail },
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            toast({ title: "Request Sent! ⏳", description: "Payment will be processed in 24-48 hours." });
            setIsWithdrawOpen(false);
            setWithdrawAmount('');
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        } finally {
            setIsSubmitting(false);
            forceUnlockUI();
        }
    };

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
            batch.delete(followerDocRef); batch.delete(followingDocRef);
        } else {
            batch.set(followerDocRef, { createdAt: serverTimestamp() });
            batch.set(followingDocRef, { createdAt: serverTimestamp() });
            const notificationRef = doc(collection(firestore, 'users', userId, 'notifications'));
            batch.set(notificationRef, { type: 'follow', senderId: user.uid, recipientId: userId, read: false, createdAt: serverTimestamp() });
        }
        await batch.commit();
    };

    const confirmDelete = async () => {
        if (!firestore || !postToDelete) return;
        await deleteDoc(doc(firestore, 'users', postToDelete.userId, 'posts', postToDelete.id));
        setIsDeleteDialogOpen(false); setPostToDelete(null); forceUnlockUI();
    };

    if (isUserLoading || isProfileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;
    
    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <header className="p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border/50">
                <div className="flex items-center gap-1.5">
                    <h1 className="text-xl font-bold">{userProfile?.username}</h1>
                    {isProfileAdmin && <BadgeCheck className="h-5 w-5 text-blue-400 fill-blue-400/20" />}
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu onOpenChange={() => forceUnlockUI()}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover text-popover-foreground border-border rounded-2xl min-w-[220px] p-2 shadow-2xl z-[100]">
                            <DropdownMenuItem onSelect={() => { forceUnlockUI(); setTimeout(() => setIsShareSheetOpen(true), 200); }} className="font-black p-4 rounded-xl focus:bg-accent cursor-pointer">
                                <CustomShareIcon className="mr-3 h-5 w-5 text-primary" /> Share Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => { forceUnlockUI(); setTimeout(() => setIsSupportOpen(true), 200); }} className="font-black p-4 rounded-xl text-primary focus:bg-primary/10 cursor-pointer">
                                <HelpCircle className="mr-3 h-5 w-5" /> Help & Support
                            </DropdownMenuItem>
                            {isOwnProfile && (
                                <>
                                    <DropdownMenuItem onSelect={() => { forceUnlockUI(); setTimeout(() => setIsEarningsOpen(true), 200); }} className="font-black p-4 rounded-xl text-green-600 focus:bg-green-500/10 cursor-pointer">
                                        <Zap className="mr-3 h-5 w-5 fill-green-500" /> Creator Studio
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => { forceUnlockUI(); setTimeout(() => setIsMonetizationOpen(true), 200); }} className="font-black p-4 rounded-xl text-blue-600 focus:bg-blue-500/10 cursor-pointer">
                                        <Target className="mr-3 h-5 w-5 fill-blue-400" /> Monetization
                                    </DropdownMenuItem>
                                    {isCurrentUserAdmin && (
                                        <DropdownMenuItem onSelect={() => { forceUnlockUI(); setTimeout(() => router.push('/admin'), 150); }} className="font-black p-4 rounded-xl focus:bg-accent cursor-pointer">
                                            <ShieldCheck className="mr-3 h-5 w-5" /> Master Panel
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator className="bg-border my-2" />
                                    <DropdownMenuItem onSelect={handleLogout} className="text-destructive font-black p-4 rounded-xl focus:bg-destructive/10 cursor-pointer">
                                        <LogOut className="mr-3 h-5 w-5" /> Logout
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div className="px-4 mt-4">
                <div className="flex items-center gap-8">
                    <Avatar className="h-24 w-24 border-4 border-primary shadow-xl">
                        <AvatarImage src={userProfile?.profileImageUrl} className="object-cover" />
                        <AvatarFallback>{userProfile?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 justify-around text-center">
                        <div className="flex flex-col"><p className="font-black text-xl">{posts?.length || 0}</p><p className="text-[10px] uppercase font-bold text-muted-foreground">Posts</p></div>
                        <Link href={`/profile/${userId}/followers`} className="flex flex-col"><p className="font-black text-xl">{followers?.length || 0}</p><p className="text-[10px] uppercase font-bold text-muted-foreground">Followers</p></Link>
                        <Link href={`/profile/${userId}/following`} className="flex flex-col"><p className="font-black text-xl">{following?.length || 0}</p><p className="text-[10px] uppercase font-bold text-muted-foreground">Following</p></Link>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-lg">{userProfile?.name}</p>
                        <div className="flex gap-3">
                            {userProfile?.youtubeUrl && <a href={userProfile.youtubeUrl} target="_blank" className="p-2 bg-red-600/10 rounded-full text-red-600"><Youtube size={18} /></a>}
                            {userProfile?.instagramUrl && <a href={`https://instagram.com/${userProfile.instagramUrl.replace('@', '')}`} target="_blank" className="p-2 bg-pink-600/10 rounded-full text-pink-600"><Instagram size={18} /></a>}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{userProfile?.bio || "A.snap Creator🎬"}</p>
                </div>
                
                {isOwnProfile ? (
                    <div className="mt-6 space-y-2">
                        <div 
                          className="bg-secondary/80 p-4 rounded-xl cursor-pointer hover:bg-secondary transition-all active:scale-[0.99] border border-border/50"
                          onClick={() => { setIsMonetizationOpen(true); forceUnlockUI(); }}
                        >
                            <p className="font-bold text-[13px] tracking-tight">Professional dashboard</p>
                            <p className="text-[11px] text-muted-foreground font-medium">{earningsStats.totalViews} views in the last 30 days.</p>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button 
                                className="flex-1 h-10 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground font-bold text-[13px] border border-border/50" 
                                onClick={() => setIsEditSheetOpen(true)}
                            >
                                Edit profile
                            </Button>
                            <Button 
                                className="flex-1 h-10 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground font-bold text-[13px] border border-border/50" 
                                onClick={() => { setIsShareSheetOpen(true); forceUnlockUI(); }}
                            >
                                Share profile
                            </Button>
                        </div>
                    </div>
                ) : user && (
                    <div className="flex gap-2 mt-6">
                        <Button className={cn("flex-1 h-12 rounded-2xl font-bold uppercase text-xs", isFollowing ? "bg-secondary text-foreground border border-border/50" : "bg-primary text-white")} onClick={handleFollowToggle}>
                            {isFollowing ? 'Following' : (doesAuthorFollowMe ? 'Follow Back' : 'Follow')}
                        </Button>
                        <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold uppercase text-xs border-border" onClick={() => router.push(`/messages/${[user.uid, userId].sort().join('_')}`)}>Message</Button>
                    </div>
                )}
            </div>

            <Tabs defaultValue="posts" className="mt-8">
                <TabsList className="grid w-full grid-cols-1 bg-transparent border-t border-border/50 h-14">
                    <TabsTrigger value="posts" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-none"><Grid3x3 className="h-6 w-6" /></TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="mt-0">
                    <div className="grid grid-cols-3 gap-0.5">
                        {posts?.map((post) => (
                            <div key={post.id} className="aspect-square bg-secondary/30 relative cursor-pointer overflow-hidden group" onClick={() => setSelectedPost(post)}>
                                <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
                                {isOwnProfile && (
                                    <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu onOpenChange={() => forceUnlockUI()}>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors shadow-lg border border-white/5">
                                                    <MoreVertical size={14} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-popover text-popover-foreground border-border rounded-xl min-w-[120px] p-1 shadow-2xl z-[150]">
                                                <DropdownMenuItem 
                                                    onSelect={(e) => { 
                                                        forceUnlockUI(); 
                                                        setPostToDelete(post); 
                                                        setIsDeleteDialogOpen(true); 
                                                    }} 
                                                    className="text-destructive font-black p-3 rounded-lg focus:bg-destructive/10 cursor-pointer text-xs flex items-center gap-2"
                                                >
                                                    <Trash2 size={14} /> Delete Post
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold drop-shadow-md"><Play className="h-3 w-3 fill-white" /> {post.viewCount || 0}</div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <Sheet open={isShareSheetOpen} onOpenChange={(open) => { setIsShareSheetOpen(open); forceUnlockUI(); }}>
                <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-[3rem] overflow-hidden bg-background border-t-0 shadow-2xl z-[150]">
                    <SheetHeader className="sr-only"><SheetTitle>Share Profile</SheetTitle></SheetHeader>
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

            <Dialog open={isSupportOpen} onOpenChange={(open) => { setIsSupportOpen(open); forceUnlockUI(); }}>
                <DialogContent className="bg-background border-border p-0 rounded-[2.5rem] max-w-lg w-[95%] h-[85vh] overflow-hidden z-[300]">
                    <DialogHeader className="sr-only"><DialogTitle>AI Support</DialogTitle></DialogHeader>
                    <SupportChat 
                        userProfile={userProfile} 
                        stats={{
                            followers: followers?.length || 0,
                            posts: posts?.length || 0,
                            views: earningsStats.totalViews,
                            earnings: earningsStats.total
                        }} 
                    />
                </DialogContent>
            </Dialog>

            {/* Other Dialogs fixed to match light theme in background and text */}
            <Dialog open={isMonetizationOpen} onOpenChange={(open) => { setIsMonetizationOpen(open); forceUnlockUI(); }}>
                <DialogContent className="bg-background border-border p-0 rounded-[2.5rem] max-w-lg w-[95%] overflow-hidden h-[90vh] flex flex-col z-[200]">
                    <DialogHeader className="p-8 border-b border-border/50 bg-gradient-to-br from-blue-600/5 to-transparent">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                                    <Target size={28} className="text-white fill-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-foreground">Monetization</DialogTitle>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={cn("h-1.5 w-1.5 rounded-full", isMonetizationUnlocked ? "bg-green-500 animate-pulse" : "bg-yellow-500")} />
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                                            Status: {isMonetizationUnlocked ? "Eligible" : "Learning Phase"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setIsMonetizationOpen(false); forceUnlockUI(); }} className="rounded-full bg-secondary"><X className="h-5 w-5" /></Button>
                         </div>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide pb-32">
                        <div className="bg-secondary/50 p-6 rounded-[2rem] border border-border">
                            <h4 className="text-xs font-black uppercase italic text-foreground mb-2">Program Overview</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Join the A.snap Partner Program to earn money from your reels. Complete the milestones below to unlock payouts.
                            </p>
                        </div>
                        {/* Progress Requirements... (rest of stats logic same but with text-foreground) */}
                        <div className="space-y-6">
                            {[
                                { label: "Followers", current: followers?.length || 0, target: reqFollowers, icon: Users2, color: "blue", isDone: (followers?.length || 0) >= reqFollowers },
                                { label: "Public Views", current: earningsStats.totalViews, target: reqViews, icon: Eye, color: "pink", isDone: earningsStats.totalViews >= reqViews },
                                { label: "Earned Milestone", current: earningsStats.total, target: reqEarnings, icon: Wallet, color: "green", isDone: earningsStats.total >= reqEarnings, isCurrency: true }
                            ].map((req, i) => (
                                <div key={i} className={cn("p-6 rounded-[2.5rem] border transition-all duration-500", req.isDone ? "bg-green-500/5 border-green-500/30" : "bg-secondary/30 border-border")}>
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2.5 rounded-xl", req.isDone ? "bg-green-500 text-white" : "bg-secondary text-muted-foreground")}>
                                                <req.icon size={20} />
                                            </div>
                                            <div>
                                                <span className="text-sm font-black uppercase italic block text-foreground">{req.label}</span>
                                                <span className="text-[10px] text-muted-foreground font-bold">{req.isCurrency ? '₹' : ''}{req.current} / {req.isCurrency ? '₹' : ''}{req.target}</span>
                                            </div>
                                        </div>
                                        {req.isDone && <CheckCircle2 size={16} className="text-green-500" />}
                                    </div>
                                    <Progress value={Math.min(100, (req.current / req.target) * 100)} className="h-2.5" />
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Earnings Studio */}
            <Dialog open={isEarningsOpen} onOpenChange={(open) => { setIsEarningsOpen(open); forceUnlockUI(); }}>
                <DialogContent className="bg-background border-border p-0 rounded-[2.5rem] max-w-lg w-[95%] overflow-hidden h-[90vh] flex flex-col z-[200]">
                    <DialogHeader className="p-6 border-b border-border bg-secondary/20 flex flex-row items-center justify-between">
                         <div className="flex items-center gap-3 text-left">
                            <div className="p-2.5 bg-green-500 rounded-xl shadow-lg">
                                <Zap size={22} className="text-white fill-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black italic uppercase text-foreground tracking-tighter">Creator Studio</DialogTitle>
                                <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest">Dashboard Active</p>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" onClick={() => { setIsEarningsOpen(false); forceUnlockUI(); }} className="rounded-full bg-secondary"><X className="h-5 w-5" /></Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 scrollbar-hide">
                        {/* Digital Wallet Card - Keep gradient for premium feel */}
                        <div className="relative group">
                            <div className="relative bg-gradient-to-br from-green-600 via-green-700 to-green-900 p-8 rounded-[3rem] shadow-2xl overflow-hidden border border-white/20">
                                <div className="absolute top-0 right-0 p-8 opacity-10 text-white"><Wallet size={120} /></div>
                                <div className="space-y-1 mb-8">
                                    <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.3em]">Total Available</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white/80">₹</span>
                                        <h2 className="text-6xl font-black italic text-white tracking-tighter">{earningsStats.available.toFixed(2)}</h2>
                                    </div>
                                </div>
                                <Button onClick={() => { setIsWithdrawOpen(true); forceUnlockUI(); }} className="w-full h-16 bg-white text-black font-black uppercase rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm" disabled={!isMonetizationUnlocked || earningsStats.available < 10}>Request Payout</Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-secondary/40 border border-border p-5 rounded-[2rem] flex flex-col gap-1">
                                <div className="flex items-center gap-2 mb-2 text-muted-foreground"><BarChart3 size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Total Impressions</span></div>
                                <p className="text-2xl font-black italic text-foreground">{earningsStats.impressions}</p>
                            </div>
                            <div className="bg-secondary/40 border border-border p-5 rounded-[2rem] flex flex-col gap-1">
                                <div className="flex items-center gap-2 mb-2 text-muted-foreground"><History size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Paid Out</span></div>
                                <p className="text-2xl font-black italic text-primary">₹{earningsStats.withdrawn}</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <EditProfileSheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} userProfile={userProfile} />
            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => { setSelectedPost(isOpen ? selectedPost : null); forceUnlockUI(); }}>
                <DialogContent className="p-0 border-0 bg-black w-full max-w-lg h-screen flex items-center justify-center overflow-hidden z-[200]">
                    <DialogTitle className="sr-only">Post Preview</DialogTitle>
                    {selectedPost && <PostCard post={selectedPost} isFocused />}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { setIsDeleteDialogOpen(open); forceUnlockUI(); }}>
                <AlertDialogContent className="bg-background text-foreground rounded-[2.5rem] border-border z-[300]">
                    <AlertDialogHeader><AlertDialogTitle className="text-center font-black uppercase italic">Delete Post?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-3 sm:flex-row mt-8">
                        <AlertDialogCancel onClick={() => forceUnlockUI()} className="rounded-2xl bg-secondary h-14 font-black border-none uppercase text-xs flex-1">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white rounded-2xl h-14 font-black uppercase text-xs flex-1">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <BottomNav />
        </div>
    );
}
