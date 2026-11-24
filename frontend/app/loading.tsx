import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-7 lg:p-9"
    >
      <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-medium text-brand-700">
        <Loader2 aria-hidden="true" className="animate-spin" size={17} />
        Loading your programme workspace…
      </div>

      <div className="animate-pulse space-y-6">
        <div className="h-48 rounded-[28px] bg-gradient-to-r from-brand-900 via-brand-700 to-brand-500" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-32 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="h-3 w-2/3 rounded bg-slate-100" />
              <div className="mt-5 h-7 w-1/3 rounded bg-brand-50" />
              <div className="mt-3 h-3 w-4/5 rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="h-64 rounded-2xl border border-slate-200 bg-white" />
          <div className="h-64 rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
