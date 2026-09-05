import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth-server";
import {
  getAttentionForUser,
  getAttentionForTicker,
  calculateAttention,
} from "@/lib/attention";
import {
  getMarketSnapshot,
  saveMarketSnapshot,
  SnapshotNews,
} from "@/lib/market-snapshot";
import { getStockQuote, getCompanyNews } from "@/lib/finnhub";
import { calculateTechnicalMetrics, TechnicalMetrics } from "@/lib/indicators";
import { headlineSentiment } from "@/lib/sentiment";
import { getWatchlist } from "@/lib/watchlist";

/**
 * Helper to fetch historical candles & compute real technical indicators (RSI, SMA, Volatility, ATR, etc.)
 */
async function computeTechnicalsForTicker(ticker: string) {
  // 1. Try Twelve Data candles first
  try {
    const { getHistoricalCandles } = await import("@/lib/twelve-data");
    const candles = await getHistoricalCandles(ticker, 300);
    if (candles && candles.length > 0) {
      const ordered = [...candles].reverse();
      const candleData = {
        closes: ordered.map((c) => Number(c.close)),
        highs: ordered.map((c) => Number(c.high)),
        lows: ordered.map((c) => Number(c.low)),
        opens: ordered.map((c) => Number(c.open)),
        volumes: ordered.map((c) => Number(c.volume ?? 0)),
        timestamps: ordered.map((c) =>
          Math.floor(new Date(c.datetime).getTime() / 1000)
        ),
      };

      const hasInvalid =
        candleData.closes.some((v) => !Number.isFinite(v)) ||
        candleData.highs.some((v) => !Number.isFinite(v));

      if (!hasInvalid) {
        const technical = calculateTechnicalMetrics(candleData);
        const chart = ordered.slice(-60).map((c) => ({
          timestamp: Math.floor(new Date(c.datetime).getTime() / 1000),
          price: Number(c.close),
        }));
        return { technical, chart };
      }
    }
  } catch (err) {
    console.warn(`[TECH METRICS] Twelve data unavailable for ${ticker}:`, err);
  }

  // 2. Fallback to Finnhub candles
  try {
    const { getStockCandles } = await import("@/lib/finnhub");
    const candles = await getStockCandles(ticker, 365);
    if (candles && candles.s === "ok" && candles.c && candles.c.length > 0) {
      const candleData = {
        closes: candles.c.map(Number),
        highs: candles.h.map(Number),
        lows: candles.l.map(Number),
        opens: candles.o.map(Number),
        volumes: candles.v.map(Number),
        timestamps: candles.t.map(Number),
      };
      const technical = calculateTechnicalMetrics(candleData);
      const closes = candles.c;
      const chart = candles.t.slice(-60).map((t, idx) => ({
        timestamp: t,
        price: closes.slice(-60)[idx],
      }));
      return { technical, chart };
    }
  } catch (err) {
    console.warn(`[TECH METRICS] Finnhub candles unavailable for ${ticker}:`, err);
  }

  return { technical: null, chart: [] };
}

/**
 * On-demand helper to create an initial snapshot for any ticker
 * so it immediately renders on dashboard or stock-detail page with FULL metrics.
 */
async function createOrEnrichSnapshot(ticker: string, existingSnapshot?: any) {
  let price = existingSnapshot?.price ?? 0;
  let change = existingSnapshot?.change ?? 0;
  let changePercent = existingSnapshot?.changePercent ?? 0;
  let high = existingSnapshot?.high ?? 0;
  let low = existingSnapshot?.low ?? 0;
  let open = existingSnapshot?.open ?? 0;
  let previousClose = existingSnapshot?.previousClose ?? 0;

  if (price === 0) {
    try {
      const quote = await getStockQuote(ticker);
      if (quote && Number.isFinite(quote.c)) {
        price = quote.c;
        change = quote.d ?? 0;
        changePercent = quote.dp ?? 0;
        high = quote.h ?? price;
        low = quote.l ?? price;
        open = quote.o ?? price;
        previousClose = quote.pc ?? price;
      }
    } catch (err) {
      console.warn(`[ATTENTION API] Quote failed for ${ticker}:`, err);
    }
  }

  // Fetch news if missing
  let newsList: SnapshotNews[] = existingSnapshot?.analytics?.news ?? [];
  let newsSentiment: number | null =
    existingSnapshot?.analytics?.newsSentiment ?? null;

  if (newsList.length === 0) {
    try {
      const rawNews = await getCompanyNews(ticker, 10);
      newsList = (rawNews || [])
        .map((item: any, idx: number) => {
          const datetime =
            Number(item.datetime) || Math.floor(Date.now() / 1000);
          return {
            id: typeof item.id === "number" ? item.id : datetime + idx,
            datetime,
            headline: String(item.headline ?? "").trim(),
            source: String(item.source ?? "Finnhub"),
            url: String(item.url ?? ""),
            sentiment: headlineSentiment(String(item.headline ?? "")),
          };
        })
        .filter((n) => n.headline.length > 0 && Number.isFinite(n.datetime));

      const sentimentValues = newsList
        .map((n) => n.sentiment)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

      if (sentimentValues.length > 0) {
        newsSentiment =
          sentimentValues.reduce((sum, v) => sum + v, 0) /
          sentimentValues.length;
      }
    } catch (err) {
      console.warn(`[ATTENTION API] News failed for ${ticker}:`, err);
    }
  }

  // Compute Technical Metrics (RSI, Volatility, DMA, 52W High/Low)
  const { technical, chart } = await computeTechnicalsForTicker(ticker);

  const snapshot = {
    ticker,
    price,
    change,
    changePercent,
    high: high > 0 ? high : price,
    low: low > 0 ? low : price,
    open: open > 0 ? open : price,
    previousClose: previousClose > 0 ? previousClose : price,
    timestamp: Math.floor(Date.now() / 1000),
    fetchedAt: new Date(),
    analytics: {
      volatility20Pct: technical?.volatility20Pct ?? null,
      atr14Pct: technical?.atr14Pct ?? null,
      sma50: technical?.sma50 ?? null,
      previousSma50: technical?.previousSma50 ?? null,
      sma200: technical?.sma200 ?? null,
      previousSma200: technical?.previousSma200 ?? null,
      rsi14: technical?.rsi14 ?? null,
      previousRsi14: technical?.previousRsi14 ?? null,
      week52High: technical?.week52High ?? (high > 0 ? high : null),
      week52Low: technical?.week52Low ?? (low > 0 ? low : null),
      currentVolume: technical?.currentVolume ?? null,
      averageVolume20: technical?.averageVolume20 ?? null,
      volumeSpike: technical?.volumeSpike ?? null,
      crossedAbove50: technical?.crossedAbove50 ?? false,
      crossedBelow50: technical?.crossedBelow50 ?? false,
      crossedAbove200: technical?.crossedAbove200 ?? false,
      crossedBelow200: technical?.crossedBelow200 ?? false,
      rsiCrossedAbove70: technical?.rsiCrossedAbove70 ?? false,
      rsiCrossedBelow30: technical?.rsiCrossedBelow30 ?? false,
      new52WeekHigh: technical?.new52WeekHigh ?? false,
      new52WeekLow: technical?.new52WeekLow ?? false,
      newsSentiment,
      latestNewsAt: newsList.length > 0 ? newsList[0].datetime : null,
      news: newsList,
      corporateEvents: existingSnapshot?.analytics?.corporateEvents ?? [],
      chart:
        chart.length > 0
          ? chart
          : price > 0
          ? [
              {
                timestamp: Math.floor(Date.now() / 1000),
                price,
              },
            ]
          : [],
    },
  };

  try {
    await saveMarketSnapshot(snapshot);
  } catch (saveErr) {
    console.warn(`[ATTENTION API] Failed saving snapshot for ${ticker}:`, saveErr);
  }

  return snapshot;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const tickerParam = request.nextUrl.searchParams
      .get("ticker")
      ?.trim()
      .toUpperCase();

    // 1. If a specific ticker is requested (e.g. from stock-detail page)
    if (tickerParam) {
      const existingSnap = await getMarketSnapshot(tickerParam);

      // If snapshot is missing or technical indicators are uncalculated (rsi14 == null), compute them
      if (!existingSnap || existingSnap.analytics?.rsi14 == null) {
        const enriched = await createOrEnrichSnapshot(tickerParam, existingSnap);
        const item = calculateAttention(enriched, null);
        return NextResponse.json([item]);
      }

      const item = await getAttentionForTicker(user.id, tickerParam);
      return NextResponse.json([item]);
    }

    // 2. Full user watchlist attention feed
    let items = await getAttentionForUser(user.id);

    // Check if any watchlist stock is missing or missing technical metrics
    try {
      const watchlist = await getWatchlist(user.id);
      const existingMap = new Map(items.map((i) => [i.ticker.toUpperCase(), i]));

      for (const w of watchlist) {
        const t = w.ticker.toUpperCase();
        const existing = existingMap.get(t);
        if (!existing || existing.metrics?.rsi14 == null) {
          const snap = await createOrEnrichSnapshot(t);
          const computed = calculateAttention(snap, null);
          existingMap.set(t, computed);
        }
      }

      items = Array.from(existingMap.values()).sort((a, b) => b.score - a.score);
    } catch (fillErr) {
      console.warn("[ATTENTION API] Error filling missing snapshots:", fillErr);
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error("Attention API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate attention",
      },
      {
        status: 500,
      }
    );
  }
}