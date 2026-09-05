import { getDb } from "./mongodb";

export async function createIndexes() {
  const db = await getDb();

  // Drop stale/erroneous single-field 'ticker_1' index on watchlists if present
  try {
    const indexes = await db.collection("watchlists").indexes();
    const hasSingleTickerIndex = indexes.some(
      (idx) => idx.name === "ticker_1" || (idx.key && idx.key.ticker === 1 && !idx.key.userId)
    );
    if (hasSingleTickerIndex) {
      console.log("[INDEXES] Dropping invalid single-field index ticker_1 from watchlists...");
      await db.collection("watchlists").dropIndex("ticker_1");
    }
  } catch (dropErr) {
    // Ignore if index doesn't exist
  }

  // Compound unique index for watchlists: per-user per-ticker
  await db.collection("watchlists").createIndex(
    {
      userId: 1,
      ticker: 1,
    },
    {
      unique: true,
    }
  );

  await db.collection("watchlists").createIndex({
    userId: 1,
    position: 1,
  });

  // Global unique index for market_snapshots: per-ticker
  await db.collection("market_snapshots").createIndex(
    {
      ticker: 1,
    },
    {
      unique: true,
    }
  );

  // Compound unique index for user_stock_states / last_seen_snapshots: per-user per-ticker
  await db.collection("last_seen_snapshots").createIndex(
    {
      userId: 1,
      ticker: 1,
    },
    {
      unique: true,
    }
  );
}