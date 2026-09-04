import { getDb } from "./mongodb";

export async function createIndexes() {
  const db = await getDb();

  await db
    .collection("watchlists")
    .createIndex(
      {
        userId: 1,
        ticker: 1,
      },
      {
        unique: true,
      }
    );

  await db
    .collection("watchlists")
    .createIndex({
      userId: 1,
      position: 1,
    });

  await db
    .collection("market_snapshots")
    .createIndex(
      {
        ticker: 1,
      },
      {
        unique: true,
      }
    );

  await db
    .collection("last_seen_snapshots")
    .createIndex(
      {
        userId: 1,
        ticker: 1,
      },
      {
        unique: true,
      }
    );
}