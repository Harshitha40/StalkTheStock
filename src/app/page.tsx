import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-950">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              S
            </div>

            <span className="font-bold tracking-tight">
              Stock Attention
            </span>
          </Link>

          <Link
            href="/login"
            className="text-sm font-medium text-slate-500 hover:text-slate-950"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-36">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Your market, intelligently filtered
            </div>

            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.045em] md:text-7xl">
              Know what changed.
              <br />
              <span className="text-blue-600">
                Know what matters.
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-500">
              Stock Attention compares the market
              with the last time you checked and
              surfaces the stocks that actually
              deserve your attention.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "bg-blue-600 px-7 shadow-sm hover:bg-blue-700",
                })}
              >
                Start tracking
              </Link>

              <Link
                href="/login"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className:
                    "border-slate-300 bg-white px-7",
                })}
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Swiss-style data preview */}

          <div className="mt-20 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
            <Metric
              label="Price movement"
              value="+4.82%"
              description="Since last visit"
              positive
            />

            <Metric
              label="Volume"
              value="3.1×"
              description="20-day average"
              positive
            />

            <Metric
              label="Attention"
              value="High"
              description="4 signals detected"
              positive
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  description,
  positive = false,
}: {
  label: string;
  value: string;
  description: string;
  positive?: boolean;
}) {
  return (
    <div className="border-l-2 border-blue-600 bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p
        className={[
          "mt-3 text-3xl font-semibold tracking-tight",
          positive
            ? "text-emerald-600"
            : "text-slate-950",
        ].join(" ")}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}