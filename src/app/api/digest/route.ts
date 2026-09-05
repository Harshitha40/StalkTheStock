import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { getAttentionForUser } from "@/lib/attention";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const results = await getAttentionForUser(user.id);

    return NextResponse.json({
      generatedAt: new Date(),
      results,
    });
  } catch (error) {
    console.error("Digest API error:", error);

    return NextResponse.json(
      { error: "Failed to load digest" },
      { status: 500 }
    );
  }
}