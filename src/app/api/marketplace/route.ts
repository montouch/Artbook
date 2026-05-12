import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const sellerId = searchParams.get("sellerId");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (sellerId) where.sellerId = sellerId;

  const products = await prisma.product.findMany({
    where,
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          image: true,
          profileColor: true,
          verified: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, price, type, image, sellerId } = body;

  if (!title || !price || !type || !sellerId) {
    return NextResponse.json(
      { error: "Title, price, type, and sellerId are required" },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: { title, description, price, type, image, sellerId },
  });

  return NextResponse.json(product, { status: 201 });
}
