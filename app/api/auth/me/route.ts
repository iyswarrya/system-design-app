import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken, COOKIE_NAME } from "@/lib/auth/jwt";

export async function GET() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ user: null });

  const decoded = await verifyAuthToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, createdAt: true },
  });

  return NextResponse.json({ user: user ?? null });
}

