export default function CreditPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1A202C]">Credit Scoring</h1>
      <p className="text-sm text-[#718096] mt-1">Alternative ML underwriting · XGBoost · M-Pesa + NDVI features</p>
      <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-white p-8 text-center text-[#718096]">
        <span className="text-4xl">💳</span>
        <p className="mt-3 font-medium text-[#4A5568]">Credit scoring UI — coming in v1.1</p>
        <p className="text-xs mt-1">POST /api/v1/credit/score is live and ready</p>
      </div>
    </div>
  );
}
