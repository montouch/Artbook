import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const genre = searchParams.get("genre");
  const mood = searchParams.get("mood");
  const type = searchParams.get("type");
  const artistId = searchParams.get("artistId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};
  if (genre) where.genre = genre;
  if (mood) where.mood = mood;
  if (type) where.type = type;
  if (artistId) where.artistId = artistId;

  const [content, total] = await Promise.all([
    prisma.content.findMany({
      where,
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
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.content.count({ where }),
  ]);

  return NextResponse.json({
    items: content.map((c) => ({
      ...c,
      comments: c._count.comments,
      likes: c._count.likes,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, type, url, genre, niche, mood, isPremium, artistId } = body;

  if (!title || !type || !url || !artistId) {
    return NextResponse.json(
      { error: "Title, type, url, and artistId are required" },
      { status: 400 }
    );
  }

  const content = await prisma.content.create({
    data: {
      title,
      description,
      type,
      url,
      genre,
      niche,
      mood,
      isPremium: isPremium || false,
      artistId,
    },
    include: {
      artist: {
        select: { id: true, name: true, image: true, profileColor: true, verified: true },
      },
    },
  });

  return NextResponse.json(content, { status: 201 });
}
