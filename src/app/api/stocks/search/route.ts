import { NextRequest, NextResponse } from "next/server";

const FINNHUB_BASE_URL =
  "https://finnhub.io/api/v1";

export async function GET(
  request: NextRequest
) {
  try {
    const query =
      request.nextUrl.searchParams
        .get("q")
        ?.trim();

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    const apiKey =
      process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "FINNHUB_API_KEY is not configured",
        },
        { status: 500 }
      );
    }

    const url =
      `${FINNHUB_BASE_URL}/search` +
      `?q=${encodeURIComponent(query)}` +
      `&exchange=US` +
      `&token=${encodeURIComponent(
        apiKey
      )}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Finnhub search failed: ${response.status}`
      );
    }

    const data =
      (await response.json()) as {
        result?: Array<{
          symbol: string;
          displaySymbol: string;
          description: string;
          type: string;
        }>;
      };

    const results =
      (data.result ?? [])
        .filter(
          (stock) =>
            stock.type ===
              "Common Stock" ||
            stock.type ===
              "American Depositary Receipt"
        )
        .map((stock) => ({
          symbol:
            stock.displaySymbol ||
            stock.symbol,
          description:
            stock.description,
          type: stock.type,
        }));

    return NextResponse.json(
      results.slice(0, 20)
    );
  } catch (error) {
    console.error(
      "Stock search error:",
      error
    );

    return NextResponse.json(
      {
        error: "Stock search failed",
      },
      { status: 500 }
    );
  }
}