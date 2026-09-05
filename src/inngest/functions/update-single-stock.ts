import { inngest } from "../client";

import { getStockQuote, getCompanyNews, getUpcomingEarnings } from "@/lib/finnhub";
import { saveMarketSnapshot } from "@/lib/market-snapshot";
import { getHistoricalCandles } from "@/lib/twelve-data";
import { calculateTechnicalMetrics } from "@/lib/indicators";
import { headlineSentiment } from "@/lib/sentiment";

const MARKET_AUX_BASE = "https://api.marketaux.com/v1/news/all";

export const updateSingleStock =
  inngest.createFunction(
    {
      id: "update-single-stock",
      triggers: [
        {
          event: "stock/watchlist.added",
        },
      ],
    },

    async ({ event, step }) => {
      const ticker =
        event.data.ticker
          .trim()
          .toUpperCase();

      /*
       * Step 1: Fetch live quote and save basic snapshot.
       */
      const quote = await step.run(
        "fetch-quote",
        async () => {
          return getStockQuote(ticker);
        }
      );

      await step.run(
        "save-snapshot",
        async () => {
          await saveMarketSnapshot({
            ticker,
            price: quote.c,
            change: quote.d,
            changePercent: quote.dp,
            high: quote.h,
            low: quote.l,
            open: quote.o,
            previousClose: quote.pc,
            timestamp: quote.t,
            fetchedAt: new Date(),
          });
        }
      );

      /*
       * Step 2: Compute full analytics immediately so the
       * dashboard shows real data without waiting for the
       * 30-minute cron job.
       */
      await step.run(
        "compute-analytics",
        async () => {
          try {
            const candles =
              await getHistoricalCandles(ticker, 300);

            if (!candles || candles.length === 0) {
              console.warn(
                `[SINGLE-STOCK] No historical candles for ${ticker}, skipping analytics`
              );
              return { success: false, reason: "No candle data" };
            }

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

            const hasInvalidData =
              candleData.closes.some((v) => !Number.isFinite(v)) ||
              candleData.highs.some((v) => !Number.isFinite(v)) ||
              candleData.lows.some((v) => !Number.isFinite(v)) ||
              candleData.opens.some((v) => !Number.isFinite(v));

            if (hasInvalidData) {
              console.warn(
                `[SINGLE-STOCK] Invalid candle data for ${ticker}`
              );
              return { success: false, reason: "Invalid candle data" };
            }

            const technical = calculateTechnicalMetrics(candleData);

            /* Finnhub News */
            let finnhubNews: any[] = [];
            try {
              finnhubNews = await getCompanyNews(ticker, 30);
            } catch (error) {
              console.warn(`[SINGLE-STOCK] Finnhub news unavailable for ${ticker}`, error);
            }

            /* Marketaux News */
            let marketauxNews: any[] = [];
            try {
              const token = process.env.MARKETAUX_API_TOKEN;
              if (token) {
                const url =
                  `${MARKET_AUX_BASE}` +
                  `?api_token=${encodeURIComponent(token)}` +
                  `&symbols=${encodeURIComponent(ticker)}` +
                  `&filter_entities=true` +
                  `&language=en` +
                  `&limit=20`;

                const response = await fetch(url, { cache: "no-store" });
                if (response.ok) {
                  const data = await response.json();
                  const articles = Array.isArray(data?.data) ? data.data : [];
                  marketauxNews = articles.map((article: any) => {
                    const entity = Array.isArray(article.entities)
                      ? article.entities.find(
                          (e: any) => String(e.symbol).toUpperCase() === ticker
                        )
                      : null;

                    const datetime = article.published_at
                      ? Math.floor(new Date(article.published_at).getTime() / 1000)
                      : 0;

                    return {
                      id: article.uuid ?? `${ticker}-${datetime}`,
                      datetime,
                      headline: article.title ?? "",
                      source: article.source ?? "Marketaux",
                      url: article.url ?? undefined,
                      sentiment:
                        typeof entity?.sentiment_score === "number"
                          ? entity.sentiment_score
                          : null,
                    };
                  });
                }
              }
            } catch (error) {
              console.warn(`[SINGLE-STOCK] Marketaux news unavailable for ${ticker}`, error);
            }

            /* Merge News (prefer Marketaux entity sentiment, fallback to Finnhub) */
            const combinedNews =
              marketauxNews.length > 0
                ? marketauxNews
                : finnhubNews.map((item: any) => ({
                    id: item.id,
                    datetime: Number(item.datetime),
                    headline: item.headline,
                    source: item.source,
                    url: item.url,
                    sentiment: headlineSentiment(item.headline),
                  }));

            const uniqueNewsMap = new Map();
            for (const article of combinedNews) {
              const key = String(article.id ?? `${article.datetime}-${article.headline}`);
              if (!uniqueNewsMap.has(key)) {
                uniqueNewsMap.set(key, article);
              }
            }

            const latestNews = Array.from(uniqueNewsMap.values())
              .filter((a: any) => Number.isFinite(a.datetime))
              .sort((a: any, b: any) => b.datetime - a.datetime)
              .slice(0, 20);

            const sentimentValues = latestNews
              .map((a: any) => a.sentiment)
              .filter((v: any): v is number => typeof v === "number" && Number.isFinite(v));

            const newsSentiment =
              sentimentValues.length > 0
                ? sentimentValues.reduce((sum, v) => sum + v, 0) / sentimentValues.length
                : null;

            /* Earnings */
            let earnings: Awaited<ReturnType<typeof getUpcomingEarnings>> = [];
            try {
              earnings = await getUpcomingEarnings(ticker);
            } catch (error) {
              console.warn(`[SINGLE-STOCK] Earnings unavailable for ${ticker}`, error);
            }

            const corporateEvents = earnings.map((event) => ({
              key: `earnings-${event.symbol}-${event.date}-${event.year}-${event.quarter}`,
              type: "earnings" as const,
              date: event.date,
              hour: event.hour,
            }));

            const chart = ordered
              .slice(-60)
              .map((c) => ({
                timestamp: Math.floor(
                  new Date(c.datetime).getTime() / 1000
                ),
                price: Number(c.close),
              }));

            const analytics = {
              ...technical,
              newsSentiment,
              latestNewsAt:
                latestNews.length > 0 ? latestNews[0].datetime : null,
              news: latestNews,
              corporateEvents,
              chart,
            };

            await saveMarketSnapshot({
              ticker,
              price: quote.c,
              change: quote.d,
              changePercent: quote.dp,
              high: quote.h,
              low: quote.l,
              open: quote.o,
              previousClose: quote.pc,
              timestamp: quote.t,
              fetchedAt: new Date(),
              analytics,
            });

            console.log(`[SINGLE-STOCK] ${ticker} analytics saved successfully`);
            return { success: true };
          } catch (error) {
            console.error(`[SINGLE-STOCK] Analytics failed for ${ticker}`, error);
            return {
              success: false,
              reason:
                error instanceof Error ? error.message : "Unknown error",
            };
          }
        }
      );

      return { ticker, success: true };
    }
  );