import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist";

import { inngest } from "@/inngest/client";

export async function GET() {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const watchlist =
      await getWatchlist(user.id);

    return NextResponse.json(
      watchlist
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to load watchlist",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const ticker = String(
      body?.ticker ?? ""
    )
      .trim()
      .toUpperCase();

    if (!ticker) {
      return NextResponse.json(
        {
          error:
            "Ticker is required",
        },
        { status: 400 }
      );
    }

    if (
      !/^[A-Z0-9.\-:]+$/.test(
        ticker
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid ticker",
        },
        { status: 400 }
      );
    }

    const stock =
      await addToWatchlist(
        user.id,
        ticker
      );

    // Ensure a baseline snapshot exists in MongoDB
    try {
      const { getMarketSnapshot, saveMarketSnapshot } = await import("@/lib/market-snapshot");
      const existing = await getMarketSnapshot(ticker);
      if (!existing) {
        let quotePrice = 0;
        let change = 0;
        let changePercent = 0;
        let high = 0;
        let low = 0;
        let open = 0;
        let prevClose = 0;

        try {
          const { getStockQuote } = await import("@/lib/finnhub");
          const quote = await getStockQuote(ticker);
          if (quote && Number.isFinite(quote.c)) {
            quotePrice = quote.c;
            change = quote.d ?? 0;
            changePercent = quote.dp ?? 0;
            high = quote.h ?? quotePrice;
            low = quote.l ?? quotePrice;
            open = quote.o ?? quotePrice;
            prevClose = quote.pc ?? quotePrice;
          }
        } catch {
          // Finnhub quote optional
        }

        await saveMarketSnapshot({
          ticker,
          price: quotePrice,
          change,
          changePercent,
          high,
          low,
          open,
          previousClose: prevClose,
          timestamp: Math.floor(Date.now() / 1000),
          fetchedAt: new Date(),
        });
      }
    } catch (snapshotErr) {
      console.warn(`[WATCHLIST] Could not initialize snapshot for ${ticker}:`, snapshotErr);
    }

    // Fire Inngest background event safely
    try {
      await inngest.send({
        name: "stock/watchlist.added",
        data: {
          ticker,
        },
      });
    } catch (inngestError) {
      console.warn(`[WATCHLIST] Inngest event failed for ${ticker}:`, inngestError);
    }

    return NextResponse.json(
      stock,
      { status: 201 }
    );
  } catch (error) {
    console.error("[WATCHLIST] Failed to add stock:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add stock",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ticker =
      request.nextUrl.searchParams
        .get("ticker")
        ?.trim()
        .toUpperCase();

    if (!ticker) {
      return NextResponse.json(
        {
          error:
            "Ticker is required",
        },
        { status: 400 }
      );
    }

    await removeFromWatchlist(
      user.id,
      ticker
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to remove stock",
      },
      { status: 500 }
    );
  }
}