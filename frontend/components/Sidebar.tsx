"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard",   label: "M&E Dashboard",   icon: "📊" },
  { href: "/agronomist",  label: "Daktari wa Mimea", icon: "🌿" },
  { href: "/credit",      label: "Credit Scoring",   icon: "💳" },
  { href: "/climate",     label: "Climate Advisory", icon: "🌦️" },
  { href: "/marketplace", label: "Farm-to-Fork",     icon: "🛒" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-unicef-navy text-white">

      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
          <span className="text-xs font-black text-unicef-navy">EK</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">EKYAN Connect</p>
          <p className="truncate text-[10px] leading-tight text-white/50">UNICEF Kenya · GenU</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="w-5 text-center text-base leading-none">{icon}</span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-4">
        <p className="text-[10px] leading-relaxed text-white/30">
          Apache 2.0 · af-south-1<br />
          SDGs 1 · 2 · 5 · 8 · 13
        </p>
      </div>
    </aside>
  );
}
