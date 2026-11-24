"use client";

interface PriceData {
  commodity: string;
  fair_farmgate_kes: number;
  broker_wouldve_paid_kes: number;
  farmer_gain_per_kg_kes: number;
  confidence: string;
}

const badge: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function MarketPriceCard({ prices }: { prices: PriceData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          <tr className="border-b border-slate-100">
            {["Commodity", "Reference price", "Indicative broker price", "Difference", "Model confidence"].map((heading, index) => (
              <th key={heading} className={`pb-3.5 ${index === 0 ? "text-left" : "text-right"}`}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {prices.map((p) => (
            <tr key={p.commodity} className="transition-colors hover:bg-slate-50/80">
              <td className="py-4 font-semibold capitalize text-slate-900">{p.commodity}</td>
              <td className="py-4 text-right font-medium text-slate-700">KES {p.fair_farmgate_kes}</td>
              <td className="py-4 text-right text-slate-500">KES {p.broker_wouldve_paid_kes}</td>
              <td className="py-4 text-right font-semibold text-emerald-700">+KES {p.farmer_gain_per_kg_kes}</td>
              <td className="py-4 text-right">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${badge[p.confidence] ?? badge.medium}`}>
                  {p.confidence}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
