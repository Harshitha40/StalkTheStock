import { getDb } from "./mongodb";
import type {
  LastSeenSnapshot,
  MarketSnapshot,
} from "./types";

export async function getCurrentSnapshot(
  ticker: string
): Promise<MarketSnapshot | null> {
  const db = await getDb();

  const snapshot =
    await db
      .collection("market_snapshots")
      .findOne({ ticker });

  if (!snapshot) return null;

  return snapshot as unknown as MarketSnapshot;
}

export async function getLastSeenSnapshot(
  userId: string,
  ticker: string
): Promise<LastSeenSnapshot | null> {
  const db = await getDb();

  const snapshot =
    await db
      .collection(
        "last_seen_snapshots"
      )
      .findOne({
        userId,
        ticker,
      });

  if (!snapshot) return null;

  return snapshot as unknown as LastSeenSnapshot;
}

export async function saveLastSeenSnapshot(
  snapshot: LastSeenSnapshot
) {
  const db = await getDb();

  await db
    .collection(
      "last_seen_snapshots"
    )
    .updateOne(
      {
        userId: snapshot.userId,
        ticker: snapshot.ticker,
      },
      {
        $set: snapshot,
      },
      {
        upsert: true,
      }
    );
}