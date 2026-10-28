"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = path === href || (href !== "/owner" && path.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition",
        active ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-paper-2",
      )}
    >
      {children}
    </Link>
  );
}
