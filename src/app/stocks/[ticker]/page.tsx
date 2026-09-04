import Link from "next/link";
import { notFound } from "next/navigation";
import { getStockQuote } from "@/lib/finnhub";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

interface Props {
  params: Promise<{
    ticker: string;
  }>;
}

export default async function StockPage({
  params,
}: Props) {
  const { ticker } = await params;

  const symbol =
    ticker.toUpperCase();

  try {
    const quote =
      await getStockQuote(symbol);

    if (!quote || !quote.c) {
      notFound();
    }

    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "ghost" })}
        >
          ← Dashboard
        </Link>

        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            STOCK
          </p>

          <h1 className="mt-1 text-4xl font-bold">
            {symbol}
          </h1>

          <div className="mt-4 text-3xl font-semibold">
            ${quote.c.toFixed(2)}
          </div>

          <div className="mt-2">
            {quote.dp >= 0 ? "+" : ""}
            {quote.dp.toFixed(2)}%
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">
              Open
            </p>

            <p className="mt-2 text-xl font-semibold">
              ${quote.o.toFixed(2)}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-muted-foreground">
              Previous close
            </p>

            <p className="mt-2 text-xl font-semibold">
              ${quote.pc.toFixed(2)}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-muted-foreground">
              Day high
            </p>

            <p className="mt-2 text-xl font-semibold">
              ${quote.h.toFixed(2)}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-muted-foreground">
              Day low
            </p>

            <p className="mt-2 text-xl font-semibold">
              ${quote.l.toFixed(2)}
            </p>
          </Card>
        </div>

        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold">
            Chart
          </h2>

          <div className="mt-10 flex h-64 items-center justify-center text-muted-foreground">
            Candlestick chart coming next.
          </div>
        </Card>
      </main>
    );
  } catch {
    notFound();
  }
}