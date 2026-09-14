'use client';

import React, { useState, useEffect } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { PwaInstallPrompt, Logo } from "@/components/pwa-install-prompt";
import { NotificationPermissionPrompt } from "@/components/notification-permission-prompt";
import { useFCM } from "@/hooks/use-fcm";

/**
 * Instagram-style Splash Screen with Glowing WinGo
 * अभिषेक भाई, बैकग्राउंड को काला कर दिया है ताकि लोगो और WinGo चमके
 */
function SplashScreen() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setHasMounted(true);
    // Show splash for 2.5 seconds
    const timer = setTimeout(() => setIsVisible(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!hasMounted || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="relative w-32 h-32 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(255,51,102,0.2)] overflow-hidden scale-110 mb-8 animate-float">
            <Logo className="w-full h-full drop-shadow-2xl" />
            <div className="absolute inset-0 border-2 border-white/10 rounded-[2.5rem] pointer-events-none" />
        </div>
        
        <div className="mt-4 px-6">
             <h2 className="text-5xl font-black italic tracking-normal animate-shimmer-text drop-shadow-[0_0_20px_rgba(255,51,102,0.4)] text-center px-4">
                WinGo
             </h2>
        </div>

        <div className="absolute bottom-16 flex flex-col items-center gap-1.5">
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30">from</p>
             <h2 className="text-xl font-black italic tracking-tighter text-white drop-shadow-md">A.S</h2>
        </div>
    </div>
  );
}

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
        <title>A.snap | Premium Visual Sharing</title>
        <meta name="description" content="A.snap - The premium short video sharing platform. Watch, share, and chat in real-time." />
        
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://asnap.vercel.app/" />
        <meta property="og:title" content="A.snap | Premium Visual Sharing" />
        <meta property="og:description" content="Join the next generation of visual storytelling. Watch amazing reels and connect with friends." />
        <meta property="og:image" content="/logo.svg?v=20" />

        <meta name="application-name" content="A.snap" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="A.snap" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0a0a0a" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#0a0a0a" />
        
        <link rel="manifest" href="/manifest.webmanifest?v=20" />
        <link rel="apple-touch-icon" href="/logo.svg?v=20" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg?v=20" />
        <link rel="shortcut icon" href="/logo.svg?v=20" />
        
        <Script
          id="adsterra-social-bar"
          strategy="afterInteractive"
          src="https://pl29453309.effectivecpmnetwork.com/e9/15/f8/e915f8c7cce368f440d031fe8ec12184.js"
        />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased overflow-x-hidden text-foreground")}>
        <FirebaseClientProvider>
          <FCMHandler>
            <SplashScreen />
            {children}
            <PwaInstallPrompt />
            <NotificationPermissionPrompt />
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
