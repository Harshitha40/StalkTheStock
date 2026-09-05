"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
}

interface AttentionData {
  score: number;
  reasoningSummary?: string;
  metrics?: CalculatedMetrics;
  reasons?: string[];
}

interface WatchlistItem {
  _id?: string;
  ticker: string;
  position: number;
  attention?: AttentionData | null;
  quote: {
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    previousClose: number;
    timestamp: number;
    fetchedAt: string;
  } | null;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatUpdated(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 1000 / 60);

  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} min ago`;
}

export function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const response = await fetch("/api/watchlist", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(ticker: string) {
    const response = await fetch("/api/watchlist", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ticker }),
    });

    if (!response.ok) return;

    setItems((current) => current.filter((item) => item.ticker !== ticker));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <Card
            key={item}
            className="h-28 animate-pulse border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="mx-auto max-w-md">
          <p className="text-lg font-semibold tracking-tight">
            Your watchlist is empty
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Add stocks to start tracking attention scores & calculated metrics.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="hidden grid-cols-[1.2fr_1fr_1fr_1.5fr_1fr_auto] border-b border-slate-200 bg-slate-50/80 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:grid">
        <span>Asset</span>
        <span>Price & Change</span>
        <span>Final Score</span>
        <span>Calculated Metrics</span>
        <span>Day Range</span>
        <span />
      </div>

      {items.map((item) => {
        const quote = item.quote;
        const attention = item.attention;
        const metrics = attention?.metrics;
        const positive = (quote?.changePercent ?? 0) >= 0;
        const score = attention?.score ?? 0;

        const scoreBadgeClass =
          score >= 70
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : score >= 40
            ? "bg-blue-50 text-blue-700 ring-blue-200"
            : "bg-slate-100 text-slate-600 ring-slate-200";

        return (
          <div
            key={item.ticker}
            className="group border-b border-slate-100 px-6 py-5 last:border-0 transition-colors hover:bg-slate-50/70"
          >
            <div className="grid items-center gap-5 md:grid-cols-[1.2fr_1fr_1fr_1.5fr_1fr_auto]">
              {/* Asset */}
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                  {item.ticker.slice(0, 3)}
                </div>

                <div>
                  <Link
                    href={`/stocks/${item.ticker}`}
                    className="font-bold tracking-tight text-slate-950 hover:text-blue-600 transition-colors"
                  >
                    {item.ticker}
                  </Link>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {quote
                      ? `Updated ${formatUpdated(quote.fetchedAt)}`
                      : "Waiting for data"}
                  </p>
                </div>
              </div>

              {/* Price & Change */}
              <div>
                <p className="text-lg font-bold tracking-tight text-slate-950">
                  {quote ? formatPrice(quote.price) : "—"}
                </p>

                {quote ? (
                  <div
                    className={[
                      "mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold",
                      positive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700",
                    ].join(" ")}
                  >
                    {positive ? "↑" : "↓"} {formatPercent(quote.changePercent)}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </div>

              {/* Attention Final Score */}
              <div>
                {attention ? (
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold tracking-tight text-slate-950">
                        {score}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/ 100</span>
                    </div>

                    <span
                      className={[
                        "mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider ring-1",
                        scoreBadgeClass,
                      ].join(" ")}
                    >
                      {score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW"}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </div>

              {/* Calculated Metrics Badges */}
              <div className="text-xs">
                {metrics ? (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">
                      RSI: <strong className="text-slate-900">{metrics.rsi14 ? metrics.rsi14.toFixed(1) : "N/A"}</strong>
                    </span>

                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">
                      Vol: <strong className="text-slate-900">{metrics.volatility20Pct ? `${metrics.volatility20Pct.toFixed(1)}%` : "N/A"}</strong>
                    </span>

                    {metrics.volumeSpike && metrics.volumeSpike > 1.2 && (
                      <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-medium text-blue-800">
                        Spike: <strong className="text-blue-900">{metrics.volumeSpike.toFixed(1)}×</strong>
                      </span>
                    )}

                    {metrics.sma50 && (
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">
                        50-DMA: <strong className="text-slate-900">${metrics.sma50.toFixed(0)}</strong>
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">Calculating...</span>
                )}
              </div>

              {/* Range */}
              <div className="text-sm">
                {quote ? (
                  <>
                    <p className="font-semibold text-slate-800">
                      {formatPrice(quote.low)}{" "}
                      <span className="text-slate-300">—</span>{" "}
                      {formatPrice(quote.high)}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">Day range</p>
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>

              {/* Remove */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(item.ticker)}
                className="text-slate-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
              >
                Remove
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}