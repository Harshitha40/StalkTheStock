"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WatchlistItem {
  _id?: string;
  ticker: string;
  position: number;
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
  const diff =
    Date.now() - new Date(date).getTime();

  const minutes = Math.floor(
    diff / 1000 / 60
  );

  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min ago";

  return `${minutes} min ago`;
}

export function Watchlist() {
  const [items, setItems] = useState<
    WatchlistItem[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  async function load() {
    try {
      const response =
        await fetch("/api/watchlist", {
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
    const response = await fetch(
      "/api/watchlist",
      {
        method: "DELETE",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          ticker,
        }),
      }
    );

    if (!response.ok) return;

    setItems((current) =>
      current.filter(
        (item) =>
          item.ticker !== ticker
      )
    );
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
            Add stocks to start tracking
            what changed while you were away.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}

      <div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr_auto] border-b border-slate-200 bg-slate-50/80 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:grid">
        <span>Asset</span>
        <span>Price</span>
        <span>Change</span>
        <span>Range</span>
        <span />
      </div>

      {items.map((item, index) => {
        const quote = item.quote;

        const positive =
          (quote?.changePercent ?? 0) >= 0;

        return (
          <div
            key={item.ticker}
            className={[
              "group border-b border-slate-100 px-6 py-5 last:border-0",
              "transition-colors hover:bg-slate-50/70",
            ].join(" ")}
          >
            <div className="grid items-center gap-5 md:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
              {/* Asset */}

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                  {item.ticker.slice(0, 2)}
                </div>

                <div>
                  <Link
                    href={`/stocks/${item.ticker}`}
                    className="font-semibold tracking-tight text-slate-950 hover:text-blue-700"
                  >
                    {item.ticker}
                  </Link>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {quote
                      ? `Updated ${formatUpdated(
                          quote.fetchedAt
                        )}`
                      : "Waiting for market data"}
                  </p>
                </div>
              </div>

              {/* Price */}

              <div>
                <p className="text-lg font-semibold tracking-tight text-slate-950">
                  {quote
                    ? formatPrice(
                        quote.price
                      )
                    : "—"}
                </p>
              </div>

              {/* Change */}

              <div>
                {quote ? (
                  <div
                    className={[
                      "inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-semibold",
                      positive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700",
                    ].join(" ")}
                  >
                    {positive ? "↑" : "↓"}{" "}
                    {formatPercent(
                      quote.changePercent
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">
                    —
                  </span>
                )}
              </div>

              {/* Range */}

              <div className="text-sm">
                {quote ? (
                  <>
                    <p className="font-medium text-slate-700">
                      {formatPrice(
                        quote.low
                      )}{" "}
                      <span className="text-slate-300">
                        —
                      </span>{" "}
                      {formatPrice(
                        quote.high
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Day range
                    </p>
                  </>
                ) : (
                  <span className="text-slate-400">
                    —
                  </span>
                )}
              </div>

              {/* Remove */}

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  remove(item.ticker)
                }
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