const positiveWords = [
  "beat",
  "beats",
  "growth",
  "grow",
  "strong",
  "surge",
  "surged",
  "rise",
  "rises",
  "raised",
  "upgrade",
  "upgraded",
  "profit",
  "profits",
  "record",
  "bullish",
  "positive",
  "outperform",
  "buyback",
];

const negativeWords = [
  "miss",
  "missed",
  "weak",
  "decline",
  "declines",
  "fall",
  "falls",
  "cut",
  "cuts",
  "downgrade",
  "downgraded",
  "loss",
  "losses",
  "bearish",
  "negative",
  "lawsuit",
  "warning",
  "layoff",
  "layoffs",
];

export function headlineSentiment(
  headline: string
): number {
  const text =
    headline.toLowerCase();

  let score = 0;

  for (const word of positiveWords) {
    if (text.includes(word)) {
      score++;
    }
  }

  for (const word of negativeWords) {
    if (text.includes(word)) {
      score--;
    }
  }

  return Math.max(
    -1,
    Math.min(1, score / 3)
  );
}

export function averageNewsSentiment(
  headlines: string[]
): number {
  if (!headlines.length) return 0;

  const total =
    headlines.reduce(
      (sum, headline) =>
        sum +
        headlineSentiment(headline),
      0
    );

  return total / headlines.length;
}