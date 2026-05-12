import { NextResponse } from "next/server";
import { getDiscoveryFeed, matchesLocation } from "@/lib/discovery";
import type { AccountType } from "@/lib/data";

const accountTypes = ["artist", "streamer", "creator"] satisfies AccountType[];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const location = searchParams.get("location") ?? undefined;
  const genres = searchParams.getAll("genre");
  const interests = searchParams.getAll("interest");
  const requestedTypes = searchParams
    .getAll("type")
    .filter((type): type is AccountType => accountTypes.includes(type as AccountType));
  const feed = getDiscoveryFeed({
    location,
    genres,
    interests,
    accountTypes: requestedTypes.length ? requestedTypes : undefined
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    priorities: ["local creators", "niche interests", "genre affinity", "live moments"],
    feed: location ? feed.filter((creator) => matchesLocation(creator, location)) : feed
  });
}
