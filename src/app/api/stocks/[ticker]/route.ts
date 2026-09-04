import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth-server";
import { getStockQuote } from "@/lib/finnhub";

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

    const quote = await getStockQuote(symbol);

    return NextResponse.json({
      ticker: symbol,
      price: quote.c,
      change: quote.d,
      changePercent: quote.dp,
      high: quote.h,
      low: quote.l,
      open: quote.o,
      previousClose: quote.pc,
      timestamp: quote.t,
    });
  } catch (error) {
    console.error("Stock API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}