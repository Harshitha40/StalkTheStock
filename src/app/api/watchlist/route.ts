import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist";
import { getMarketSnapshots } from "@/lib/market-snapshot";
import { inngest } from "@/inngest/client";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const watchlist = await getWatchlist(user.id);

    const tickers = watchlist.map((item) => item.ticker);

    const snapshots = await getMarketSnapshots(tickers);

    const snapshotMap = new Map(
      snapshots.map((snapshot) => [
        snapshot.ticker,
        snapshot,
      ])
    );

    const stocks = watchlist.map((item) => {
      const snapshot = snapshotMap.get(item.ticker);

      return {
        _id: item._id,
        ticker: item.ticker,
        position: item.position,
        quote: snapshot
          ? {
              price: snapshot.price,
              change: snapshot.change,
              changePercent: snapshot.changePercent,
              high: snapshot.high,
              low: snapshot.low,
              open: snapshot.open,
              previousClose: snapshot.previousClose,
              timestamp: snapshot.timestamp,
              fetchedAt: snapshot.fetchedAt,
            }
          : null,
      };
    });

    return NextResponse.json(stocks);
  } catch (error) {
    console.error("Watchlist GET error:", error);

    return NextResponse.json(
      { error: "Failed to load watchlist" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (
      typeof body.ticker !== "string" ||
      !body.ticker.trim()
    ) {
      return NextResponse.json(
        { error: "Ticker is required" },
        { status: 400 }
      );
    }

    const ticker = body.ticker.trim().toUpperCase();

    const item = await addToWatchlist(
      user.id,
      ticker
    );

    /*
     * Ask Inngest to refresh the shared snapshot.
     *
     * The scheduled worker remains the primary refresh
     * mechanism. This event simply helps a newly-added
     * ticker get populated sooner.
     */
    await inngest.send({
      name: "stock/watchlist.added",
      data: {
        ticker,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Watchlist POST error:", error);

    return NextResponse.json(
      { error: "Failed to add stock" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (
      typeof body.ticker !== "string" ||
      !body.ticker.trim()
    ) {
      return NextResponse.json(
        { error: "Ticker is required" },
        { status: 400 }
      );
    }

    await removeFromWatchlist(
      user.id,
      body.ticker
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Watchlist DELETE error:", error);

    return NextResponse.json(
      { error: "Failed to remove stock" },
      { status: 500 }
    );
  }
}