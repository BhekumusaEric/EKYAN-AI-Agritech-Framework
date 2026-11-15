"use client";

interface PriceData {
  commodity: string;
  fair_farmgate_kes: number;
  market_wholesale_kes: number;
  broker_wouldve_paid_kes: number;
  farmer_gain_per_kg_kes: number;
  confidence: string;
  forecast_date: string;
}

interface MarketPriceCardProps {
  prices: PriceData[];
}

const confidenceColor: Record<string, string> = {
  high:   "text-green-600",
  medium: "text-amber-600",
  low:    "text-red-500",
};

export default function MarketPriceCard({ prices }: MarketPriceCardProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-gray-500 uppercase">
            <th className="pb-2 text-left">Commodity</th>
            <th className="pb-2 text-right">Fair Price</th>
            <th className="pb-2 text-right">Broker Paid</th>
            <th className="pb-2 text-right text-green-700">Farmer Gain/kg</th>
            <th className="pb-2 text-right">Confidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {prices.map((p) => (
            <tr key={p.commodity} className="hover:bg-gray-50">
              <td className="py-2 font-medium capitalize">{p.commodity}</td>
              <td className="py-2 text-right">KES {p.fair_farmgate_kes}</td>
              <td className="py-2 text-right text-red-500">KES {p.broker_wouldve_paid_kes}</td>
              <td className="py-2 text-right font-bold text-green-700">
                +KES {p.farmer_gain_per_kg_kes}
              </td>
              <td className={`py-2 text-right text-xs font-semibold ${confidenceColor[p.confidence]}`}>
                {p.confidence}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
