import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import Script from "next/script";

const LOGO_SVG = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjEwMCUiIHgyPSIxMDAlIiB5MT0iMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZjAwODA7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSI1MCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZjMzNjY7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZmZjYzMzO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodT0iNTEyIiByeD0iMTIwIiBmaWxsPSIjMGEwYTBhIiAvPjxwYXRoIGQ9Ik0xNTAgNDAwTDI1NiAxMDBMMzYyIDQwME0yMTAgMzIwTDMwMiAzMjAiIHN0cm9rZT0idXJsKCNncmFkKSIgc3Ryb2tlLXdpZHRoPSI2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiAvPjxjaXJjbGUgY3g9IjM5MCIgY3k9IjEyMCIgcj0iMzUiIGZpbGw9IiNmZjAwODAiIC8+PC9zdmc+";

export const metadata: Metadata = {
  title: "A.snap - Share Your World in Short Videos",
  description: "A.snap is the ultimate premium short video sharing application.",
  manifest: "/manifest.json",
  icons: {
    icon: LOGO_SVG,
    shortcut: LOGO_SVG,
    apple: LOGO_SVG,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "A.snap",
  },
  other: {
    "google-adsense-account": "ca-pub-6100214178274409",
    "mobile-web-app-capable": "yes",
    "theme-color": "#000000",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href={LOGO_SVG} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />
      </head>
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
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}