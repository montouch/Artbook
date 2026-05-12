import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const genre = searchParams.get("genre");
  const location = searchParams.get("location");
  const mood = searchParams.get("mood");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const contentWhere: Record<string, unknown> = {};
  if (genre) contentWhere.genre = genre;
  if (mood) contentWhere.mood = mood;
  if (location) {
    contentWhere.artist = { location: { contains: location } };
  }

  const [content, artists] = await Promise.all([
    prisma.content.findMany({
      where: contentWhere,
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true,
            profileColor: true,
            verified: true,
            location: true,
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { plays: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.findMany({
      where: {
        accountType: { in: ["ARTIST", "STREAMER"] },
        ...(location ? { location: { contains: location } } : {}),
      },
      select: {
        id: true,
        name: true,
        image: true,
        profileColor: true,
        verified: true,
        location: true,
        accountType: true,
        bio: true,
      },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    content: content.map((c) => ({
      ...c,
      likes: c._count.likes,
      comments: c._count.comments,
    })),
    artists,
    page,
  });
}
