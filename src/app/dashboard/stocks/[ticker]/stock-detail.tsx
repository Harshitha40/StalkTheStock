"use client";

import { useEffect, useState } from "react";

/* =========================================================
   LOCAL TYPE — mirrors AttentionItem from attention.ts
   ========================================================= */

type AttentionNewsItem = {
  id?: string | number;
  datetime: number;
  headline: string;
  source?: string;
  url?: string;
  sentiment: number | null;
};

type Attention = {
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
    headlines: AttentionNewsItem[];
  };

  corporateEvents: {
    key: string;
    type?: string;
    date?: string;
    hour?: string;
  }[];

  newCorporateEvents: {
    key: string;
    type?: string;
    date?: string;
    hour?: string;
  }[];

  chart: {
    timestamp: number;
    price: number;
  }[];
};

/* =========================================================
   HELPERS
   ========================================================= */

function metric(
  value: number | null | undefined,
  suffix = ""
) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(2)}${suffix}`;
}

function scoreColor(
  level: Attention["level"]
) {
  if (level === "HIGH") return "text-red-600";
  if (level === "MEDIUM") return "text-amber-600";
  return "text-emerald-600";
}

function hasAnalytics(data: Attention) {
  const metrics = data?.metrics;

  if (!metrics) {
    return false;
  }

  return (
    metrics.rsi14 != null ||
    metrics.sma50 != null ||
    metrics.volatility20Pct != null ||
    metrics.sma200 != null ||
    metrics.volumeSpike != null ||
    metrics.week52High != null ||
    metrics.week52Low != null
  );
}
/* =========================================================
   MAIN COMPONENT
   ========================================================= */


export default function StockDetail({
  ticker,
}: {
  ticker: string;
}) {
  const [data, setData] = useState<Attention | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
  try {
    const response = await fetch(
      `/api/attention?ticker=${encodeURIComponent(ticker)}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Failed to load stock");
    }

    const raw = await response.json();

    // /api/attention returns an array.
    // Stock detail needs the single requested ticker.
    const item = Array.isArray(raw)
      ? raw.find(
          (stock) =>
            String(stock?.ticker).toUpperCase() ===
            ticker.toUpperCase()
        )
      : raw;

    if (!item) {
      throw new Error(
        `No attention data found for ${ticker}`
      );
    }

    const normalized: Attention = {
      ...item,

      price:
        item.price ??
        item.currentPrice ??
        null,

      currentPrice:
        item.currentPrice ??
        item.price ??
        null,

      changePercent:
        item.changePercent ??
        null,

      reasons:
        Array.isArray(item.reasons)
          ? item.reasons
          : [],

      breakdown: {
        priceMove:
          Number(item.breakdown?.priceMove ?? 0),
        volume:
          Number(item.breakdown?.volume ?? 0),
        technicals:
          Number(item.breakdown?.technicals ?? 0),
        gap:
          Number(item.breakdown?.gap ?? 0),
        news:
          Number(item.breakdown?.news ?? 0),
        corporateActions:
          Number(
            item.breakdown?.corporateActions ?? 0
          ),
      },

      metrics: {
        rsi14:
          item.metrics?.rsi14 ?? null,
        volatility20Pct:
          item.metrics?.volatility20Pct ?? null,
        atr14Pct:
          item.metrics?.atr14Pct ?? null,
        volumeSpike:
          item.metrics?.volumeSpike ?? null,
        currentVolume:
          item.metrics?.currentVolume ?? null,
        averageVolume20:
          item.metrics?.averageVolume20 ?? null,
        sma50:
          item.metrics?.sma50 ?? null,
        sma200:
          item.metrics?.sma200 ?? null,
        week52High:
          item.metrics?.week52High ?? null,
        week52Low:
          item.metrics?.week52Low ?? null,
        openGapPct:
          item.metrics?.openGapPct ?? null,
        newsSentiment:
          item.metrics?.newsSentiment ?? null,
        newsCount:
          Number(item.metrics?.newsCount ?? 0),
        corporateEventsCount:
          Number(
            item.metrics?.corporateEventsCount ?? 0
          ),
      },

      news: {
        score:
          Number(item.news?.score ?? 0),
        newHeadlineCount:
          Number(
            item.news?.newHeadlineCount ?? 0
          ),
        sentimentDelta:
          item.news?.sentimentDelta ?? null,
        currentSentiment:
          item.news?.currentSentiment ?? null,
        previousSentiment:
          item.news?.previousSentiment ?? null,
        reasoning:
          item.news?.reasoning ?? "",
        headlines:
          Array.isArray(item.news?.headlines)
            ? item.news.headlines
            : [],
      },

      corporateEvents:
        Array.isArray(item.corporateEvents)
          ? item.corporateEvents
          : [],

      newCorporateEvents:
        Array.isArray(item.newCorporateEvents)
          ? item.newCorporateEvents
          : [],

      chart:
        Array.isArray(item.chart)
          ? item.chart
          : [],
    };

    setData(normalized);
  } catch (error) {
    console.warn(
      "Primary attention fetch failed, attempting fallback to /api/stocks:",
      error
    );

    try {
      const fallbackRes = await fetch(
        `/api/stocks/${encodeURIComponent(ticker)}`,
        { cache: "no-store" }
      );
      if (fallbackRes.ok) {
        const stock = await fallbackRes.json();
        const fallbackNormalized: Attention = {
          ticker: ticker.toUpperCase(),
          score: stock.attention?.score ?? 0,
          level: stock.attention?.level ?? "LOW",
          price: stock.price ?? 0,
          currentPrice: stock.price ?? 0,
          changePercent: stock.changePercent ?? 0,
          previousPrice: stock.previousClose ?? null,
          lastSeenPrice: null,
          lastSeenAt: null,
          firstVisit: true,
          updatedAt: new Date().toISOString(),
          priceMovePct: stock.changePercent ?? null,
          explanation: stock.attention?.explanation ?? "Live market data loaded.",
          performanceExplanation: "",
          newsExplanation: "",
          reasons: stock.attention?.reasons ?? [],
          breakdown: stock.attention?.breakdown ?? {
            priceMove: 0,
            volume: 0,
            technicals: 0,
            gap: 0,
            news: 0,
            corporateActions: 0,
          },
          metrics: stock.attention?.metrics ?? {
            rsi14: null,
            volatility20Pct: null,
            atr14Pct: null,
            volumeSpike: null,
            currentVolume: null,
            averageVolume20: null,
            sma50: null,
            sma200: null,
            week52High: stock.high ?? null,
            week52Low: stock.low ?? null,
            openGapPct: null,
            newsSentiment: null,
            newsCount: 0,
            corporateEventsCount: 0,
          },
          news: stock.attention?.news ?? {
            score: 0,
            newHeadlineCount: 0,
            sentimentDelta: null,
            currentSentiment: null,
            previousSentiment: null,
            reasoning: "",
            headlines: [],
          },
          corporateEvents: stock.attention?.corporateEvents ?? [],
          newCorporateEvents: [],
          chart: stock.attention?.chart ?? [
            {
              timestamp: Math.floor(Date.now() / 1000),
              price: stock.price ?? 0,
            },
          ],
        };
        setData(fallbackNormalized);
      }
    } catch (fallbackError) {
      console.error("Fallback load failed:", fallbackError);
    }
  } finally {
    setLoading(false);
  }
}
    
  useEffect(() => {
    load();
  }, [ticker]);

  async function triggerRefresh() {
    setRefreshing(true);
    try {
      await fetch(
        `/api/attention/refresh?ticker=${encodeURIComponent(ticker)}`,
        { method: "POST" }
      );
      /* Give inngest ~8 seconds to process then reload */
      await new Promise((resolve) => setTimeout(resolve, 8000));
      await load();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f9fc] p-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-8 w-32 rounded bg-slate-200" />
          <div className="mt-8 h-72 rounded-2xl bg-white" />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f7f9fc] p-8">
        <div className="mx-auto max-w-7xl">
          <a
            href="/dashboard"
            className="text-sm text-blue-600"
          >
            ← Back to dashboard
          </a>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-10">
            Stock data is currently unavailable.
          </div>
        </div>
      </main>
    );
  }

  const analyticsReady = hasAnalytics(data);

  return (
    <main className="min-h-screen bg-[#f7f9fc]">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">

        <a
          href="/dashboard"
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          ← Back to watchlist
        </a>

        {/* HERO */}

        <section className="mt-8 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
              Stock analysis
            </p>

            <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em] text-slate-950">
              {data.ticker}
            </h1>

            <div className="mt-4 flex items-baseline gap-4">
              <span className="text-3xl font-semibold text-slate-950">
                {data.price != null
  ? `$${Number(data.price).toFixed(2)}`
  : "—"}
              </span>

              <span
                className={`text-sm font-semibold ${
                  (data.changePercent ?? 0) >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {data.changePercent != null
                  ? `${data.changePercent >= 0 ? "+" : ""}${data.changePercent.toFixed(2)}%`
                  : "—"}
              </span>
            </div>
          </div>

          <div className="text-left md:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Attention score
            </p>

            <div
              className={`mt-1 text-5xl font-semibold ${scoreColor(data.level)}`}
            >
              {data.score}
            </div>

            <p className="text-xs font-bold tracking-widest text-slate-400">
              / 100 · {data.level}
            </p>
          </div>
        </section>

        {/* ANALYTICS NOT READY BANNER */}

        {!analyticsReady && (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">
                  Analytics computing
                </p>

                <p className="mt-1 text-sm text-amber-800">
                  {data.firstVisit
                    ? "This stock was just added. Full technical analytics are being computed in the background — this usually takes under a minute."
                    : "Analytics are not yet available for this stock. Click Refresh to trigger computation."}
                </p>
              </div>

              <button
                type="button"
                onClick={triggerRefresh}
                disabled={refreshing}
                className="shrink-0 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {refreshing ? "Refreshing…" : "Refresh now"}
              </button>
            </div>
          </section>
        )}

        {/* EXPLANATION */}

        {!data.firstVisit && data.explanation && (
          <section className="mt-10 rounded-2xl border border-blue-100 bg-blue-50/50 p-6 md:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
              What changed
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-700">
              {data.explanation}
            </p>
          </section>
        )}

        {/* WHY */}

        <section className="mt-10 rounded-2xl border border-blue-100 bg-blue-50/50 p-6 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
            Why this stock?
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            What changed since your last check
          </h2>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {(data.reasons ?? []).length > 0 ? (
              (data.reasons ?? []).map((reason, index) => (
                <div
                  key={`${reason.label}-${index}`}
                  className="rounded-xl border border-white bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      {reason.label}
                    </span>

                    <span className="text-xs font-bold text-blue-600">
                      +{reason.points}
                    </span>
                  </div>

                  {reason.value && (
                    <p className="mt-2 text-sm text-slate-500">
                      {reason.value}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                {data.firstVisit
                  ? "Baseline is being established. Attention signals will appear on your next visit."
                  : "No significant changes detected since your last visit."}
              </p>
            )}
          </div>
        </section>

        {/* SCORE BREAKDOWN */}

        <section className="mt-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Score breakdown
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <ScoreBox label="Price" value={data.breakdown.priceMove} max={30} />
            <ScoreBox label="Volume" value={data.breakdown.volume} max={20} />
            <ScoreBox label="Technical" value={data.breakdown.technicals} max={20} />
            <ScoreBox label="Gap" value={data.breakdown.gap} max={10} />
            <ScoreBox label="News" value={data.breakdown.news} max={10} />
            <ScoreBox label="Corporate" value={data.breakdown.corporateActions} max={10} />
          </div>
        </section>

        {/* METRICS */}

        <section className="mt-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Market metrics
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              label="RSI (14)"
              value={metric(data.metrics.rsi14)}
            />

            <Metric
              label="20D volatility"
              value={metric(data.metrics.volatility20Pct, "%")}
            />

            <Metric
              label="Volume spike"
              value={metric(data.metrics.volumeSpike, "×")}
            />

            <Metric
              label="50-day DMA"
              value={
                data.metrics.sma50 != null
                  ? `$${data.metrics.sma50.toFixed(2)}`
                  : "—"
              }
            />

            <Metric
              label="200-day DMA"
              value={
                data.metrics.sma200 != null
                  ? `$${data.metrics.sma200.toFixed(2)}`
                  : "—"
              }
            />

            <Metric
              label="52-week range"
              value={
                data.metrics.week52Low != null &&
                data.metrics.week52High != null
                  ? `$${data.metrics.week52Low.toFixed(2)} — $${data.metrics.week52High.toFixed(2)}`
                  : "—"
              }
            />

            {data.metrics.openGapPct != null && (
              <Metric
                label="Opening gap"
                value={`${data.metrics.openGapPct >= 0 ? "+" : ""}${data.metrics.openGapPct.toFixed(2)}%`}
              />
            )}

            {data.metrics.currentVolume != null && (
              <Metric
                label="Current volume"
                value={
                  data.metrics.currentVolume >= 1_000_000
                    ? `${(data.metrics.currentVolume / 1_000_000).toFixed(2)}M`
                    : data.metrics.currentVolume.toLocaleString()
                }
              />
            )}

            {data.metrics.averageVolume20 != null && (
              <Metric
                label="Avg volume (20D)"
                value={
                  data.metrics.averageVolume20 >= 1_000_000
                    ? `${(data.metrics.averageVolume20 / 1_000_000).toFixed(2)}M`
                    : data.metrics.averageVolume20.toLocaleString()
                }
              />
            )}
          </div>

          {!analyticsReady && (
            <p className="mt-4 text-xs text-slate-400">
              Metrics will appear once analytics have been computed.
            </p>
          )}
        </section>

        {/* NEWS */}

        <section className="mt-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            News signal
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-xs text-slate-400">New headlines</p>

                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {data.news.newHeadlineCount}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Current sentiment</p>

                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {data.news.currentSentiment != null
                    ? data.news.currentSentiment.toFixed(2)
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Sentiment delta</p>

                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {data.news.sentimentDelta != null
                    ? `${data.news.sentimentDelta >= 0 ? "+" : ""}${data.news.sentimentDelta.toFixed(2)}`
                    : "—"}
                </p>
              </div>
            </div>

            {data.news.reasoning && (
              <p className="mt-4 text-sm text-slate-500">
                {data.news.reasoning}
              </p>
            )}

            {/* HEADLINES */}

            {data.news.headlines && data.news.headlines.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Recent headlines
                </p>

                <div className="space-y-3">
                  {data.news.headlines.slice(0, 5).map((headline, index) => (
                    <a
                      key={
  headline.id ??
  `${ticker}-${headline.datetime}-${index}`
}
                      href={headline.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm font-medium leading-5 text-slate-700 hover:text-blue-600"
                    >
                      {headline.headline}

                      {headline.source && (
                        <span className="ml-2 text-[10px] font-normal text-slate-400">
                          {headline.source}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CORPORATE EVENTS */}

        {data.newCorporateEvents && data.newCorporateEvents.length > 0 && (
          <section className="mt-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Corporate events
            </p>

            <div className="mt-4 space-y-3">
              {data.newCorporateEvents.map((event) => (
                <div
                  key={event.key}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold capitalize text-slate-900">
                      {event.type ?? "Event"}
                    </span>

                    {event.date && (
                      <span className="text-xs text-slate-500">{event.date}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}

/* =========================================================
   SUB-COMPONENTS
   ========================================================= */

function ScoreBox({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-900">{value}/{max}</span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}