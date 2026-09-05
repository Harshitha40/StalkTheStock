"use client";

interface PriceComparisonChartProps {
  current: number;
  previous: number | null;
  history: {
    timestamp: number;
    price: number;
  }[];
}

export function PriceComparisonChart({
  current,
  previous,
  history,
}: PriceComparisonChartProps) {
  const values = history
    .map((item) => item.price)
    .filter(
      (value) =>
        Number.isFinite(value)
    );

  if (previous !== null) {
    values.push(previous);
  }

  values.push(current);

  const min =
    Math.min(...values);

  const max =
    Math.max(...values);

  const range =
    max - min || 1;

  const points = history
    .slice(-40)
    .map((item, index) => {
      const x =
        (index /
          Math.max(
            history.length - 1,
            1
          )) *
        100;

      const y =
        100 -
        ((item.price - min) /
          range) *
          100;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-4">
      <div className="flex h-32 items-end gap-8 rounded-xl bg-slate-50 px-6 py-5">
        <div className="flex h-full flex-1 flex-col justify-end">
          <div
            className="rounded-t-md bg-slate-300 transition-all"
            style={{
              height: previous
                ? `${Math.max(
                    12,
                    ((previous -
                      min) /
                      range) *
                      100
                  )}%`
                : "15%",
            }}
          />

          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Last seen
          </p>

          <p className="text-center text-sm font-semibold text-slate-700">
            {previous !== null
              ? `$${previous.toFixed(2)}`
              : "—"}
          </p>
        </div>

        <div className="flex h-full flex-1 flex-col justify-end">
          <div
            className="rounded-t-md bg-blue-600 transition-all"
            style={{
              height: `${Math.max(
                12,
                ((current - min) /
                  range) *
                  100
              )}%`,
            }}
          />

          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-blue-600">
            Current
          </p>

          <p className="text-center text-sm font-semibold text-slate-950">
            ${current.toFixed(2)}
          </p>
        </div>
      </div>

      {history.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Price trend
            </p>

            <p className="text-xs text-slate-400">
              Historical
            </p>
          </div>

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-20 w-full"
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              className="text-blue-600"
            />
          </svg>
        </div>
      )}
    </div>
  );
}