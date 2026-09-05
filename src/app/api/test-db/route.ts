import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();

    await db.command({
      ping: 1,
    });

    return NextResponse.json({
      success: true,
      message: "MongoDB connected successfully",
      database:
        process.env.MONGODB_DB ||
        "stock_attention",
    });
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}