import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type Tone = "info" | "success" | "warning" | "error";

const styles: Record<Tone, { wrap: string; icon: string; Icon: typeof Info }> = {
  info: {
    wrap: "border-sky-200 bg-sky-50 text-sky-950",
    icon: "text-sky-700",
    Icon: Info,
  },
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-950",
    icon: "text-emerald-700",
    Icon: CheckCircle2,
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-950",
    icon: "text-amber-700",
    Icon: AlertTriangle,
  },
  error: {
    wrap: "border-rose-200 bg-rose-50 text-rose-950",
    icon: "text-rose-700",
    Icon: XCircle,
  },
};

export function StatusNotice({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title: string;
  children: ReactNode;
}) {
  const { wrap, icon, Icon } = styles[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`flex gap-3 rounded-xl border p-4 ${wrap}`}
    >
      <Icon aria-hidden="true" className={`mt-0.5 shrink-0 ${icon}`} size={18} />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-1 text-xs leading-5 opacity-80">{children}</div>
      </div>
    </div>
  );
}
