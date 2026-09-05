import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth-server";
import { getStockQuote } from "@/lib/finnhub";
import { getAttentionForTicker } from "@/lib/attention";

const tickerSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Za-z0-9.-]+$/);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { ticker } = await params;

    const parsedTicker = tickerSchema.safeParse(ticker);

    if (!parsedTicker.success) {
      return NextResponse.json(
        { error: "Invalid ticker" },
        { status: 400 }
      );
    }

    const symbol = parsedTicker.data.toUpperCase();

    const [quote, attention] = await Promise.all([
      getStockQuote(symbol).catch(() => null),
      getAttentionForTicker(user.id, symbol).catch(() => null),
    ]);

    return NextResponse.json({
      ticker: symbol,
      price: quote?.c ?? attention?.price ?? 0,
      change: quote?.d ?? 0,
      changePercent: quote?.dp ?? attention?.changePercent ?? 0,
      high: quote?.h ?? attention?.metrics?.week52High ?? 0,
      low: quote?.l ?? attention?.metrics?.week52Low ?? 0,
      open: quote?.o ?? 0,
      previousClose: quote?.pc ?? 0,
      timestamp: quote?.t ?? Date.now(),
      attention,
    });
  } catch (error) {
    console.error("Stock API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}