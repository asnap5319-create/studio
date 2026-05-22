
'use client';

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { useFCM } from "@/hooks/use-fcm";

function FCMHandler({ children }: { children: React.ReactNode }) {
  useFCM();
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="application-name" content="A.snap" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="A.snap" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Adsterra Social Bar Script */}
        <Script
          id="adsterra-social-bar"
          strategy="afterInteractive"
          src="https://pl29453309.effectivecpmnetwork.com/e9/15/f8/e915f8c7cce368f440d031fe8ec12184.js"
        />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased overflow-x-hidden")}>
        <FirebaseClientProvider>
          <FCMHandler>
            {children}
            <PwaInstallPrompt />
          </FCMHandler>
        </FirebaseClientProvider>
        <SpeedInsights />
        <Toaster />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/firebase-messaging-sw.js').then(function(registration) {
                  console.log('FCM ServiceWorker registration successful');
                }, function(err) {
                  console.log('FCM ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
