"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Settings, Archive, History, Bookmark, DollarSign } from "lucide-react";
import Link from "next/link";

const menuItems = [
  { href: "/earnings", icon: DollarSign, label: "Earnings" },
  { href: "#", icon: Settings, label: "Settings" },
  { href: "#", icon: Archive, label: "Archive" },
  { href: "#", icon: History, label: "Your Activity" },
  { href: "#", icon: Bookmark, label: "Saved" },
];

export function ProfileMenu() {
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
        <nav className="mt-4">
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
        </nav>
      </SheetContent>
    </Sheet>
  );
}
