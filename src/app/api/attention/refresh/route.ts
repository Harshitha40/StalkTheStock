import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { inngest } from "@/inngest/client";
import { getWatchlist } from "@/lib/watchlist";

/**
 * POST /api/attention/refresh
 *
 * Triggers an immediate analytics refresh for all tickers in the
 * user's watchlist (or a specific ticker if ?ticker=X is provided).
 *
 * This fires the same "stock/watchlist.added" event that normally runs
 * when a stock is first added, causing full analytics to be recomputed.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ticker = request.nextUrl.searchParams
      .get("ticker")
      ?.trim()
      .toUpperCase();

    let tickers: string[];

    if (ticker) {
      tickers = [ticker];
    } else {
      const watchlist = await getWatchlist(user.id);
      tickers = watchlist.map((item) =>
        String(item.ticker).toUpperCase()
      );
    }

    if (tickers.length === 0) {
      return NextResponse.json({ refreshed: 0 });
    }

    await inngest.send(
      tickers.map((t) => ({
        name: "stock/watchlist.added" as const,
        data: { ticker: t },
      }))
    );

    return NextResponse.json({
      refreshed: tickers.length,
      tickers,
    });
  } catch (error) {
    console.error("Refresh error:", error);

    return NextResponse.json(
      { error: "Failed to trigger refresh" },
      { status: 500 }
    );
  }
}
