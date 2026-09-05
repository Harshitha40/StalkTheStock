"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import StockCalculator from "@/components/stock-calculator";

type NewsHeadline = {
  id?: string | number;
  datetime: number;
  headline: string;
  source?: string;
  url?: string;
  sentiment?: number | null;
};

type AttentionItem = {
  ticker: string;

  score: number;

  level: "LOW" | "MEDIUM" | "HIGH";

  price: number | null;

  currentPrice: number | null;

  changePercent: number | null;

  previousPrice: number | null;

  lastSeenPrice: number | null;

  lastSeenAt: string | null;

  firstVisit: boolean;

  updatedAt: string;

  priceMovePct: number | null;

  explanation: string;

  performanceExplanation: string;

  newsExplanation: string;

  reasons: {
    label: string;
    value?: string;
    points: number;
  }[];

  breakdown: {
    priceMove: number;
    volume: number;
    technicals: number;
    gap: number;
    news: number;
    corporateActions: number;
  };

  metrics: {
    rsi14: number | null;
    volatility20Pct: number | null;
    atr14Pct: number | null;
    volumeSpike: number | null;
    currentVolume: number | null;
    averageVolume20: number | null;
    sma50: number | null;
    sma200: number | null;
    week52High: number | null;
    week52Low: number | null;
    openGapPct: number | null;
    newsSentiment: number | null;
    newsCount: number;
    corporateEventsCount: number;
  };

  news: {
    score: number;
    newHeadlineCount: number;
    sentimentDelta: number | null;
    currentSentiment: number | null;
    previousSentiment: number | null;
    reasoning: string;
    headlines: {
      id?: string | number;
      datetime: number;
      headline: string;
      source?: string;
      url?: string;
      sentiment: number | null;
    }[];
  };

  newCorporateEvents: {
    key: string;
    type?: string;
    date?: string;
    hour?: string;
  }[];
};

type SearchResult = {
  symbol: string;
  description: string;
  type: string;
};

type TopPerformerStock = {
  ticker: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
};

interface DashboardProps {
  user: {
    name: string;
    email: string;
  };
};

function uniqueByTicker(
  items: AttentionItem[]
): AttentionItem[] {
  const seen = new Set<string>();
  const result: AttentionItem[] = [];

  for (const item of items) {
    const ticker = item.ticker
      ?.trim()
      .toUpperCase();

    if (!ticker || seen.has(ticker)) {
      continue;
    }

    seen.add(ticker);

    result.push({
      ...item,
      ticker,
    });
  }

  return result;
}

function uniqueSearchResults(
  items: SearchResult[]
): SearchResult[] {
  const seen = new Set<string>();
  const result: SearchResult[] = [];

  for (const item of items) {
    const symbol = item.symbol
      ?.trim()
      .toUpperCase();

    if (!symbol || seen.has(symbol)) {
      continue;
    }

    seen.add(symbol);

    result.push({
      ...item,
      symbol,
    });
  }

  return result;
}

function formatPrice(
  price: number | null
) {
  if (
    price === null ||
    !Number.isFinite(price)
  ) {
    return "—";
  }

  return `$${price.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatPercent(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(
    2
  )}%`;
}

function formatRelativeTime(
  value: string | null
) {
  if (!value) {
    return "Not seen yet";
  }

  const timestamp =
    new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Not seen yet";
  }

  const diff = Math.max(
    0,
    Date.now() - timestamp
  );

  const seconds = Math.floor(
    diff / 1000
  );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes} ${
      minutes === 1
        ? "min"
        : "mins"
    } ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    } ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  return `${days} ${
    days === 1
      ? "day"
      : "days"
  } ago`;
}

function scoreClass(
  level: AttentionItem["level"]
) {
  if (level === "HIGH") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (level === "MEDIUM") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function reasonIcon(label: string) {
  const value =
    label.toLowerCase();

  if (value.includes("price")) {
    return "↑";
  }

  if (value.includes("volume")) {
    return "↗";
  }

  if (value.includes("news")) {
    return "N";
  }

  if (value.includes("52")) {
    return "◆";
  }

  if (value.includes("cross")) {
    return "×";
  }

  return "•";
}

function buildExplanation(
  item: AttentionItem
) {
  const parts: string[] = [];

  if (
    item.previousPrice !== null &&
    item.price !== null &&
    item.previousPrice > 0
  ) {
    const move =
      ((item.price -
        item.previousPrice) /
        item.previousPrice) *
      100;

    if (Math.abs(move) >= 0.1) {
      parts.push(
        `the stock has ${
          move >= 0
            ? "risen"
            : "fallen"
        } ${Math.abs(move).toFixed(
          2
        )}%`
      );
    }
  }

  if (
    item.metrics?.volumeSpike !== null &&
    item.metrics?.volumeSpike !== undefined &&
    item.metrics.volumeSpike >= 1.5
  ) {
    parts.push(
      `trading volume is ${item.metrics.volumeSpike.toFixed(
        1
      )}× its 20-day average`
    );
  }

  if (
    item.metrics?.week52High !== null &&
    item.metrics?.week52High !== undefined &&
    item.price !== null &&
    item.price >= item.metrics.week52High
  ) {
    parts.push(
      "it is trading at a new 52-week high"
    );
  }

  if (
    item.metrics?.week52Low !== null &&
    item.metrics?.week52Low !== undefined &&
    item.price !== null &&
    item.price <= item.metrics.week52Low
  ) {
    parts.push(
      "it is trading near a new 52-week low"
    );
  }

  if (
    typeof item.news?.newHeadlineCount === "number" &&
    item.news.newHeadlineCount > 0
  ) {
    parts.push(
      `${item.news.newHeadlineCount} new ${
        item.news.newHeadlineCount === 1
          ? "headline has"
          : "headlines have"
      } appeared`
    );
  }

  if (parts.length === 0) {
    return item.lastSeenAt
      ? "Since you last checked, no major measurable change has been detected."
      : "This stock has just been added. We are establishing your baseline.";
  }

  return `Since you last checked, ${joinParts(
    parts
  )}.`;
}

function joinParts(
  parts: string[]
) {
  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts
    .slice(0, -1)
    .join(", ")}, and ${
    parts[parts.length - 1]
  }`;
}

export function DashboardClient({
  user,
}: DashboardProps) {
  const [items, setItems] =
    useState<AttentionItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<SearchResult[]>([]);

  const [searching, setSearching] =
    useState(false);

  const [adding, setAdding] =
    useState<string | null>(null);

  const [calculatorOpen, setCalculatorOpen] =
    useState(false);

  const [topPerformers, setTopPerformers] =
    useState<TopPerformerStock[]>([]);

  const [loadingTopPerformers, setLoadingTopPerformers] =
    useState(true);

  async function loadTopPerformers() {
    try {
      setLoadingTopPerformers(true);
      const res = await fetch("/api/stocks/top-performers");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTopPerformers(data);
        }
      }
    } catch (err) {
      console.error("Failed to load top performers:", err);
    } finally {
      setLoadingTopPerformers(false);
    }
  }

  async function loadAttention() {
    try {
      setLoading(true);

      const response =
        await fetch("/api/attention", {
          cache: "no-store",
        });

      if (!response.ok) {
        throw new Error(
          "Failed to load attention"
        );
      }

      const data =
        await response.json();

      if (Array.isArray(data)) {
        const cleanItems =
          uniqueByTicker(data);

        setItems(cleanItems);

        setTimeout(() => {
          fetch("/api/attention/seen", {
            method: "POST",
          }).catch((error) =>
            console.error(
              "Failed to save seen state:",
              error
            )
          );
        }, 500);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error(
        "Attention loading error:",
        error
      );

      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttention();
    loadTopPerformers();
  }, []);

  useEffect(() => {
    const value =
      search.trim();

    if (!value) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(
      async () => {
        try {
          setSearching(true);

          const response =
            await fetch(
              `/api/stocks/search?q=${encodeURIComponent(
                value
              )}`,
              {
                cache: "no-store",
              }
            );

          if (!response.ok) {
            setSearchResults([]);
            return;
          }

          const data =
            await response.json();

          setSearchResults(
            Array.isArray(data)
              ? uniqueSearchResults(
                  data
                )
              : []
          );
        } catch (error) {
          console.error(
            "Stock search error:",
            error
          );

          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      },
      300
    );

    return () =>
      clearTimeout(timer);
  }, [search]);

  async function addStock(
    ticker: string
  ) {
    const normalizedTicker =
      ticker.trim().toUpperCase();

    if (!normalizedTicker) {
      return;
    }

    // Check if already in watchlist to avoid duplicates
    if (
      cleanItems.some(
        (item) => item.ticker === normalizedTicker
      )
    ) {
      return;
    }

    try {
      setAdding(normalizedTicker);

      const response =
        await fetch(
          "/api/watchlist",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              ticker:
                normalizedTicker,
            }),
          }
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          data?.error ||
            "Failed to add stock"
        );
      }

      // Optimistically add a placeholder to items so the UI
      // shows "Watching" immediately without a full re-fetch
      const placeholder: AttentionItem = {
        ticker: normalizedTicker,
        score: 0,
        level: "LOW",
        price: null,
        currentPrice: null,
        changePercent: null,
        previousPrice: null,
        lastSeenPrice: null,
        lastSeenAt: null,
        firstVisit: true,
        updatedAt: new Date().toISOString(),
        priceMovePct: null,
        explanation: "We are establishing your baseline.",
        performanceExplanation: "",
        newsExplanation: "",
        reasons: [],
        breakdown: {
          priceMove: 0,
          volume: 0,
          technicals: 0,
          gap: 0,
          news: 0,
          corporateActions: 0,
        },
        metrics: {
          rsi14: null,
          volatility20Pct: null,
          atr14Pct: null,
          volumeSpike: null,
          currentVolume: null,
          averageVolume20: null,
          sma50: null,
          sma200: null,
          week52High: null,
          week52Low: null,
          openGapPct: null,
          newsSentiment: null,
          newsCount: 0,
          corporateEventsCount: 0,
        },
        news: {
          score: 0,
          newHeadlineCount: 0,
          sentimentDelta: null,
          currentSentiment: null,
          previousSentiment: null,
          reasoning: "",
          headlines: [],
        },
        newCorporateEvents: [],
      };

      setItems((prev) =>
        uniqueByTicker([...prev, placeholder])
      );

      setSearch("");

      // Background re-fetch to sync real data (no loading flash).
      // Merge instead of replace so optimistic placeholders survive
      // if Inngest hasn't computed attention metrics yet.
      fetch("/api/attention", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data)) {
            setItems((prev) => {
              const fetched = uniqueByTicker(data);
              const fetchedSet = new Set(
                fetched.map((i) => i.ticker)
              );
              // Keep any placeholder tickers not yet in the DB response
              const keepPlaceholders = prev.filter(
                (i) => !fetchedSet.has(i.ticker)
              );
              return uniqueByTicker([...fetched, ...keepPlaceholders]);
            });
          }
        })
        .catch(() => {/* silently ignore background sync errors */});
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to add stock"
      );
    } finally {
      setAdding(null);
    }
  }

  const cleanItems = useMemo(
    () => uniqueByTicker(items),
    [items]
  );

  const watchlistTickers = useMemo(
    () =>
      new Set(
        cleanItems.map((item) =>
          String(item.ticker).toUpperCase()
        )
      ),
    [cleanItems]
  );

  const high =
    cleanItems.filter(
      (item) =>
        item.level === "HIGH"
    ).length;

  const medium =
    cleanItems.filter(
      (item) =>
        item.level === "MEDIUM"
    ).length;

  const low =
    cleanItems.filter(
      (item) =>
        item.level === "LOW"
    ).length;

  const topItems =
    [...cleanItems]
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Navbar user={user} />

      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">

        {/* HEADER */}

        <section className="mb-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
                Stock intelligence
              </p>

              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                Good evening,{" "}
                {user.name.split(" ")[0]}.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                See what changed across
                your watchlist and why it
                deserves your attention.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Shared market data
            </div>
          </div>
        </section>

        {/* SEARCH */}

        <section className="relative mb-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex items-center">
              <span className="px-4 text-slate-400">
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search stocks by ticker or company name..."
                className="h-12 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="mr-3 text-xs text-slate-400 hover:text-slate-900"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {search && (
            <div className="absolute left-0 right-0 top-[68px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              {searching ? (
                <div className="p-6 text-sm text-slate-500">
                  Searching stocks...
                </div>
              ) : searchResults.length ===
                0 ? (
                <div className="p-6 text-sm text-slate-500">
                  No matching stocks found.
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto">
                  {searchResults
                    .slice(0, 12)
                    .map((stock) => {
                      const symbol =
                        stock.symbol
                          .trim()
                          .toUpperCase();

                      const alreadyAdded =
                        cleanItems.some(
                          (item) =>
                            item.ticker ===
                            symbol
                        );

                      return (
                        <div
                          key={symbol}
                          className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50"
                        >
                          <div className="min-w-0 pr-4">
                            <p className="font-semibold text-slate-950">
                              {symbol}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {stock.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={
                              alreadyAdded ||
                              adding ===
                                symbol
                            }
                            onClick={() =>
                              addStock(
                                symbol
                              )
                            }
                            className="shrink-0 rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                          >
                            {alreadyAdded
                              ? "Added"
                              : adding ===
                                symbol
                              ? "Adding..."
                              : "Add"}
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* SUMMARY */}

        <section className="mb-10 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="High attention"
            value={high}
            description="Needs review"
            className="text-red-600"
          />

          <SummaryCard
            label="Medium attention"
            value={medium}
            description="Worth checking"
            className="text-amber-600"
          />

          <SummaryCard
            label="Low attention"
            value={low}
            description="No major changes"
            className="text-emerald-600"
          />
        </section>

        {/* ATTENTION */}

        <section className="mb-12">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Since you last checked
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              What needs your attention
            </h2>
          </div>

          {loading ? (
            <LoadingCards />
          ) : topItems.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {topItems.map((item) => (
                <AttentionCard
                  key={item.ticker}
                  item={item}
                />
              ))}
            </div>
          )}
        </section>

        {/* WATCHLIST */}

        <section className="mb-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Your market
              </p>

              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Watchlist
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Ranked automatically by
                attention score.
              </p>
            </div>

            <span className="text-xs text-slate-400">
              {cleanItems.length} stocks
            </span>
          </div>

          {loading ? (
            <LoadingCards />
          ) : cleanItems.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {cleanItems.map(
                (item, index) => (
                  <WatchlistRow
                    key={item.ticker}
                    item={item}
                    index={index}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* TOP PERFORMERS OF THE DAY (AROUND 20) */}

        <section className="mb-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Market Leaders
                </p>
              </div>

              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Top Performing Stocks Today
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Top market movers and gainers across US exchanges today.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {topPerformers.length} top gainers
            </span>
          </div>

          {loadingTopPerformers ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
                />
              ))}
            </div>
          ) : topPerformers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              Top market performer data is temporarily loading.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {topPerformers.map((stock, idx) => {
                const isWatchlisted = watchlistTickers.has(stock.ticker);
                const isPositive = (stock.changePercent ?? 0) >= 0;

                return (
                  <div
                    key={stock.ticker}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                            {idx + 1}
                          </span>
                          <a
                            href={`/dashboard/stocks/${encodeURIComponent(stock.ticker)}`}
                            className="font-bold text-slate-900 group-hover:text-blue-600 transition"
                          >
                            {stock.ticker}
                          </a>
                        </div>

                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {stock.changePercent !== null && stock.changePercent !== undefined
                            ? Number(stock.changePercent).toFixed(2)
                            : "0.00"}
                          %
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                        {stock.name || stock.ticker}
                      </p>
                    </div>

                    <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {formatPrice(stock.price)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isPositive ? "+" : ""}${Number(stock.change ?? 0).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isWatchlisted ? (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                            Watching
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={adding === stock.ticker}
                            onClick={() => addStock(stock.ticker)}
                            className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
                          >
                            {adding === stock.ticker ? "Adding..." : "+ Watch"}
                          </button>
                        )}

                        <a
                          href={`/dashboard/stocks/${encodeURIComponent(stock.ticker)}`}
                          aria-label={`View ${stock.ticker} analysis`}
                          className="rounded-lg border border-slate-200 p-1 text-xs text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
                        >
                          →
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* FLOATING CALCULATOR */}

      <button
        type="button"
        onClick={() =>
          setCalculatorOpen(true)
        }
        aria-label="Open calculator"
        className="fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-2xl text-white shadow-2xl transition hover:-translate-y-1 hover:bg-blue-700"
      >
        🧮
      </button>

      {calculatorOpen && (
        <StockCalculator
          stocks={cleanItems}
          onClose={() =>
            setCalculatorOpen(false)
          }
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  className,
}: {
  label: string;
  value: number;
  description: string;
  className: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <div
        className={`mt-3 text-3xl font-semibold ${className}`}
      >
        {value}
      </div>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function AttentionCard({
  item,
}: {
  item: AttentionItem;
}) {
  const router = useRouter();
  const explanation =
    buildExplanation(item);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        router.push(
          `/dashboard/stocks/${encodeURIComponent(
            item.ticker
          )}`
        );
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(
            `/dashboard/stocks/${encodeURIComponent(
              item.ticker
            )}`
          );
        }
      }}
      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-slate-950">
              {item.ticker}
            </h3>

            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${scoreClass(
                item.level
              )}`}
            >
              {item.level}
            </span>
          </div>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {formatPrice(item.price)}
          </p>

          <p
            className={`mt-1 text-sm font-semibold ${
              item.changePercent !==
                null &&
              item.changePercent >= 0
                ? "text-emerald-600"
                : item.changePercent !==
                  null
                ? "text-red-600"
                : "text-slate-400"
            }`}
          >
            {formatPercent(
              item.changePercent
            )}
          </p>

          <p className="mt-2 text-[11px] font-medium text-slate-400">
            Last seen{" "}
            {formatRelativeTime(
              item.lastSeenAt
            )}
          </p>
        </div>

        <div className="text-right">
          <div className="text-4xl font-semibold tracking-tight text-slate-950">
            {Number.isFinite(
              item.score
            )
              ? item.score
              : "—"}
          </div>

          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            / 100
          </div>
        </div>
      </div>

      {/* HUMAN EXPLANATION */}

      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
          What changed
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {explanation}
        </p>
      </div>

      {/* REASONS */}

      <div className="my-6 h-px bg-slate-100" />

      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Why this stock?
      </p>

      <div className="flex flex-wrap gap-2">
        {(item.reasons ?? [])
          .slice(0, 5)
          .map(
            (reason, index) => (
              <span
                key={`${item.ticker}-${reason.label}-${index}`}
                className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
              >
                <span className="mr-1.5 text-blue-600">
                  {reasonIcon(
                    reason.label
                  )}
                </span>

                {reason.label}

                {reason.value
                  ? ` ${reason.value}`
                  : ""}
              </span>
            )
          )}
      </div>

      {/* NEWS */}

      {item.news?.headlines &&
        item.news.headlines.length > 0 && (
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Latest stock news
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  Recent headlines from Marketaux
                </p>
              </div>

              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                {item.news.newHeadlineCount > 0
                  ? `${item.news.newHeadlineCount} new`
                  : `${item.news.headlines.length} available`}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {item.news.headlines
                .slice(0, 5)
                .map(
                  (
                    headline,
                    index
                  ) => (
                    <a
                      key={
                        headline.id ??
                        `${item.ticker}-news-${headline.datetime}-${index}`
                      }
                      href={
                        headline.url ||
                        "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      className="block rounded-lg border border-slate-100 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/30"
                    >
                      <p className="text-xs font-semibold leading-5 text-slate-800 hover:text-blue-600">
                        {headline.headline}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[10px] text-slate-400">
                          {headline.source ||
                            "Marketaux"}
                        </span>

                        {headline.sentiment !==
                          null &&
                          headline.sentiment !==
                            undefined && (
                            <span className="text-[10px] font-medium text-slate-400">
                              Sentiment{" "}
                              {headline.sentiment >=
                              0
                                ? "+"
                                : ""}
                              {headline.sentiment.toFixed(
                                2
                              )}
                            </span>
                          )}
                      </div>
                    </a>
                  )
                )}
            </div>
          </div>
        )}

      <div className="mt-6 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Attention breakdown
        </span>

        <span className="font-semibold text-blue-600 group-hover:underline">
          View analysis →
        </span>
      </div>
    </div>
  );
}

function WatchlistRow({
  item,
  index,
}: {
  item: AttentionItem;
  index: number;
}) {
  return (
    <a
      href={`/dashboard/stocks/${encodeURIComponent(
        item.ticker
      )}`}
      className="flex items-center justify-between border-b border-slate-100 px-5 py-5 transition last:border-0 hover:bg-slate-50"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="w-5 text-xs text-slate-300">
          {String(index + 1).padStart(
            2,
            "0"
          )}
        </span>

        <div className="min-w-0">
          <p className="font-semibold text-slate-950">
            {item.ticker}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Last seen{" "}
            {formatRelativeTime(
              item.lastSeenAt
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden text-right sm:block">
          <p className="font-semibold text-slate-950">
            {formatPrice(item.price)}
          </p>

          <p
            className={`mt-1 text-xs font-medium ${
              item.changePercent !==
                null &&
              item.changePercent >= 0
                ? "text-emerald-600"
                : item.changePercent !==
                  null
                ? "text-red-600"
                : "text-slate-400"
            }`}
          >
            {formatPercent(
              item.changePercent
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-slate-950">
            {Number.isFinite(
              item.score
            )
              ? item.score
              : "—"}
          </p>

          <p className="text-[9px] font-bold tracking-wider text-slate-400">
            ATTENTION
          </p>
        </div>

        <span className="text-slate-300">
          →
        </span>
      </div>
    </a>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[1, 2, 3, 4].map(
        (item) => (
          <div
            key={item}
            className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        )
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <p className="text-lg font-semibold text-slate-900">
        Your watchlist is quiet.
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Search for a stock above to start
        building your attention feed.
      </p>
    </div>
  );
}