"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, HandCoins, Languages, LayoutDashboard, LogOut, MapPin, Menu, ShieldAlert, Sprout, Wifi, WifiOff } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { ROLE_OPTIONS, ROLE_WORKSPACES, roleForPath, type PreviewRole } from "@/lib/role-navigation";
import { apiRequest, clearAccountSession, signOut, type AccountActor, type ApiDemoRole } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { AVAILABLE_LANGUAGES, COMMUNITY_LANGUAGES_IN_REVIEW, translate as t } from "@/lib/i18n";

const PAGE_TITLES: Record<string, string> = {
  "/home": "Today",
  "/dashboard": "Programme dashboard",
  "/field-log": "Field log",
  "/blockers": "Blocker resolution",
  "/agronomist": "Ask Nia · mock advisory",
  "/credit": "Finance record summary",
  "/business-book": "Business records",
  "/demand": "Pooled input demand",
  "/lender": "Consent-gated profile view",
  "/extension": "Extension officer queue",
  "/configuration": "Pilot configuration",
  "/climate": "Climate services · Phase 2",
  "/marketplace": "Buyer marketplace · Phase 2",
  "/investor": "Investor opportunity preview",
  "/farmer": "Farmer home",
};

const PREVIEW_ROLE: Record<ApiDemoRole, PreviewRole> = {
  agripreneur: "agripreneur", supplier: "supplier", lender: "lender", investor: "investor",
  buyer: "buyer", extension_officer: "extension", programme_manager: "programme", administrator: "admin",
};

const AGRIPRENEUR_MOBILE_LINKS = [
  { href: "/home", label: "Today", icon: LayoutDashboard },
  { href: "/field-log", label: "Record a need", icon: Sprout },
  { href: "/blockers", label: "Follow up", icon: ClipboardList },
  { href: "/business-book", label: "Business records", icon: HandCoins },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, preferenceWarning } = useLanguage();
  const authPage = pathname.startsWith("/auth");
  const [actor, setActor] = useState<AccountActor | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const role = actor ? PREVIEW_ROLE[actor.role] : "agripreneur";
  const [online, setOnline] = useState(true);
  const [offlineSupport, setOfflineSupport] = useState<"checking" | "ready" | "unavailable" | "development">("checking");
  const [sessionStatus, setSessionStatus] = useState("Checking account…");
  const title = t(language, PAGE_TITLES[pathname] ?? "EKYAN Connect");
  const mobileLinks = role === "agripreneur"
    ? AGRIPRENEUR_MOBILE_LINKS
    : ROLE_WORKSPACES[role].links.slice(0, 3).map((link) => ({
      ...link,
      icon: link.icon === "demand" ? HandCoins : link.icon === "extension" ? ShieldAlert : Sprout,
    }));

  useEffect(() => {
    let active = true;
    if (authPage) { setSessionLoading(false); return () => { active = false; }; }
    const expireSession = () => { setActor(null); router.replace("/auth"); };
    window.addEventListener("ekyan:session-expired", expireSession);
    setSessionLoading(true);
    void apiRequest<AccountActor>("/api/v1/me")
      .then((current) => { if (active) { setActor(current); setSessionStatus(current.displayName); } })
      .catch((cause: unknown) => {
        if (active) {
          clearAccountSession();
          const message = cause instanceof Error ? cause.message : "EKYAN could not confirm this session. Please sign in again.";
          router.replace(`/auth?notice=${encodeURIComponent(message)}`);
        }
      })
      .finally(() => { if (active) setSessionLoading(false); });
    return () => {
      active = false;
      window.removeEventListener("ekyan:session-expired", expireSession);
    };
  }, [authPage, pathname, router]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const updateConnection = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    if (process.env.NODE_ENV !== "production") {
      setOfflineSupport("development");
    } else if (!("serviceWorker" in navigator)) {
      setOfflineSupport("unavailable");
    } else {
      void navigator.serviceWorker.register("/sw.js")
        .then(() => setOfflineSupport("ready"))
        .catch(() => setOfflineSupport("unavailable"));
    }

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    if (!authPage && actor && roleForPath(pathname) !== role) router.replace(ROLE_WORKSPACES[role].home);
  }, [actor, authPage, pathname, role, router]);

  if (authPage) return <>{children}</>;
  if (sessionLoading || !actor) return <div className="grid min-h-dvh place-items-center bg-[#F6F8F6] text-sm text-slate-600">Checking your EKYAN account…</div>;

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F6F8F6]">
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-slate-950/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar role={role} open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex min-h-[64px] shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/95 px-3 py-2 backdrop-blur sm:min-h-[72px] sm:gap-3 sm:px-6 lg:px-7">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                <span className="sm:hidden">EKYAN Connect</span>
                <span className="hidden sm:inline">{title}</span>
              </p>
              <p className="mt-0.5 hidden items-center gap-1 text-xs text-slate-500 xl:flex">
                <MapPin size={12} />
                Kenya programme workspace
              </p>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <span
              role="status"
              aria-live="polite"
              title={offlineSupport === "ready" ? "The app shell can be cached; queued entries still need a configured sync API." : "Offline app-shell support is not confirmed."}
              className={`hidden min-h-10 items-center gap-1.5 rounded-xl px-2.5 text-[10px] font-semibold xl:inline-flex ${
                online && offlineSupport === "ready"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-900"
              }`}
            >
              {online ? <Wifi aria-hidden="true" size={14} /> : <WifiOff aria-hidden="true" size={14} />}
              {online
                ? offlineSupport === "ready" ? "Offline shell ready" : offlineSupport === "development" ? "Local preview" : "Offline setup pending"
                : "Offline"}
            </span>
            <span className="hidden max-w-40 truncate rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 sm:inline" title={actor.email ?? actor.displayName}>
              {t(language, ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "Account")}
            </span>
            <label className="sr-only" htmlFor="language-preference">{t(language, "Language")}</label>
            <span className="hidden text-slate-500 sm:inline-flex" aria-hidden="true"><Languages size={15} /></span>
            <select
              id="language-preference"
              value={language}
              onChange={(event) => setLanguage(event.target.value as "en" | "sw")}
              className="h-10 w-[76px] rounded-xl border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:h-11 sm:w-[112px] sm:px-3 lg:w-[128px] lg:text-xs"
              title={`${t(language, "English and Kiswahili are available. Farmer, field-log and business-book screens have initial Kiswahili copy; other workspaces are being prepared.")}${preferenceWarning ? ` ${preferenceWarning}` : ""}`}
            >
              {AVAILABLE_LANGUAGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              <optgroup label={t(language, "More Kenyan languages (translation review needed)")}>
                {COMMUNITY_LANGUAGES_IN_REVIEW.map((communityLanguage) => (
                  <option key={communityLanguage} disabled>{communityLanguage} · {t(language, "translation in review")}</option>
                ))}
              </optgroup>
            </select>
            <span className="hidden max-w-40 truncate text-[10px] text-slate-500 xl:inline" role="status" aria-live="polite" title={sessionStatus}>
              {sessionStatus}
            </span>
            <button type="button" onClick={() => void signOut().finally(() => { setActor(null); router.replace("/auth"); })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 sm:w-auto sm:gap-2 sm:px-3" aria-label={t(language, "Sign out")} title={t(language, "Sign out")}>
              <LogOut size={16} /><span className="hidden text-xs font-semibold sm:inline">{t(language, "Sign out")}</span>
            </button>
            <span
              title="All prototype records must be synthetic. No live programme data is connected."
              aria-label={t(language, "Synthetic demo only")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-900 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-2 sm:text-xs sm:font-semibold lg:px-3"
            >
              <ShieldAlert aria-hidden="true" size={14} className="shrink-0 text-amber-700" />
              <span className="hidden sm:inline">{t(language, "Synthetic demo only")}</span>
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {language === "sw" && (
            <p role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-950 sm:px-7">
              {t(language, pathname === "/farmer" || pathname === "/field-log" || pathname === "/business-book"
                ? "Kiswahili text is an initial draft. Please review it with local farmers before field use."
                : "This workspace is in English. Farmer view, field log and business book have draft Kiswahili; other workspace translations are pending local review.")}
            </p>
          )}
          {children}
        </main>
      </div>
      <nav
        aria-label={t(language, "Mobile navigation")}
        className="fixed inset-x-0 bottom-0 z-10 flex h-[calc(4.5rem+env(safe-area-inset-bottom))] items-stretch justify-around border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:hidden"
      >
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold ${
                active ? "text-brand-800" : "text-slate-500"
              }`}
            >
              <Icon aria-hidden="true" size={19} />
              <span className="max-w-full truncate">{t(language, label)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label={t(language, "More navigation")}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold text-slate-500"
        >
          <Menu aria-hidden="true" size={19} />
          <span>{t(language, "More")}</span>
        </button>
      </nav>
    </div>
  );
}
