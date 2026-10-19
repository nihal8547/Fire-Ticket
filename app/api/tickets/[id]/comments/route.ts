import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, isInternal } = await req.json();
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const comment = await prisma.ticketComment.create({
    data: {
      content,
      isInternal: isInternal || false,
      ticketId: params.id,
      userId: (session.user as any).id,
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
