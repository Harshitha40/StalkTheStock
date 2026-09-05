import { getDb } from "./mongodb";

export interface UserStockState {
  userId: string;
  ticker: string;

  lastSeenAt: Date;
  lastSeenPrice: number;

  lastSeenSma50: number | null;
  lastSeenSma200: number | null;
  lastSeenRsi14: number | null;

  lastSeenWeek52High: number | null;
  lastSeenWeek52Low: number | null;

  lastSeenNewsAt: number | null;
  lastSeenNewsSentiment: number;

  lastSeenCorporateKeys: string[];
}

export async function getUserStockStates(
  userId: string,
  tickers: string[]
) {
  if (!tickers.length) return [];

  const db = await getDb();

  return db
    .collection<UserStockState>(
      "user_stock_states"
    )
    .find({
      userId,
      ticker: {
        $in: tickers,
      },
    })
    .toArray();
}

export async function markStocksSeen(
  userId: string,
  snapshots: any[]
) {
  if (!snapshots.length) return;

  const db = await getDb();

  const operations = snapshots
    .filter(
      (snapshot) =>
        snapshot.analytics
    )
    .map((snapshot) => {
      const analytics =
        snapshot.analytics;

      return {
        updateOne: {
          filter: {
            userId,
            ticker: snapshot.ticker,
          },

          update: {
            $set: {
              userId,
              ticker: snapshot.ticker,

              lastSeenAt:
                new Date(),

              lastSeenPrice:
                snapshot.price,

              lastSeenSma50:
                analytics.sma50,

              lastSeenSma200:
                analytics.sma200,

              lastSeenRsi14:
                analytics.rsi14,

              lastSeenWeek52High:
                analytics.week52High,

              lastSeenWeek52Low:
                analytics.week52Low,

              lastSeenNewsAt:
                analytics.latestNewsAt,

              lastSeenNewsSentiment:
                analytics.newsSentiment,

              lastSeenCorporateKeys:
                analytics.corporateEvents.map(
                  (event: any) =>
                    event.key
                ),
            },
          },

          upsert: true,
        },
      };
    });

  if (operations.length) {
    await db
      .collection<UserStockState>(
        "user_stock_states"
      )
      .bulkWrite(operations);
  }
}