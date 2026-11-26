"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, LoaderCircle, ShoppingBasket, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";
import { apiRequest } from "@/lib/api";

type PriceForecast = {
  commodity: string;
  forecast_date: string;
  fair_farmgate_kes: number;
  market_wholesale_kes: number;
  broker_wouldve_paid_kes: number;
  farmer_gain_per_kg_kes: number;
  confidence: string;
};

type HarvestListing = {
  id: string;
  agripreneur_id: string;
  commodity: string;
  volume_kg: number;
  harvest_date: string;
  county: string;
  ward: string;
  quality_grade: string;
  price_expectation_kes: number | null;
  status: string;
};

const COMMODITIES = ["maize", "tomatoes", "kale", "beans", "poultry"];

export default function MarketplacePage() {
  const [forecasts, setForecasts] = useState<Record<string, PriceForecast>>({});
  const [listings, setListings] = useState<HarvestListing[]>([]);
  const [loadingForecasts, setLoadingForecasts] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);
  const [error, setError] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState("maize");

  useEffect(() => {
    void loadForecasts();
    void loadListings();
  }, []);

  async function loadForecasts() {
    setLoadingForecasts(true);
    try {
      const results = await Promise.all(
        COMMODITIES.map((commodity) =>
          apiRequest<PriceForecast>(`/api/v1/marketplace/price-forecast?commodity=${commodity}&days_ahead=14`)
        )
      );
      const map: Record<string, PriceForecast> = {};
      results.forEach((forecast) => { map[forecast.commodity] = forecast; });
      setForecasts(map);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Price forecasts could not be loaded.");
    } finally {
      setLoadingForecasts(false);
    }
  }

  async function loadListings() {
    setLoadingListings(true);
    try {
      const data = await apiRequest<{ listings: HarvestListing[] }>("/api/v1/marketplace/listings");
      setListings(data.listings);
    } catch {
      // listings are optional
    } finally {
      setLoadingListings(false);
    }
  }

  const selectedForecast = forecasts[selectedCommodity];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="success"><ShoppingBasket aria-hidden="true" size={14} /> Buyer marketplace</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Farm-to-fork price forecasting</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Compare synthetic market estimates and review available pilot listings.
        </p>
      </section>

      <StatusNotice tone="warning" title="Synthetic price data">
        Prices are model-generated estimates from synthetic baselines. Do not use them for real trading decisions.
      </StatusNotice>

      {error && <StatusNotice tone="error" title="Marketplace error">{error}</StatusNotice>}
      <section>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>14-day price forecast</CardTitle>
                <CardDescription>Fair farmgate vs wholesale vs broker price per kg.</CardDescription>
              </div>
              <TrendingUp aria-hidden="true" className="text-brand-700" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              {COMMODITIES.map((commodity) => (
                <button
                  key={commodity}
                  type="button"
                  onClick={() => setSelectedCommodity(commodity)}
                  aria-pressed={selectedCommodity === commodity}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold capitalize ${selectedCommodity === commodity ? "border-brand-700 bg-brand-50 text-brand-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {commodity}
                </button>
              ))}
            </div>
            {loadingForecasts ? (
              <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={15} /> Loading forecasts…</div>
            ) : selectedForecast ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-semibold text-emerald-800">Fair farmgate price</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-900">KES {selectedForecast.fair_farmgate_kes}/kg</p>
                  <p className="mt-1 text-xs text-emerald-700">What you should receive</p>
                </div>
                <div className="rounded-xl bg-sky-50 p-4">
                  <p className="text-xs font-semibold text-sky-800">Wholesale market price</p>
                  <p className="mt-1 text-2xl font-semibold text-sky-900">KES {selectedForecast.market_wholesale_kes}/kg</p>
                  <p className="mt-1 text-xs text-sky-700">Nairobi/Kisumu wholesale</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-4">
                  <p className="text-xs font-semibold text-rose-800">Broker would have paid</p>
                  <p className="mt-1 text-2xl font-semibold text-rose-900">KES {selectedForecast.broker_wouldve_paid_kes}/kg</p>
                  <p className="mt-1 text-xs text-rose-700">Typical middleman offer</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800">Your gain per kg (direct)</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-900">KES +{selectedForecast.farmer_gain_per_kg_kes}/kg</p>
                  <p className="mt-1 text-xs text-amber-700">vs broker · confidence: {selectedForecast.confidence}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No forecast available for {selectedCommodity}.</p>
            )}
          </CardContent>
        </Card>

      </section>

      <Card>
        <CardHeader>
          <CardTitle>Registered harvests</CardTitle>
          <CardDescription>Synthetic listings available for buyer matching.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingListings ? (
            <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={15} /> Loading listings…</div>
          ) : !listings.length ? (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <BadgeDollarSign aria-hidden="true" className="text-brand-700" size={22} />
              <p className="mt-2 text-sm font-semibold text-slate-700">No harvests registered yet</p>
              <p className="mt-1 text-xs text-slate-500">Pilot harvest listings will appear here when the marketplace phase is enabled.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <article key={listing.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold capitalize text-slate-900">{listing.commodity}</p>
                    <Badge variant="success">{listing.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{listing.volume_kg} kg · Grade {listing.quality_grade}</p>
                  <p className="mt-1 text-xs text-slate-500">{listing.ward}, {listing.county} · {listing.harvest_date}</p>
                  {listing.price_expectation_kes && (
                    <p className="mt-1 text-xs font-medium text-brand-700">Expects KES {listing.price_expectation_kes}/kg</p>
                  )}
                </article>
              ))}
            </div>
          )}
          <Link href="/demand" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-950">
            Open pooled input demand board <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
