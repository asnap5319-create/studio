'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, orderBy, doc, limit, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2, Users, FileVideo, ArrowLeft, Search, ShieldCheck, Loader2, Play, MoreVertical, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { PostCard } from "@/components/post-card";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import type { Post } from '@/models/post';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { BottomNav } from "@/components/bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

const ADMIN_EMAIL = "asnap5319@gmail.com";

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const isAdmin = useMemo(() => {
        if (!user?.email) return false;
        return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    }, [user]);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore]);

    const postsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore]);

    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);
    const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(postsQuery);

    const handleDeleteUser = async (userId: string, username: string) => {
        if (!firestore || !isAdmin) return;
        if (!confirm(`🚨 चेतावनी 🚨\n\nक्या आप वाकई "${username}" की आईडी डिलीट करना चाहते हैं?`)) return;

        setIsActionLoading(userId);
        const userDocRef = doc(firestore, 'users', userId);

        try {
            await deleteDoc(userDocRef);
            toast({ title: "सफलता ✅", description: "यूजर डिलीट हो गया।" });
        } catch (error: any) {
            console.error("Delete Error:", error);
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleDeletePost = async (post: Post) => {
        if (!firestore || !isAdmin) return;
        if (!confirm("क्या आप इस वीडियो को डिलीट करना चाहते हैं?")) return;

        setIsActionLoading(post.id);
        const postDocRef = doc(firestore, 'users', post.userId, 'posts', post.id);

        try {
            await deleteDoc(postDocRef);
            toast({ title: "सफलता ✅", description: "वीडियो डिलीट हो गया।" });
        } catch (error: any) {
            console.error("Delete Error:", error);
            const permissionError = new FirestorePermissionError({
                path: postDocRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsActionLoading(null);
        }
    };

    if (isUserLoading) return (
        <div className="flex h-screen flex-col items-center justify-center bg-background text-white">
            <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
            <span className="font-bold">Admin Checking...</span>
        </div>
    );

    if (!user || !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background text-white">
                <ShieldAlert className="w-20 h-20 text-destructive mb-4 animate-bounce" />
                <h1 className="text-3xl font-black mb-2 text-red-500 uppercase">ACCESS DENIED</h1>
                <p className="text-muted-foreground mb-8">
                    This panel is restricted to <span className="text-primary font-bold">{ADMIN_EMAIL}</span>.
                </p>
                <Button onClick={() => router.push('/')}>Return to Feed</Button>
            </div>
        );
    }

    const filteredUsers = users?.filter(u => 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPosts = posts?.filter(p => 
        p.caption?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.userId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background text-white p-4 max-w-4xl mx-auto pb-24">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-md z-30 py-4 gap-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2 text-primary uppercase italic">
                            <ShieldCheck /> Master Panel
                        </h1>
                        <p className="text-[10px] text-green-500 font-bold mt-1">
                            Admin: {user.email}
                        </p>
                    </div>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-secondary/50 border-white/10 rounded-xl"
                    />
                </div>
            </header>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-2xl mb-8 border border-white/5 h-14">
                    <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary font-bold">
                        <Users className="mr-2 h-5 w-5" /> Users ({users?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-primary font-bold">
                        <FileVideo className="mr-2 h-5 w-5" /> Videos ({posts?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <div className="grid grid-cols-1 gap-3">
                        {isUsersLoading ? (
                            <div className="flex justify-center p-10"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
                        ) : filteredUsers?.length ? filteredUsers.map(u => (
                            <div 
                                key={u.id} 
                                className="flex items-center justify-between p-4 bg-secondary/40 rounded-2xl border border-white/5 hover:border-primary/50 group"
                            >
                                <div 
                                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                                    onClick={() => router.push(`/profile/${u.id}`)}
                                >
                                    <Avatar className="h-14 w-14 border-2 border-white/10 group-hover:border-primary">
                                        <AvatarImage src={u.profileImageUrl} className="object-cover" />
                                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-black truncate group-hover:text-primary transition-colors">
                                            {u.username}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 h-12 w-12">
                                            <MoreVertical className="h-6 w-6" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-border text-white min-w-[180px] p-2 rounded-2xl">
                                        <DropdownMenuItem onClick={() => router.push(`/profile/${u.id}`)} className="focus:bg-primary/20 py-3 rounded-xl cursor-pointer">
                                            <Eye className="mr-3 h-4 w-4" /> View Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-white/5 my-1" />
                                        <DropdownMenuItem 
                                            onClick={() => handleDeleteUser(u.id, u.username || 'User')}
                                            className="focus:bg-destructive/20 text-destructive font-black py-3 rounded-xl cursor-pointer"
                                            disabled={isActionLoading === u.id}
                                        >
                                            <Trash2 className="mr-3 h-4 w-4 text-destructive" /> 
                                            {isActionLoading === u.id ? 'Deleting...' : 'Delete Account'}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )) : <div className="text-center py-20 opacity-30">No users found</div>}
                    </div>
                </TabsContent>

                <TabsContent value="posts">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isPostsLoading ? (
                             <div className="flex justify-center p-10 col-span-full"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
                        ) : filteredPosts?.length ? filteredPosts.map(p => (
                            <div 
                                key={p.id} 
                                className="bg-secondary/40 rounded-2xl border border-white/5 overflow-hidden group hover:border-primary/50 relative"
                            >
                                <div className="aspect-video relative bg-black cursor-pointer" onClick={() => setSelectedPost(p)}>
                                    {p.mediaUrl.includes('video') || p.mediaUrl.includes('.mp4') || p.mediaUrl.includes('cloudinary') ? (
                                        <video src={p.mediaUrl} className="w-full h-full object-contain" muted />
                                    ) : (
                                        <img src={p.mediaUrl} className="w-full h-full object-contain" alt="" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Play className="text-white h-12 w-12 fill-white" />
                                    </div>
                                </div>
                                <div className="p-4 flex justify-between items-center gap-4">
                                    <p className="text-sm font-medium line-clamp-1 flex-1">"{p.caption || 'No caption'}"</p>
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 h-10 w-10">
                                                <MoreVertical className="h-6 w-6" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-border text-white min-w-[180px] p-2 rounded-2xl shadow-2xl">
                                            <DropdownMenuItem onClick={() => setSelectedPost(p)} className="focus:bg-primary/20 py-3 rounded-xl cursor-pointer">
                                                <Play className="mr-3 h-4 w-4" /> Play
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-white/5 my-1" />
                                            <DropdownMenuItem 
                                                onClick={() => handleDeletePost(p)}
                                                className="focus:bg-destructive/20 text-destructive font-black py-3 rounded-xl cursor-pointer"
                                                disabled={isActionLoading === p.id}
                                            >
                                                <Trash2 className="mr-3 h-4 w-4 text-destructive" /> 
                                                {isActionLoading === p.id ? 'Deleting...' : 'Delete Video'}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )) : <div className="text-center py-20 opacity-30">No videos found</div>}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black/90 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center overflow-hidden">
                    {selectedPost && (
                        <>
                            <DialogTitle className="sr-only">Admin Preview</DialogTitle>
                            <PostCard post={selectedPost} />
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <PwaInstallPrompt />
            <BottomNav />
        </div>
    );
}
