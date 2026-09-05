import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";
import { getWatchlist } from "@/lib/watchlist";
import { getMarketSnapshot } from "@/lib/market-snapshot";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = await getDb();

    const watchlist = await getWatchlist(user.id);

    if (watchlist.length === 0) {
      return NextResponse.json({
        success: true,
        saved: 0,
      });
    }

    const now = new Date();

    const operations = [];

    for (const item of watchlist) {
      const snapshot = await getMarketSnapshot(item.ticker);

      if (!snapshot) {
        continue;
      }

      const analytics = snapshot.analytics;

      operations.push({
        updateOne: {
          filter: {
            userId: user.id,
            ticker: item.ticker,
          },
          update: {
            $set: {
              userId: user.id,
              ticker: item.ticker,

              lastSeenPrice: snapshot.price,
              lastSeenAt: now,

              lastSeenSma50:
                analytics?.sma50 ?? null,

              lastSeenSma200:
                analytics?.sma200 ?? null,

              lastSeenRsi14:
                analytics?.rsi14 ?? null,

              lastSeenWeek52High:
                analytics?.week52High ?? null,

              lastSeenWeek52Low:
                analytics?.week52Low ?? null,

              lastSeenNewsAt:
                analytics?.latestNewsAt ?? null,

              lastSeenNewsSentiment:
                analytics?.newsSentiment ?? null,

              lastSeenCorporateKeys:
                analytics?.corporateEvents?.map(
                  (event: { key: string }) => event.key
                ) ?? [],

              updatedAt: now,
            },
          },
          upsert: true,
        },
      });
    }

    if (operations.length > 0) {
      await db
        .collection("user_stock_states")
        .bulkWrite(operations);
    }

    return NextResponse.json({
      success: true,
      saved: operations.length,
    });
  } catch (error) {
    console.error(
      "Attention seen error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to save seen state",
      },
      { status: 500 }
    );
  }
}