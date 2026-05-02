
'use client';

import { useState } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, orderBy, deleteDoc, doc, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2, Users, FileVideo, ArrowLeft, Search, ShieldCheck } from 'lucide-react';
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

    // Stronger admin check
    const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Queries for Admin
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

    const handleDeleteUser = async (userId: string) => {
        if (!firestore || !confirm("Are you sure you want to delete this user? All their data will remain but profile will be gone.")) return;
        try {
            await deleteDoc(doc(firestore, 'users', userId));
            toast({ title: "User Deleted" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete user." });
        }
    };

    const handleDeletePost = async (post: Post) => {
        if (!firestore || !confirm("Delete this post permanently?")) return;
        try {
            await deleteDoc(doc(firestore, 'users', post.userId, 'posts', post.id));
            toast({ title: "Post Deleted" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete post." });
        }
    };

    if (isUserLoading) return (
        <div className="flex h-screen items-center justify-center bg-background text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mr-3"></div>
            <span>Verifying Admin...</span>
        </div>
    );

    if (!user || !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background text-white">
                <ShieldAlert className="w-20 h-20 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground mb-6">This area is for the site administrator only.</p>
                <Button onClick={() => router.push('/feed')}>Go Back Home</Button>
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
        <div className="min-h-screen bg-background text-white p-4 max-w-4xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-md z-10 py-4 gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShieldCheck className="text-primary" /> Admin Panel
                    </h1>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search users or posts..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-secondary border-none"
                    />
                </div>
            </header>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-secondary mb-8">
                    <TabsTrigger value="users" className="data-[state=active]:bg-primary">
                        <Users className="mr-2 h-4 w-4" /> Users ({users?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="posts" className="data-[state=active]:bg-primary">
                        <FileVideo className="mr-2 h-4 w-4" /> Posts ({posts?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="animate-in fade-in duration-300">
                    <div className="space-y-4">
                        {isUsersLoading ? <p className="text-center p-10 opacity-50">Loading users...</p> : 
                        filteredUsers?.length ? filteredUsers.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={u.profileImageUrl} />
                                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold">{u.username}</p>
                                        <p className="text-xs text-muted-foreground">{u.email}</p>
                                    </div>
                                </div>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(u.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )) : <p className="text-center p-10 opacity-50">No users found.</p>}
                    </div>
                </TabsContent>

                <TabsContent value="posts" className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isPostsLoading ? <p className="text-center p-10 opacity-50">Loading posts...</p> : 
                        filteredPosts?.length ? filteredPosts.map(p => (
                            <div key={p.id} className="bg-secondary/50 rounded-xl border border-border overflow-hidden">
                                <div className="aspect-video relative bg-black">
                                    {p.mediaUrl.includes('video') || p.mediaUrl.includes('.mp4') || p.mediaUrl.includes('cloudinary') ? (
                                        <video src={p.mediaUrl} className="w-full h-full object-contain" muted playsInline />
                                    ) : (
                                        <img src={p.mediaUrl} className="w-full h-full object-contain" alt="" />
                                    )}
                                </div>
                                <div className="p-4 flex justify-between items-start">
                                    <div>
                                        <p className="text-sm line-clamp-2 mb-2 font-medium">{p.caption}</p>
                                        <p className="text-[10px] text-muted-foreground">User ID: {p.userId}</p>
                                        <p className="text-[10px] text-muted-foreground">Date: {p.createdAt ? format(p.createdAt.toDate(), 'PPP') : 'N/A'}</p>
                                    </div>
                                    <Button variant="destructive" size="icon" className="shrink-0" onClick={() => handleDeletePost(p)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )) : <p className="text-center p-10 opacity-50">No posts found.</p>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
