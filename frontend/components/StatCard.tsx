"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down";
  color?: "blue" | "green" | "yellow" | "red";
}

const styles = {
  blue:   "border-unicef-blue   bg-unicef-pale",
  green:  "border-unicef-green  bg-green-50",
  yellow: "border-unicef-yellow bg-amber-50",
  red:    "border-unicef-red    bg-red-50",
};

const subColor = {
  blue:   "text-unicef-navy",
  green:  "text-unicef-green",
  yellow: "text-amber-700",
  red:    "text-red-700",
};

export default function StatCard({ label, value, sub, trend, color = "blue" }: StatCardProps) {
  return (
    <div className={`rounded-xl border-l-4 p-5 ${styles[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && (
        <p className={`mt-1 text-sm font-medium ${subColor[color]}`}>
          {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}{sub}
        </p>
      )}
    </div>
  );
}
