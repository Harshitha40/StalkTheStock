import { serve } from "inngest/next";

import { inngest } from "./client";

import { updateMarketSnapshots } from "./functions/update-market-snapshots";
import { updateSingleStock } from "./functions/update-single-stock";

export const {
  GET,
  POST,
  PUT,
} = serve({
  client: inngest,

  functions: [
    updateMarketSnapshots,
    updateSingleStock,
  ],
});