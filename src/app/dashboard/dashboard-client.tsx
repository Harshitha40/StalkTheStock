"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Digest } from "@/components/digest";
import { Watchlist } from "@/components/watchlist";
import { AddStock } from "@/components/add-stock";

interface DashboardProps {
  user: {
    name: string;
    email: string;
  };
}

export function DashboardClient({
  user,
}: DashboardProps) {
  const [refreshKey, setRefreshKey] =
    useState(0);

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Navbar user={user} />

      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        {/* Header */}

        <section className="mb-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
                Market overview
              </p>

              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 md:text-4xl">
                Good evening,{" "}
                {user.name.split(" ")[0]}.
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                Here is what changed across
                your portfolio since your last
                visit.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Market data connected
            </div>
          </div>
        </section>

        {/* Digest */}

        <section>
          <Digest key={refreshKey} />
        </section>

        {/* Watchlist */}

        <section className="mt-12">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Your market
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                Watchlist
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Live shared market snapshots,
                refreshed in the background.
              </p>
            </div>

            <AddStock
              onAdded={() =>
                setRefreshKey(
                  (value) => value + 1
                )
              }
            />
          </div>

          <Watchlist />
        </section>
      </main>
    </div>
  );
}