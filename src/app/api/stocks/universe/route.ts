import { NextResponse } from "next/server";

const FINNHUB_BASE_URL =
  "https://finnhub.io/api/v1";

export async function GET() {
  try {
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
      `${FINNHUB_BASE_URL}/stock/symbol` +
      `?exchange=US` +
      `&token=${encodeURIComponent(
        apiKey
      )}`;

    const response = await fetch(url, {
      next: {
        revalidate: 86400,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Finnhub symbols failed: ${response.status}`
      );
    }

    const data =
      (await response.json()) as Array<{
        symbol: string;
        displaySymbol: string;
        description: string;
        type: string;
      }>;

    const stocks = data
      .filter(
        (stock) =>
          stock.type ===
          "Common Stock"
      )
      .map((stock) => ({
        symbol:
          stock.displaySymbol ||
          stock.symbol,
        description:
          stock.description,
      }));

    return NextResponse.json(
      stocks
    );
  } catch (error) {
    console.error(
      "Stock universe error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load stock universe",
      },
      { status: 500 }
    );
  }
}