import { getDb } from "./mongodb";

export interface SnapshotNews {
  id: number;
  datetime: number;
  headline: string;
  source: string;
  url: string;
  sentiment: number;
}

export interface CorporateEvent {
  key: string;
  type: "earnings";
  date: string;
  hour?: string;
}

export interface SnapshotAnalytics {
  volatility20Pct: number | null;
  atr14Pct: number | null;

  sma50: number | null;
  previousSma50: number | null;

  sma200: number | null;
  previousSma200: number | null;

  rsi14: number | null;
  previousRsi14: number | null;

  week52High: number | null;
  week52Low: number | null;

  currentVolume: number | null;
  averageVolume20: number | null;
  volumeSpike: number | null;

  crossedAbove50: boolean;
  crossedBelow50: boolean;
  crossedAbove200: boolean;
  crossedBelow200: boolean;

  rsiCrossedAbove70: boolean;
  rsiCrossedBelow30: boolean;

  new52WeekHigh: boolean;
  new52WeekLow: boolean;

  newsSentiment: number | null;
  latestNewsAt: number | null;
  news: SnapshotNews[];

  corporateEvents: CorporateEvent[];

  chart: {
    timestamp: number;
    price: number;
  }[];
}

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
  analytics?: SnapshotAnalytics;
}

function normalizeTicker(
  ticker: string
) {
  return ticker
    .trim()
    .toUpperCase();
}

export async function getMarketSnapshot(
  ticker: string
): Promise<MarketSnapshot | null> {
  const db = await getDb();

  return db
    .collection<MarketSnapshot>(
      "market_snapshots"
    )
    .findOne({
      ticker: normalizeTicker(ticker),
    });
}

export async function getMarketSnapshots(
  tickers: string[]
): Promise<MarketSnapshot[]> {
  if (!tickers.length) return [];

  const normalized = [
    ...new Set(
      tickers.map(normalizeTicker)
    ),
  ];

  const db = await getDb();

  return db
    .collection<MarketSnapshot>(
      "market_snapshots"
    )
    .find({
      ticker: {
        $in: normalized,
      },
    })
    .toArray();
}

export async function saveMarketSnapshot(
  snapshot: MarketSnapshot
) {
  const db = await getDb();

  const ticker =
    normalizeTicker(snapshot.ticker);

  await db
    .collection<MarketSnapshot>(
      "market_snapshots"
    )
    .updateOne(
      { ticker },
      {
        $set: {
          ...snapshot,
          ticker,
        },
      },
      { upsert: true }
    );
}