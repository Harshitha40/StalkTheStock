import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export async function getWatchlist(userId: string) {
  const db = await getDb();

  return db
    .collection("watchlists")
    .find({ userId })
    .sort({ position: 1 })
    .toArray();
}

export async function addToWatchlist(userId: string, ticker: string) {
  const db = await getDb();

  const normalizedTicker = ticker.trim().toUpperCase();

  const existing = await db.collection("watchlists").findOne({
    userId,
    ticker: normalizedTicker,
  });

  if (existing) {
    return existing;
  }

  const count = await db.collection("watchlists").countDocuments({
    userId,
  });

  const document = {
    userId,
    ticker: normalizedTicker,
    position: count,
    createdAt: new Date(),
  };

  try {
    const result = await db.collection("watchlists").insertOne(document);

    return {
      ...document,
      _id: result.insertedId,
    };
  } catch (err: any) {
    // If error is E11000 duplicate key on the old 'ticker_1' index, drop that stale index and retry
    if (err?.code === 11000 && err?.message?.includes("ticker_1")) {
      try {
        console.warn("[WATCHLIST] Dropping stale single-field ticker_1 index...");
        await db.collection("watchlists").dropIndex("ticker_1");
        const retryResult = await db.collection("watchlists").insertOne(document);
        return {
          ...document,
          _id: retryResult.insertedId,
        };
      } catch (retryErr: any) {
        if (retryErr?.code === 11000) {
          const found = await db.collection("watchlists").findOne({
            userId,
            ticker: normalizedTicker,
          });
          if (found) return found;
        }
      }
    }

    // If duplicate for same user and ticker, return existing
    if (err?.code === 11000) {
      const found = await db.collection("watchlists").findOne({
        userId,
        ticker: normalizedTicker,
      });
      if (found) return found;
    }

    throw err;
  }
}

export async function removeFromWatchlist(userId: string, ticker: string) {
  const db = await getDb();

  await db.collection("watchlists").deleteOne({
    userId,
    ticker: ticker.toUpperCase(),
  });
}