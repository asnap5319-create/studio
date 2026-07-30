
"use client";

import { Home, PlusSquare, Search, CircleUser, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useFirebase, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import type { UserProfile } from "@/models/user";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Search", icon: Search },
  { href: "/create", label: "Upload", icon: PlusSquare },
  { href: "/messages", label: "Direct", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: CircleUser },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { firestore } = useFirebase();

  // Fetch current user's profile image for the nav bar
  const userRef = useMemoFirebase(() => 
    (firestore && user) ? doc(firestore, 'users', user.uid) : null, 
    [firestore, user]
  );
  
  const { data: userProfile } = useDoc<UserProfile>(userRef);

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t bg-background">
      <div className="grid h-16 grid-cols-5 max-w-lg mx-auto">
        {navItems.map((item) => {
          // Home is active only on exact root path, others use startWith
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const isProfile = item.href === "/profile";

          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex flex-col items-center justify-center px-2 hover:bg-secondary group"
            >
              {isProfile && user && userProfile?.profileImageUrl ? (
                /* Display user's profile picture if logged in, same as Instagram */
                <div className={cn(
                  "w-7 h-7 rounded-full overflow-hidden border-2 transition-all duration-300",
                  isActive ? "border-primary scale-110 shadow-[0_0_10px_rgba(255,51,102,0.3)]" : "border-transparent"
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
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
