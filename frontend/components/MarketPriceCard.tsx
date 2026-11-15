"use client";

interface PriceData {
  commodity: string;
  fair_farmgate_kes: number;
  broker_wouldve_paid_kes: number;
  farmer_gain_per_kg_kes: number;
  confidence: string;
}

const badge: Record<string, string> = {
  high:   "bg-green-50 text-unicef-green",
  medium: "bg-amber-50 text-amber-700",
  low:    "bg-red-50   text-unicef-red",
};

export default function MarketPriceCard({ prices }: { prices: PriceData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {["Commodity", "Fair Price", "Broker Paid", "Farmer Gain/kg", "Confidence"].map((h, i) => (
              <th key={h} className={`pb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 ${i === 0 ? "text-left" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface">
          {prices.map((p) => (
            <tr key={p.commodity} className="hover:bg-surface transition-colors">
              <td className="py-3 font-semibold capitalize text-gray-900">{p.commodity}</td>
              <td className="py-3 text-right text-gray-700">KES {p.fair_farmgate_kes}</td>
              <td className="py-3 text-right text-unicef-red">KES {p.broker_wouldve_paid_kes}</td>
              <td className="py-3 text-right font-bold text-unicef-green">+KES {p.farmer_gain_per_kg_kes}</td>
              <td className="py-3 text-right">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge[p.confidence] ?? badge.medium}`}>
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
