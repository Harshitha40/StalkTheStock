import type {
  AttentionResult,
  LastSeenSnapshot,
  MarketSnapshot,
} from "./types";

function clamp(
  value: number,
  min = 0,
  max = 100
): number {
  return Math.max(min, Math.min(max, value));
}

function percentageChange(
  current: number,
  previous: number
): number {
  if (!previous) return 0;

  return ((current - previous) / previous) * 100;
}

export function calculateAttention(
  current: MarketSnapshot,
  previous: LastSeenSnapshot | null
): AttentionResult {
  if (!previous) {
    return {
      ticker: current.ticker,
      score: 0,
      priceScore: 0,
      volumeScore: 0,
      technicalScore: 0,
      gapScore: 0,
      newsScore: 0,
      corporateScore: 0,
      reasons: ["First visit — baseline created"],
    };
  }

  const reasons: string[] = [];

  // -------------------------
  // 1. PRICE MOVE
  // -------------------------

  const priceChange = percentageChange(
    current.price,
    previous.price
  );

  const volatility =
    Math.max(current.volatility20, 0.001);

  const normalizedMove =
    Math.abs(priceChange / 100) / volatility;

  const priceScore = clamp(
    normalizedMove * 40
  );

  if (Math.abs(priceChange) >= 1) {
    reasons.push(
      `${priceChange >= 0 ? "↑" : "↓"}${Math.abs(
        priceChange
      ).toFixed(1)}% since last check`
    );
  }

  // -------------------------
  // 2. VOLUME
  // -------------------------

  const volumeRatio =
    current.avgVolume20 > 0
      ? current.volume / current.avgVolume20
      : 1;

  const volumeScore = clamp(
    Math.max(0, volumeRatio - 1) * 45
  );

  if (volumeRatio >= 2) {
    reasons.push(
      `Volume ${volumeRatio.toFixed(1)}x average`
    );
  }

  // -------------------------
  // 3. TECHNICALS
  // -------------------------

  let technicalScore = 0;

  const crossed50Up =
    previous.price < previous.dma50 &&
    current.price >= current.dma50;

  const crossed50Down =
    previous.price > previous.dma50 &&
    current.price <= current.dma50;

  const crossed200Up =
    previous.price < previous.dma200 &&
    current.price >= current.dma200;

  const crossed200Down =
    previous.price > previous.dma200 &&
    current.price <= current.dma200;

  const newHigh =
    current.price >= current.high52 &&
    previous.price < previous.high52;

  const newLow =
    current.price <= current.low52 &&
    previous.price > previous.low52;

  const rsi70 =
    previous.rsi < 70 &&
    current.rsi >= 70;

  const rsi30 =
    previous.rsi > 30 &&
    current.rsi <= 30;

  if (crossed50Up || crossed50Down) {
    technicalScore += 25;
    reasons.push("Crossed 50-day moving average");
  }

  if (crossed200Up || crossed200Down) {
    technicalScore += 30;
    reasons.push("Crossed 200-day moving average");
  }

  if (newHigh) {
    technicalScore += 35;
    reasons.push("Broke 52-week high");
  }

  if (newLow) {
    technicalScore += 35;
    reasons.push("Broke 52-week low");
  }

  if (rsi70) {
    technicalScore += 15;
    reasons.push("RSI crossed above 70");
  }

  if (rsi30) {
    technicalScore += 15;
    reasons.push("RSI crossed below 30");
  }

  technicalScore = clamp(technicalScore);

  // -------------------------
  // 4. GAP
  // -------------------------

  const gap =
    current.previousClose > 0
      ? ((current.open - current.previousClose) /
          current.previousClose) *
        100
      : 0;

  const gapScore = clamp(
    Math.abs(gap) * 15
  );

  if (Math.abs(gap) >= 2) {
    reasons.push(
      `${gap >= 0 ? "+" : ""}${gap.toFixed(
        1
      )}% opening gap`
    );
  }

  // -------------------------
  // 5. NEWS
  // -------------------------

  const newsDelta =
    current.timestamp.getTime() >
    previous.seenAt.getTime()
      ? Math.max(
          0,
          previous.newsCount
        )
      : 0;

  const newsScore = clamp(
    newsDelta * 15
  );

  // -------------------------
  // 6. CORPORATE ACTION
  // -------------------------

  const corporateScore = 0;

  // Corporate actions will be wired
  // after the core pipeline is working.

  // -------------------------
  // FINAL SCORE
  // -------------------------

  const score = Math.round(
    priceScore * 0.30 +
      volumeScore * 0.20 +
      technicalScore * 0.20 +
      gapScore * 0.10 +
      newsScore * 0.10 +
      corporateScore * 0.10
  );

  return {
    ticker: current.ticker,
    score: clamp(score),

    priceScore,
    volumeScore,
    technicalScore,
    gapScore,
    newsScore,
    corporateScore,

    reasons:
      reasons.length > 0
        ? reasons
        : ["No significant change"],
  };
}