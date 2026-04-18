import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "A.snap",
  description: "A.snap Short Video App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
       <body className={cn("min-h-screen bg-background font-sans antialiased")}>
          {children}
        <Toaster />
      </body>
    </html>
  );
}
