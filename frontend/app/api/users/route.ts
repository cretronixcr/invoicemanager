import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errMsg } from "@/lib/utils";
import { requireApiSession } from "@/lib/dal";

export async function GET() {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      success: true,
      users,
      currentUserId: session.userId,
    });
  } catch (error) {
    const msg = error instanceof Error ? errMsg(error) : "Failed to load users";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
