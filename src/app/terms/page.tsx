'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto pb-24">
            <header className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
                <h1 className="text-2xl font-black uppercase italic">Terms of Service</h1>
            </header>
            
            <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
                <section>
                    <h2 className="text-white font-bold text-lg mb-2">1. Acceptance of Terms</h2>
                    <p>By using A.snap, you agree to comply with our community guidelines. You must not upload illegal, harmful, or copyright-infringing content.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-lg mb-2">2. User Content</h2>
                    <p>You retain ownership of the reels you upload, but you grant A.snap a license to host and display your content to other users on the platform.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-lg mb-2">3. Monetization Rules</h2>
                    <p>Monetization is a privilege, not a right. We reserve the right to withhold earnings if fraudulent activity or bot views are detected on your account.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-lg mb-2">4. Termination</h2>
                    <p>We may suspend or delete accounts that violate our terms or engage in spam behavior to protect our community.</p>
                </section>

                <p className="text-[10px] uppercase font-bold mt-10">© 2023 A.snap Platform | All Rights Reserved</p>
            </div>
        </div>
    );
}
