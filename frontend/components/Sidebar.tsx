"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CloudSun,
  HandCoins,
  LayoutDashboard,
  MessageCircle,
  ShoppingBasket,
  Sprout,
  ClipboardList,
  ShieldCheck,
  Settings,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { ROLE_WORKSPACES, type PreviewRole } from "@/lib/role-navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { translate as t } from "@/lib/i18n";

const ICONS: Record<string, LucideIcon> = {
  field: Sprout,
  blockers: ClipboardList,
  advisory: MessageCircle,
  business: HandCoins,
  demand: ShoppingBasket,
  lender: ShieldCheck,
  extension: ClipboardCheck,
  dashboard: LayoutDashboard,
  settings: Settings,
};

export default function Sidebar({
  role,
  open,
  onNavigate,
}: {
  role: PreviewRole;
  open: boolean;
  onNavigate: () => void;
}) {
  const path = usePathname();
  const { language } = useLanguage();
  const links = ROLE_WORKSPACES[role].links;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-[272px] shrink-0 flex-col bg-[#102C26] text-white transition-transform duration-200 md:static md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
        <Image
          src="/ekyan-mark.svg"
          alt=""
          aria-hidden="true"
          width={42}
          height={42}
          priority
          className="shrink-0 rounded-xl"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight tracking-wide">EKYAN Connect</p>
          <p className="mt-1 truncate text-[11px] leading-tight text-white/65">{t(language, "Grow · learn · thrive")}</p>
        </div>
      </div>

      <div className="px-6 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        {t(language, role === "programme" ? "Programme workspace" : "Role workspace")}
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {links.map(({ href, label, icon }) => {
          const Icon = ICONS[icon];
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-[#d6e7d4] text-[#153c2d] shadow-[inset_3px_0_0_#d58a48]"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Icon
                aria-hidden="true"
                size={18}
                className={active ? "text-[#276947]" : "text-white/55 group-hover:text-white"}
              />
              <span className="truncate">{t(language, label)}</span>
              {active && <span aria-hidden="true" className="ml-auto h-2 w-2 rounded-full bg-[#d58a48]" />}
            </Link>
          );
        })}
        <div className="px-3 pb-1 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          {t(language, "Phase 2 previews")}
        </div>
        {[
          { href: "/climate", label: "Climate services", icon: CloudSun },
          { href: "/marketplace", label: "Buyer marketplace", icon: ShoppingBasket },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Icon aria-hidden="true" size={18} />
            <span className="truncate">{t(language, label)}</span>
          </Link>
        ))}
      </nav>

      <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-white/90">
          <span className="h-2 w-2 rounded-full bg-[#F4B942]" />
          {t(language, "Busia · Poultry pilot")}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-white/60">
          {t(language, "Synthetic records only. Demo roles are checked by the API; this is not production sign-in.")}
        </p>
      </div>
    </aside>
  );
}
