import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist";

export async function GET() {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const watchlist =
      await getWatchlist(user.id);

    return NextResponse.json(
      watchlist
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to load watchlist",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const ticker = String(
      body?.ticker ?? ""
    )
      .trim()
      .toUpperCase();

    if (!ticker) {
      return NextResponse.json(
        {
          error:
            "Ticker is required",
        },
        { status: 400 }
      );
    }

    if (
      !/^[A-Z0-9.\-:]+$/.test(
        ticker
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid ticker",
        },
        { status: 400 }
      );
    }

    const stock =
      await addToWatchlist(
        user.id,
        ticker
      );

    return NextResponse.json(
      stock,
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to add stock",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ticker =
      request.nextUrl.searchParams
        .get("ticker")
        ?.trim()
        .toUpperCase();

    if (!ticker) {
      return NextResponse.json(
        {
          error:
            "Ticker is required",
        },
        { status: 400 }
      );
    }

    await removeFromWatchlist(
      user.id,
      ticker
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to remove stock",
      },
      { status: 500 }
    );
  }
}