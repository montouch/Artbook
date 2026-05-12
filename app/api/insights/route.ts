import { NextResponse } from "next/server";
import { getCreatorIntelligence } from "@/lib/insights";

const accountTypes = new Set(["artist", "streamer"]);

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountType = searchParams.get("accountType");

  if (accountType && !accountTypes.has(accountType)) {
    return NextResponse.json(
      { error: "accountType must be artist or streamer" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    insights: getCreatorIntelligence(accountType as "artist" | "streamer" | undefined)
  });
}
