const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";

export type TwelveDataCandle = {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
};

type TwelveDataResponse = {
  values?: TwelveDataCandle[];
  status?: string;
  message?: string;
};

export async function getHistoricalCandles(
  ticker: string,
  outputsize = 300
) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error("TWELVE_DATA_API_KEY is not configured");
  }

  const symbol = ticker.trim().toUpperCase();

  const url = new URL(
    `${TWELVE_DATA_BASE_URL}/time_series`
  );

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Twelve Data request failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as TwelveDataResponse;

  if (!data.values) {
    throw new Error(
      data.message || "No historical data returned"
    );
  }

  return data.values;
}