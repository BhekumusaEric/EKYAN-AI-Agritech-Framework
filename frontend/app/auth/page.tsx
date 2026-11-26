"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Sprout } from "lucide-react";
import { fetchHealth, getApiBaseUrl, signIn, signUp, type ApiDemoRole } from "@/lib/api";

const ACCOUNT_ROLES: { id: ApiDemoRole; name: string; detail: string }[] = [
  { id: "agripreneur", name: "Agripreneur", detail: "Record farmer needs and follow up" },
  { id: "supplier", name: "Supplier", detail: "Respond to pooled input demand" },
  { id: "extension_officer", name: "Extension officer", detail: "Work assigned support requests" },
  { id: "programme_manager", name: "Programme manager", detail: "Track programme delivery" },
  { id: "lender", name: "Lender", detail: "Review records with active consent" },
  { id: "buyer", name: "Buyer", detail: "Access buyer tools when enabled" },
  { id: "investor", name: "Investor", detail: "Access programme opportunity views" },
];
const syntheticMode = process.env.NEXT_PUBLIC_EKYAN_SYNTHETIC_MODE !== "false";

export default function AccountPage() {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<ApiDemoRole>("agripreneur");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");

  async function checkApiConnection() {
    setApiStatus("checking");
    try { await fetchHealth(); setApiStatus("online"); }
    catch { setApiStatus("offline"); }
  }

  useEffect(() => {
    let active = true;
    const priorNotice = new URLSearchParams(window.location.search).get("notice");
    if (priorNotice) {
      setError(priorNotice);
      window.history.replaceState(null, "", "/auth");
    }
    void fetchHealth()
      .then(() => { if (active) setApiStatus("online"); })
      .catch(() => { if (active) setApiStatus("offline"); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      let signedInRole = role;
      if (registering) {
        const result = await signUp(displayName, email, password, role);
        if (!result.active) { setNotice(result.message ?? "Your role request is awaiting review."); return; }
        signedInRole = result.actor?.role ?? role;
      } else {
        signedInRole = (await signIn(email, password)).role;
      }
      router.replace(signedInRole === "agripreneur" ? "/home" : signedInRole === "supplier" ? "/demand" : signedInRole === "lender" ? "/lender" : signedInRole === "buyer" ? "/marketplace" : signedInRole === "investor" ? "/investor" : signedInRole === "extension_officer" ? "/extension" : signedInRole === "administrator" ? "/configuration" : "/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your account request could not be completed.");
    } finally { setBusy(false); }
  }

  return (
    <main className="grid min-h-dvh bg-[#F6F8F6] px-4 py-8 sm:place-items-center sm:px-6">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 md:min-h-[620px] md:grid-cols-[0.92fr_1.08fr]">
        <section className="flex flex-col justify-between bg-[#173C32] p-6 text-white sm:p-10">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><Sprout size={22} /></span><span><b className="block text-lg">EKYAN Connect</b><small className="text-white/65">Practical support, together</small></span></div>
          <div className="py-10 md:py-0"><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Your workspace</p><h1 className="max-w-md text-3xl font-semibold leading-tight sm:text-4xl">The right tools for your role in the programme.</h1><p className="mt-4 max-w-md text-sm leading-6 text-white/75">Sign in to a role-based workspace for field operations, supplier response, extension support, or programme oversight.</p></div>
          <p className="text-xs leading-5 text-white/60">Access depends on your role. Partner and programme accounts are reviewed before they can use protected workspaces.</p>
        </section>
        <section className="flex flex-col justify-center p-5 sm:p-10">
          <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">{registering ? "Get started" : "Welcome back"}</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">{registering ? "Create your account" : "Sign in"}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{registering ? "Choose your programme role. Partner roles need administrator approval." : "Use the email and password linked to your EKYAN account."}</p>
            <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-xs leading-5 ${apiStatus === "online" ? "bg-emerald-50 text-emerald-800" : apiStatus === "offline" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-600"}`}>
              {apiStatus === "online" ? "EKYAN service is reachable." : apiStatus === "offline" ? `Can't reach EKYAN at ${getApiBaseUrl()}. Start the API server, then check NEXT_PUBLIC_API_URL and ALLOWED_ORIGINS.` : "Checking connection to the EKYAN service…"}
              {apiStatus === "offline" && <button type="button" onClick={() => void checkApiConnection()} className="ml-2 font-bold underline underline-offset-2">Retry</button>}
            </p>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            {registering && syntheticMode && <p className="rounded-xl bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-900">Local prototype sign-up: use a Synthetic or Demo name and an email ending in <b>.invalid</b>. Live programme access requires separate approval.</p>}
            {registering && <label className="block text-sm font-semibold text-slate-700">Your name<input required minLength={3} maxLength={120} autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3.5 font-normal outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" /></label>}
            <label className="block text-sm font-semibold text-slate-700">Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3.5 font-normal outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" /></label>
            <label className="block text-sm font-semibold text-slate-700">Password<input required minLength={registering ? 12 : 1} maxLength={256} type="password" autoComplete={registering ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={registering ? "At least 12 characters" : "Your password"} className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3.5 font-normal outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" /></label>
            {registering && <label className="block text-sm font-semibold text-slate-700">Programme role<select value={role} onChange={(e) => setRole(e.target.value as ApiDemoRole)} className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 font-normal outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10">{ACCOUNT_ROLES.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.detail}</option>)}</select></label>}
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm leading-5 text-rose-800">{error}</p>}
            {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm leading-5 text-emerald-900">{notice}</p>}
            <button disabled={busy} aria-busy={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176B50] px-4 text-sm font-semibold text-white hover:bg-[#125940] disabled:opacity-60">{busy ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Connecting to EKYAN…</> : registering ? "Create account" : "Sign in"}{!busy && <ArrowRight size={16} />}</button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-600">{registering ? "Already registered?" : "New to EKYAN Connect?"} <button className="font-semibold text-emerald-800 underline-offset-4 hover:underline" onClick={() => { setRegistering(!registering); setError(""); setNotice(""); }}>{registering ? "Sign in" : "Create an account"}</button></p>
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">{syntheticMode ? "Prototype accounts use synthetic data. Live programme access remains disabled until privacy and partner approvals are in place." : "Account sign-in is enabled. EKYAN programme records remain synthetic until privacy, consent and partner approvals are complete."}</p>
        </section>
      </div>
    </main>
  );
}
