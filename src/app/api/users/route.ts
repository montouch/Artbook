import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountType = searchParams.get("accountType");
  const location = searchParams.get("location");

  const where: Record<string, unknown> = {};
  if (accountType) where.accountType = accountType;
  if (location) where.location = { contains: location };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      location: true,
      accountType: true,
      verified: true,
      profileColor: true,
      profileLayout: true,
      coverImage: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password, accountType, location, bio } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      accountType: accountType || "FAN",
      location,
      bio,
    },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    accountType: user.accountType,
  }, { status: 201 });
}
