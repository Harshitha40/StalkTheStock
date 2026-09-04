import { inngest } from "../client";

import { getStockQuote } from "@/lib/finnhub";
import { saveMarketSnapshot } from "@/lib/market-snapshot";

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

      return await step.run(
        "fetch-and-save",
        async () => {
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
            previousClose:
              quote.pc,

            timestamp: quote.t,
            fetchedAt: new Date(),
          });

          return {
            ticker,
            success: true,
          };
        }
      );
    }
  );