import { NextResponse } from "next/server";
import { getStockQuote } from "@/lib/finnhub";

// Curated list of high-liquidity, market-leading tickers across Tech, Semis, Finance, Healthcare & Consumer
const TOP_MARKET_TICKERS = [
  "NVDA",
  "TSLA",
  "AAPL",
  "MSFT",
  "AMZN",
  "GOOGL",
  "META",
  "AMD",
  "NFLX",
  "AVGO",
  "PLTR",
  "SMCI",
  "LLY",
  "JPM",
  "COIN",
  "ARM",
  "QCOM",
  "INTC",
  "UBER",
  "PANW",
  "ORCL",
  "CRM",
  "DIS",
  "BABA",
];

export interface TopPerformerStock {
  ticker: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

const COMPANY_NAMES: Record<string, string> = {
  NVDA: "NVIDIA Corporation",
  TSLA: "Tesla, Inc.",
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corporation",
  AMZN: "Amazon.com, Inc.",
  GOOGL: "Alphabet Inc.",
  META: "Meta Platforms, Inc.",
  AMD: "Advanced Micro Devices",
  NFLX: "Netflix, Inc.",
  AVGO: "Broadcom Inc.",
  PLTR: "Palantir Technologies",
  SMCI: "Super Micro Computer",
  LLY: "Eli Lilly and Company",
  JPM: "JPMorgan Chase & Co.",
  COIN: "Coinbase Global, Inc.",
  ARM: "Arm Holdings plc",
  QCOM: "Qualcomm Incorporated",
  INTC: "Intel Corporation",
  UBER: "Uber Technologies, Inc.",
  PANW: "Palo Alto Networks",
  ORCL: "Oracle Corporation",
  CRM: "Salesforce, Inc.",
  DIS: "The Walt Disney Company",
  BABA: "Alibaba Group",
};

export async function GET() {
  try {
    const quotePromises = TOP_MARKET_TICKERS.map(async (ticker) => {
      try {
        const quote = await getStockQuote(ticker);
        if (!quote || quote.c === 0 || !Number.isFinite(quote.c)) {
          return null;
        }
        return {
          ticker,
          name: COMPANY_NAMES[ticker] || ticker,
          price: quote.c,
          change: quote.d,
          changePercent: quote.dp,
          high: quote.h,
          low: quote.l,
          open: quote.o,
          previousClose: quote.pc,
        } as TopPerformerStock;
      } catch (err) {
        console.warn(`Failed to fetch quote for top performer ${ticker}:`, err);
        return null;
      }
    });

    const results = (await Promise.all(quotePromises)).filter(
      (item): item is TopPerformerStock => item !== null
    );

    // Sort by daily % gain descending (top performers first)
    results.sort((a, b) => b.changePercent - a.changePercent);

    // Take top 20
    const top20 = results.slice(0, 20);

    return NextResponse.json(top20, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Top performers API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch top performers" },
      { status: 500 }
    );
  }
}
