import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import {
  calculateAttention,
} from "@/lib/attention";
import {
  getCurrentSnapshot,
  getLastSeenSnapshot,
  saveLastSeenSnapshot,
} from "@/lib/snapshots";
import { getWatchlist } from "@/lib/watchlist";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const watchlist =
    await getWatchlist(user.id);

  const results = [];

  for (const item of watchlist) {
    const current =
      await getCurrentSnapshot(
        item.ticker
      );

    if (!current) continue;

    const previous =
      await getLastSeenSnapshot(
        user.id,
        item.ticker
      );

    const attention =
      calculateAttention(
        current,
        previous
      );

    results.push({
      ticker: item.ticker,
      current,
      attention,
      previousSeenAt:
        previous?.seenAt ?? null,
    });
  }

  results.sort(
    (a, b) =>
      b.attention.score -
      a.attention.score
  );

  return NextResponse.json({
    generatedAt: new Date(),
    results,
  });
}