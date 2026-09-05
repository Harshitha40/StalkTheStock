import { NextResponse } from "next/server";

export async function GET() {
  const ticker = "AAPL";

  const result: any = {
    ticker,
    finnhub: null,
    twelveData: null,
    marketaux: null,
  };

  // -------------------------
  // FINNHUB
  // -------------------------
  try {
    const key = process.env.FINNHUB_API_KEY;

    if (!key) {
      throw new Error("FINNHUB_API_KEY missing");
    }

    const url =
      `https://finnhub.io/api/v1/quote` +
      `?symbol=${ticker}` +
      `&token=${encodeURIComponent(key)}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    const data = await response.json();

    result.finnhub = {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    result.finnhub = {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }

  // -------------------------
  // TWELVE DATA
  // -------------------------
  try {
    const key = process.env.TWELVE_DATA_API_KEY;

    if (!key) {
      throw new Error(
        "TWELVE_DATA_API_KEY missing"
      );
    }

    const url =
      `https://api.twelvedata.com/time_series` +
      `?symbol=${ticker}` +
      `&interval=1day` +
      `&outputsize=300` +
      `&apikey=${encodeURIComponent(key)}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    const data = await response.json();

    result.twelveData = {
      ok: response.ok,
      status: response.status,
      statusField: data?.status,
      message: data?.message,
      valueCount: Array.isArray(data?.values)
        ? data.values.length
        : 0,
      firstValue: data?.values?.[0] ?? null,
    };
  } catch (error) {
    result.twelveData = {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }

  // -------------------------
  // MARKETAUX
  // -------------------------
  try {
    const token =
      process.env.MARKETAUX_API_TOKEN;

    if (!token) {
      throw new Error(
        "MARKETAUX_API_TOKEN missing"
      );
    }

    const url =
      `https://api.marketaux.com/v1/news/all` +
      `?api_token=${encodeURIComponent(token)}` +
      `&symbols=${ticker}` +
      `&filter_entities=true` +
      `&language=en` +
      `&limit=10`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    const data = await response.json();

    result.marketaux = {
      ok: response.ok,
      status: response.status,
      message: data?.message,
      dataCount: Array.isArray(data?.data)
        ? data.data.length
        : 0,
      firstArticle: data?.data?.[0] ?? null,
    };
  } catch (error) {
    result.marketaux = {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }

  return NextResponse.json(result);
}