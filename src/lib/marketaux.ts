const MARKET_AUX_URL =
  "https://api.marketaux.com/v1/news/all";

export type MarketauxArticle = {
  uuid: string;
  title: string;
  description?: string;
  snippet?: string;
  url: string;
  image_url?: string;
  published_at: string;
  source?: string;
  entities?: Array<{
    symbol?: string;
    name?: string;
    sentiment_score?: number;
    match_score?: number;
  }>;
};

type MarketauxResponse = {
  data?: MarketauxArticle[];
  meta?: {
    found?: number;
    returned?: number;
    limit?: number;
  };
};

export async function getStockNews(
  ticker: string,
  limit = 10
) {
  const token = process.env.MARKETAUX_API_TOKEN;

  if (!token) {
    throw new Error(
      "MARKETAUX_API_TOKEN is not configured"
    );
  }

  const url = new URL(MARKET_AUX_URL);

  url.searchParams.set(
    "symbols",
    ticker.trim().toUpperCase()
  );

  url.searchParams.set(
    "filter_entities",
    "true"
  );

  url.searchParams.set(
    "language",
    "en"
  );

  url.searchParams.set(
    "limit",
    String(limit)
  );

  url.searchParams.set(
    "api_token",
    token
  );

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Marketaux request failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as MarketauxResponse;

  return data.data ?? [];
}