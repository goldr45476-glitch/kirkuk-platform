"use client";

import { Bookmark, Clapperboard, Compass, Home, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function BottomNav({ labels }: { labels: { home: string; reels: string; explore: string; saved: string; account: string } }) {
  const path = usePathname();
  const items = [
    { href: "/", label: labels.home, Icon: Home, active: path === "/" },
    { href: "/reels", label: labels.reels, Icon: Clapperboard, active: path.startsWith("/reels") },
    { href: "/explore", label: labels.explore, Icon: Compass, active: path.startsWith("/explore") || path.startsWith("/where") || path.startsWith("/map") },
    { href: "/saved", label: labels.saved, Icon: Bookmark, active: path.startsWith("/saved") },
    { href: "/account", label: labels.account, Icon: User, active: path.startsWith("/account") || path.startsWith("/login") },
  ];
  return (
    <nav aria-label="primary" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/90 shadow-[0_-8px_24px_-16px_hsl(var(--primary)/.3)] backdrop-blur-xl md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, Icon, active }) => (
          <li key={href}>
            <Link href={href} aria-current={active ? "page" : undefined}
              className={cn("flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors", active ? "text-primary" : "text-muted-foreground")}>
              <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-primary/12")}><Icon className="size-5" aria-hidden /></span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
