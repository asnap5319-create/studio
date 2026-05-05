'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, orderBy, doc, limit, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2, Users, FileVideo, ArrowLeft, Search, ShieldCheck, AlertTriangle, Loader2, ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PostCard } from "@/components/post-card";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import type { Post } from '@/models/post';

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

    const handleDeleteUser = async (e: React.MouseEvent, userId: string, username: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!firestore || !isAdmin) return;
        if (!confirm(`🚨 महा चेतावनी 🚨\n\nक्या आप वाकई "${username}" को हटाना चाहते हैं?`)) return;

        setIsActionLoading(userId);
        try {
            await deleteDoc(doc(firestore, 'users', userId));
            toast({ title: "सफलता ✅", description: "यूजर डिलीट हो गया।" });
        } catch (error: any) {
            console.error("Delete Error:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "डिलीट नहीं हो पाया।" });
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleDeletePost = async (e: React.MouseEvent, post: Post) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!firestore || !isAdmin) return;
        if (!confirm("इस वीडियो को डिलीट करें?")) return;

        setIsActionLoading(post.id);
        try {
            await deleteDoc(doc(firestore, 'users', post.userId, 'posts', post.id));
            toast({ title: "सफलता ✅", description: "वीडियो डिलीट हो गया।" });
        } catch (error: any) {
            console.error("Delete Error:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "डिलीट नहीं हो पाया।" });
        } finally {
            setIsActionLoading(null);
        }
    };

    if (isUserLoading) return (
        <div className="flex h-screen flex-col items-center justify-center bg-background text-white">
            <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
            <span className="font-bold">एडमिन चेक हो रहा है...</span>
        </div>
    );

    if (!user || !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background text-white">
                <ShieldAlert className="w-20 h-20 text-destructive mb-4 animate-bounce" />
                <h1 className="text-3xl font-black mb-2 text-red-500 uppercase">ACCESS DENIED</h1>
                <p className="text-muted-foreground mb-8">
                    यह पैनल सिर्फ <span className="text-primary font-bold">{ADMIN_EMAIL}</span> के लिए है।
                </p>
                <Button onClick={() => router.push('/feed')}>फीड पर वापस जाएं</Button>
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
                        <p className="text-[10px] text-green-500 font-bold uppercase mt-1">
                            Logged in: {user.email}
                        </p>
                    </div>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="नाम या ईमेल से खोजें..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-secondary/50 border-white/10 rounded-xl"
                    />
                </div>
            </header>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-2xl mb-8 border border-white/5 h-14">
                    <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary font-bold">
                        <Users className="mr-2 h-5 w-5" /> यूजर्स ({users?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-primary font-bold">
                        <FileVideo className="mr-2 h-5 w-5" /> वीडियो ({posts?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <div className="grid grid-cols-1 gap-3">
                        {isUsersLoading ? (
                            <Loader2 className="animate-spin h-10 w-10 mx-auto" />
                        ) : filteredUsers?.length ? filteredUsers.map(u => (
                            <div 
                                key={u.id} 
                                className="flex items-center justify-between p-4 bg-secondary/40 rounded-2xl border border-white/5 hover:border-primary/50 group"
                                onClick={() => router.push(`/profile/${u.id}`)}
                            >
                                <div className="flex items-center gap-4 flex-1 cursor-pointer">
                                    <Avatar className="h-14 w-14 border-2 border-white/10 group-hover:border-primary">
                                        <AvatarImage src={u.profileImageUrl} />
                                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-black truncate group-hover:text-primary transition-colors flex items-center gap-2">
                                            {u.username} <ExternalLink size={12} className="opacity-50" />
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    disabled={isActionLoading === u.id}
                                    className="rounded-xl h-11 w-11 hover:scale-110"
                                    onClick={(e) => handleDeleteUser(e, u.id, u.username || 'User')}
                                >
                                    {isActionLoading === u.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                                </Button>
                            </div>
                        )) : <div className="text-center py-20 opacity-30">कोई डेटा नहीं मिला</div>}
                    </div>
                </TabsContent>

                <TabsContent value="posts">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isPostsLoading ? (
                            <Loader2 className="animate-spin h-10 w-10 mx-auto" />
                        ) : filteredPosts?.length ? filteredPosts.map(p => (
                            <div 
                                key={p.id} 
                                className="bg-secondary/40 rounded-2xl border border-white/5 overflow-hidden group hover:border-primary/50"
                            >
                                <div className="aspect-video relative bg-black cursor-pointer" onClick={() => setSelectedPost(p)}>
                                    {(p.mediaUrl.includes('video') || p.mediaUrl.includes('.mp4') || p.mediaUrl.includes('cloudinary')) ? (
                                        <video src={p.mediaUrl} className="w-full h-full object-contain" muted />
                                    ) : (
                                        <img src={p.mediaUrl} className="w-full h-full object-contain" alt="" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                        <Play className="text-white h-12 w-12 fill-white" />
                                    </div>
                                </div>
                                <div className="p-4 flex justify-between items-start gap-4">
                                    <p className="text-sm font-medium line-clamp-1 flex-1">"{p.caption || 'No caption'}"</p>
                                    <Button 
                                        variant="destructive" 
                                        size="icon" 
                                        disabled={isActionLoading === p.id}
                                        className="rounded-xl h-11 w-11 hover:scale-110" 
                                        onClick={(e) => handleDeletePost(e, p)}
                                    >
                                        {isActionLoading === p.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                                    </Button>
                                </div>
                            </div>
                        )) : <div className="text-center py-20 opacity-30">कोई वीडियो नहीं मिली</div>}
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

            <footer className="mt-12 p-6 bg-red-500/5 rounded-3xl border border-red-500/20 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3 animate-pulse" />
                <h3 className="text-red-500 font-black text-lg mb-2 uppercase italic">Master Warning</h3>
                <p className="text-xs text-muted-foreground font-hindi">यहाँ से डिलीट किया गया डेटा वापस नहीं आएगा।</p>
            </footer>
        </div>
    );
}