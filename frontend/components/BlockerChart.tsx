"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface BlockerChartProps {
  data: { category: string; status: string }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  inputs:   "Inputs (P02)",
  finance:  "Finance (P03)",
  market:   "Market (P04)",
  advisory: "Advisory (P05)",
  climate:  "Climate",
  other:    "Other (P01)",
};

const COLORS: Record<string, string> = {
  inputs:   "#f59e0b",
  finance:  "#3b82f6",
  market:   "#8b5cf6",
  advisory: "#10b981",
  climate:  "#ef4444",
  other:    "#6b7280",
};

export default function BlockerChart({ data }: BlockerChartProps) {
  // Aggregate by category
  const counts: Record<string, { open: number; resolved: number }> = {};
  for (const row of data) {
    if (!counts[row.category]) counts[row.category] = { open: 0, resolved: 0 };
    if (row.status === "open") counts[row.category].open++;
    else counts[row.category].resolved++;
  }

  const chartData = Object.entries(counts).map(([cat, v]) => ({
    name: CATEGORY_LABELS[cat] ?? cat,
    open: v.open,
    resolved: v.resolved,
    color: COLORS[cat] ?? "#6b7280",
  }));

  if (!chartData.length) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-400 text-sm">
        No blocker data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="open" name="Open" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
        <Bar dataKey="resolved" name="Resolved" fill="#d1fae5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
