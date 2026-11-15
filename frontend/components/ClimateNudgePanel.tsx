"use client";

interface Nudge {
  trigger: string;
  severity: string;
  action_required: boolean;
  swahili: string;
  english: string;
}

interface ClimateNudgePanelProps {
  county: string;
  nudges: Nudge[];
}

const severityStyle: Record<string, string> = {
  critical: "bg-red-50 border-red-400 text-red-800",
  warning:  "bg-amber-50 border-amber-400 text-amber-800",
  info:     "bg-green-50 border-green-400 text-green-800",
};

const severityIcon: Record<string, string> = {
  critical: "🔴",
  warning:  "🟡",
  info:     "🟢",
};

export default function ClimateNudgePanel({ county, nudges }: ClimateNudgePanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
        {county} — Live Alerts
      </p>
      {nudges.map((n, i) => (
        <div key={i} className={`rounded-lg border-l-4 p-4 ${severityStyle[n.severity] ?? severityStyle.info}`}>
          <div className="flex items-center gap-2 mb-1">
            <span>{severityIcon[n.severity]}</span>
            <span className="text-xs font-bold uppercase">{n.severity}</span>
            {n.action_required && (
              <span className="ml-auto text-xs bg-white/60 px-2 py-0.5 rounded-full font-medium">
                Action needed
              </span>
            )}
          </div>
          <p className="text-sm font-medium">{n.swahili}</p>
          <p className="text-xs mt-1 opacity-75">{n.english}</p>
        </div>
      ))}
    </div>
  );
}
