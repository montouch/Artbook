import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      sender: {
        select: { id: true, name: true, image: true, profileColor: true, verified: true },
      },
      receiver: {
        select: { id: true, name: true, image: true, profileColor: true, verified: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { content, senderId, receiverId } = body;

  if (!content || !senderId || !receiverId) {
    return NextResponse.json(
      { error: "Content, senderId, and receiverId are required" },
      { status: 400 }
    );
  }

  const message = await prisma.message.create({
    data: { content, senderId, receiverId },
    include: {
      sender: {
        select: { id: true, name: true, image: true, profileColor: true },
      },
    },
  });

  return NextResponse.json(message, { status: 201 });
}
