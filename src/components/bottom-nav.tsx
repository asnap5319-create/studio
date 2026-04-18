"use client";

import { Home, PlusSquare, Search, CircleUser } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/create", label: "Upload", icon: PlusSquare },
  { href: "/profile", label: "Profile", icon: CircleUser },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t bg-background">
      <div className="grid h-16 grid-cols-4 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex flex-col items-center justify-center px-5 hover:bg-secondary group"
            >
              <item.icon
                className={cn(
                  "w-7 h-7 text-muted-foreground group-hover:text-primary",
                  isActive && "text-primary"
                )}
              />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
