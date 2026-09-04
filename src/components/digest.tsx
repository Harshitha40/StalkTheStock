"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DigestItem {
  ticker: string;
  attention: {
    score: number;
    reasons: string[];
  };
  current: {
    price: number;
    timestamp: string;
  };
}

export function Digest() {
  const [items, setItems] =
    useState<DigestItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response =
          await fetch("/api/digest");

        if (!response.ok) return;

        const data =
          await response.json();

        setItems(data.results);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        Loading your digest...
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold">
          Your digest is empty
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Add stocks to your watchlist to start
          tracking changes.
        </p>
      </Card>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          Since you last checked
        </h2>

        <p className="text-sm text-muted-foreground">
          Ranked by Attention Score.
        </p>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card
            key={item.ticker}
            className="p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold">
                    {item.ticker}
                  </h3>

                  <Badge
                    variant={
                      item.attention.score >= 70
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    Attention{" "}
                    {item.attention.score}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {item.attention.reasons.map(
                    (reason) => (
                      <Badge
                        key={reason}
                        variant="outline"
                      >
                        {reason}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-semibold">
                  $
                  {item.current.price.toFixed(
                    2
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Market snapshot
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}