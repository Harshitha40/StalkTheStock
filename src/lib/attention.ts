import {
  getMarketSnapshots,
  getMarketSnapshot,
  MarketSnapshot,
} from "./market-snapshot";

import { getUserStockStates } from "./attention-state";
import { getWatchlist } from "./watchlist";

/* =========================================================
   TYPES
   ========================================================= */

type AnalyticsNews = {
  id?: string | number;
  datetime: number;
  headline: string;
  source?: string;
  url?: string;
  sentiment?: number | null;
};

type CorporateEvent = {
  key: string;
  type?: string;
  date?: string;
  hour?: string;
  [key: string]: unknown;
};

type Analytics = {
  volatility20Pct: number | null;
  atr14Pct: number | null;

  sma50: number | null;
  previousSma50?: number | null;

  sma200: number | null;
  previousSma200?: number | null;

  rsi14: number | null;
  previousRsi14?: number | null;

  week52High: number | null;
  week52Low: number | null;

  currentVolume: number | null;
  averageVolume20: number | null;
  volumeSpike: number | null;

  newsSentiment: number | null;
  news: AnalyticsNews[];

  corporateEvents: CorporateEvent[];

  chart: {
    timestamp: number;
    price: number;
  }[];
};

type UserState = {
  userId: string;
  ticker: string;

  lastSeenPrice?: number | null;
  lastSeenAt?: Date | string | null;

  lastSeenSma50?: number | null;
  lastSeenSma200?: number | null;
  lastSeenRsi14?: number | null;

  lastSeenWeek52High?: number | null;
  lastSeenWeek52Low?: number | null;

  lastSeenNewsAt?: number | null;
  lastSeenNewsSentiment?: number | null;

  lastSeenCorporateKeys?: string[];
};

export type AttentionReason = {
  label: string;
  value?: string;
  points: number;
};

export type AttentionFactor = {
  name: string;
  points: number;
  maxPoints: number;
  value: string;
  active: boolean;
  description: string;
  reasoning: string;
};

export type AttentionNews = {
  id?: string | number;
  datetime: number;
  headline: string;
  source?: string;
  url?: string;
  sentiment: number | null;
};

export type NewsScoreResult = {
  score: number;
  newHeadlineCount: number;
  sentimentDelta: number | null;
  currentSentiment: number | null;
  previousSentiment: number | null;
  reasoning: string;

  headlines: {
    id?: string | number;
    datetime: number;
    headline: string;
    source?: string;
    url?: string;
    sentiment: number | null;
  }[];
};

export type AttentionNewsResult = NewsScoreResult;

export type AttentionBreakdown = {
  priceMove: number;
  volume: number;
  technicals: number;
  gap: number;
  news: number;
  corporateActions: number;
};

export type AttentionMetrics = {
  rsi14: number | null;
  volatility20Pct: number | null;
  atr14Pct: number | null;

  volumeSpike: number | null;
  currentVolume: number | null;
  averageVolume20: number | null;

  sma50: number | null;
  sma200: number | null;

  week52High: number | null;
  week52Low: number | null;

  openGapPct: number | null;

  newsSentiment: number | null;
  newsCount: number;

  corporateEventsCount: number;
};

export type AttentionItem = {
  ticker: string;

  score: number;

  level: "LOW" | "MEDIUM" | "HIGH";

  price: number | null;

  currentPrice: number | null;

  changePercent: number | null;

  previousPrice: number | null;

  lastSeenPrice: number | null;

  lastSeenAt: string | null;

  firstVisit: boolean;

  updatedAt: string;

  priceMovePct: number | null;

  explanation: string;

  performanceExplanation: string;

  newsExplanation: string;

  reasons: AttentionReason[];

  factors: AttentionFactor[];

  breakdown: AttentionBreakdown;

  scores: {
    finalScore: number;
    priceScore: number;
    volumeScore: number;
    technicalScore: number;
    gapScore: number;
    newsScore: number;
    corporateScore: number;
  };

  metrics: AttentionMetrics;

  news: AttentionNewsResult;

  corporateEvents: CorporateEvent[];

  newCorporateEvents: CorporateEvent[];

  chart: {
    timestamp: number;
    price: number;
  }[];
};

/* =========================================================
   HELPERS
   ========================================================= */

function clamp(
  value: number,
  min: number,
  max: number
): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(
    Math.max(value, min),
    max
  );
}

function safeNumber(
  value: unknown
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return value;
}

function formatPercent(
  value: number
): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(
    2
  )}%`;
}

function formatMoney(
  value: number | null
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  return `$${value.toFixed(2)}`;
}

function getAttentionLevel(
  score: number
): "LOW" | "MEDIUM" | "HIGH" {
  if (score >= 70) {
    return "HIGH";
  }

  if (score >= 40) {
    return "MEDIUM";
  }

  return "LOW";
}

function getAnalytics(
  snapshot: MarketSnapshot
): Analytics {
  const analytics =
    (snapshot.analytics ?? {}) as Partial<Analytics>;

  return {
    volatility20Pct:
      safeNumber(
        analytics.volatility20Pct
      ),

    atr14Pct:
      safeNumber(
        analytics.atr14Pct
      ),

    sma50:
      safeNumber(
        analytics.sma50
      ),

    previousSma50:
      safeNumber(
        analytics.previousSma50
      ),

    sma200:
      safeNumber(
        analytics.sma200
      ),

    previousSma200:
      safeNumber(
        analytics.previousSma200
      ),

    rsi14:
      safeNumber(
        analytics.rsi14
      ),

    previousRsi14:
      safeNumber(
        analytics.previousRsi14
      ),

    week52High:
      safeNumber(
        analytics.week52High
      ),

    week52Low:
      safeNumber(
        analytics.week52Low
      ),

    currentVolume:
      safeNumber(
        analytics.currentVolume
      ),

    averageVolume20:
      safeNumber(
        analytics.averageVolume20
      ),

    volumeSpike:
      safeNumber(
        analytics.volumeSpike
      ),

    newsSentiment:
      safeNumber(
        analytics.newsSentiment
      ),

    news:
      Array.isArray(
        analytics.news
      )
        ? analytics.news.filter(
            (item): item is AnalyticsNews =>
              typeof item?.datetime ===
                "number" &&
              Number.isFinite(
                item.datetime
              ) &&
              typeof item?.headline ===
                "string"
          )
        : [],

    corporateEvents:
      Array.isArray(
        analytics.corporateEvents
      )
        ? analytics.corporateEvents.filter(
            (
              event
            ): event is CorporateEvent =>
              typeof event?.key ===
              "string"
          )
        : [],

    chart:
      Array.isArray(
        analytics.chart
      )
        ? analytics.chart.filter(
            (item) =>
              typeof item?.timestamp ===
                "number" &&
              typeof item?.price ===
                "number"
          )
        : [],
  };
}

/* =========================================================
   PRICE SCORE
   30 POINTS
   ========================================================= */

function calculatePriceScore(
  movePct: number | null,
  volatilityPct: number | null
): number {
  if (
    movePct === null ||
    volatilityPct === null ||
    volatilityPct <= 0
  ) {
    return 0;
  }

  const volatility = Math.max(
    volatilityPct,
    0.25
  );

  const zScore =
    Math.abs(movePct) /
    volatility;

  return clamp(
    (zScore / 3) * 30,
    0,
    30
  );
}

/* =========================================================
   VOLUME SCORE
   20 POINTS
   ========================================================= */

function calculateVolumeScore(
  volumeSpike: number | null
): number {
  if (
    volumeSpike === null ||
    volumeSpike <= 1
  ) {
    return 0;
  }

  return clamp(
    ((volumeSpike - 1) / 2) *
      20,
    0,
    20
  );
}

/* =========================================================
   GAP SCORE
   10 POINTS

   Gap is normalized against volatility.
   ========================================================= */

function calculateGapScore(
  gapPct: number | null,
  volatilityPct: number | null
): number {
  if (
    gapPct === null ||
    volatilityPct === null ||
    volatilityPct <= 0
  ) {
    return 0;
  }

  const threshold =
    Math.max(
      volatilityPct * 2,
      1
    );

  return (
    clamp(
      Math.abs(gapPct) /
        threshold,
      0,
      1
    ) * 10
  );
}

/* =========================================================
   TECHNICAL SCORE
   20 POINTS
   ========================================================= */

function calculateTechnicalScore(
  currentPrice: number | null,
  metrics: AttentionMetrics,
  previousMetrics: {
    rsi14: number | null;
    sma50: number | null;
    sma200: number | null;
    week52High: number | null;
    week52Low: number | null;
  } | null,
  firstVisit: boolean
): {
  score: number;
  reasons: AttentionReason[];
} {
  const reasons: AttentionReason[] = [];

  /*
   * IMPORTANT:
   *
   * On the first visit there is no previous state.
   * Therefore there is no "change" to measure.
   *
   * We do NOT manufacture a technical score.
   */
  if (
    firstVisit ||
    currentPrice === null ||
    previousMetrics === null
  ) {
    return {
      score: 0,
      reasons,
    };
  }

  let score = 0;

  /* -----------------------------
     50 DMA crossover
     ----------------------------- */

  

  /* -----------------------------
     52 WEEK HIGH
     ----------------------------- */

  if (
    metrics.week52High !== null &&
    previousMetrics.week52High !==
      null &&
    currentPrice >
      previousMetrics.week52High
  ) {
    score += 3;

    reasons.push({
      label: "New 52-week high",
      value: formatMoney(
        currentPrice
      ),
      points: 3,
    });
  }

  /* -----------------------------
     52 WEEK LOW
     ----------------------------- */

  if (
    metrics.week52Low !== null &&
    previousMetrics.week52Low !==
      null &&
    currentPrice <
      previousMetrics.week52Low
  ) {
    score += 3;

    reasons.push({
      label: "New 52-week low",
      value: formatMoney(
        currentPrice
      ),
      points: 3,
    });
  }

  /* -----------------------------
     RSI CROSS
     ----------------------------- */

  if (
    metrics.rsi14 !== null &&
    previousMetrics.rsi14 !== null
  ) {
    const crossedAbove70 =
      previousMetrics.rsi14 <=
        70 &&
      metrics.rsi14 > 70;

    const crossedBelow30 =
      previousMetrics.rsi14 >=
        30 &&
      metrics.rsi14 < 30;

    if (crossedAbove70) {
      score += 2;

      reasons.push({
        label:
          "RSI crossed above 70",
        value:
          metrics.rsi14.toFixed(1),
        points: 2,
      });
    }

    if (crossedBelow30) {
      score += 2;

      reasons.push({
        label:
          "RSI crossed below 30",
        value:
          metrics.rsi14.toFixed(1),
        points: 2,
      });
    }
  }

  return {
    score: Math.min(
      score,
      20
    ),
    reasons,
  };
}

/* =========================================================
   NEWS SCORE
   10 POINTS
   ========================================================= */

export function calculateNewsScore(params: {
  currentNews: Array<{
    id?: string | number;
    datetime: number;
    headline?: string;
    source?: string;
    url?: string;
    sentiment?: number | null;
  }>;

  lastSeenNewsAt: number | null;
  currentSentiment: number | null;
  previousSentiment: number | null;
}): NewsScoreResult {
  const {
    currentNews,
    lastSeenNewsAt,
    currentSentiment,
    previousSentiment,
  } = params;

  const validNews = currentNews
    .filter(
      (article) =>
        Number.isFinite(article.datetime) &&
        typeof article.headline === "string" &&
        article.headline.trim().length > 0
    )
    .sort(
      (a, b) =>
        b.datetime - a.datetime
    );

  /*
   * ALWAYS expose latest headlines to the UI.
   * These are display data, not necessarily "new"
   * for Attention Score purposes.
   */
  const headlines = validNews
    .slice(0, 5)
    .map((article) => ({
      id: article.id,
      datetime: article.datetime,
      headline: article.headline!,
      source: article.source,
      url: article.url,
      sentiment:
        article.sentiment ?? null,
    }));

  /*
   * FIRST VISIT
   *
   * Existing articles are displayed but are NOT
   * counted as new because there is no baseline.
   */
  if (lastSeenNewsAt === null) {
    return {
      score: 0,
      newHeadlineCount: 0,
      sentimentDelta: null,
      currentSentiment,
      previousSentiment: null,
      reasoning:
        headlines.length > 0
          ? `Showing ${headlines.length} latest available headline${
              headlines.length === 1
                ? ""
                : "s"
            }. New-headline comparison starts after this visit.`
          : "No stock news is currently available.",
      headlines,
    };
  }

  /*
   * ONLY articles after lastSeenNewsAt count
   * toward the Attention Score.
   */
  const newHeadlines =
    validNews.filter(
      (article) =>
        article.datetime >
        lastSeenNewsAt
    );

  const newHeadlineCount =
    newHeadlines.length;

  /*
   * Maximum 6 points from new headlines.
   */
  const headlinePoints = clamp(
    newHeadlineCount,
    0,
    6
  );

  /*
   * Maximum 4 points from sentiment movement.
   */
  let sentimentDelta:
    | number
    | null = null;

  let sentimentPoints = 0;

  if (
    currentSentiment !== null &&
    previousSentiment !== null &&
    Number.isFinite(
      currentSentiment
    ) &&
    Number.isFinite(
      previousSentiment
    )
  ) {
    sentimentDelta =
      currentSentiment -
      previousSentiment;

    sentimentPoints = clamp(
      Math.abs(sentimentDelta) * 10,
      0,
      4
    );
  }

  const score = Math.round(
    clamp(
      headlinePoints +
        sentimentPoints,
      0,
      10
    )
  );

  let reasoning: string;

  if (newHeadlineCount === 0) {
    reasoning =
      "No new headlines since your last visit.";

    if (sentimentDelta !== null) {
      reasoning +=
        ` Aggregate sentiment changed by ${
          sentimentDelta >= 0
            ? "+"
            : ""
        }${sentimentDelta.toFixed(2)}.`;
    }
  } else {
    reasoning =
      `${newHeadlineCount} new headline${
        newHeadlineCount === 1
          ? ""
          : "s"
      } appeared since your last visit.`;

    if (sentimentDelta !== null) {
      reasoning +=
        ` Aggregate sentiment changed by ${
          sentimentDelta >= 0
            ? "+"
            : ""
        }${sentimentDelta.toFixed(2)}.`;
    }
  }

  return {
    score,
    newHeadlineCount,
    sentimentDelta,
    currentSentiment,
    previousSentiment,
    reasoning,

    /*
     * IMPORTANT:
     * Always send latest headlines to the UI.
     */
    headlines,
  };
}

/* =========================================================
   HUMAN EXPLANATION
   ========================================================= */

function buildHumanExplanation(
  params: {
    firstVisit: boolean;
    priceMovePct: number | null;
    previousPrice: number | null;
    currentPrice: number | null;
    volatilityPct: number | null;
    volumeSpike: number | null;
    gapPct: number | null;
    technicalReasons: AttentionReason[];
    news: AttentionNewsResult;
    corporateEvents: CorporateEvent[];
  }
): {
  explanation: string;
  performanceExplanation: string;
  newsExplanation: string;
} {
  const {
    firstVisit,
    priceMovePct,
    previousPrice,
    currentPrice,
    volatilityPct,
    volumeSpike,
    gapPct,
    technicalReasons,
    news,
    corporateEvents,
  } = params;

  if (firstVisit) {
    return {
      explanation:
        "This is your first visit to this stock. We are establishing the baseline that future changes will be measured against.",

      performanceExplanation:
        "There is no previous visit yet, so performance since last seen is not available.",

      newsExplanation:
        "Existing headlines are not treated as new until there is a previous news baseline.",
    };
  }

  const performanceParts: string[] =
    [];

  if (
    priceMovePct !== null &&
    previousPrice !== null &&
    currentPrice !== null
  ) {
    if (
      Math.abs(
        priceMovePct
      ) >= 0.1
    ) {
      performanceParts.push(
        `the stock has ${
          priceMovePct >= 0
            ? "risen"
            : "fallen"
        } ${Math.abs(
          priceMovePct
        ).toFixed(2)}%`
      );
    } else {
      performanceParts.push(
        "the stock price has been broadly stable"
      );
    }
  }

  if (
    volatilityPct !== null &&
    priceMovePct !== null &&
    Math.abs(
      priceMovePct
    ) >= volatilityPct
  ) {
    performanceParts.push(
      `the move is larger than its normal ${volatilityPct.toFixed(
        2
      )}% volatility`
    );
  }

  if (
    volumeSpike !== null &&
    volumeSpike >= 1.5
  ) {
    performanceParts.push(
      `trading volume is ${volumeSpike.toFixed(
        2
      )}× the 20-day average`
    );
  }

  if (
    gapPct !== null &&
    Math.abs(gapPct) >= 1
  ) {
    performanceParts.push(
      `the stock opened with a ${formatPercent(
        gapPct
      )} gap`
    );
  }

  if (
    technicalReasons.length >
    0
  ) {
    performanceParts.push(
      technicalReasons
        .slice(0, 2)
        .map(
          (reason) =>
            reason.label.toLowerCase()
        )
        .join(" and ")
    );
  }

  let performanceExplanation =
    "No major measurable price or market-activity change has been detected.";

  if (
    performanceParts.length === 1
  ) {
    performanceExplanation =
      `The main change is that ${performanceParts[0]}.`;
  } else if (
    performanceParts.length > 1
  ) {
    performanceExplanation =
      `The move is being highlighted because ${performanceParts.join(
        ", "
      )}.`;
  }

  /*
   * News explanation
   */

  let newsExplanation =
    "No new news has been detected since your last visit.";

  if (
    news.newHeadlineCount >
    0
  ) {
    newsExplanation =
      `${news.newHeadlineCount} new headline${
        news.newHeadlineCount ===
        1
          ? ""
          : "s"
      } appeared since your last visit.`;

    if (
      news.sentimentDelta !==
      null
    ) {
      const direction =
        news.sentimentDelta >
        0
          ? "more positive"
          : "more negative";

      newsExplanation += ` Overall news sentiment became ${direction} by ${Math.abs(
        news.sentimentDelta
      ).toFixed(2)}.`;
    }

    /*
     * Important wording:
     *
     * We don't claim that the headline
     * CAUSED the stock move. We only
     * say it may have influenced it.
     */

    if (
      news.headlines.length >
      0
    ) {
      newsExplanation +=
        " These are the new headlines that may have influenced the move.";
    }
  }

  if (
    corporateEvents.length >
    0
  ) {
    newsExplanation += ` There ${
      corporateEvents.length ===
      1
        ? "is"
        : "are"
    } ${
      corporateEvents.length
    } new corporate event${
      corporateEvents.length ===
      1
        ? ""
        : "s"
    } in the current data.`;
  }

  const explanation =
    `Since you last checked, ${
      performanceExplanation
        .charAt(0)
        .toLowerCase() +
      performanceExplanation.slice(
        1
      )
    }`;

  return {
    explanation,
    performanceExplanation,
    newsExplanation,
  };
}

/* =========================================================
   BUILD ONE ATTENTION ITEM
   ========================================================= */

export function buildAttentionItemForSnapshot(
  snapshot: MarketSnapshot,
  state: UserState | null = null
): AttentionItem {
  const analytics =
    getAnalytics(snapshot);

  const firstVisit =
    state === null ||
    !state.lastSeenAt ||
    state.lastSeenPrice ===
      null ||
    state.lastSeenPrice ===
      undefined;

  const currentPrice =
    safeNumber(
      snapshot.price
    );

  const previousPrice =
    state?.lastSeenPrice ??
    null;

  /*
   * PRICE MOVE
   */

  let priceMovePct:
    | number
    | null = null;

  if (
    currentPrice !== null &&
    previousPrice !== null &&
    previousPrice > 0 &&
    !firstVisit
  ) {
    priceMovePct =
      ((currentPrice -
        previousPrice) /
        previousPrice) *
      100;
  }

  /*
   * VOLATILITY
   */

  const volatilityPct =
    analytics.volatility20Pct ??
    analytics.atr14Pct ??
    null;

  /*
   * PRICE SCORE
   */

  const priceScore =
    calculatePriceScore(
      priceMovePct,
      volatilityPct
    );

  /*
   * VOLUME SCORE
   */

  const volumeScore =
    firstVisit
      ? 0
      : calculateVolumeScore(
          analytics.volumeSpike
        );

  /*
   * GAP
   */

  let gapPct:
    | number
    | null = null;

  if (
    snapshot.open !== null &&
    snapshot.open !== undefined &&
    snapshot.previousClose !==
      null &&
    snapshot.previousClose !==
      undefined &&
    snapshot.previousClose > 0
  ) {
    gapPct =
      ((snapshot.open -
        snapshot.previousClose) /
        snapshot.previousClose) *
      100;
  }

  const gapScore =
    firstVisit
      ? 0
      : calculateGapScore(
          gapPct,
          volatilityPct
        );

  /*
   * CURRENT METRICS
   */

  const metrics: AttentionMetrics =
    {
      rsi14:
        analytics.rsi14,

      volatility20Pct:
        analytics.volatility20Pct,

      atr14Pct:
        analytics.atr14Pct,

      volumeSpike:
        analytics.volumeSpike,

      currentVolume:
        analytics.currentVolume,

      averageVolume20:
        analytics.averageVolume20,

      sma50:
        analytics.sma50,

      sma200:
        analytics.sma200,

      week52High:
        analytics.week52High,

      week52Low:
        analytics.week52Low,

      openGapPct:
        gapPct,

      newsSentiment:
        analytics.newsSentiment,

      newsCount:
        analytics.news.length,

      corporateEventsCount:
        analytics.corporateEvents.length,
    };

  /*
   * PREVIOUS METRICS
   */

  const previousMetrics =
    state
      ? {
          rsi14:
            state.lastSeenRsi14 ??
            null,

          sma50:
            state.lastSeenSma50 ??
            null,

          sma200:
            state.lastSeenSma200 ??
            null,

          week52High:
            state.lastSeenWeek52High ??
            null,

          week52Low:
            state.lastSeenWeek52Low ??
            null,
        }
      : null;

  /*
   * TECHNICAL SCORE
   */

  const technicalResult =
    calculateTechnicalScore(
      currentPrice,
      metrics,
      previousMetrics,
      firstVisit
    );

  let technicalScore =
    technicalResult.score;

  const technicalReasons =
    [...technicalResult.reasons];

  /*
   * Actual DMA CROSSOVERS.
   *
   * Need both previous price and
   * current price.
   */

  if (
    !firstVisit &&
    currentPrice !== null &&
    previousPrice !== null
  ) {
    if (
      analytics.sma50 !== null &&
      state?.lastSeenSma50 !==
        null &&
      state?.lastSeenSma50 !==
        undefined
    ) {
      const wasAbove =
        previousPrice >
        state.lastSeenSma50;

      const isAbove =
        currentPrice >
        analytics.sma50;

      if (
        wasAbove !==
        isAbove
      ) {
        technicalScore += 5;

        technicalReasons.push({
          label: isAbove
            ? "Crossed above 50-DMA"
            : "Crossed below 50-DMA",
          value:
            formatMoney(
              analytics.sma50
            ),
          points: 5,
        });
      }
    }

    if (
      analytics.sma200 !== null &&
      state?.lastSeenSma200 !==
        null &&
      state?.lastSeenSma200 !==
        undefined
    ) {
      const wasAbove =
        previousPrice >
        state.lastSeenSma200;

      const isAbove =
        currentPrice >
        analytics.sma200;

      if (
        wasAbove !==
        isAbove
      ) {
        technicalScore += 5;

        technicalReasons.push({
          label: isAbove
            ? "Crossed above 200-DMA"
            : "Crossed below 200-DMA",
          value:
            formatMoney(
              analytics.sma200
            ),
          points: 5,
        });
      }
    }
  }

  technicalScore =
    Math.min(
      technicalScore,
      20
    );

  /*
   * NEWS
   */

  const currentNews =
  (analytics?.news ?? []).map(
    (article: {
      id?: string | number;
      datetime: number;
      headline: string;
      source?: string;
      url?: string;
      sentiment?: number | null;
    }) => ({
      id: article.id,
      datetime: article.datetime,
      headline: article.headline,
      source: article.source,
      url: article.url,
      sentiment:
        article.sentiment ?? null,
    })
  );

  const lastSeenNewsAt =
    state?.lastSeenNewsAt ??
    null;

  const previousSentiment =
    state?.lastSeenNewsSentiment ??
    null;

  const news =
    calculateNewsScore({
      currentNews,
      lastSeenNewsAt,
      currentSentiment: analytics.newsSentiment,
      previousSentiment,
    });

  /*
   * CORPORATE EVENTS
   */

  const corporateEvents =
    analytics.corporateEvents;

  const previousCorporateKeys =
    new Set(
      state?.lastSeenCorporateKeys ??
        []
    );

  const newCorporateEvents =
    firstVisit
      ? []
      : corporateEvents.filter(
          (event) =>
            !previousCorporateKeys.has(
              event.key
            )
        );

  const corporateScore =
    newCorporateEvents.length >
    0
      ? 10
      : 0;

  /*
   * FINAL SCORE
   */

  const breakdown:
    AttentionBreakdown = {
      priceMove:
        Math.round(
          priceScore
        ),

      volume:
        Math.round(
          volumeScore
        ),

      technicals:
        Math.round(
          technicalScore
        ),

      gap:
        Math.round(
          gapScore
        ),

      news:
        news.score,

      corporateActions:
        corporateScore,
    };

  const score =
    Math.round(
      clamp(
        breakdown.priceMove +
          breakdown.volume +
          breakdown.technicals +
          breakdown.gap +
          breakdown.news +
          breakdown.corporateActions,
        0,
        100
      )
    );

  /*
   * REASONS
   */

  const reasons:
    AttentionReason[] = [];

  if (
    priceMovePct !== null &&
    volatilityPct !== null &&
    Math.abs(
      priceMovePct
    ) >= volatilityPct
  ) {
    reasons.push({
      label:
        priceMovePct >= 0
          ? "Significant price increase"
          : "Significant price decline",
      value:
        formatPercent(
          priceMovePct
        ),
      points:
        Math.round(
          priceScore
        ),
    });
  }

  if (
    volumeScore > 0 &&
    analytics.volumeSpike !==
      null
  ) {
    reasons.push({
      label:
        "Unusual trading volume",
      value: `${analytics.volumeSpike.toFixed(
        2
      )}× average`,
      points:
        Math.round(
          volumeScore
        ),
    });
  }

  reasons.push(
    ...technicalReasons
  );

  if (
    gapPct !== null &&
    Math.abs(gapPct) >= 1
  ) {
    reasons.push({
      label: "Opening gap",
      value:
        formatPercent(
          gapPct
        ),
      points:
        Math.round(
          gapScore
        ),
    });
  }

  if (
    news.newHeadlineCount >
    0
  ) {
    reasons.push({
      label:
        "New stock news",
      value: `${news.newHeadlineCount} headline${
        news.newHeadlineCount ===
        1
          ? ""
          : "s"
      }`,
      points:
        news.score,
    });
  }

  if (
    newCorporateEvents.length >
    0
  ) {
    reasons.push({
      label:
        "New corporate event",
      value: `${newCorporateEvents.length} event${
        newCorporateEvents.length ===
        1
          ? ""
          : "s"
      }`,
      points:
        corporateScore,
    });
  }

  /*
   * HUMAN EXPLANATION
   */

  const human =
    buildHumanExplanation({
      firstVisit,
      priceMovePct,
      previousPrice,
      currentPrice,
      volatilityPct,
      volumeSpike:
        analytics.volumeSpike,
      gapPct,
      technicalReasons,
      news,
      corporateEvents:
        newCorporateEvents,
    });

  /*
   * FACTORS
   */

  const factors:
    AttentionFactor[] = [
      {
        name: "Price movement",

        points:
          breakdown.priceMove,

        maxPoints: 30,

        value:
          priceMovePct !== null
            ? `${formatPercent(
                priceMovePct
              )}${
                volatilityPct !==
                null
                  ? ` · ${volatilityPct.toFixed(
                      2
                    )}% volatility`
                  : ""
              }`
            : "Baseline unavailable",

        active:
          breakdown.priceMove >
          0,

        description:
          "Price movement normalized against the stock's own volatility.",

        reasoning:
          firstVisit
            ? "No previous price baseline exists yet."
            : priceMovePct !==
                null &&
              volatilityPct !==
                null
            ? `The stock moved ${formatPercent(
                priceMovePct
              )} against ${volatilityPct.toFixed(
                2
              )}% normal volatility.`
            : "Historical volatility is unavailable.",
      },

      {
        name: "Volume",

        points:
          breakdown.volume,

        maxPoints: 20,

        value:
          analytics.volumeSpike !==
          null
            ? `${analytics.volumeSpike.toFixed(
                2
              )}× 20-day average`
            : "Unavailable",

        active:
          breakdown.volume >
          0,

        description:
          "Unusual trading activity relative to the 20-day average.",

        reasoning:
          analytics.volumeSpike !==
          null
            ? `Current volume is ${analytics.volumeSpike.toFixed(
                2
              )}× the 20-day average.`
            : "Volume analytics are unavailable.",
      },

      {
        name:
          "Technical levels",

        points:
          breakdown.technicals,

        maxPoints: 20,

        value:
          analytics.rsi14 !==
          null
            ? `RSI ${analytics.rsi14.toFixed(
                1
              )}`
            : "Unavailable",

        active:
          breakdown.technicals >
          0,

        description:
          "DMA crossovers, RSI thresholds and 52-week breakouts.",

        reasoning:
          technicalReasons.length >
          0
            ? technicalReasons
                .map(
                  (reason) =>
                    reason.label
                )
                .join(
                  ", "
                )
            : "No new technical level breach was detected.",
      },

      {
        name: "Opening gap",

        points:
          breakdown.gap,

        maxPoints: 10,

        value:
          gapPct !== null
            ? formatPercent(
                gapPct
              )
            : "Unavailable",

        active:
          breakdown.gap >
          0,

        description:
          "Opening price relative to the previous close.",

        reasoning:
          gapPct !== null
            ? `The stock opened ${formatPercent(
                gapPct
              )} from its previous close.`
            : "Opening-gap data is unavailable.",
      },

      {
        name: "News",

        points:
          breakdown.news,

        maxPoints: 10,

        value:
          news.newHeadlineCount >
          0
            ? `${news.newHeadlineCount} new headline${
                news.newHeadlineCount ===
                1
                  ? ""
                  : "s"
              }`
            : "No new headlines",

        active:
          breakdown.news >
          0,

        description:
          "New headlines and change in aggregate news sentiment.",

        reasoning:
          news.reasoning,
      },

      {
        name:
          "Corporate actions",

        points:
          breakdown.corporateActions,

        maxPoints: 10,

        value:
          newCorporateEvents.length >
          0
            ? `${newCorporateEvents.length} new event${
                newCorporateEvents.length ===
                1
                  ? ""
                  : "s"
              }`
            : "None detected",

        active:
          breakdown.corporateActions >
          0,

        description:
          "New earnings and other corporate events detected since the previous baseline.",

        reasoning:
          newCorporateEvents.length >
          0
            ? `${newCorporateEvents.length} new corporate event${
                newCorporateEvents.length ===
                1
                  ? ""
                  : "s"
              } detected.`
            : "No new corporate event was detected.",
      },
    ];

  const updatedAt =
    snapshot.fetchedAt
      ? new Date(
          snapshot.fetchedAt
        ).toISOString()
      : new Date().toISOString();

  return {
    ticker:
      String(
        snapshot.ticker
      ).toUpperCase(),

    score,

    level:
      getAttentionLevel(
        score
      ),

    price:
      currentPrice,

    currentPrice,

    changePercent:
      snapshot.changePercent ??
      null,

    previousPrice,

    lastSeenPrice:
      previousPrice,

    lastSeenAt:
      state?.lastSeenAt
        ? new Date(
            state.lastSeenAt
          ).toISOString()
        : null,

    firstVisit,

    updatedAt,

    priceMovePct,

    explanation:
      human.explanation,

    performanceExplanation:
      human.performanceExplanation,

    newsExplanation:
      human.newsExplanation,

    reasons,

    factors,

    breakdown,

    scores: {
      finalScore: score,

      priceScore:
        breakdown.priceMove,

      volumeScore:
        breakdown.volume,

      technicalScore:
        breakdown.technicals,

      gapScore:
        breakdown.gap,

      newsScore:
        breakdown.news,

      corporateScore:
        breakdown.corporateActions,
    },

    metrics,

    news,

    corporateEvents,

    newCorporateEvents,

    chart:
      analytics.chart,
  };
}

/* =========================================================
   GET ALL ATTENTION
   ========================================================= */

export async function getAttentionForUser(
  userId: string
): Promise<AttentionItem[]> {
  const watchlist =
    await getWatchlist(
      userId
    );

  if (
    watchlist.length ===
    0
  ) {
    return [];
  }

  const tickers = [
    ...new Set(
      watchlist.map(
        (item) =>
          String(
            item.ticker
          ).toUpperCase()
      )
    ),
  ];

  const [
    snapshots,
    states,
  ] = await Promise.all([
    getMarketSnapshots(
      tickers
    ),

    getUserStockStates(
      userId,
      tickers
    ),
  ]);

  const snapshotMap =
    new Map(
      snapshots.map(
        (snapshot) => [
          String(
            snapshot.ticker
          ).toUpperCase(),
          snapshot,
        ]
      )
    );

  const stateMap =
    new Map(
      states.map(
        (state) => [
          String(
            state.ticker
          ).toUpperCase(),
          state as UserState,
        ]
      )
    );

  const results: AttentionItem[] =
    [];

  for (const item of watchlist) {
    const ticker =
      String(
        item.ticker
      ).toUpperCase();

    const snapshot =
      snapshotMap.get(
        ticker
      );

    if (!snapshot) {
      continue;
    }

    const state =
      stateMap.get(
        ticker
      ) ?? null;

    results.push(
      buildAttentionItemForSnapshot(
        snapshot,
        state
      )
    );
  }

  results.sort(
    (a, b) =>
      b.score - a.score
  );

  return results;
}

/* =========================================================
   GET ONE STOCK
   ========================================================= */

export async function getAttentionForTicker(
  userId: string,
  ticker: string
): Promise<AttentionItem | null> {
  const normalizedTicker =
    ticker
      .trim()
      .toUpperCase();

  const [
    snapshot,
    states,
  ] = await Promise.all([
    getMarketSnapshot(
      normalizedTicker
    ),

    getUserStockStates(
      userId,
      [normalizedTicker]
    ),
  ]);

  if (!snapshot) {
    return null;
  }

  const state =
    states[0]
      ? (states[0] as UserState)
      : null;

  return buildAttentionItemForSnapshot(
    snapshot,
    state
  );
}

/*
 * Backwards-compatible export.
 */
export const calculateAttention =
  buildAttentionItemForSnapshot;