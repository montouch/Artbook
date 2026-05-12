import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isLive = searchParams.get("isLive");
  const isPremium = searchParams.get("isPremium");

  const where: Record<string, unknown> = {};
  if (isLive !== null) where.isLive = isLive === "true";
  if (isPremium !== null) where.isPremium = isPremium === "true";

  const streams = await prisma.stream.findMany({
    where,
    include: {
      streamer: {
        select: {
          id: true,
          name: true,
          image: true,
          profileColor: true,
          verified: true,
        },
      },
    },
    orderBy: [{ isLive: "desc" }, { viewerCount: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json(streams);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, isPremium, scheduledAt, streamerId } = body;

  if (!title || !streamerId) {
    return NextResponse.json({ error: "Title and streamerId are required" }, { status: 400 });
  }

  const stream = await prisma.stream.create({
    data: {
      title,
      description,
      isPremium: isPremium || false,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      streamerId,
    },
  });

  return NextResponse.json(stream, { status: 201 });
}
