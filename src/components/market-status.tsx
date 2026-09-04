interface MarketStatusProps {
  fetchedAt: string | null;
}

export function MarketStatus({
  fetchedAt,
}: MarketStatusProps) {
  if (!fetchedAt) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        Waiting for market data
      </span>
    );
  }

  const age =
    Date.now() -
    new Date(fetchedAt).getTime();

  const stale =
    age > 10 * 60 * 1000;

  const minutes = Math.floor(
    age / 1000 / 60
  );

  return (
    <span
      className={[
        "inline-flex items-center gap-2 text-xs",
        stale
          ? "text-amber-600"
          : "text-emerald-600",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          stale
            ? "bg-amber-500"
            : "bg-emerald-500",
        ].join(" ")}
      />

      {stale
        ? `Data may be stale · ${minutes}m ago`
        : `Updated ${minutes < 1 ? "just now" : `${minutes}m ago`}`}
    </span>
  );
}