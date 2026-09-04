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