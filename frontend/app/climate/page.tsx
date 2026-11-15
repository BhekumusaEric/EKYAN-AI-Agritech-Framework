export default function ClimatePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1A202C]">Climate Advisory</h1>
      <p className="text-sm text-[#718096] mt-1">Sentinel-2 NDVI · Open-Meteo · Hyperlocal nudges</p>
      <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-white p-8 text-center text-[#718096]">
        <span className="text-4xl">🌦️</span>
        <p className="mt-3 font-medium text-[#4A5568]">County-level climate map — coming in v1.1</p>
        <p className="text-xs mt-1">GET /api/v1/climate/advisory is live and ready</p>
      </div>
    </div>
  );
}
