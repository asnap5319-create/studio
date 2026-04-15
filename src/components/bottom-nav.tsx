"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusSquare, User, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", icon: Video, label: "Feed" },
  { href: "/create", icon: PlusSquare, label: "Create" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 h-16 w-full max-w-md -translate-x-1/2 border-t border-neutral-700 bg-black/50 backdrop-blur-sm">
      <div className="grid h-full grid-cols-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 text-neutral-400"
              prefetch={false}
            >
              <item.icon
                className={cn(
                  "h-6 w-6",
                  isActive && "text-white"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive && "text-white"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
