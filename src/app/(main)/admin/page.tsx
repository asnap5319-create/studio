'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, collectionGroup, query, orderBy, deleteDoc, doc, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2, Users, FileVideo, ArrowLeft, Search, ShieldCheck, RefreshCw, AlertTriangle, User, Loader2, ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PostCard } from "@/components/post-card";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import type { Post } from '@/models/post';
import { format } from 'date-fns';
import Link from 'next/link';

const ADMIN_EMAIL = "asnap5319@gmail.com";

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    // Strict admin check
    const isAdmin = useMemo(() => {
        if (!user?.email) return false;
        return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    }, [user]);

    // Query for Users
    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore]);

    // Query for Posts
    const postsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore]);

    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);
    const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(postsQuery);

    const handleDeleteUser = async (e: React.MouseEvent, userId: string, username: string) => {
        e.stopPropagation();
        if (!firestore) return;
        if (!confirm(`क्या आप वाकई "${username}" (ID: ${userId}) को हमेशा के लिए हटाना चाहते हैं?`)) return;

        setIsActionLoading(userId);
        const userRef = doc(firestore, 'users', userId);

        try {
            await deleteDoc(userRef);
            toast({ 
                title: "डिलीट सफल ✅", 
                description: `यूजर "${username}" डेटाबेस से हटा दिया गया है।` 
            });
        } catch (err: any) {
            console.error("Delete Error:", err);
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ 
                variant: 'destructive', 
                title: "डिलीट फेल ❌", 
                description: `कारण: ${err.message || 'अनुमति नहीं है'}` 
            });
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleDeletePost = async (e: React.MouseEvent, post: Post) => {
        e.stopPropagation();
        if (!firestore) return;
        if (!confirm("इस वीडियो को हमेशा के लिए डिलीट करें?")) return;

        setIsActionLoading(post.id);
        const postRef = doc(firestore, 'users', post.userId, 'posts', post.id);

        try {
            await deleteDoc(postRef);
            toast({ 
                title: "सफलता ✅", 
                description: "वीडियो सफलतापूर्वक हटा दिया गया है।" 
            });
        } catch (err: any) {
            console.error("Post Delete Error:", err);
            const permissionError = new FirestorePermissionError({
                path: postRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ 
                variant: 'destructive', 
                title: "Error ❌", 
                description: `वीडियो डिलीट नहीं हुआ: ${err.message}` 
            });
        } finally {
            setIsActionLoading(null);
        }
    };

    if (isUserLoading) return (
        <div className="flex h-screen flex-col items-center justify-center bg-background text-white">
            <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
            <span className="font-bold font-hindi text-xl">एडमिन पावर चेक हो रही है...</span>
        </div>
    );

    if (!user || !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background text-white">
                <ShieldAlert className="w-20 h-20 text-destructive mb-4 animate-bounce" />
                <h1 className="text-3xl font-black mb-2 italic text-red-500 uppercase tracking-tighter">ACCESS DENIED</h1>
                <p className="text-muted-foreground mb-4 font-hindi">
                    आप <span className="text-white font-bold underline">{user?.email || 'अनजान यूजर'}</span> से लॉगिन हैं।
                </p>
                <p className="text-sm text-muted-foreground mb-8 max-w-xs font-hindi">
                    यह कंट्रोल पैनल सिर्फ <span className="text-primary font-bold">{ADMIN_EMAIL}</span> के लिए सुरक्षित है।
                </p>
                <Button onClick={() => router.push('/feed')} className="px-10 py-6 text-lg font-bold rounded-2xl">फीड पर वापस जाएं</Button>
            </div>
        );
    }

    const filteredUsers = users?.filter(u => 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPosts = posts?.filter(p => 
        p.caption?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background text-white p-4 max-w-4xl mx-auto pb-24">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-md z-30 py-4 gap-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-primary/20 rounded-xl">
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2 italic text-primary uppercase tracking-tight">
                            <ShieldCheck className="text-primary" /> Master Panel
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                                Logged in as: {user.email}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="नाम, ईमेल या ID से खोजें..." 
                        value={searchTerm}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-secondary/50 border-white/10 rounded-xl focus:ring-primary h-11"
                    />
                </div>
            </header>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-2xl mb-8 border border-white/5 h-14">
                    <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-base transition-all">
                        <Users className="mr-2 h-5 w-5" /> यूजर्स ({users?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-base transition-all">
                        <FileVideo className="mr-2 h-5 w-5" /> वीडियो ({posts?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 gap-3">
                        {isUsersLoading ? (
                            Array.from({length: 5}).map((_, i) => <div key={i} className="h-20 bg-secondary/30 rounded-2xl animate-pulse" />)
                        ) : filteredUsers?.length ? filteredUsers.map(u => (
                            <div 
                                key={u.id} 
                                onClick={() => router.push(`/profile/${u.id}`)}
                                className="flex items-center justify-between p-4 bg-secondary/40 rounded-2xl border border-white/5 hover:border-primary/50 transition-all group cursor-pointer active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <Avatar className="h-14 w-14 border-2 border-white/10 group-hover:border-primary/50 transition-colors">
                                        <AvatarImage src={u.profileImageUrl} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{u.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-black text-base truncate group-hover:text-primary transition-colors flex items-center gap-2">
                                            {u.username} <ExternalLink size={12} className="opacity-0 group-hover:opacity-50" />
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                        <p className="text-[9px] text-primary/60 font-mono mt-1 tracking-tighter">ID: {u.id}</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    disabled={isActionLoading === u.id}
                                    className="rounded-xl h-11 w-11 shadow-lg shadow-destructive/20 hover:scale-110 transition-transform shrink-0"
                                    onClick={(e) => handleDeleteUser(e, u.id, u.username || 'User')}
                                >
                                    {isActionLoading === u.id ? <RefreshCw className="animate-spin h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                                </Button>
                            </div>
                        )) : (
                            <div className="text-center py-20 opacity-30">
                                <Users className="h-16 w-16 mx-auto mb-2" />
                                <p className="font-bold font-hindi">कोई डेटा नहीं मिला</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="posts" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isPostsLoading ? (
                            Array.from({length: 4}).map((_, i) => <div key={i} className="aspect-video bg-secondary/30 rounded-2xl animate-pulse" />)
                        ) : filteredPosts?.length ? filteredPosts.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => setSelectedPost(p)}
                                className="bg-secondary/40 rounded-2xl border border-white/5 overflow-hidden group hover:border-primary/50 transition-all cursor-pointer active:scale-[0.98]"
                            >
                                <div className="aspect-video relative bg-black flex items-center justify-center">
                                    {(p.mediaUrl.includes('video') || p.mediaUrl.includes('.mp4') || p.mediaUrl.includes('cloudinary')) ? (
                                        <video src={p.mediaUrl} className="w-full h-full object-contain" muted playsInline />
                                    ) : (
                                        <img src={p.mediaUrl} className="w-full h-full object-contain" alt="" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Play className="text-white h-12 w-12 fill-white" />
                                    </div>
                                    <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold text-primary uppercase tracking-widest">
                                        PREVIEW VIDEO
                                    </div>
                                </div>
                                <div className="p-4 flex justify-between items-start gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium line-clamp-1 mb-2 text-white/90 italic">"{p.caption || 'No caption'}"</p>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <User size={10} /> Owner ID: {p.userId.slice(0, 15)}...
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                📅 {p.createdAt ? format(p.createdAt.toDate(), 'MMM d, yyyy HH:mm') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="destructive" 
                                        size="icon" 
                                        disabled={isActionLoading === p.id}
                                        className="shrink-0 rounded-xl h-11 w-11 shadow-lg shadow-destructive/20 hover:scale-110 transition-transform" 
                                        onClick={(e) => handleDeletePost(e, p)}
                                    >
                                        {isActionLoading === p.id ? <RefreshCw className="animate-spin h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full text-center py-20 opacity-30">
                                <FileVideo className="h-16 w-16 mx-auto mb-2" />
                                <p className="font-bold font-hindi">कोई वीडियो नहीं मिली</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Video Preview Modal */}
            <Dialog open={!!selectedPost} onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black/90 w-full max-w-lg h-screen sm:h-[90vh] flex items-center justify-center overflow-hidden">
                    {selectedPost && (
                        <>
                            <DialogTitle className="sr-only">Admin Preview: {selectedPost.id}</DialogTitle>
                            <PostCard post={selectedPost} />
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <footer className="mt-12 p-6 bg-red-500/5 rounded-3xl border border-red-500/20 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3 animate-pulse" />
                <h3 className="text-red-500 font-black text-lg mb-2 uppercase italic tracking-tighter">Master Warning</h3>
                <p className="text-xs text-muted-foreground font-hindi leading-relaxed max-w-sm mx-auto">
                    यहाँ से किसी भी आइटम को डिलीट करने पर उसे रिकवर नहीं किया जा सकता। <br/>
                    <span className="text-white font-bold underline decoration-red-500">सावधानी से इस्तेमाल करें।</span>
                </p>
            </footer>
        </div>
    );
}