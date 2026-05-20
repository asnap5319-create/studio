
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
import { MoreVertical, LogOut, Grid3x3, Trash2, Play, BadgeCheck, Loader2, ShieldCheck, Wallet, Eye, Zap, TrendingUp, Calendar, X, CreditCard, DollarSign, History, AlertCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
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

    const earningsStats = useMemo(() => {
        if (!posts) return { total: 0, impressions: 0, today: 0, totalViews: 0, withdrawn: 0, available: 0 };
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const withdrawnTotal = userPayouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;

        const stats = posts.reduce((acc, post) => {
            const earnings = post.estimatedEarnings || 0;
            const impressions = post.adImpressions || 0;
            const views = post.viewCount || 0;
            const postTime = post.createdAt?.toMillis() || 0;
            acc.total += earnings;
            acc.impressions += impressions;
            acc.totalViews += views;
            if (postTime >= startOfToday) acc.today += earnings;
            return acc;
        }, { total: 0, impressions: 0, today: 0, totalViews: 0 });

        return { ...stats, withdrawn: withdrawnTotal, available: Math.max(0, stats.total - withdrawnTotal) };
    }, [posts, userPayouts]);

    const handleWithdrawRequest = async () => {
        if (!firestore || !user || !isOwnProfile) return;
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount" });
            return;
        }
        if (amount > earningsStats.available) {
            toast({ variant: 'destructive', title: "Insufficient Balance" });
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'payout_requests'), {
                userId: user.uid,
                username: userProfile?.username || 'user',
                amount,
                method: withdrawMethod,
                details: withdrawMethod === 'bank' ? {
                    accountNo: payoutDetails.accountNo,
                    ifsc: payoutDetails.ifsc,
                    holderName: payoutDetails.holderName
                } : { paypalEmail: payoutDetails.paypalEmail },
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            toast({ title: "Request Sent! ⏳", description: "Admin will review your request soon." });
            setIsWithdrawOpen(false);
            setWithdrawAmount('');
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed", description: "Something went wrong." });
        } finally {
            setIsSubmitting(false);
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

    const openEarnings = () => {
      // Small delay to let the dropdown menu close properly and avoid UI lockup
      setTimeout(() => {
        setIsEarningsOpen(true);
      }, 150);
    };

    const handleDeleteClickFromGrid = (e: React.MouseEvent, post: Post) => {
        e.stopPropagation(); // VERY IMPORTANT: Prevents opening the video dialog
        setPostToDelete(post);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!firestore || !postToDelete) return;
        try {
            await deleteDoc(doc(firestore, 'users', postToDelete.userId, 'posts', postToDelete.id));
            toast({ title: "Deleted!", description: "Video has been removed." });
            setIsDeleteDialogOpen(false);
            setPostToDelete(null);
            if (selectedPost?.id === postToDelete.id) {
                setSelectedPost(null);
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete video." });
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
                            <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] text-white border-white/10 rounded-2xl min-w-[220px] p-2 shadow-2xl z-[100]">
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openEarnings(); }} className="font-black p-4 rounded-xl text-green-400 focus:bg-green-400/10 cursor-pointer">
                                <Zap className="mr-3 h-5 w-5 fill-green-400" /> Creator Studio
                            </DropdownMenuItem>
                            {isCurrentUserAdmin && (
                                <DropdownMenuItem onSelect={() => setTimeout(() => router.push('/admin'), 150)} className="font-black p-4 rounded-xl text-primary focus:bg-primary/10 cursor-pointer">
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
                        <div className="flex flex-col"><p className="font-black text-xl">{posts?.length || 0}</p><p className="text-[10px] uppercase font-bold text-muted-foreground">Posts</p></div>
                        <Link href={`/profile/${userId}/followers`} className="flex flex-col hover:opacity-70"><p className="font-black text-xl">{followers?.length || 0}</p><p className="text-[10px] uppercase font-bold text-muted-foreground">Followers</p></Link>
                        <Link href={`/profile/${userId}/following`} className="flex flex-col hover:opacity-70"><p className="font-black text-xl">{following?.length || 0}</p><p className="text-[10px] uppercase font-bold text-muted-foreground">Following</p></Link>
                    </div>
                </div>
                <div className="mt-4"><p className="font-bold text-lg">{userProfile?.name}</p><p className="text-sm text-muted-foreground">{userProfile?.bio || "A.snap Creator🎬"}</p></div>
                
                {isOwnProfile ? (
                    <div className="flex gap-2 mt-6">
                        <Button className="flex-1 h-12 rounded-2xl bg-secondary/80 font-bold uppercase text-xs" onClick={() => setIsEditSheetOpen(true)}>Edit Profile</Button>
                        <Button className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-500" onClick={openEarnings}><Wallet className="h-5 w-5" /></Button>
                    </div>
                ) : user && (
                    <div className="flex gap-2 mt-6">
                        <Button className={cn("flex-1 h-12 rounded-2xl font-bold uppercase text-xs", isFollowing ? "bg-secondary/50" : "bg-primary")} onClick={handleFollowToggle}>{isFollowing ? 'Following' : 'Follow'}</Button>
                        <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold uppercase text-xs border-white/10" onClick={() => router.push(`/messages/${[user.uid, userId].sort().join('_')}`)}>Message</Button>
                    </div>
                )}
            </div>

            <Tabs defaultValue="posts" className="mt-8">
                <TabsList className="grid w-full grid-cols-1 bg-transparent border-t border-white/5 h-14">
                    <TabsTrigger value="posts" className="data-[state=active]:bg-transparent border-white"><Grid3x3 className="h-6 w-6" /></TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="mt-0">
                    <div className="grid grid-cols-3 gap-0.5">
                        {posts?.map((post) => (
                            <div 
                                key={post.id} 
                                className="aspect-square bg-secondary/30 relative cursor-pointer overflow-hidden group" 
                                onClick={() => setSelectedPost(post)}
                            >
                                <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
                                
                                {isOwnProfile && (
                                    <button 
                                        onClick={(e) => handleDeleteClickFromGrid(e, post)}
                                        className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full text-white shadow-lg border border-white/10 z-10 transition-transform active:scale-90"
                                    >
                                        <Trash2 size={14} className="text-red-500" />
                                    </button>
                                )}

                                {isOwnProfile && post.estimatedEarnings !== undefined && (
                                    <div className="absolute top-2 left-2 bg-green-500/80 backdrop-blur-md px-2 py-0.5 rounded-full z-10 shadow-lg">
                                        <p className="text-[9px] font-black text-white italic">₹{post.estimatedEarnings.toFixed(2)}</p>
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold">
                                    <Play className="h-3 w-3 fill-white" /> {post.viewCount || 0}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Creator Dashboard Payouts & Earnings */}
            <Dialog open={isEarningsOpen} onOpenChange={(open) => {
              setIsEarningsOpen(open);
              if (!open) {
                // Manually force interaction restoration just in case
                document.body.style.pointerEvents = 'auto';
              }
            }}>
                <DialogContent className="bg-[#0a0a0a] border-white/10 p-0 rounded-[2.5rem] max-w-lg w-[95%] overflow-hidden h-[90vh] flex flex-col z-[200]">
                    <DialogHeader className="p-6 border-b border-white/5 bg-gradient-to-br from-green-500/10 via-transparent to-transparent flex flex-row items-center justify-between">
                         <div className="flex items-center gap-3 text-left">
                            <div className="p-2 bg-green-500 rounded-xl"><Zap size={20} className="text-white fill-white" /></div>
                            <div>
                                <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-white">Creator Studio</DialogTitle>
                                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-0.5">Monetization Active</p>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" onClick={() => setIsEarningsOpen(false)} className="rounded-full hover:bg-white/10">
                           <X className="h-6 w-6" />
                         </Button>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide pb-32">
                        <div className="bg-gradient-to-br from-green-600 to-green-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-2">Available Balance</p>
                            <h2 className="text-5xl font-black italic text-white tracking-tighter">₹{earningsStats.available.toFixed(2)}</h2>
                            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/10">
                                <div className="flex-1"><p className="text-[9px] font-bold text-white/50 uppercase">Total Earned</p><p className="text-lg font-black text-white">₹{earningsStats.total.toFixed(2)}</p></div>
                                <div className="flex-1"><p className="text-[9px] font-bold text-white/50 uppercase">Paid Out</p><p className="text-lg font-black text-white">₹{earningsStats.withdrawn.toFixed(2)}</p></div>
                            </div>
                            <Button onClick={() => setIsWithdrawOpen(true)} className="w-full mt-6 h-12 bg-white text-black hover:bg-white/90 font-black uppercase rounded-2xl" disabled={earningsStats.available < 1}>Withdraw Funds</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-secondary/20 p-5 rounded-3xl border border-white/5 text-center"><TrendingUp size={16} className="text-blue-400 mx-auto mb-2" /><p className="text-2xl font-black">{earningsStats.totalViews.toLocaleString()}</p><p className="text-[9px] font-bold text-muted-foreground uppercase">Views</p></div>
                            <div className="bg-secondary/20 p-5 rounded-3xl border border-white/5 text-center"><Eye size={16} className="text-primary mx-auto mb-2" /><p className="text-2xl font-black">{earningsStats.impressions.toLocaleString()}</p><p className="text-[9px] font-bold text-muted-foreground uppercase">Ad Impressions</p></div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2"><History size={16} className="text-muted-foreground" /><h3 className="text-xs font-black uppercase tracking-wider">Payment History</h3></div>
                            {userPayouts?.map(p => (
                                <div key={p.id} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-secondary rounded-lg"><CreditCard size={14} /></div>
                                        <div><p className="text-sm font-black text-white">₹{p.amount.toFixed(2)}</p><p className="text-[9px] text-muted-foreground uppercase">{p.method}</p></div>
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-[8px] font-black uppercase",
                                        p.status === 'pending' ? "bg-yellow-500/20 text-yellow-500" :
                                        p.status === 'paid' ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"
                                    )}>{p.status}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Withdrawal Form Dialog */}
            <Dialog open={isWithdrawOpen} onOpenChange={(open) => {
              setIsWithdrawOpen(open);
              if (!open) {
                document.body.style.pointerEvents = 'auto';
              }
            }}>
                <DialogContent className="bg-[#0a0a0a] border-white/10 rounded-[2.5rem] max-w-lg w-[95%] z-[300]">
                    <DialogHeader><DialogTitle className="text-xl font-black italic uppercase text-center mb-2">Request Cash Out</DialogTitle></DialogHeader>
                    <div className="space-y-6 mt-6">
                        <RadioGroup value={withdrawMethod} onValueChange={(v: any) => setWithdrawMethod(v)} className="flex gap-4">
                            <div className={cn("flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer", withdrawMethod === 'bank' ? "border-primary bg-primary/10" : "border-white/5 bg-secondary/20")}>
                                <RadioGroupItem value="bank" id="bank" className="sr-only" /><Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer font-bold"><CreditCard size={16} /> Bank</Label>
                            </div>
                            <div className={cn("flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer", withdrawMethod === 'paypal' ? "border-primary bg-primary/10" : "border-white/5 bg-secondary/20")}>
                                <RadioGroupItem value="paypal" id="paypal" className="sr-only" /><Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer font-bold"><DollarSign size={16} /> PayPal</Label>
                            </div>
                        </RadioGroup>
                        <Input type="number" placeholder="Amount (₹)" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="h-14 bg-secondary/40 border-white/10 rounded-2xl font-black text-xl text-center" />
                        {withdrawMethod === 'bank' ? (
                            <div className="space-y-4">
                                <Input placeholder="A/C Holder Name" value={payoutDetails.holderName} onChange={(e) => setPayoutDetails({...payoutDetails, holderName: e.target.value})} className="h-12 bg-secondary/40 border-white/5 rounded-xl" />
                                <Input placeholder="Bank Account Number" value={payoutDetails.accountNo} onChange={(e) => setPayoutDetails({...payoutDetails, accountNo: e.target.value})} className="h-12 bg-secondary/40 border-white/5 rounded-xl" />
                                <Input placeholder="Bank IFSC Code" value={payoutDetails.ifsc} onChange={(e) => setPayoutDetails({...payoutDetails, ifsc: e.target.value})} className="h-12 bg-secondary/40 border-white/5 rounded-xl" />
                            </div>
                        ) : (
                            <Input placeholder="PayPal Email Address" value={payoutDetails.paypalEmail} onChange={(e) => setPayoutDetails({...payoutDetails, paypalEmail: e.target.value})} className="h-12 bg-secondary/40 border-white/5 rounded-xl" />
                        )}
                    </div>
                    <DialogFooter className="mt-8 flex gap-3 sm:flex-row">
                        <Button variant="ghost" onClick={() => setIsWithdrawOpen(false)} className="flex-1 rounded-xl h-14 font-black uppercase text-xs">Cancel</Button>
                        <Button onClick={handleWithdrawRequest} disabled={isSubmitting || !withdrawAmount} className="flex-1 bg-primary hover:bg-primary/90 rounded-xl h-14 font-black uppercase text-xs">
                            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Submit Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <EditProfileSheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} userProfile={userProfile} />
            
            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => {
              if (!isOpen) {
                setSelectedPost(null);
                document.body.style.pointerEvents = 'auto';
              }
            }}>
                <DialogContent className="p-0 border-0 bg-black w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center overflow-hidden z-[200]">
                    <DialogTitle className="sr-only">Post Preview</DialogTitle>
                    {selectedPost && <PostCard post={selectedPost} isFocused />}
                </DialogContent>
            </Dialog>

            {/* Global Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                setIsDeleteDialogOpen(open);
                if (!open) document.body.style.pointerEvents = 'auto';
            }}>
                <AlertDialogContent className="bg-[#121212] text-white rounded-[2.5rem] border-white/10 z-[300]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black uppercase italic tracking-wider text-xl">Delete Post?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2">This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-3 sm:flex-row mt-8">
                        <AlertDialogCancel className="rounded-2xl bg-secondary/50 h-14 font-black border-none uppercase text-xs flex-1">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-14 font-black uppercase text-xs flex-1">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <BottomNav />
        </div>
    );
}
