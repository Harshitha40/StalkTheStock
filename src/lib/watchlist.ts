import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export async function getWatchlist(
  userId: string
) {
  const db = await getDb();

  return db
    .collection("watchlists")
    .find({ userId })
    .sort({ position: 1 })
    .toArray();
}

export async function addToWatchlist(
  userId: string,
  ticker: string
) {
  const db = await getDb();

  const normalizedTicker =
    ticker.trim().toUpperCase();

  const existing =
    await db.collection("watchlists").findOne({
      userId,
      ticker: normalizedTicker,
    });

  if (existing) {
    return existing;
  }

  const count =
    await db.collection("watchlists").countDocuments({
      userId,
    });

  const document = {
    userId,
    ticker: normalizedTicker,
    position: count,
    createdAt: new Date(),
  };

  const result =
    await db
      .collection("watchlists")
      .insertOne(document);

  return {
    ...document,
    _id: result.insertedId,
  };
}

export async function removeFromWatchlist(
  userId: string,
  ticker: string
) {
  const db = await getDb();

  await db
    .collection("watchlists")
    .deleteOne({
      userId,
      ticker: ticker.toUpperCase(),
    });
}