const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

export type FinnhubQuote = {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

export type FinnhubCandle = {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  t: number[];
  v: number[];
  s: string;
};

export type FinnhubNews = {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image?: string;
  related?: string;
  source: string;
  summary?: string;
  url: string;
};

export type FinnhubEarnings = {
  date: string;
  epsActual?: number;
  epsEstimate?: number;
  hour?: string;
  quarter?: number;
  revenueActual?: number;
  revenueEstimate?: number;
  symbol: string;
  year?: number;
};

async function finnhubFetch<T>(
  path: string,
  params: Record<string, string>
): Promise<T> {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error(
      "FINNHUB_API_KEY is not configured"
    );
  }

  const searchParams = new URLSearchParams({
    ...params,
    token: apiKey,
  });

  const response = await fetch(
    `${FINNHUB_BASE_URL}${path}?${searchParams}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Finnhub ${path} failed: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export async function getStockQuote(
  ticker: string
): Promise<FinnhubQuote> {
  return finnhubFetch<FinnhubQuote>(
    "/quote",
    {
      symbol: ticker
        .trim()
        .toUpperCase(),
    }
  );
}

export async function getStockCandles(
  ticker: string,
  days = 400
): Promise<FinnhubCandle> {
  const now = Math.floor(
    Date.now() / 1000
  );

  const from =
    now - days * 24 * 60 * 60;

  return finnhubFetch<FinnhubCandle>(
    "/stock/candle",
    {
      symbol: ticker
        .trim()
        .toUpperCase(),
      resolution: "D",
      from: String(from),
      to: String(now),
    }
  );
}

export const getCandles = getStockCandles;

export async function getCompanyNews(
  ticker: string,
  days = 30
): Promise<FinnhubNews[]> {
  const to = new Date();

  const from = new Date();
  from.setDate(
    from.getDate() - days
  );

  const formatDate = (date: Date) =>
    date.toISOString().slice(0, 10);

  return finnhubFetch<FinnhubNews[]>(
    "/company-news",
    {
      symbol: ticker
        .trim()
        .toUpperCase(),
      from: formatDate(from),
      to: formatDate(to),
    }
  );
}

export async function getUpcomingEarnings(
  ticker: string
): Promise<FinnhubEarnings[]> {
  const from = new Date();

  const to = new Date();
  to.setDate(
    to.getDate() + 30
  );

  const formatDate = (date: Date) =>
    date.toISOString().slice(0, 10);

  const result =
    await finnhubFetch<{
      earningsCalendar: FinnhubEarnings[];
    }>("/calendar/earnings", {
      from: formatDate(from),
      to: formatDate(to),
      symbol: ticker
        .trim()
        .toUpperCase(),
    });

  return result.earningsCalendar ?? [];
}