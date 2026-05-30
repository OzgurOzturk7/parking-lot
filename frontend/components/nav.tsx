"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

const items = [
  { href: "/entry", label: "Entry" },
  { href: "/exit", label: "Exit" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-thin">
          <Link
            href="/"
            className={cn(
              "mr-2 sm:mr-3 shrink-0 text-sm font-semibold tracking-tight transition-colors",
              pathname === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            ParkingLot
          </Link>
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== "/" && pathname?.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "shrink-0 rounded px-2 py-1 text-sm transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
