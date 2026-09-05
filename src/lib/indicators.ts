export interface CandleData {
  closes: number[];
  highs: number[];
  lows: number[];
  opens: number[];
  volumes: number[];
  timestamps: number[];
}

export interface TechnicalMetrics {
  volatility20Pct: number | null;
  atr14Pct: number | null;

  sma50: number | null;
  previousSma50: number | null;

  sma200: number | null;
  previousSma200: number | null;

  rsi14: number | null;
  previousRsi14: number | null;

  week52High: number | null;
  week52Low: number | null;

  currentVolume: number | null;
  averageVolume20: number | null;
  volumeSpike: number | null;

  crossedAbove50: boolean;
  crossedBelow50: boolean;

  crossedAbove200: boolean;
  crossedBelow200: boolean;

  rsiCrossedAbove70: boolean;
  rsiCrossedBelow30: boolean;

  new52WeekHigh: boolean;
  new52WeekLow: boolean;
}

/* -------------------------------------------------------------------------- */
/* Basic helpers                                                              */
/* -------------------------------------------------------------------------- */

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}

export function standardDeviation(
  values: number[]
): number | null {
  if (values.length < 2) {
    return null;
  }

  const avg = average(values);

  if (avg === null) {
    return null;
  }

  const variance =
    values.reduce(
      (sum, value) =>
        sum + Math.pow(value - avg, 2),
      0
    ) / values.length;

  return Math.sqrt(variance);
}

/**
 * Standard deviation of supplied values.
 */
export function calculateVolatility(
  values: number[]
): number | null {
  return standardDeviation(values);
}

/* -------------------------------------------------------------------------- */
/* Simple Moving Average                                                      */
/* -------------------------------------------------------------------------- */

export function sma(
  values: number[],
  period: number,
  endIndex = values.length - 1
): number | null {
  if (
    period <= 0 ||
    endIndex < 0 ||
    endIndex >= values.length ||
    endIndex + 1 < period
  ) {
    return null;
  }

  const start =
    endIndex - period + 1;

  const slice = values.slice(
    start,
    endIndex + 1
  );

  return average(slice);
}

/* -------------------------------------------------------------------------- */
/* RSI                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * RSI using the standard average-gain / average-loss
 * calculation over the requested period.
 *
 * This is based entirely on the supplied closing prices.
 */
export function rsi(
  closes: number[],
  period = 14,
  endIndex = closes.length - 1
): number | null {
  if (
    period <= 0 ||
    endIndex < period ||
    endIndex >= closes.length
  ) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (
    let i = endIndex - period + 1;
    i <= endIndex;
    i++
  ) {
    const previousClose =
      closes[i - 1];

    const currentClose =
      closes[i];

    if (
      !Number.isFinite(
        previousClose
      ) ||
      !Number.isFinite(
        currentClose
      )
    ) {
      return null;
    }

    const change =
      currentClose -
      previousClose;

    if (change > 0) {
      gains += change;
    } else if (change < 0) {
      losses += Math.abs(change);
    }
  }

  const averageGain =
    gains / period;

  const averageLoss =
    losses / period;

  /*
   * If there were no losses during the period,
   * RSI is 100.
   */
  if (averageLoss === 0) {
    return 100;
  }

  const rs =
    averageGain /
    averageLoss;

  return (
    100 -
    100 / (1 + rs)
  );
}

export const calculateRSI = rsi;

/* -------------------------------------------------------------------------- */
/* ATR                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Calculates ATR as a percentage of the current price.
 *
 * True Range:
 *
 * max(
 *   high - low,
 *   abs(high - previous close),
 *   abs(low - previous close)
 * )
 */
function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number | null {
  if (
    period <= 0 ||
    closes.length < period + 1 ||
    highs.length !== closes.length ||
    lows.length !== closes.length
  ) {
    return null;
  }

  const trueRanges: number[] = [];

  for (
    let i = 1;
    i < closes.length;
    i++
  ) {
    const high = highs[i];
    const low = lows[i];
    const previousClose =
      closes[i - 1];

    if (
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(previousClose)
    ) {
      continue;
    }

    const trueRange =
      Math.max(
        high - low,
        Math.abs(
          high - previousClose
        ),
        Math.abs(
          low - previousClose
        )
      );

    trueRanges.push(
      trueRange
    );
  }

  if (
    trueRanges.length < period
  ) {
    return null;
  }

  const recentTrueRanges =
    trueRanges.slice(-period);

  const atr =
    average(
      recentTrueRanges
    );

  if (atr === null) {
    return null;
  }

  const currentPrice =
    closes[
      closes.length - 1
    ];

  if (
    !Number.isFinite(
      currentPrice
    ) ||
    currentPrice <= 0
  ) {
    return null;
  }

  return (
    (atr / currentPrice) *
    100
  );
}

/* -------------------------------------------------------------------------- */
/* Main technical calculation                                                */
/* -------------------------------------------------------------------------- */

export function calculateTechnicalMetrics(
  candles: CandleData
): TechnicalMetrics {
  const {
    closes,
    highs,
    lows,
    volumes,
  } = candles;

  /*
   * Validate the candle arrays.
   *
   * We do not manufacture missing values.
   */
  if (
    closes.length === 0 ||
    highs.length !== closes.length ||
    lows.length !== closes.length ||
    volumes.length !== closes.length
  ) {
    return {
      volatility20Pct: null,
      atr14Pct: null,

      sma50: null,
      previousSma50: null,

      sma200: null,
      previousSma200: null,

      rsi14: null,
      previousRsi14: null,

      week52High: null,
      week52Low: null,

      currentVolume: null,
      averageVolume20: null,
      volumeSpike: null,

      crossedAbove50: false,
      crossedBelow50: false,

      crossedAbove200: false,
      crossedBelow200: false,

      rsiCrossedAbove70: false,
      rsiCrossedBelow30: false,

      new52WeekHigh: false,
      new52WeekLow: false,
    };
  }

  const currentIndex =
    closes.length - 1;

  const previousIndex =
    closes.length - 2;

  const current =
    closes[currentIndex];

  const previous =
    previousIndex >= 0
      ? closes[previousIndex]
      : null;

  /* ---------------------------------------------------------------------- */
  /* 20-day volatility                                                       */
  /* ---------------------------------------------------------------------- */

  const returns: number[] = [];

  /*
   * Need 20 daily returns.
   *
   * If there are fewer than 20 valid returns,
   * return null rather than inventing volatility.
   */
  const firstReturnIndex =
    Math.max(
      1,
      closes.length - 20
    );

  for (
    let i = firstReturnIndex;
    i < closes.length;
    i++
  ) {
    const previousClose =
      closes[i - 1];

    const close =
      closes[i];

    if (
      !Number.isFinite(
        previousClose
      ) ||
      !Number.isFinite(close) ||
      previousClose <= 0
    ) {
      continue;
    }

    returns.push(
      ((close -
        previousClose) /
        previousClose) *
        100
    );
  }

  const volatility20Pct =
    returns.length >= 2
      ? standardDeviation(
          returns
        )
      : null;

  /* ---------------------------------------------------------------------- */
  /* 50-day moving average                                                   */
  /* ---------------------------------------------------------------------- */

  const sma50 =
    sma(
      closes,
      50,
      currentIndex
    );

  const previousSma50 =
    previousIndex >= 0
      ? sma(
          closes,
          50,
          previousIndex
        )
      : null;

  /* ---------------------------------------------------------------------- */
  /* 200-day moving average                                                  */
  /* ---------------------------------------------------------------------- */

  const sma200 =
    sma(
      closes,
      200,
      currentIndex
    );

  const previousSma200 =
    previousIndex >= 0
      ? sma(
          closes,
          200,
          previousIndex
        )
      : null;

  /* ---------------------------------------------------------------------- */
  /* RSI                                                                      */
  /* ---------------------------------------------------------------------- */

  const rsi14 =
    rsi(
      closes,
      14,
      currentIndex
    );

  const previousRsi14 =
    previousIndex >= 0
      ? rsi(
          closes,
          14,
          previousIndex
        )
      : null;

  /* ---------------------------------------------------------------------- */
  /* 52-week high / low                                                       */
  /* ---------------------------------------------------------------------- */

  /*
   * Use actual daily HIGH and LOW values,
   * not closing prices.
   *
   * Today's candle is excluded so that:
   *
   * new52WeekHigh = today's high > previous
   * 252 trading-day high
   *
   * This avoids comparing today's value with
   * itself.
   */
  const start252 =
    Math.max(
      0,
      closes.length - 253
    );

  const prior252Highs =
    highs.slice(
      start252,
      -1
    );

  const prior252Lows =
    lows.slice(
      start252,
      -1
    );

  const week52High =
    prior252Highs.length > 0
      ? Math.max(
          ...prior252Highs
        )
      : null;

  const week52Low =
    prior252Lows.length > 0
      ? Math.min(
          ...prior252Lows
        )
      : null;

  /*
   * Use today's actual high/low to determine
   * whether a new 52-week extreme occurred.
   */
  const currentHigh =
    highs[currentIndex];

  const currentLow =
    lows[currentIndex];

  const new52WeekHigh =
    week52High !== null &&
    Number.isFinite(
      currentHigh
    ) &&
    currentHigh >
      week52High;

  const new52WeekLow =
    week52Low !== null &&
    Number.isFinite(
      currentLow
    ) &&
    currentLow <
      week52Low;

  /* ---------------------------------------------------------------------- */
  /* Volume                                                                   */
  /* ---------------------------------------------------------------------- */

  /*
   * Current volume.
   */
  const currentVolume =
    Number.isFinite(
      volumes[currentIndex]
    )
      ? volumes[currentIndex]
      : null;

  /*
   * Previous 20 trading sessions.
   *
   * IMPORTANT:
   * Today's volume is excluded from the average.
   */
  const previous20Volumes =
    volumes.slice(
      Math.max(
        0,
        volumes.length - 21
      ),
      -1
    );

  const validPrevious20Volumes =
    previous20Volumes.filter(
      (volume) =>
        Number.isFinite(
          volume
        ) &&
        volume >= 0
    );

  const averageVolume20 =
    validPrevious20Volumes.length >=
    2
      ? average(
          validPrevious20Volumes
        )
      : null;

  const volumeSpike =
    currentVolume !== null &&
    averageVolume20 !== null &&
    averageVolume20 > 0
      ? currentVolume /
        averageVolume20
      : null;

  /* ---------------------------------------------------------------------- */
  /* Crossovers                                                              */
  /* ---------------------------------------------------------------------- */

  const crossedAbove50 =
    previous !== null &&
    previousSma50 !== null &&
    sma50 !== null &&
    previous <= previousSma50 &&
    current > sma50;

  const crossedBelow50 =
    previous !== null &&
    previousSma50 !== null &&
    sma50 !== null &&
    previous >= previousSma50 &&
    current < sma50;

  const crossedAbove200 =
    previous !== null &&
    previousSma200 !== null &&
    sma200 !== null &&
    previous <= previousSma200 &&
    current > sma200;

  const crossedBelow200 =
    previous !== null &&
    previousSma200 !== null &&
    sma200 !== null &&
    previous >= previousSma200 &&
    current < sma200;

  /* ---------------------------------------------------------------------- */
  /* RSI threshold crossings                                                 */
  /* ---------------------------------------------------------------------- */

  const rsiCrossedAbove70 =
    previousRsi14 !== null &&
    rsi14 !== null &&
    previousRsi14 < 70 &&
    rsi14 >= 70;

  const rsiCrossedBelow30 =
    previousRsi14 !== null &&
    rsi14 !== null &&
    previousRsi14 > 30 &&
    rsi14 <= 30;

  /* ---------------------------------------------------------------------- */
  /* Return actual calculated metrics                                        */
  /* ---------------------------------------------------------------------- */

  return {
    volatility20Pct,

    atr14Pct:
      calculateATR(
        highs,
        lows,
        closes,
        14
      ),

    sma50,
    previousSma50,

    sma200,
    previousSma200,

    rsi14,
    previousRsi14,

    week52High,
    week52Low,

    currentVolume,
    averageVolume20,
    volumeSpike,

    crossedAbove50,
    crossedBelow50,

    crossedAbove200,
    crossedBelow200,

    rsiCrossedAbove70,
    rsiCrossedBelow30,

    new52WeekHigh,
    new52WeekLow,
  };
}