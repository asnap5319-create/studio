import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from "@/firebase/client-provider";

export const metadata: Metadata = {
  title: "A.snap - Share Your World in Short Videos",
  description: "A.snap is the ultimate premium short video sharing application. Create, share, and discover amazing visual content with friends in real-time.",
  keywords: ["A.snap", "Short Video", "Social Media", "Video Sharing", "A snap", "Trending Videos"],
  authors: [{ name: "A.snap Team" }],
  openGraph: {
    title: "A.snap - Short Video Sharing",
    description: "Join A.snap and start sharing your world through amazing short videos.",
    type: "website",
    siteName: "A.snap",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
       <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
