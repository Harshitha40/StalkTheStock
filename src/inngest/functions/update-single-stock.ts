import { inngest } from "../client";

import {
  getStockQuote,
  getCompanyNews,
  getUpcomingEarnings,
} from "@/lib/finnhub";

import {
  saveMarketSnapshot,
  getMarketSnapshot,
  SnapshotAnalytics,
  CorporateEvent,
  SnapshotNews,
} from "@/lib/market-snapshot";

import { getHistoricalCandles, TwelveDataCandle } from "@/lib/twelve-data";
import { calculateTechnicalMetrics, TechnicalMetrics } from "@/lib/indicators";
import { headlineSentiment } from "@/lib/sentiment";

const MARKET_AUX_BASE = "https://api.marketaux.com/v1/news/all";

type QuoteData = {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  source: "finnhub" | "twelve-data";
};

type NewsItem = {
  id: number;
  datetime: number;
  headline: string;
  source: string;
  url: string;
  sentiment: number;
};

/**
 * Fetch quote from Twelve Data as a fallback.
 */
async function getTwelveDataQuote(
  ticker: string
): Promise<QuoteData | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    console.warn(
      "[SINGLE-STOCK] TWELVE_DATA_API_KEY is not configured"
    );
    return null;
  }

  try {
    const url =
      "https://api.twelvedata.com/quote" +
      `?symbol=${encodeURIComponent(ticker)}` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        `[SINGLE-STOCK] Twelve Data quote failed for ${ticker}: ${response.status}`
      );
      return null;
    }

    const data = await response.json();

    if (data?.status === "error" || !data?.close) {
      console.warn(
        `[SINGLE-STOCK] Twelve Data returned no quote for ${ticker}`,
        data?.message ?? ""
      );
      return null;
    }

    const price = Number(data.close);
    if (!Number.isFinite(price)) {
      return null;
    }

    const change = Number(data.change);
    const changePercent = Number(data.percent_change);
    const high = Number(data.high);
    const low = Number(data.low);
    const open = Number(data.open);
    const previousClose = Number(data.previous_close);

    const datetime = data.datetime
      ? Math.floor(new Date(data.datetime).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    return {
      price,
      change: Number.isFinite(change) ? change : 0,
      changePercent: Number.isFinite(changePercent) ? changePercent : 0,
      high: Number.isFinite(high) ? high : price,
      low: Number.isFinite(low) ? low : price,
      open: Number.isFinite(open) ? open : price,
      previousClose: Number.isFinite(previousClose) ? previousClose : price,
      timestamp: datetime,
      source: "twelve-data",
    };
  } catch (error) {
    console.warn(
      `[SINGLE-STOCK] Twelve Data quote unavailable for ${ticker}`,
      error
    );
    return null;
  }
}

/**
 * Fetch quote with Finnhub priority and Twelve Data fallback.
 */
async function fetchBestQuote(
  ticker: string
): Promise<{
  quote: QuoteData | null;
}> {
  try {
    const quote = await getStockQuote(ticker);

    if (quote && Number.isFinite(quote.c)) {
      const price = quote.c;
      const change = Number.isFinite(quote.d) ? quote.d : 0;
      const changePercent = Number.isFinite(quote.dp) ? quote.dp : 0;
      const high = Number.isFinite(quote.h) ? quote.h : price;
      const low = Number.isFinite(quote.l) ? quote.l : price;
      const open = Number.isFinite(quote.o) ? quote.o : price;
      const previousClose = Number.isFinite(quote.pc) ? quote.pc : price;
      const timestamp = Number.isFinite(quote.t)
        ? quote.t
        : Math.floor(Date.now() / 1000);

      return {
        quote: {
          price,
          change,
          changePercent,
          high,
          low,
          open,
          previousClose,
          timestamp,
          source: "finnhub",
        },
      };
    }
  } catch (error) {
    console.warn(
      `[SINGLE-STOCK] Finnhub quote unavailable for ${ticker}`,
      error
    );
  }

  const twelveQuote = await getTwelveDataQuote(ticker);
  if (twelveQuote) {
    return {
      quote: twelveQuote,
    };
  }

  return {
    quote: null,
  };
}

/**
 * Fetch Marketaux news.
 */
async function getMarketauxNews(
  ticker: string
): Promise<NewsItem[]> {
  const token = process.env.MARKETAUX_API_TOKEN;

  if (!token) {
    return [];
  }

  try {
    const url =
      `${MARKET_AUX_BASE}` +
      `?api_token=${encodeURIComponent(token)}` +
      `&symbols=${encodeURIComponent(ticker)}` +
      `&filter_entities=true` +
      `&language=en` +
      `&limit=20`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        `[SINGLE-STOCK] Marketaux failed for ${ticker}: ${response.status}`
      );
      return [];
    }

    const data = await response.json();
    const articles = Array.isArray(data?.data) ? data.data : [];

    return articles
      .map((article: any, index: number) => {
        const entity = Array.isArray(article.entities)
          ? article.entities.find(
              (e: any) =>
                String(e?.symbol ?? "").toUpperCase() === ticker
            )
          : null;

        const datetime = article.published_at
          ? Math.floor(new Date(article.published_at).getTime() / 1000)
          : Math.floor(Date.now() / 1000);

        const sentimentScore =
          typeof entity?.sentiment_score === "number" &&
          Number.isFinite(entity.sentiment_score)
            ? entity.sentiment_score
            : headlineSentiment(String(article.title ?? ""));

        return {
          id: Math.abs(Number(article.id) || datetime + index),
          datetime,
          headline: String(article.title ?? "").trim(),
          source: String(article.source ?? "Marketaux"),
          url: String(article.url ?? ""),
          sentiment: sentimentScore,
        };
      })
      .filter(
        (article: NewsItem) =>
          article.headline.length > 0 && article.datetime > 0
      );
  } catch (error) {
    console.warn(
      `[SINGLE-STOCK] Marketaux unavailable for ${ticker}`,
      error
    );
    return [];
  }
}

/**
 * Fetch Finnhub news.
 */
async function getFinnhubNews(
  ticker: string
): Promise<NewsItem[]> {
  try {
    const news = await getCompanyNews(ticker, 30);

    return news
      .map((item: any, index: number) => {
        const datetime = Number(item.datetime) || Math.floor(Date.now() / 1000);
        return {
          id: typeof item.id === "number" ? item.id : datetime + index,
          datetime,
          headline: String(item.headline ?? "").trim(),
          source: String(item.source ?? "Finnhub"),
          url: String(item.url ?? ""),
          sentiment: headlineSentiment(String(item.headline ?? "")),
        };
      })
      .filter(
        (article: NewsItem) =>
          article.headline.length > 0 && Number.isFinite(article.datetime)
      );
  } catch (error) {
    console.warn(
      `[SINGLE-STOCK] Finnhub news unavailable for ${ticker}`,
      error
    );
    return [];
  }
}

/**
 * Merge news from all providers, deduplicating by headline/url.
 */
function mergeNews(
  marketauxNews: NewsItem[],
  finnhubNews: NewsItem[]
): SnapshotNews[] {
  const allNews = [...marketauxNews, ...finnhubNews];
  const unique = new Map<string, SnapshotNews>();

  for (const article of allNews) {
    const headlineKey = article.headline
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    const key = article.url || `${article.datetime}-${headlineKey}`;

    if (!unique.has(key)) {
      unique.set(key, {
        id: article.id,
        datetime: article.datetime,
        headline: article.headline,
        source: article.source,
        url: article.url,
        sentiment: article.sentiment,
      });
    }
  }

  return Array.from(unique.values())
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 20);
}

function getDefaultTechnicalMetrics(): TechnicalMetrics {
  return {
    volatility20Pct: null,
    atr14Pct: null,
    sma50: null,
    previousSma50: null,
    sma200: null,
    previousSma200: null,
    rsi14: null,
    previousRsi14: null,
    week52High: null,
    week52Low: null,
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
  };
}

export const updateSingleStock = inngest.createFunction(
  {
    id: "update-single-stock",
    triggers: [
      {
        event: "stock/watchlist.added",
      },
    ],
  },
  async ({ event, step }) => {
    const ticker = String(event.data.ticker ?? "")
      .trim()
      .toUpperCase();

    if (!ticker) {
      throw new Error("Ticker is required");
    }

    /*
     * STEP 1: Fetch best quote
     */
    const quoteResult = await step.run("fetch-best-quote", async () => {
      return fetchBestQuote(ticker);
    });

    const quote = quoteResult.quote;

    /*
     * STEP 2: Fetch historical data
     */
    const historicalResult = await step.run(
      "fetch-historical-data",
      async () => {
        try {
          const candles = await getHistoricalCandles(ticker, 300);

          if (!candles || candles.length === 0) {
            return {
              success: false,
              candles: [] as TwelveDataCandle[],
              reason: "No historical candle data",
            };
          }

          return {
            success: true,
            candles,
          };
        } catch (error) {
          console.warn(
            `[SINGLE-STOCK] Historical data unavailable for ${ticker}`,
            error
          );
          return {
            success: false,
            candles: [] as TwelveDataCandle[],
            reason:
              error instanceof Error
                ? error.message
                : "Historical data failed",
          };
        }
      }
    );

    /*
     * STEP 3: Compute technical metrics & chart
     */
    const analyticsResult = await step.run(
      "compute-analytics",
      async () => {
        let technical: TechnicalMetrics = getDefaultTechnicalMetrics();
        let chart: Array<{ timestamp: number; price: number }> = [];

        const rawCandles = historicalResult.candles || [];
        const validCandles = rawCandles.filter(
          (c): c is TwelveDataCandle =>
            Boolean(c) &&
            typeof c.datetime === "string" &&
            typeof c.close === "string"
        );

        if (validCandles.length > 0) {
          try {
            const ordered = [...validCandles].reverse();

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

            const hasInvalidData =
              candleData.closes.some((v) => !Number.isFinite(v)) ||
              candleData.highs.some((v) => !Number.isFinite(v)) ||
              candleData.lows.some((v) => !Number.isFinite(v)) ||
              candleData.opens.some((v) => !Number.isFinite(v));

            if (!hasInvalidData) {
              technical = calculateTechnicalMetrics(candleData);

              chart = ordered.slice(-60).map((c) => ({
                timestamp: Math.floor(
                  new Date(c.datetime).getTime() / 1000
                ),
                price: Number(c.close),
              }));
            }
          } catch (error) {
            console.warn(
              `[SINGLE-STOCK] Technical calculation failed for ${ticker}`,
              error
            );
          }
        }

        return {
          technical,
          chart,
        };
      }
    );

    /*
     * STEP 4: Fetch news from all providers
     */
    const newsResult = await step.run("fetch-all-news", async () => {
      const [marketauxNews, finnhubNews] = await Promise.all([
        getMarketauxNews(ticker),
        getFinnhubNews(ticker),
      ]);

      const mergedNews = mergeNews(marketauxNews, finnhubNews);

      const sentimentValues = mergedNews
        .map((a) => a.sentiment)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

      const newsSentiment =
        sentimentValues.length > 0
          ? sentimentValues.reduce((sum, v) => sum + v, 0) / sentimentValues.length
          : null;

      return {
        mergedNews,
        newsSentiment,
      };
    });

    /*
     * STEP 5: Fetch corporate events
     */
    const corporateResult = await step.run(
      "fetch-corporate-events",
      async () => {
        try {
          const earnings = await getUpcomingEarnings(ticker);

          const corporateEvents: CorporateEvent[] = earnings.map(
            (event: any) => ({
              key: `earnings-${event.symbol}-${event.date}-${event.year}-${event.quarter}`,
              type: "earnings" as const,
              date: event.date,
              hour: event.hour,
            })
          );

          return {
            corporateEvents,
          };
        } catch (error) {
          console.warn(
            `[SINGLE-STOCK] Earnings unavailable for ${ticker}`,
            error
          );
          return {
            corporateEvents: [] as CorporateEvent[],
          };
        }
      }
    );

    /*
     * STEP 6: Assemble full snapshot analytics
     */
    const analytics: SnapshotAnalytics = {
      ...analyticsResult.technical,
      newsSentiment: newsResult.newsSentiment,
      latestNewsAt:
        newsResult.mergedNews.length > 0
          ? newsResult.mergedNews[0].datetime
          : null,
      news: newsResult.mergedNews,
      corporateEvents: corporateResult.corporateEvents,
      chart: analyticsResult.chart,
    };

    /*
     * STEP 7: Save snapshot
     */
    const saveResult = await step.run("save-snapshot", async () => {
      if (quote) {
        await saveMarketSnapshot({
          ticker,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          high: quote.high,
          low: quote.low,
          open: quote.open,
          previousClose: quote.previousClose,
          timestamp: quote.timestamp,
          fetchedAt: new Date(),
          analytics,
        });

        return {
          success: true,
          source: quote.source,
        };
      }

      const existing = await getMarketSnapshot(ticker);
      if (existing) {
        await saveMarketSnapshot({
          ...existing,
          ticker,
          fetchedAt: new Date(),
          analytics,
        });

        return {
          success: true,
          source: "existing-snapshot",
        };
      }

      return {
        success: false,
        reason: "No quote available from Finnhub or Twelve Data",
      };
    });

    console.log(`[SINGLE-STOCK] ${ticker} completed`, {
      quote: quote?.source ?? "none",
      historical: historicalResult.success,
      newsCount: newsResult.mergedNews.length,
      earningsCount: corporateResult.corporateEvents.length,
      saved: saveResult.success,
    });

    return {
      ticker,
      success: saveResult.success,
    };
  }
);