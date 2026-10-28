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
        active ? "bg-white font-medium text-blueprint" : "text-white/75 hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}
