import { BottomNav } from "@/components/bottom-nav";
import React from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16 h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
