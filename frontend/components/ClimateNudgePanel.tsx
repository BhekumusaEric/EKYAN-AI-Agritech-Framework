"use client";

interface Nudge {
  trigger: string;
  severity: string;
  action_required: boolean;
  swahili: string;
  english: string;
}

const styles: Record<string, { wrap: string; dot: string }> = {
  critical: { wrap: "border-unicef-red   bg-red-50   text-red-800",   dot: "bg-unicef-red"   },
  warning:  { wrap: "border-unicef-yellow bg-amber-50 text-amber-800", dot: "bg-unicef-yellow" },
  info:     { wrap: "border-unicef-blue  bg-unicef-pale text-unicef-navy", dot: "bg-unicef-blue" },
};

export default function ClimateNudgePanel({ nudges }: { county: string; nudges: Nudge[] }) {
  return (
    <div className="space-y-3">
      {nudges.map((n, i) => {
        const s = styles[n.severity] ?? styles.info;
        return (
          <div key={i} className={`rounded-lg border-l-4 p-4 ${s.wrap}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
              <span className="text-xs font-bold uppercase tracking-wide">{n.severity}</span>
              {n.action_required && (
                <span className="ml-auto rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold">
                  Action needed
                </span>
              )}
            </div>
            <p className="text-sm font-medium">{n.swahili}</p>
            <p className="mt-0.5 text-xs opacity-70">{n.english}</p>
          </div>
        );
      })}
    </div>
  );
}
