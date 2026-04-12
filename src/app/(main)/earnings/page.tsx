'use client';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { UserProfile, Post } from "@/lib/types";
import { doc, collection, query, where, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function EarningsPage() {
    const { user: authUser, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !authUser) return null;
        return doc(firestore, 'users', authUser.uid);
    }, [firestore, authUser]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const userPostsQuery = useMemoFirebase(() => {
        if (!firestore || !authUser) return null;
        return query(
            collection(firestore, 'users', authUser.uid, 'posts'),
            where('mediaType', '==', 'video'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, authUser]);

    const { data: videoPosts, isLoading: postsLoading } = useCollection<Post>(userPostsQuery);

    if (isUserLoading || profileLoading || postsLoading) {
        return (
            <div>
                <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
                     <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-6 w-32" />
                </header>
                <main className="p-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-40" />
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-48 mb-2" />
                            <Skeleton className="h-4 w-full" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>
        )
    }

    if (!userProfile) {
        return <div className="flex justify-center items-center h-screen">Could not load user profile.</div>;
    }

    return (
        <div>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
                <Link href="/profile" className="p-2 -ml-2">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-lg font-semibold font-headline">Earnings</h1>
            </header>
            <main className="p-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardDescription>Total Earnings</CardDescription>
                        <CardTitle>${(userProfile.totalEarnings || 0).toFixed(2)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Video Performance</CardTitle>
                        <CardDescription>Earnings are calculated based on video views.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Video</TableHead>
                                    <TableHead className="text-right">Views</TableHead>
                                    <TableHead className="text-right">Earnings</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {videoPosts && videoPosts.map(post => (
                                    <TableRow key={post.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-16 h-10 rounded-md overflow-hidden shrink-0">
                                                    <Image src={post.mediaUrl} alt={post.caption || 'video thumbnail'} fill className="object-cover" />
                                                </div>
                                                <p className="font-medium truncate">{post.caption || 'Untitled Video'}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{post.viewCount}</TableCell>
                                        <TableCell className="text-right">${post.postEarnings.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {(!videoPosts || videoPosts.length === 0) && (
                            <p className="text-muted-foreground text-center p-8">You don&apos;t have any video posts yet.</p>
                         )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
