"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Languages, Menu, MapPin, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { ROLE_OPTIONS, ROLE_WORKSPACES, roleForPath, type PreviewRole } from "@/lib/role-navigation";
import { activateDemoSession, type ApiDemoRole } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { AVAILABLE_LANGUAGES, COMMUNITY_LANGUAGES_IN_REVIEW, translate as t } from "@/lib/i18n";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Programme dashboard",
  "/field-log": "Field log",
  "/blockers": "Blocker resolution",
  "/agronomist": "Ask Nia · mock advisory",
  "/credit": "Finance profile",
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

const API_ROLE: Record<PreviewRole, ApiDemoRole> = {
  agripreneur: "agripreneur",
  supplier: "supplier",
  lender: "lender",
  extension: "extension_officer",
  programme: "programme_manager",
  admin: "administrator",
  buyer: "buyer",
  investor: "investor",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, preferenceWarning } = useLanguage();
  const [role, setRole] = useState<PreviewRole>(() => roleForPath(pathname));
  const [online, setOnline] = useState(true);
  const [offlineSupport, setOfflineSupport] = useState<"checking" | "ready" | "unavailable" | "development">("checking");
  const [sessionStatus, setSessionStatus] = useState("Connecting demo session…");
  const title = t(language, PAGE_TITLES[pathname] ?? "EKYAN Connect");

  useEffect(() => {
    setRole(roleForPath(pathname));
  }, [pathname]);

  useEffect(() => {
    let active = true;
    setSessionStatus("Connecting demo session…");
    void activateDemoSession(API_ROLE[role])
      .then(() => {
        if (active) setSessionStatus("Authenticated synthetic demo");
      })
      .catch((error: unknown) => {
        if (active) {
          setSessionStatus(error instanceof Error ? error.message : "Demo session could not be connected.");
        }
      });
    return () => {
      active = false;
    };
  }, [role]);

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

  function changeRole(value: string) {
    const option = ROLE_OPTIONS.find((candidate) => candidate.value === value);
    if (!option) return;
    setRole(option.value);
    router.push(ROLE_WORKSPACES[option.value].home);
  }

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
        <header className="z-10 flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-2 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{title}</p>
              <p className="mt-0.5 hidden items-center gap-1 text-xs text-slate-500 sm:flex">
                <MapPin size={12} />
                Kenya programme workspace
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
            <label className="sr-only" htmlFor="preview-role">Synthetic demo role</label>
            <select
              id="preview-role"
              value={role}
              onChange={(event) => changeRole(event.target.value)}
              className="min-h-11 max-w-[104px] rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:max-w-none sm:px-3"
              title={t(language, "Switch the synthetic demo identity; backend role checks are active")}
            >
              {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(language, option.label)}</option>)}
            </select>
            <label className="sr-only" htmlFor="language-preference">{t(language, "Language")}</label>
            <span className="hidden text-slate-500 sm:inline-flex" aria-hidden="true"><Languages size={15} /></span>
            <select
              id="language-preference"
              value={language}
              onChange={(event) => setLanguage(event.target.value as "en" | "sw")}
              className="min-h-11 max-w-[100px] rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:max-w-none sm:px-3"
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
            <span
              title="All prototype records must be synthetic. No live programme data is connected."
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 text-[10px] font-semibold text-amber-900 sm:px-3 sm:text-xs"
            >
              <ShieldAlert aria-hidden="true" size={14} className="shrink-0 text-amber-700" />
              <span className="hidden sm:inline">{t(language, "Synthetic demo only")}</span>
              <span className="sm:hidden">{t(language, "Demo")}</span>
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
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
    </div>
  );
}
