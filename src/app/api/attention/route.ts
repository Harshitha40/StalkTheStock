import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth-server";
import { getAttentionForUser } from "@/lib/attention";

export async function GET() {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const items =
      await getAttentionForUser(
        user.id
      );

    return NextResponse.json(
      items
    );
  } catch (error) {
    console.error(
      "Attention API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate attention",
      },
      {
        status: 500,
      }
    );
  }
}