"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  color?: "green" | "blue" | "amber" | "red";
}

const colorMap = {
  green: "border-green-500 bg-green-50",
  blue:  "border-blue-500 bg-blue-50",
  amber: "border-amber-500 bg-amber-50",
  red:   "border-red-500 bg-red-50",
};

const trendIcon = { up: "↑", down: "↓", neutral: "→" };
const trendColor = { up: "text-green-600", down: "text-red-500", neutral: "text-gray-500" };

export default function StatCard({ label, value, sub, trend, color = "green" }: StatCardProps) {
  return (
    <div className={`rounded-xl border-l-4 p-5 shadow-sm ${colorMap[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && (
        <p className={`mt-1 text-sm ${trend ? trendColor[trend] : "text-gray-500"}`}>
          {trend && <span className="mr-1">{trendIcon[trend]}</span>}
          {sub}
        </p>
      )}
    </div>
  );
}
