'use client';
import { useState, useMemo, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { useCollection, useDoc, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, where, limit } from "firebase/firestore";
import { MoreVertical, LogOut, BadgeCheck, Loader2, Wallet, Zap, Settings, Trophy, Shield, PlusCircle, ArrowUpRight, HelpCircle, Target, History, Clock, CheckCircle2, XCircle, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { EditProfileSheet } from "@/components/edit-profile";
import type { UserProfile } from "@/models/user";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import Link from "next/link";
import { SupportChat } from "@/components/support-chat";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProfileShareSheet } from "@/components/profile-share-sheet";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ADMIN_EMAIL = "asnap5319@gmail.com";

export default function ProfilePage() {
    const params = useParams();
    const userId = params?.userId as string;
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { firestore, auth } = useFirebase();
    const { toast } = useToast();
    
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
    const [historyType, setHistoryType] = useState<'deposit' | 'withdraw' | null>(null);

    const isOwnProfile = user?.uid === userId;
    const isCurrentUserAdmin = user?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    
    const userProfileRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile & { virtualBalance?: number }>(userProfileRef);
    const isProfileAdmin = userProfile?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Payment History Queries
    const depositsQuery = useMemoFirebase(() => 
        (firestore && userId) ? query(collection(firestore, 'deposit_requests'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(20)) : null, 
    [firestore, userId]);

    const withdrawsQuery = useMemoFirebase(() => 
        (firestore && userId) ? query(collection(firestore, 'withdraw_requests'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(20)) : null, 
    [firestore, userId]);

    const { data: deposits } = useCollection<any>(depositsQuery);
    const { data: withdraws } = useCollection<any>(withdrawsQuery);

    const handleLogout = async () => {
        await signOut(auth!);
        router.push('/login?auth=true');
    };

    if (isUserLoading || isProfileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
    
    return (
        <div className="min-h-screen bg-background text-foreground pb-32 select-none">
            {/* Header */}
            <header className="p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border/50">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-primary/20">A</div>
                   <h1 className="text-xl font-black tracking-tighter uppercase italic">Account</h1>
                </div>
                <div className="flex items-center gap-2">
                    {isOwnProfile && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50"><MoreVertical /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover text-popover-foreground border-border rounded-2xl min-w-[220px] p-2 shadow-2xl z-[100]">
                                <DropdownMenuItem onSelect={() => setIsEditSheetOpen(true)} className="font-bold p-4 rounded-xl focus:bg-accent cursor-pointer">
                                    <Settings className="mr-3 h-5 w-5 text-primary" /> Edit Account
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setIsShareSheetOpen(true)} className="font-bold p-4 rounded-xl focus:bg-accent cursor-pointer">
                                    <Trophy className="mr-3 h-5 w-5 text-yellow-500" /> Share Profile
                                </DropdownMenuItem>
                                {isCurrentUserAdmin && (
                                    <DropdownMenuItem onSelect={() => router.push('/admin')} className="font-bold p-4 rounded-xl focus:bg-accent cursor-pointer">
                                        <ShieldCheck className="mr-3 h-5 w-5 text-blue-600" /> Master Panel
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </header>

            <main className="w-full space-y-6 mt-6">
                {/* Profile Card - Premium Redesign */}
                <div className="px-4">
                    <div className="bg-secondary/40 border border-border p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col items-center text-center gap-4 shadow-inner">
                        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                            <Shield size={140} />
                        </div>
                        
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-purple-600 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                            <Avatar className="h-28 w-28 border-4 border-background relative shadow-2xl">
                                <AvatarImage src={userProfile?.profileImageUrl} className="object-cover" />
                                <AvatarFallback className="text-3xl font-black bg-secondary">{userProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-xl shadow-lg border-2 border-background z-10">
                                <BadgeCheck size={18} />
                            </div>
                        </div>

                        <div className="space-y-1.5 z-10">
                            <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center justify-center gap-2 italic">
                                {userProfile?.username}
                                {isProfileAdmin && <BadgeCheck className="h-5 w-5 text-blue-400" />}
                            </h2>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">VIP Member • Active Status</p>
                            <p className="text-xs text-muted-foreground font-medium max-w-xs leading-relaxed mt-2">{userProfile?.bio || "A.snap Pro Creator🎬"}</p>
                        </div>
                    </div>
                </div>

                {/* Gaming Wallet Section */}
                {isOwnProfile && (
                    <div className="px-4">
                        <div className="bg-money-pattern p-6 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group border border-white/5">
                           <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                              <Wallet size={120} />
                           </div>
                           
                           <div className="relative z-10 space-y-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/70 flex items-center gap-2">
                                        Virtual Balance
                                    </p>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-2xl font-black text-white/80">₹</span>
                                      <h2 className="text-5xl font-black tracking-tighter drop-shadow-2xl" style={{ fontStyle: 'normal' }}>
                                          {userProfile?.virtualBalance?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '0.0'}
                                      </h2>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <Link href="/deposit" className="flex-1">
                                    <Button 
                                        className="w-full bg-white text-blue-700 hover:bg-white/90 rounded-2xl h-14 font-black uppercase text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                                    >
                                        <PlusCircle size={18} /> Deposit
                                    </Button>
                                  </Link>
                                  <Link href="/withdraw" className="flex-1">
                                    <Button 
                                        className="w-full bg-blue-800/40 text-white hover:bg-blue-800/60 border border-white/20 rounded-2xl h-14 font-black uppercase text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all backdrop-blur-sm"
                                    >
                                        <ArrowUpRight size={18} /> Withdraw
                                    </Button>
                                  </Link>
                                </div>
                           </div>
                        </div>
                    </div>
                )}

                {/* History Grid - Optimized for User Clarity */}
                <div className="px-4 grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setHistoryType('deposit')}
                        className="bg-secondary/30 p-5 rounded-[2rem] border border-border flex flex-col items-center text-center gap-2 hover:bg-secondary/50 transition-all active:scale-95"
                    >
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><History size={20} /></div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Deposit History</p>
                    </button>
                    <button 
                        onClick={() => setHistoryType('withdraw')}
                        className="bg-secondary/30 p-5 rounded-[2rem] border border-border flex flex-col items-center text-center gap-2 hover:bg-secondary/50 transition-all active:scale-95"
                    >
                        <div className="p-2 bg-red-500/10 rounded-xl text-red-500"><History size={20} /></div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Withdraw History</p>
                    </button>
                </div>

                {/* Feature List */}
                <div className="px-4 space-y-3 pb-8">
                    <button onClick={() => toast({ title: "Rules Page 🎮", description: "Coming soon with Jalwa rules." })} className="w-full p-5 bg-secondary/50 hover:bg-secondary rounded-2xl border border-border transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-blue-600/10 rounded-xl text-blue-600 group-hover:scale-110 transition-transform"><Target size={20} /></div>
                            <div className="text-left">
                                <p className="text-xs font-black uppercase text-foreground tracking-tighter">Game Rules</p>
                                <p className="text-[8px] text-muted-foreground font-bold uppercase">Fair Play Guide</p>
                            </div>
                        </div>
                        <ArrowUpRight size={14} className="text-muted-foreground" />
                    </button>

                    <button onClick={() => setIsSupportOpen(true)} className="w-full p-5 bg-secondary/50 hover:bg-secondary rounded-2xl border border-border transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-purple-600/10 rounded-xl text-purple-600 group-hover:scale-110 transition-transform"><HelpCircle size={20} /></div>
                            <div className="text-left">
                                <p className="text-xs font-black uppercase text-foreground tracking-tighter">Support Center</p>
                                <p className="text-[8px] text-muted-foreground font-bold uppercase">Help & Admin Chat</p>
                            </div>
                        </div>
                        <ArrowUpRight size={14} className="text-muted-foreground" />
                    </button>

                    {isOwnProfile && (
                      <button 
                        onClick={handleLogout} 
                        className="w-full p-5 bg-destructive/5 hover:bg-destructive/10 rounded-2xl border border-destructive/10 transition-all flex items-center justify-between group mt-4"
                      >
                          <div className="flex items-center gap-4">
                              <div className="p-2.5 bg-destructive/10 rounded-xl text-destructive group-hover:scale-110 transition-transform"><LogOut size={20} /></div>
                              <div className="text-left">
                                  <p className="text-xs font-black uppercase text-destructive tracking-tighter">Logout</p>
                                  <p className="text-[8px] text-muted-foreground font-bold uppercase">Securely sign out</p>
                              </div>
                          </div>
                      </button>
                    )}
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

            {/* History Sheet - Custom Status Display */}
            <Sheet open={historyType !== null} onOpenChange={(open) => !open && setHistoryType(null)}>
                <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-[3rem] overflow-hidden bg-background border-none shadow-2xl z-[200]">
                    <SheetHeader className="p-6 border-b border-white/5 bg-secondary/20">
                        <SheetTitle className="text-xl font-black uppercase italic tracking-tighter text-center flex items-center justify-center gap-3">
                            <History className="text-primary" />
                            {historyType === 'deposit' ? 'Deposit History' : 'Withdrawal History'}
                        </SheetTitle>
                    </SheetHeader>
                    <div className="p-4 space-y-4 overflow-y-auto h-full pb-32 scrollbar-hide">
                        {historyType === 'deposit' ? (
                            deposits && deposits.length > 0 ? (
                                deposits.map((d: any) => (
                                    <div key={d.id} className="bg-secondary/40 p-5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-secondary/60 transition-all">
                                        <div className="space-y-1">
                                            <p className="text-2xl font-black text-white" style={{ fontStyle: 'normal' }}>₹{d.amount}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                                <Clock size={10} /> {d.createdAt ? format(d.createdAt.toDate(), 'dd MMM, HH:mm') : 'Recently'}
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase shadow-lg",
                                            d.status === 'approved' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : 
                                            d.status === 'rejected' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                            "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                                        )}>
                                            {d.status === 'approved' ? (
                                                <><CheckCircle2 size={12} /> COMPLETE</>
                                            ) : d.status === 'rejected' ? (
                                                <><XCircle size={12} /> FAILED</>
                                            ) : (
                                                <><Clock size={12} className="animate-pulse" /> PENDING</>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : <div className="text-center py-20 opacity-30 italic text-sm">No deposits yet</div>
                        ) : (
                            withdraws && withdraws.length > 0 ? (
                                withdraws.map((w: any) => (
                                    <div key={w.id} className="bg-secondary/40 p-5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-secondary/60 transition-all">
                                        <div className="space-y-1">
                                            <p className="text-2xl font-black text-red-500" style={{ fontStyle: 'normal' }}>-₹{w.amount}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                                <Clock size={10} /> {w.createdAt ? format(w.createdAt.toDate(), 'dd MMM, HH:mm') : 'Recently'}
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase shadow-lg",
                                            w.status === 'approved' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : 
                                            w.status === 'rejected' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                            "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                                        )}>
                                            {w.status === 'approved' ? (
                                                <><Zap size={12} /> PAID</>
                                            ) : w.status === 'rejected' ? (
                                                <><XCircle size={12} /> FAILED</>
                                            ) : (
                                                <><Clock size={12} className="animate-pulse" /> PENDING</>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : <div className="text-center py-20 opacity-30 italic text-sm">No withdrawals yet</div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                <DialogContent className="bg-background border-border p-0 rounded-[2.5rem] max-w-lg w-[95%] h-[85vh] overflow-hidden z-[300]">
                    <DialogHeader className="sr-only"><DialogTitle>Game Support</DialogTitle></DialogHeader>
                    <SupportChat 
                        userProfile={userProfile} 
                        stats={{
                            followers: 0,
                            posts: 0,
                            views: 0,
                            earnings: userProfile?.virtualBalance || 0
                        }} 
                    />
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
}
