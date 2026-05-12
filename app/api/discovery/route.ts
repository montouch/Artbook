import { NextResponse } from "next/server";
import { getDiscoveryFeed } from "@/lib/discovery";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const location = searchParams.get("location") ?? undefined;
  const genres = searchParams.getAll("genre");
  const interests = searchParams.getAll("interest");
  const feelings = [
    ...searchParams.getAll("feeling"),
    ...searchParams.getAll("mood")
  ];

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    priorities: [
      "local creators",
      "niche interests",
      "genre affinity",
      "AI feeling search",
      "live moments"
    ],
    aiFeelingSearch: {
      enabled: true,
      queryParams: ["feeling", "mood"],
      examples: ["calm focus", "hype party", "soulful healing", "experimental visuals"]
    },
    feed: getDiscoveryFeed({ location, genres, interests, feelings })
  });
}
