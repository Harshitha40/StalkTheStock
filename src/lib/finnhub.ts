const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

export type FinnhubQuote = {
  c: number;   // current price
  d: number;   // change
  dp: number;  // percentage change
  h: number;   // high
  l: number;   // low
  o: number;   // open
  pc: number;  // previous close
  t: number;   // timestamp
};

export async function getStockQuote(
  ticker: string
): Promise<FinnhubQuote> {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  const symbol = ticker.trim().toUpperCase();

  const url =
    `${FINNHUB_BASE_URL}/quote` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&token=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Finnhub request failed: ${response.status}`
    );
  }

  const data = (await response.json()) as FinnhubQuote;

  return data;
}

export type FinnhubCandle = {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  s: string;
  t: number[];
  v: number[];
};

export async function getCandles(
  ticker: string,
  resolution = "D",
  from: number,
  to: number
): Promise<FinnhubCandle> {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  const symbol = ticker.trim().toUpperCase();

  const url =
    `${FINNHUB_BASE_URL}/stock/candle` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&resolution=${encodeURIComponent(resolution)}` +
    `&from=${from}` +
    `&to=${to}` +
    `&token=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Finnhub request failed: ${response.status}`
    );
  }

  const data = (await response.json()) as FinnhubCandle;

  return data;
}