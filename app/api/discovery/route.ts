import { NextResponse } from "next/server";
import { getDiscoveryFeed } from "@/lib/discovery";

const sampleDataGeneratedAt = "2026-01-01T00:00:00.000Z";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const location = searchParams.get("location") ?? undefined;
  const genres = searchParams.getAll("genre");
  const interests = searchParams.getAll("interest");

  return NextResponse.json({
    generatedAt: sampleDataGeneratedAt,
    priorities: ["local creators", "niche interests", "genre affinity", "live moments"],
    feed: getDiscoveryFeed({ location, genres, interests })
  });
}
