
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, orderBy, deleteDoc, doc, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2, Users, FileVideo, ArrowLeft, Search, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/models/user';
import type { Post } from '@/models/post';
import { format } from 'date-fns';

const ADMIN_EMAIL = "asnap5319@gmail.com";

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');

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

    // Query for Posts (Collection Group)
    const postsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore]);

    const { data: users, isLoading: isUsersLoading, error: usersError } = useCollection<UserProfile>(usersQuery);
    const { data: posts, isLoading: isPostsLoading, error: postsError } = useCollection<Post>(postsQuery);

    const handleDeleteUser = async (userId: string) => {
        if (!firestore || !confirm("Are you sure? This will delete the USER PROFILE document. Sub-collections like posts will remain in database but hidden from profile.")) return;
        try {
            await deleteDoc(doc(firestore, 'users', userId));
            toast({ title: "User Profile Deleted", description: "The user's main profile has been removed." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Delete Failed", description: "Permission denied or network error." });
        }
    };

    const handleDeletePost = async (post: Post) => {
        if (!firestore || !confirm("Delete this video permanently?")) return;
        try {
            // Path: /users/{userId}/posts/{postId}
            await deleteDoc(doc(firestore, 'users', post.userId, 'posts', post.id));
            toast({ title: "Video Deleted", description: "Post removed successfully from database." });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Error", description: "Could not delete this post." });
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    if (isUserLoading) return (
        <div className="flex h-screen items-center justify-center bg-background text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mr-3"></div>
            <span className="font-bold">Verifying Admin Permissions...</span>
        </div>
    );

    if (!user || !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background text-white">
                <ShieldAlert className="w-20 h-20 text-destructive mb-4" />
                <h1 className="text-3xl font-black mb-2 italic">ACCESS DENIED</h1>
                <p className="text-muted-foreground mb-6 max-w-xs">This high-security panel is restricted to the owner: <span className="text-primary font-bold">{ADMIN_EMAIL}</span></p>
                <Button onClick={() => router.push('/feed')} className="px-10 py-6 text-lg font-bold">Exit Panel</Button>
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

    const hasIndexError = (usersError?.message.includes('index')) || (postsError?.message.includes('index'));

    return (
        <div className="min-h-screen bg-background text-white p-4 max-w-4xl mx-auto pb-24">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-md z-30 py-4 gap-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-primary/20">
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2 italic text-primary">
                            <ShieldCheck className="text-primary animate-pulse" /> ADMIN CONTROL
                        </h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Full Database Access</p>
                    </div>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search users or captions..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-secondary/50 border-white/10 rounded-xl focus:ring-primary"
                    />
                </div>
            </header>

            {hasIndexError && (
                <div className="mb-8 p-6 bg-primary/10 rounded-2xl border border-primary/20 text-center">
                    <Database className="h-10 w-10 text-primary mx-auto mb-3" />
                    <h3 className="font-bold text-lg mb-1">Index Setup Required</h3>
                    <p className="text-sm text-muted-foreground mb-4 px-4">
                        Google needs a search index to list all users and posts here. Please check the browser console for the link to create it.
                    </p>
                    <Button variant="outline" onClick={handleRefresh} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Refresh after creating
                    </Button>
                </div>
            )}

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-2xl mb-8 border border-white/5">
                    <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-bold h-12">
                        <Users className="mr-2 h-5 w-5" /> Users ({users?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-bold h-12">
                        <FileVideo className="mr-2 h-5 w-5" /> Videos ({posts?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 gap-3">
                        {isUsersLoading ? (
                            Array.from({length: 5}).map((_, i) => <div key={i} className="h-20 bg-secondary/30 rounded-2xl animate-pulse" />)
                        ) : filteredUsers?.length ? filteredUsers.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-4 bg-secondary/40 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-14 w-14 border-2 border-white/10 group-hover:border-primary/50 transition-colors">
                                        <AvatarImage src={u.profileImageUrl} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{u.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-black text-base truncate">{u.username}</p>
                                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                        <p className="text-[9px] text-primary/60 font-mono mt-1 uppercase tracking-tighter">UID: {u.id}</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="rounded-xl h-11 w-11 shadow-lg shadow-destructive/20"
                                    onClick={() => handleDeleteUser(u.id)}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        )) : (
                            <div className="text-center py-20 opacity-30">
                                <Users className="h-16 w-16 mx-auto mb-2" />
                                <p className="font-bold">No Users Found</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="posts" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isPostsLoading ? (
                            Array.from({length: 4}).map((_, i) => <div key={i} className="aspect-video bg-secondary/30 rounded-2xl animate-pulse" />)
                        ) : filteredPosts?.length ? filteredPosts.map(p => (
                            <div key={p.id} className="bg-secondary/40 rounded-2xl border border-white/5 overflow-hidden group hover:border-primary/30 transition-all">
                                <div className="aspect-video relative bg-black">
                                    {(p.mediaUrl.includes('video') || p.mediaUrl.includes('.mp4') || p.mediaUrl.includes('cloudinary')) ? (
                                        <video src={p.mediaUrl} className="w-full h-full object-contain" muted playsInline />
                                    ) : (
                                        <img src={p.mediaUrl} className="w-full h-full object-contain" alt="" />
                                    )}
                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold text-primary">
                                        VIDEO ID: {p.id.slice(0, 8)}...
                                    </div>
                                </div>
                                <div className="p-4 flex justify-between items-start gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium line-clamp-2 mb-3 text-white/90">"{p.caption || 'No caption'}"</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Users size={10} /> {p.userId.slice(0, 10)}...
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                📅 {p.createdAt ? format(p.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="destructive" 
                                        size="icon" 
                                        className="shrink-0 rounded-xl h-10 w-10 shadow-lg shadow-destructive/20 hover:scale-110 transition-transform" 
                                        onClick={() => handleDeletePost(p)}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full text-center py-20 opacity-30">
                                <FileVideo className="h-16 w-16 mx-auto mb-2" />
                                <p className="font-bold">No Videos Available</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
