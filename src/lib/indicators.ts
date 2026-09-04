export function sma(
  values: number[],
  period: number
): number {
  if (values.length < period) return 0;

  const slice = values.slice(-period);

  return (
    slice.reduce((sum, value) => sum + value, 0) /
    period
  );
}

export function standardDeviation(
  values: number[]
): number {
  if (values.length === 0) return 0;

  const mean =
    values.reduce((sum, value) => sum + value, 0) /
    values.length;

  const variance =
    values.reduce(
      (sum, value) =>
        sum + Math.pow(value - mean, 2),
      0
    ) / values.length;

  return Math.sqrt(variance);
}

export function calculateRSI(
  closes: number[],
  period = 14
): number {
  if (closes.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  for (
    let i = closes.length - period;
    i < closes.length;
    i++
  ) {
    const change = closes[i] - closes[i - 1];

    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  if (losses === 0) return 100;

  const averageGain = gains / period;
  const averageLoss = losses / period;

  const rs = averageGain / averageLoss;

  return 100 - 100 / (1 + rs);
}

export function calculateVolatility(
  closes: number[]
): number {
  if (closes.length < 2) return 0;

  const returns: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] === 0) continue;

    returns.push(
      (closes[i] - closes[i - 1]) /
        closes[i - 1]
    );
  }

  return standardDeviation(returns);
}