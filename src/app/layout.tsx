import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import Script from "next/script";

export const metadata: Metadata = {
  title: "A.snap - Share Your World in Short Videos",
  description: "A.snap is the ultimate premium short video sharing application.",
  manifest: "/manifest.json",
  icons: {
    icon: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNTAgMTAgTDE1IDkwIEwzMCA5MCBMNDAgNjUgTDYwIDY1IEw3MCA5MCBMODUgOTAgWiBNNTAgMzAgTDU1IDU1IEw0NSA1NSBaIiBmaWxsPSIjZmYzMzY2Ii8+PC9zdmc+",
    apple: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzBhMGEwYSIvPjxwYXRoIGQ9Ik01MCAxMCBMMTUgOTAgTDMwIDkwIEw0MCA2NSBMNjAgNjUgTDcwIDkwIEw4NSA5MCBaIE01MCAzMCBMNTUgNTUgTDQ1IDU1IFoiIGZpbGw9IiNmZjMzNjYiLz48L3N2Zz4=",
  },
  other: {
    "google-adsense-account": "ca-pub-6100214178274409",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent"
  },
};

export const viewport: Viewport = {
  themeColor: "#ff3366",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6100214178274409"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}