import { getDb } from "./mongodb";

export interface MarketSnapshot {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  fetchedAt: Date;
}

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

export async function getMarketSnapshot(
  ticker: string
): Promise<MarketSnapshot | null> {
  const db = await getDb();

  return db
    .collection<MarketSnapshot>("market_snapshots")
    .findOne({
      ticker: normalizeTicker(ticker),
    });
}

export async function getMarketSnapshots(
  tickers: string[]
): Promise<MarketSnapshot[]> {
  if (tickers.length === 0) return [];

  const normalized = [
    ...new Set(tickers.map(normalizeTicker)),
  ];

  const db = await getDb();

  return db
    .collection<MarketSnapshot>("market_snapshots")
    .find({
      ticker: { $in: normalized },
    })
    .toArray();
}

export async function saveMarketSnapshot(
  snapshot: MarketSnapshot
) {
  const db = await getDb();

  const ticker = normalizeTicker(snapshot.ticker);

  await db.collection<MarketSnapshot>("market_snapshots").updateOne(
    { ticker },
    {
      $set: {
        ...snapshot,
        ticker,
        fetchedAt: snapshot.fetchedAt,
      },
    },
    { upsert: true }
  );
}