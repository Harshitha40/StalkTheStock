import { inngest } from "../client";
import { getDb } from "@/lib/mongodb";
import { getStockQuote } from "@/lib/finnhub";
import { saveMarketSnapshot } from "@/lib/market-snapshot";

export const updateMarketSnapshots =
  inngest.createFunction(
    {
      id: "update-market-snapshots",
      triggers: [
        {
          cron: "*/5 * * * *",
          jitter: "2m",
        },
      ],
    },
    async ({ step }) => {
      const tickers = await step.run(
        "get-unique-tickers",
        async () => {
          const db = await getDb();

          const tickers =
            await db
              .collection("watchlists")
              .distinct("ticker");

          return tickers.map((ticker) =>
            String(ticker).toUpperCase()
          );
        }
      );

      const results = [];

      for (const ticker of tickers) {
        const result = await step.run(
          `update-${ticker}`,
          async () => {
            try {
              const quote =
                await getStockQuote(ticker);

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

              return {
                ticker,
                success: true,
              };
            } catch (error) {
              console.error(
                `Failed to update ${ticker}:`,
                error
              );

              return {
                ticker,
                success: false,
              };
            }
          }
        );

        results.push(result);
      }

      return {
        tickersFound: tickers.length,
        results,
      };
    }
  );