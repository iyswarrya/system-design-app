import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken, COOKIE_NAME } from "@/lib/auth/jwt";

export async function POST(req: Request) {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const decoded = await verifyAuthToken(token).catch(() => null);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const topicName = (body?.topicName ?? "").toString().trim();
  const summary = (body?.summary ?? "").toString();

  if (!topicName || !summary) {
    return NextResponse.json(
      { error: "Missing topicName or summary." },
      { status: 400 }
    );
  }

  const attempt = await prisma.topicAttempt.create({
    data: {
      userId: decoded.userId,
      topicName,
      summary,
    },
    select: { id: true, createdAt: true, topicName: true },
  });

  return NextResponse.json({ ok: true, attempt });
}

