import { inngest } from "./client";
import { getCandles, getStockQuote as getQuote } from "@/lib/finnhub";
import {
  calculateRSI,
  calculateVolatility,
  sma,
} from "@/lib/indicators";
import { getDb } from "@/lib/mongodb";

export const refreshMarketData =
  inngest.createFunction(
    {
      id: "refresh-market-data",

      triggers: [
        {
          cron: "*/5 * * * *",
          jitter: "2m",
        },
      ],
    },

    async ({ step }) => {
      const db = await getDb();

      const watchlists =
        await step.run(
          "load-watchlist-tickers",
          async () => {
            return db
              .collection("watchlists")
              .distinct("ticker");
          }
        );

      for (const ticker of watchlists) {
        await step.run(
          `refresh-${ticker}`,
          async () => {
            const quote =
              await getQuote(ticker);

            const now =
              Math.floor(
                Date.now() / 1000
              );

            const oneYearAgo =
              now -
              365 * 24 * 60 * 60;

            const candles =
              await getCandles(
                ticker,
                365
              );

            if (
              candles.s !== "ok" ||
              candles.c.length === 0
            ) {
              throw new Error(
                `No candle data for ${ticker}`
              );
            }

            const closes =
              candles.c;

            const volumes =
              candles.v;

            const avgVolume20 =
              volumes.length >= 20
                ? sma(volumes, 20)
                : sma(
                  volumes,
                  volumes.length
                );

            const snapshot = {
              ticker,

              price: quote.c,
              open: quote.o,
              high: quote.h,
              low: quote.l,
              previousClose: quote.pc,

              volume:
                volumes[
                volumes.length - 1
                ] ?? 0,

              avgVolume20,

              volatility20:
                calculateVolatility(
                  closes.slice(-20)
                ),

              rsi: calculateRSI(
                closes
              ),

              dma50: sma(
                closes,
                50
              ),

              dma200: sma(
                closes,
                200
              ),

              high52: Math.max(
                ...closes
              ),

              low52: Math.min(
                ...closes
              ),

              timestamp: new Date(
                quote.t * 1000
              ),

              source: "finnhub",
            };

            await db
              .collection(
                "market_snapshots"
              )
              .updateOne(
                { ticker },
                {
                  $set: snapshot,
                  $setOnInsert: {
                    createdAt:
                      new Date(),
                  },
                },
                { upsert: true }
              );

            return snapshot;
          }
        );
      }

      return {
        tickers: watchlists.length,
      };
    }
  );