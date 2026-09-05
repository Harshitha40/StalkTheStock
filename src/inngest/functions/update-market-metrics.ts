import { inngest } from "../client";

import { getDb } from "@/lib/mongodb";

import {
  getMarketSnapshot,
  saveMarketSnapshot,
} from "@/lib/market-snapshot";

import {
  getCompanyNews,
  getUpcomingEarnings,
} from "@/lib/finnhub";

import { getHistoricalCandles } from "@/lib/twelve-data";

import {
  calculateTechnicalMetrics,
} from "@/lib/indicators";

import {
  headlineSentiment,
} from "@/lib/sentiment";

const MARKET_AUX_BASE =
  "https://api.marketaux.com/v1/news/all";

export const updateMarketMetrics =
  inngest.createFunction(
    {
      id: "update-market-metrics",

      triggers: [
        {
          cron: "*/30 * * * *",
          jitter: "5m",
        },
      ],
    },

    async ({ step }) => {
      console.log(
        "[METRICS] Starting market metrics update"
      );

      const tickers =
        await step.run(
          "get-unique-tickers",
          async () => {
            const db = await getDb();

            const values =
              await db
                .collection("watchlists")
                .distinct("ticker");

            const unique = [
              ...new Set(
                values
                  .map((ticker) =>
                    String(ticker)
                      .trim()
                      .toUpperCase()
                  )
                  .filter(Boolean)
              ),
            ];

            console.log(
              "[METRICS] Watchlist tickers:",
              unique
            );

            return unique;
          }
        );

      const results: Array<{
        ticker: string;
        success: boolean;
        reason?: string;
      }> = [];

      for (const ticker of tickers) {
        const result =
          await step.run(
            `metrics-${ticker}`,
            async () => {
              try {
                console.log(
                  `[METRICS] Processing ${ticker}`
                );

                // =====================================================
                // 1. EXISTING MARKET SNAPSHOT / FINNHUB QUOTE
                // =====================================================

                const snapshot =
                  await getMarketSnapshot(
                    ticker
                  );

                if (!snapshot) {
                  throw new Error(
                    `No market snapshot found for ${ticker}`
                  );
                }

                console.log(
                  `[METRICS] ${ticker} current price:`,
                  snapshot.price
                );

                // =====================================================
                // 2. TWELVE DATA HISTORICAL CANDLES
                // =====================================================

                console.log(
                  `[TWELVE DATA] Fetching candles for ${ticker}`
                );

                const candles =
                  await getHistoricalCandles(
                    ticker,
                    300
                  );

                if (
                  !Array.isArray(candles) ||
                  candles.length < 20
                ) {
                  throw new Error(
                    `Insufficient Twelve Data candles for ${ticker}: ${
                      candles?.length ?? 0
                    }`
                  );
                }

                /*
                 * Twelve Data returns newest first.
                 * Indicators expect oldest -> newest.
                 */
                const ordered =
                  [...candles].reverse();

                const candleData = {
                  closes: ordered.map((c) =>
                    Number(c.close)
                  ),

                  highs: ordered.map((c) =>
                    Number(c.high)
                  ),

                  lows: ordered.map((c) =>
                    Number(c.low)
                  ),

                  opens: ordered.map((c) =>
                    Number(c.open)
                  ),

                  volumes: ordered.map((c) =>
                    Number(c.volume ?? 0)
                  ),

                  timestamps:
                    ordered.map((c) =>
                      Math.floor(
                        new Date(
                          c.datetime
                        ).getTime() / 1000
                      )
                    ),
                };

                const technical =
                  calculateTechnicalMetrics(
                    candleData
                  );

                console.log(
                  `[TWELVE DATA] ${ticker} technicals:`,
                  {
                    candles:
                      ordered.length,

                    sma50:
                      technical.sma50,

                    sma200:
                      technical.sma200,

                    rsi14:
                      technical.rsi14,

                    volatility20Pct:
                      technical.volatility20Pct,

                    atr14Pct:
                      technical.atr14Pct,

                    currentVolume:
                      technical.currentVolume,

                    averageVolume20:
                      technical.averageVolume20,

                    volumeSpike:
                      technical.volumeSpike,

                    week52High:
                      technical.week52High,

                    week52Low:
                      technical.week52Low,
                  }
                );

                // =====================================================
                // 3. FINNHUB COMPANY NEWS
                // =====================================================

                let finnhubNews: any[] = [];

                try {
                  console.log(
                    `[FINNHUB] Fetching company news for ${ticker}`
                  );

                  finnhubNews =
                    await getCompanyNews(
                      ticker,
                      30
                    );

                  console.log(
                    `[FINNHUB] ${ticker}: ${finnhubNews.length} articles`
                  );
                } catch (error) {
                  console.warn(
                    `[FINNHUB] News failed for ${ticker}`,
                    error
                  );
                }

                // =====================================================
                // 4. MARKETAUX NEWS + REAL SENTIMENT
                // =====================================================

                let marketauxNews: any[] = [];

                try {
                  const token =
                    process.env
                      .MARKETAUX_API_TOKEN;

                  if (!token) {
                    throw new Error(
                      "MARKETAUX_API_TOKEN is not configured"
                    );
                  }

                  console.log(
                    `[MARKETAUX] Fetching news for ${ticker}`
                  );

                  const url =
                    `${MARKET_AUX_BASE}` +
                    `?api_token=${encodeURIComponent(
                      token
                    )}` +
                    `&symbols=${encodeURIComponent(
                      ticker
                    )}` +
                    `&filter_entities=true` +
                    `&language=en` +
                    `&limit=20`;

                  const response =
                    await fetch(url, {
                      cache: "no-store",
                    });

                  if (!response.ok) {
                    throw new Error(
                      `Marketaux HTTP ${response.status}`
                    );
                  }

                  const data =
                    await response.json();

                  const articles =
                    Array.isArray(data?.data)
                      ? data.data
                      : [];

                  console.log(
                    `[MARKETAUX] ${ticker}: ${articles.length} articles`
                  );

                  marketauxNews =
                    articles.map(
                      (article: any) => {
                        const entity =
                          Array.isArray(
                            article.entities
                          )
                            ? article.entities.find(
                                (entity: any) =>
                                  String(
                                    entity.symbol
                                  ).toUpperCase() ===
                                  ticker
                              )
                            : null;

                        const datetime =
                          article.published_at
                            ? Math.floor(
                                new Date(
                                  article.published_at
                                ).getTime() /
                                  1000
                              )
                            : 0;

                        return {
                          id:
                            article.uuid ??
                            `${ticker}-${datetime}`,

                          datetime,

                          headline:
                            article.title ??
                            "",

                          source:
                            article.source ??
                            "Marketaux",

                          url:
                            article.url ??
                            undefined,

                          sentiment:
                            typeof entity?.sentiment_score ===
                            "number"
                              ? entity.sentiment_score
                              : null,
                        };
                      }
                    );
                } catch (error) {
                  console.warn(
                    `[MARKETAUX] Failed for ${ticker}`,
                    error
                  );
                }

                // =====================================================
                // 5. MERGE NEWS
                // =====================================================

                /*
                 * Prefer Marketaux because it gives us
                 * actual entity-level sentiment.
                 *
                 * If Marketaux has no articles,
                 * retain Finnhub news.
                 */

                const combinedNews =
                  marketauxNews.length > 0
                    ? marketauxNews
                    : finnhubNews.map(
                        (item: any) => ({
                          id: item.id,

                          datetime:
                            Number(
                              item.datetime
                            ),

                          headline:
                            item.headline,

                          source:
                            item.source,

                          url:
                            item.url,

                          sentiment:
                            headlineSentiment(
                              item.headline
                            ),
                        })
                      );

                /*
                 * Remove duplicate articles.
                 */
                const uniqueNewsMap =
                  new Map();

                for (
                  const article of combinedNews
                ) {
                  const key =
                    String(
                      article.id ??
                        `${article.datetime}-${article.headline}`
                    );

                  if (
                    !uniqueNewsMap.has(key)
                  ) {
                    uniqueNewsMap.set(
                      key,
                      article
                    );
                  }
                }

                const latestNews =
                  Array.from(
                    uniqueNewsMap.values()
                  )
                    .filter(
                      (article: any) =>
                        Number.isFinite(
                          article.datetime
                        )
                    )
                    .sort(
                      (a: any, b: any) =>
                        b.datetime -
                        a.datetime
                    )
                    .slice(0, 20);

                // =====================================================
                // 6. REAL NEWS SENTIMENT
                // =====================================================

                const sentimentValues =
                  latestNews
                    .map(
                      (article: any) =>
                        article.sentiment
                    )
                    .filter(
                      (
                        value: any
                      ): value is number =>
                        typeof value ===
                          "number" &&
                        Number.isFinite(value)
                    );

                const newsSentiment =
                  sentimentValues.length >
                  0
                    ? sentimentValues.reduce(
                        (
                          sum,
                          value
                        ) =>
                          sum + value,
                        0
                      ) /
                      sentimentValues.length
                    : null;

                console.log(
                  `[NEWS] ${ticker}:`,
                  {
                    articles:
                      latestNews.length,

                    sentiment:
                      newsSentiment,

                    latestNewsAt:
                      latestNews.length >
                      0
                        ? latestNews[0]
                            .datetime
                        : null,
                  }
                );

                // =====================================================
                // 7. EARNINGS / CORPORATE EVENTS
                // =====================================================

                let earnings: any[] =
                  [];

                try {
                  console.log(
                    `[FINNHUB] Fetching earnings for ${ticker}`
                  );

                  earnings =
                    await getUpcomingEarnings(
                      ticker
                    );

                  console.log(
                    `[FINNHUB] ${ticker}: ${earnings.length} earnings events`
                  );
                } catch (error) {
                  console.warn(
                    `[FINNHUB] Earnings failed for ${ticker}`,
                    error
                  );
                }

                const corporateEvents =
                  earnings.map(
                    (event: any) => ({
                      key: `earnings-${event.symbol}-${event.date}-${event.year}-${event.quarter}`,

                      type:
                        "earnings" as const,

                      date:
                        event.date,

                      hour:
                        event.hour,
                    })
                  );

                // =====================================================
                // 8. CHART
                // =====================================================

                const chart =
                  ordered
                    .slice(-60)
                    .map((c) => ({
                      timestamp:
                        Math.floor(
                          new Date(
                            c.datetime
                          ).getTime() /
                            1000
                        ),

                      price:
                        Number(c.close),
                    }));

                // =====================================================
                // 9. SAVE EVERYTHING TO MONGODB
                // =====================================================

                const analytics = {
                  ...technical,

                  newsSentiment,

                  latestNewsAt:
                    latestNews.length >
                    0
                      ? latestNews[0]
                          .datetime
                      : null,

                  news:
                    latestNews,

                  corporateEvents,

                  chart,
                };

                console.log(
                  `[MONGO] Saving analytics for ${ticker}`,
                  {
                    rsi14:
                      analytics.rsi14,

                    sma50:
                      analytics.sma50,

                    sma200:
                      analytics.sma200,

                    volumeSpike:
                      analytics.volumeSpike,

                    newsCount:
                      analytics.news
                        .length,

                    newsSentiment:
                      analytics.newsSentiment,

                    corporateEvents:
                      analytics
                        .corporateEvents
                        .length,
                  }
                );

                await saveMarketSnapshot({
                  ...snapshot,
                  analytics,
                });

                console.log(
                  `[MONGO] Successfully saved ${ticker}`
                );

                return {
                  ticker,
                  success: true,
                };
              } catch (error) {
                console.error(
                  `[METRICS] FAILED ${ticker}`,
                  error
                );

                return {
                  ticker,
                  success: false,
                  reason:
                    error instanceof Error
                      ? error.message
                      : String(error),
                };
              }
            }
          );

        results.push(result);
      }

      console.log(
        "[METRICS] Finished:",
        results
      );

      return {
        tickersFound:
          tickers.length,

        results,
      };
    }
  );