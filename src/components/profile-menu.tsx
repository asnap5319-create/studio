"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Settings, Shield, LogOut } from "lucide-react";
import Link from "next/link";

const menuItems = [
  { href: "#", icon: Settings, label: "Settings" },
  { href: "#", icon: Shield, label: "Privacy" },
];

interface ProfileMenuProps {
  onLogout: () => void;
}

export function ProfileMenu({ onLogout }: ProfileMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-4 flex h-[calc(100%-4rem)] flex-col justify-between">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-md p-3 text-base font-medium hover:bg-muted"
                >
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Button variant="destructive" className="w-full" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
