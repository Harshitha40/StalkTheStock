"use client";

import { useState, ChangeEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onAdded: () => void;
}

export function AddStock({
  onAdded,
}: Props) {
  const [ticker, setTicker] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function addStock() {
    if (!ticker.trim()) return;

    setLoading(true);

    try {
      const response =
        await fetch("/api/watchlist", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ticker,
          }),
        });

      if (!response.ok) {
        const data =
          await response.json();

        alert(
          data.error ||
          "Failed to add stock"
        );

        return;
      }

      setTicker("");
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={ticker}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setTicker(
            e.target.value.toUpperCase()
          )
        }
        className="w-28"
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            addStock();
          }
        }}
      />

      <Button
        onClick={addStock}
        disabled={loading}
      >
        {loading ? "Adding..." : "Add"}
      </Button>
    </div>
  );
}