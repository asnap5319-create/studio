"use client";

import { Home, CircleUser } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useFirebase, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import type { UserProfile } from "@/models/user";

const navItems = [
  { href: "/", label: "Game", icon: Home },
  { href: "/profile", label: "Account", icon: CircleUser },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { firestore } = useFirebase();

  const userRef = useMemoFirebase(() => 
    (firestore && user) ? doc(firestore, 'users', user.uid) : null, 
    [firestore, user]
  );
  
  const { data: userProfile } = useDoc<UserProfile>(userRef);

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t bg-background shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      <div className="grid h-16 grid-cols-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const isProfile = item.href === "/profile";

          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex flex-col items-center justify-center px-2 hover:bg-secondary/50 group"
            >
              {isProfile && user && userProfile?.profileImageUrl ? (
                <div className={cn(
                  "w-8 h-8 rounded-full overflow-hidden border-2 transition-all duration-300",
                  isActive ? "border-primary scale-110 shadow-[0_0_15px_rgba(255,51,102,0.4)]" : "border-transparent"
                )}>
                    <Avatar className="w-full h-full">
                        <AvatarImage src={userProfile.profileImageUrl} className="object-cover" />
                        <AvatarFallback className="bg-secondary">
                           <item.icon className="w-4 h-4 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                </div>
              ) : (
                <item.icon
                  className={cn(
                    "w-7 h-7 text-muted-foreground group-hover:text-primary transition-all duration-300",
                    isActive && "text-primary scale-110"
                  )}
                />
              )}
              <span className={cn(
                "text-[10px] font-black uppercase mt-1 tracking-widest transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
