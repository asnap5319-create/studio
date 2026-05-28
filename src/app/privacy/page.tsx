'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto pb-24">
            <header className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
                <h1 className="text-2xl font-black uppercase italic">Privacy Policy</h1>
            </header>
            
            <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
                <section>
                    <h2 className="text-white font-bold text-lg mb-2">1. Information We Collect</h2>
                    <p>A.snap collects information you provide when creating an account, such as your username, email, and profile picture. We also host the video content (reels) you upload to our platform.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-lg mb-2">2. How We Use Data</h2>
                    <p>We use your data to provide social networking services, personalize your feed, and enable monetization features based on your video views and engagement.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-lg mb-2">3. Data Security</h2>
                    <p>We use Firebase's secure cloud infrastructure to protect your data. Your private messages and account details are encrypted and protected by strict security rules.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold text-lg mb-2">4. Third-Party Services</h2>
                    <p>We use Cloudinary for media storage and Adsterra for monetization. These services have their own privacy policies regarding data handling.</p>
                </section>

                <p className="text-[10px] uppercase font-bold mt-10">Last Updated: October 2023 | A.snap Official</p>
            </div>
        </div>
    );
}
