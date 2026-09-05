export interface WatchlistItem {
  id: string;
  userId: string;
  ticker: string;
  position: number;
  createdAt: Date;
}

export interface MarketSnapshot {
  ticker: string;

  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;

  volume: number;
  avgVolume20: number;

  volatility20: number;

  rsi: number;

  dma50: number;
  dma200: number;

  high52: number;
  low52: number;

  timestamp: Date;
  source: string;
}

export interface LastSeenSnapshot {
  userId: string;
  ticker: string;

  price: number;
  volume: number;

  rsi: number;

  dma50: number;
  dma200: number;

  high52: number;
  low52: number;

  volatility20: number;

  newsCount: number;
  sentiment: number;

  seenAt: Date;
}

export interface CalculatedMetrics {
  rsi14: number | null;
  volatility20Pct: number | null;
  volumeSpike: number | null;
  sma50: number | null;
  sma200: number | null;
  week52High: number | null;
  week52Low: number | null;
  openGapPct: number | null;
  newsSentiment: number | null;
  newsCount: number;
  corporateEventsCount: number;
  currentVolume: number | null;
  averageVolume20: number | null;
}

export interface ScoreBreakdown {
  finalScore: number;
  priceScore: number;
  volumeScore: number;
  technicalScore: number;
  gapScore: number;
  newsScore: number;
  corporateScore: number;
}

export interface AttentionResult {
  ticker: string;

  score: number;

  priceScore: number;
  volumeScore: number;
  technicalScore: number;
  gapScore: number;
  newsScore: number;
  corporateScore: number;

  reasons: string[];
  metrics?: CalculatedMetrics;
  scores?: ScoreBreakdown;
}

export interface NewsItem {
  id: number;
  headline: string;
  source: string;
  url: string;
  summary: string;
  publishedAt: Date;
  related?: string;
}