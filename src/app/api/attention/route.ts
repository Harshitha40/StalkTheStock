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
import { headlineSentiment } from "@/lib/sentiment";
import { getWatchlist } from "@/lib/watchlist";

/**
 * On-demand helper to create an initial snapshot for any ticker
 * so it immediately renders on dashboard or stock-detail page.
 */
async function createOnDemandSnapshot(ticker: string) {
  let price = 0;
  let change = 0;
  let changePercent = 0;
  let high = 0;
  let low = 0;
  let open = 0;
  let previousClose = 0;

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
    console.warn(`[ATTENTION API] On-demand quote failed for ${ticker}:`, err);
  }

  let newsList: SnapshotNews[] = [];
  let newsSentiment: number | null = null;
  try {
    const rawNews = await getCompanyNews(ticker, 10);
    newsList = (rawNews || [])
      .map((item: any, idx: number) => {
        const datetime = Number(item.datetime) || Math.floor(Date.now() / 1000);
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
        sentimentValues.reduce((sum, v) => sum + v, 0) / sentimentValues.length;
    }
  } catch (err) {
    console.warn(`[ATTENTION API] On-demand news failed for ${ticker}:`, err);
  }

  const snapshot = {
    ticker,
    price,
    change,
    changePercent,
    high,
    low,
    open,
    previousClose,
    timestamp: Math.floor(Date.now() / 1000),
    fetchedAt: new Date(),
    analytics: {
      volatility20Pct: null,
      atr14Pct: null,
      sma50: null,
      previousSma50: null,
      sma200: null,
      previousSma200: null,
      rsi14: null,
      previousRsi14: null,
      week52High: high > 0 ? high : null,
      week52Low: low > 0 ? low : null,
      currentVolume: null,
      averageVolume20: null,
      volumeSpike: null,
      crossedAbove50: false,
      crossedBelow50: false,
      crossedAbove200: false,
      crossedBelow200: false,
      rsiCrossedAbove70: false,
      rsiCrossedBelow30: false,
      new52WeekHigh: false,
      new52WeekLow: false,
      newsSentiment,
      latestNewsAt: newsList.length > 0 ? newsList[0].datetime : null,
      news: newsList,
      corporateEvents: [],
      chart:
        price > 0
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
    console.warn(`[ATTENTION API] Failed saving on-demand snapshot:`, saveErr);
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
      let item = await getAttentionForTicker(user.id, tickerParam);

      if (!item) {
        // Create on-demand snapshot if not yet in MongoDB
        const snapshot = await createOnDemandSnapshot(tickerParam);
        item = calculateAttention(snapshot, null);
      }

      return NextResponse.json([item]);
    }

    // 2. Full user watchlist attention feed
    let items = await getAttentionForUser(user.id);

    // If some watchlist items don't have snapshots yet, create them on-demand
    try {
      const watchlist = await getWatchlist(user.id);
      const existingTickers = new Set(items.map((i) => i.ticker.toUpperCase()));
      const missing = watchlist.filter(
        (w) => !existingTickers.has(w.ticker.toUpperCase())
      );

      if (missing.length > 0) {
        const createdItems = await Promise.all(
          missing.map(async (w) => {
            const snap = await createOnDemandSnapshot(w.ticker.toUpperCase());
            return calculateAttention(snap, null);
          })
        );
        items = [...items, ...createdItems];
      }
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