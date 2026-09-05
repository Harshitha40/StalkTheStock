"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PriceComparisonChart } from "./price-comparison-chart";

interface Factor {
  name: string;
  points: number;
  maxPoints: number;
  value: string;
  active: boolean;
  description: string;
  reasoning: string;
}

interface CalculatedMetrics {
  rsi14: number | null;
  volatility20Pct: number | null;
  volumeSpike: number | null;
  sma50: number | null;
  sma200: number | null;
  week52High: number | null;
  week52Low: number | null;
  openGapPct: number | null;
  newsSentiment: number | null;
  newsCount: number;
  corporateEventsCount: number;
  currentVolume: number | null;
  averageVolume20: number | null;
}

interface ScoreBreakdown {
  finalScore: number;
  priceScore: number;
  volumeScore: number;
  technicalScore: number;
  gapScore: number;
  newsScore: number;
  corporateScore: number;
}

interface AttentionItem {
  ticker: string;
  score: number;
  scores: ScoreBreakdown;
  metrics: CalculatedMetrics;
  reasoningSummary: string;
  currentPrice: number;
  lastSeenPrice: number | null;
  priceMovePct: number | null;
  reasons: string[];
  factors: Factor[];
  chart: {
    timestamp: number;
    price: number;
  }[];
  firstVisit: boolean;
  updatedAt: string;
}

export function Digest() {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const response = await fetch("/api/attention", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (loading || items.length === 0) return;

    const timer = setTimeout(() => {
      fetch("/api/attention/seen", { method: "POST" });
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading, items]);

  if (loading) {
    return <Card className="h-64 animate-pulse border-slate-200 bg-white" />;
  }

  if (!items.length) {
    return (
      <Card className="border-slate-200 bg-white p-8">
        <p className="text-sm font-semibold text-slate-900">
          No market changes yet
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Add stocks to begin building your attention feed.
        </p>
      </Card>
    );
  }

  const highAttention = items.filter((item) => item.score >= 60).length;

  return (
    <section>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
            Intelligent Attention Feed
          </p>

          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Attention & Metric Analysis
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {highAttention > 0
              ? `${highAttention} stock${highAttention === 1 ? "" : "s"} scored high attention based on real-time calculated metrics.`
              : "Market metrics calculated across all tracked stocks."}
          </p>
        </div>

        <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 sm:block">
          Ranked by final calculated score
        </div>
      </div>

      <div className="space-y-6">
        {items.map((item) => (
          <AttentionCard key={item.ticker} item={item} />
        ))}
      </div>
    </section>
  );
}

function AttentionCard({ item }: { item: AttentionItem }) {
  const scoreLabel =
    item.score >= 70
      ? "HIGH ATTENTION"
      : item.score >= 40
      ? "MEDIUM ATTENTION"
      : "LOW ATTENTION";

  const scoreClass =
    item.score >= 70
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : item.score >= 40
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="p-6">
        {/* Top Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-500/20">
                {item.ticker.slice(0, 3)}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/stocks/${item.ticker}`}
                    className="text-xl font-bold tracking-tight text-slate-950 hover:text-blue-600 transition-colors"
                  >
                    {item.ticker}
                  </Link>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.14em] ring-1",
                      scoreClass,
                    ].join(" ")}
                  >
                    {scoreLabel}
                  </span>

                  {item.firstVisit && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                      Initial Baseline
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-semibold tracking-tight text-slate-950">
                    ${item.currentPrice.toFixed(2)}
                  </span>

                  {item.priceMovePct !== null && (
                    <span
                      className={
                        item.priceMovePct >= 0
                          ? "text-sm font-bold text-emerald-600"
                          : "text-sm font-bold text-rose-600"
                      }
                    >
                      {item.priceMovePct >= 0 ? "↑" : "↓"}{" "}
                      {Math.abs(item.priceMovePct).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Signal Badges */}
            {item.reasons.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Final Score Circle/Badge */}
          <div className="flex items-center gap-4 lg:flex-col lg:items-end">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Final Score
              </p>
              <div className="mt-1 flex items-baseline justify-end gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-950">
                  {item.score}
                </span>
                <span className="text-sm font-semibold text-slate-400">/ 100</span>
              </div>
            </div>

            <div className="h-2.5 w-32 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.score >= 70
                    ? "bg-emerald-500"
                    : item.score >= 40
                    ? "bg-blue-600"
                    : "bg-slate-400"
                }`}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Overall Score Reasoning Banner */}
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
            Score Calculation Reasoning
          </p>
          <p className="mt-1 text-xs leading-relaxed text-blue-950 font-medium">
            {item.reasoningSummary}
          </p>
        </div>

        {/* Calculated Metrics Summary Grid */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Calculated Metric Summary
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricBadge
              label="RSI (14)"
              value={item.metrics?.rsi14 ? item.metrics.rsi14.toFixed(1) : "N/A"}
              subtext={
                item.metrics?.rsi14
                  ? item.metrics.rsi14 >= 70
                    ? "Overbought"
                    : item.metrics.rsi14 <= 30
                    ? "Oversold"
                    : "Neutral"
                  : "Normal"
              }
              highlight={
                !!item.metrics?.rsi14 &&
                (item.metrics.rsi14 >= 70 || item.metrics.rsi14 <= 30)
              }
            />

            <MetricBadge
              label="20d Volatility"
              value={
                item.metrics?.volatility20Pct
                  ? `${item.metrics.volatility20Pct.toFixed(2)}%`
                  : "N/A"
              }
              subtext="Normalized range"
            />

            <MetricBadge
              label="Volume Spike"
              value={
                item.metrics?.volumeSpike
                  ? `${item.metrics.volumeSpike.toFixed(1)}×`
                  : "1.0×"
              }
              subtext="Vs 20-day avg"
              highlight={!!item.metrics?.volumeSpike && item.metrics.volumeSpike > 1.5}
            />

            <MetricBadge
              label="50-Day DMA"
              value={
                item.metrics?.sma50 ? `$${item.metrics.sma50.toFixed(2)}` : "N/A"
              }
              subtext={
                item.metrics?.sma50
                  ? item.currentPrice >= item.metrics.sma50
                    ? "Above DMA"
                    : "Below DMA"
                  : "Indicator"
              }
            />

            <MetricBadge
              label="200-Day DMA"
              value={
                item.metrics?.sma200 ? `$${item.metrics.sma200.toFixed(2)}` : "N/A"
              }
              subtext={
                item.metrics?.sma200
                  ? item.currentPrice >= item.metrics.sma200
                    ? "Above DMA"
                    : "Below DMA"
                  : "Indicator"
              }
            />

            <MetricBadge
              label="52w High / Low"
              value={
                item.metrics?.week52High
                  ? `$${item.metrics.week52High.toFixed(0)}`
                  : "N/A"
              }
              subtext={
                item.metrics?.week52Low
                  ? `Low: $${item.metrics.week52Low.toFixed(0)}`
                  : "52-week"
              }
            />
          </div>
        </div>

        {/* Price Comparison Chart */}
        {item.chart && item.chart.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Price Movement Trend
              </p>
              {item.lastSeenPrice && (
                <p className="text-xs font-medium text-slate-600">
                  Last seen: ${item.lastSeenPrice.toFixed(2)}
                </p>
              )}
            </div>
            <PriceComparisonChart
              current={item.currentPrice}
              previous={item.lastSeenPrice}
              history={item.chart}
            />
          </div>
        )}

        {/* Signal Factors with Metric Calculation Reasoning */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Factor Score Breakdown & Metric Reasoning
            </p>
            <span className="text-xs text-slate-400 font-medium">
              Detailed calculation per metric
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {item.factors.map((factor) => (
              <div
                key={factor.name}
                className={[
                  "rounded-xl border p-4 transition-colors",
                  factor.active
                    ? "border-blue-200 bg-blue-50/30 ring-1 ring-blue-100"
                    : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">{factor.name}</p>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                    {factor.points} / {factor.maxPoints} pts
                  </span>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {factor.value}
                </p>

                <div className="mt-2 text-xs leading-relaxed text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-800">Reasoning: </span>
                  {factor.reasoning}
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${(factor.points / factor.maxPoints) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetricBadge({
  label,
  value,
  subtext,
  highlight = false,
}: {
  label: string;
  value: string;
  subtext: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-3 text-left transition-colors",
        highlight
          ? "border-blue-200 bg-blue-50/50"
          : "border-slate-200 bg-slate-50/60",
      ].join(" ")}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{subtext}</p>
    </div>
  );
}