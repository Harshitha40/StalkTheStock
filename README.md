# StalkTheStock

> **Know what changed. Know what matters.**

StalkTheStock is a personalized stock intelligence platform that
transforms a static watchlist into a prioritized, explainable stream of
market changes.

Instead of forcing users to manually open every stock, inspect charts,
check indicators, scan news, and remember what changed, StalkTheStock
compares the **current market state with the user's last-seen state**
and highlights what actually deserves attention.

------------------------------------------------------------------------

# 1. The Problem --- A Static Watchlist Is Not Enough

A traditional watchlist tells users **what they follow**, but not **what
changed since they last checked**.

For users tracking dozens of stocks, manually checking price, volume,
technical indicators, news, breakouts, gaps, and corporate events is
repetitive and time-consuming.

### The core question StalkTheStock answers

> **"What changed, why does it matter, and which stock should I look at
> first?"**

------------------------------------------------------------------------

# 2. How StalkTheStock Solves It

## Personalized Attention Score

Every watchlist stock receives a **0--100 Attention Score** based on
real market signals:

  ------------------------------------------------------------------------
  Signal                                      Weight What it captures
  --------------------- ---------------------------- ---------------------
  Price movement vs                               30 Movement relative to
  volatility                                         the stock's normal
                                                     behavior

  Volume spike                                    20 Unusual trading
                                                     activity

  Technical signals                               20 DMA, RSI and 52-week
                                                     changes

  Opening gap                                     10 Open vs previous
                                                     close movement

  News + sentiment                                10 New headlines and
                                                     sentiment change

  Corporate events                                10 Earnings and relevant
                                                     events

  **Total**                                  **100** **Overall Attention
                                                     Score**
  ------------------------------------------------------------------------

The score prioritizes meaningful change rather than simply ranking
stocks by daily return.

## "Since You Last Checked"

The system stores a **per-user, per-stock last-seen baseline**.

``` text
Last seen AAPL:  $210.20
Current AAPL:    $219.30
Movement:          +4.3%
```

The dashboard can explain:

``` text
HIGH ATTENTION

↑ 4.3% since last checked
Volume 3.1× 20-day average
New 52-week high
4 new headlines
```

This makes a large watchlist much easier to scan.

## News & Sentiment

Stock-specific news is tracked for:

-   New headlines since the user's last visit
-   Current headline sentiment
-   Sentiment change
-   Recent relevant headlines
-   News context alongside market signals

News is presented as context rather than incorrectly claiming that a
headline caused a price movement.

## Real Market Metrics

The analytics engine uses real market data and calculates:

-   20-day return volatility
-   ATR
-   SMA 50
-   SMA 200
-   RSI 14
-   Volume spike vs 20-day average
-   52-week high / low
-   Opening gap
-   Recent price history
-   News sentiment
-   Corporate/earnings events

Price movement is evaluated relative to the stock's own volatility and
ATR, rather than using a fixed threshold for every stock.

## Fresh Market Experience

Market data is collected server-side and refreshed through background
processing. Dashboard requests primarily read persisted market snapshots
from MongoDB rather than making every browser request call external
market APIs.

This improves responsiveness while controlling third-party API traffic
and rate limits.

## Built-in Stock Calculator

A built-in stock calculator with an arithmetic keypad lets users perform
quick calculations without leaving the stock research workflow.

## Explainable Reasoning

The platform does not only show a score. It explains the signals behind
it.

``` text
Attention: 82

Why?
• Price moved 4.8% relative to normal volatility
• Volume is 3.1× its 20-day average
• Stock crossed its 50-day moving average
• 3 new headlines appeared
```

This makes the system useful for both tracking and learning.

------------------------------------------------------------------------

# 3. Architecture

The key architectural decision is separating **shared market state**
from **user-specific state**.

A naive implementation could do:

``` text
1,000 users
     ↓
1,000 requests
     ↓
1,000 identical AAPL API calls
     ↓
Finnhub
```

StalkTheStock instead does:

``` text
                    AAPL
                     │
                     ▼
            ┌─────────────────┐
            │ Market Snapshot │
            │ Price           │
            │ Volume          │
            │ Indicators      │
            │ News            │
            │ Events          │
            └────────┬────────┘
                     │
              Shared globally
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       User A     User B     User N
          │          │          │
          ▼          ▼          ▼
     Last Seen   Last Seen   Last Seen
       State       State       State
```

The expensive market-data operation happens at the **unique ticker
level**. Personalization happens afterward using each user's own
baseline.

------------------------------------------------------------------------

# 4. Complete System Architecture

``` text
                         ┌──────────────────────┐
                         │        USERS         │
                         │ User A / User B / N  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       NEXT.JS        │
                         │                      │
                         │ React UI             │
                         │ App Router           │
                         │ API Routes            │
                         │ Authentication       │
                         │ Attention Engine     │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
          ┌──────────────────┐             ┌──────────────────┐
          │     MongoDB      │             │     Inngest      │
          │                  │             │                  │
          │ Watchlists       │             │ Scheduled Jobs   │
          │ Market Snapshots │             │ Event Jobs       │
          │ User State       │             │ Metrics Jobs     │
          │ Analytics        │             │ Stock Updates    │
          └────────┬─────────┘             └────────┬─────────┘
                   │                                │
                   │                                ▼
                   │                     ┌────────────────────┐
                   │                     │ External Data APIs │
                   │                     │                    │
                   │                     │ Finnhub            │
                   │                     │ Twelve Data        │
                   │                     └────────────────────┘
                   │
                   ▼
          ┌──────────────────────┐
          │ Attention Engine     │
          │ Current State        │
          │        vs            │
          │ Last Seen State      │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Personalized Feed   │
          │ Scores + Reasons    │
          │ News + Metrics      │
          └──────────────────────┘
```

------------------------------------------------------------------------

# 5. How the Backend Actually Works

## Step 1 --- Authentication

The user signs in through **Better Auth**.

The authenticated user ID is used to isolate their watchlist and
last-seen state.

``` text
User
 ↓
Better Auth
 ↓
Authenticated Session
 ↓
User-specific data
```

## Step 2 --- Add a Stock

``` text
Browser
   ↓
POST /api/watchlist
   ↓
Validate ticker
   ↓
MongoDB
   ↓
Watchlist entry
```

A stock-specific background update can then be triggered.

## Step 3 --- Collect Market Data

``` text
Unique Tickers
      ↓
Inngest
      ↓
Finnhub / Twelve Data
      ↓
Market Data
      ↓
Technical Calculations
      ↓
MongoDB Market Snapshot
```

## Step 4 --- Calculate Analytics

Historical OHLCV data is processed into:

``` text
Price
Volume
Volatility
ATR
SMA50
SMA200
RSI14
52-week High / Low
Opening Gap
```

News and corporate-event information is also stored with the snapshot.

## Step 5 --- Generate Personalized Attention

When the dashboard is requested:

``` text
User Watchlist
      +
Shared Market Snapshot
      +
User Last-Seen State
      ↓
Attention Engine
      ↓
Attention Score
      ↓
Reasons + News + Metrics
```

Two users watching the same stock can receive different "since you last
checked" results because their baselines can differ.

------------------------------------------------------------------------

# 6. Inngest --- Why It Is Used

**Inngest** is the background job and event-processing layer.

It moves expensive work out of synchronous user requests.

### It handles

-   Scheduled market snapshot updates
-   Technical metric calculations
-   News processing
-   Stock-specific update events
-   Background workflows
-   Retryable processing

### Why it matters for scale

Without background processing:

``` text
User Request
 → External APIs
 → Historical Data
 → Indicators
 → News
 → Response
```

With Inngest:

``` text
User Request → MongoDB → Fast Response

Inngest → APIs → Calculate → Persist
```

This prevents external API latency and heavy analytics from becoming the
bottleneck for every dashboard request.

------------------------------------------------------------------------

# 7. Finnhub --- Why It Is Used

**Finnhub** provides real market and company information.

Used for:

-   Stock quotes
-   Stock search
-   Company news
-   Earnings information

API access is kept server-side.

### Scaling benefit

Instead of allowing every browser to call Finnhub:

``` text
Finnhub
   ↓
Background processing
   ↓
MongoDB Market Snapshot
   ↓
Many users
```

This centralizes API traffic and reduces redundant requests.

------------------------------------------------------------------------

# 8. Twelve Data --- Why It Is Used

**Twelve Data** supplies historical OHLCV data used by the analytics
engine.

It supports calculations such as:

-   Historical volatility
-   Moving averages
-   RSI
-   ATR
-   52-week levels
-   Volume averages

The data is processed in the background and persisted instead of
recalculating everything during each user request.

------------------------------------------------------------------------

# 9. MongoDB Atlas --- Why It Is Used

MongoDB is the persistent state layer.

### `watchlists`

Stores user-specific watched stocks:

``` text
userId
ticker
position
createdAt
```

### `market_snapshots`

Stores shared ticker-level market information:

``` text
ticker
price
analytics
news
corporateEvents
chart
updatedAt
```

### `user_stock_states`

Stores each user's last-seen baseline:

``` text
userId
ticker
lastSeenPrice
lastSeenAt
lastSeen indicators
lastSeenNewsAt
lastSeenSentiment
lastSeenCorporateEvents
```

The separation between market snapshots and user state prevents
duplication of expensive market data.

------------------------------------------------------------------------

# 10. Better Auth --- Why It Is Used

**Better Auth** provides authentication and sessions.

It keeps:

-   Watchlists user-specific
-   Last-seen state user-specific
-   Protected API operations authenticated
-   User data isolated by authenticated user ID

This keeps authentication concerns centralized while allowing the
backend to safely personalize the Attention Score.

------------------------------------------------------------------------

# 11. Next.js --- Why It Is Used

**Next.js App Router** provides both the frontend and backend
application layer.

### Frontend

``` text
React
 ↓
Next.js
 ↓
Dashboard
Stock Detail
Watchlist
Calculator
Attention UI
```

### Backend

``` text
Next.js API Routes
 ↓
Authentication
 ↓
MongoDB
 ↓
Server-side business logic
```

This keeps market API credentials and sensitive business logic on the
server.

------------------------------------------------------------------------

# 12. Multiple User Requests --- How They Are Handled

Imagine:

``` text
10,000 users
2,000 users watching AAPL
```

The application should not create:

``` text
2,000 AAPL requests → Finnhub
```

Instead:

``` text
                    AAPL
                     │
                     ▼
             Shared Snapshot
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
      User A        User B       User N
        │            │            │
        ▼            ▼            ▼
   Last-seen       Last-seen    Last-seen
    baseline        baseline     baseline
        │            │            │
        └────────────┼────────────┘
                     ▼
            Personalized Score
```

### Expensive work

Runs around unique stocks:

``` text
Fetch market data
Fetch historical data
Calculate indicators
Process news
Store snapshot
```

### Lightweight work

Runs per user:

``` text
Read watchlist
Read snapshot
Read last-seen state
Calculate deltas
Return response
```

This means the expensive external workload is not directly proportional
to the number of users.

------------------------------------------------------------------------

# 13. Database Indexing

The primary access patterns are indexed.

``` js
db.watchlists.createIndex(
  { userId: 1, ticker: 1 },
  { unique: true }
)

db.watchlists.createIndex(
  { userId: 1, position: 1 }
)

db.market_snapshots.createIndex(
  { ticker: 1 },
  { unique: true }
)

db.user_stock_states.createIndex(
  { userId: 1, ticker: 1 },
  { unique: true }
)
```

This optimizes:

``` text
User → Watchlist
Ticker → Market Snapshot
User + Ticker → Last Seen State
```

------------------------------------------------------------------------

# 14. Request Path vs Background Path

## Fast User Request Path

``` text
Browser
   ↓
Next.js API
   ↓
Better Auth
   ↓
MongoDB
   ↓
Cached Market Snapshot
   ↓
Lightweight Attention Calculation
   ↓
Response
```

## Heavy Background Path

``` text
Inngest
   ↓
External APIs
   ↓
Historical Data
   ↓
Technical Analytics
   ↓
News Processing
   ↓
MongoDB
```

This separation is one of the main performance and scalability decisions
in the system.

------------------------------------------------------------------------

# 15. Tech Stack

  ------------------------------------------------------------------------
  Technology              Role                    Why it was chosen
  ----------------------- ----------------------- ------------------------
  **Next.js**             Frontend + backend      Full-stack architecture
                                                  with server-side APIs

  **TypeScript**          Application language    Type safety across UI,
                                                  APIs, models and
                                                  analytics

  **Tailwind CSS**        Styling                 Fast, consistent
                                                  responsive UI

  **shadcn/ui**           Components              Reusable accessible
                                                  dashboard components

  **Better Auth**         Authentication          Secure sessions and user
                                                  isolation

  **MongoDB Atlas**       Database                Flexible persistence for
                                                  shared and user-specific
                                                  state

  **Inngest**             Background jobs         Scheduled/event-driven
                                                  processing without
                                                  blocking requests

  **Finnhub**             Market/news data        Real quotes, search,
                                                  company news and
                                                  earnings

  **Twelve Data**         Historical data         OHLCV history for
                                                  technical analytics

  **Vercel**              Deployment              Managed Next.js
                                                  production hosting

  **Inngest Cloud**       Production jobs         Managed background
                                                  execution
  ------------------------------------------------------------------------

------------------------------------------------------------------------

# 16. Security

The application follows a server-first architecture.

-   API keys are stored in environment variables.
-   Market APIs are called from the server.
-   Authentication is handled by Better Auth.
-   Users access only their own watchlists and state.
-   Third-party credentials are not exposed to the browser.
-   Last-seen state is persisted server-side.

------------------------------------------------------------------------

# 18. How It Helps Groww Users

StalkTheStock is designed to make stock tracking **faster, clearer and
more educational**.

### Faster tracking

Users do not need to open every stock individually.

### Better prioritization

The Attention Score shows which stocks deserve attention first.

### Easier learning

Technical signals are converted into understandable explanations.

### Better context

Users see what changed **since their last visit**, rather than only
seeing generic daily movement.

### Less information overload

Instead of treating every metric equally, the system prioritizes
meaningful changes.

------------------------------------------------------------------------

# 19. Why It Is Better Than Existing Static Watchlists

### Existing approach

``` text
AAPL   $219
NVDA   $182
MSFT   $505
TSLA   $345
```

The user still has to determine:

> What changed?

> Is it important?

> Why?

> Which stock should I open first?

### StalkTheStock

``` text
🔥 NVDA — 91 Attention
↑ 6.2% • Volume 3.4× • 52W High

⚡ AAPL — 67 Attention
↑ 3.1% • 5 new headlines

🟢 MSFT — 18 Attention
No significant changes
```

The product turns a **static watchlist into a personalized intelligence
layer**.

------------------------------------------------------------------------

# 20. Engineering Depth & Scalability

The main engineering value is not simply displaying stock prices.

The system combines:

``` text
Real Market Data
       +
Historical Analytics
       +
Background Processing
       +
Shared Market State
       +
Per-User State
       +
Event-Driven Updates
       +
Server-Side APIs
       +
Personalized Scoring
       +
Explainable Results
```

### Key scalability principle

> **The number of users should not directly determine the number of
> expensive market-data API calls.**

Market data is shared at the ticker level.

Personalization is performed at the user level.

Heavy processing is handled asynchronously.

User requests primarily read from persisted data.

That gives the system a much stronger foundation for scaling than a
client-driven dashboard that calls market APIs independently for every
user.

------------------------------------------------------------------------

# 21. Running Locally

## Requirements

-   Node.js 18+
-   MongoDB Atlas account
-   Finnhub API key
-   Twelve Data API key

## Clone

``` bash
git clone https://github.com/Harshitha40/StalkTheStock.git
cd StalkTheStock
```

## Install

``` bash
npm install
```

## Create `.env.local`

``` env
MONGODB_URI=your_mongodb_atlas_uri
MONGODB_DB=stock_attention

BETTER_AUTH_SECRET=your_secret
BETTER_AUTH_URL=http://localhost:3000

FINNHUB_API_KEY=your_finnhub_key
TWELVE_DATA_API_KEY=your_twelve_data_key

INNGEST_DEV=1
```

## Start Next.js

Terminal 1:

``` bash
npm run dev
```

## Start Inngest

Terminal 2:

``` bash
npx inngest-cli@latest dev
```

## Open

Application:

``` text
http://localhost:3000
```

Inngest dashboard:

``` text
http://localhost:8288
```

------------------------------------------------------------------------

# 22. Production Deployment

Production uses managed infrastructure:

``` text
                    PRODUCTION
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
        ▼                ▼                 ▼
     Vercel          Inngest Cloud    MongoDB Atlas
        │                │                 │
        └────────────────┼─────────────────┘
                         │
                         ▼
                External Market APIs
                  ┌──────────────┐
                  │   Finnhub    │
                  │ Twelve Data  │
                  └──────────────┘
```

The local Inngest CLI is not required in production.

------------------------------------------------------------------------

# 23. Future Improvements

-   Personalized alerts
-   Portfolio-level Attention Score
-   More advanced AI-generated explanations
-   Additional technical indicators
-   Mobile-first experience
-   Multi-market support
-   Personalized investing education
-   Smarter event prioritization

------------------------------------------------------------------------

# 🎯 Final Pitch

> **StalkTheStock transforms a static stock watchlist into a
> personalized market intelligence system --- showing users what
> changed, why it matters, and what deserves their attention.**

### Built with

**Next.js · TypeScript · MongoDB Atlas · Inngest · Finnhub · Twelve Data
· Better Auth · Tailwind CSS · shadcn/ui**

------------------------------------------------------------------------

## 🚀 Built for the Groww Hackathon

**Faster tracking. Better context. Smarter watchlists.**
