import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const roles = await prisma.role.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });

    // Count users for each role
    const userRoleCounts = await prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
    });

    const countMap: Record<string, number> = {};
    userRoleCounts.forEach((rc) => {
      countMap[rc.role] = rc._count.id;
    });

    const rolesWithCounts = roles.map((r) => ({
      ...r,
      userCount: countMap[r.name] || 0,
      permissionsList: (() => {
        try {
          return JSON.parse(r.permissions);
        } catch {
          return [];
        }
      })(),
    }));

    return NextResponse.json(rolesWithCounts);
  } catch (err: any) {
    console.error("GET /api/roles error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUserRole = (session.user as any).role;
  if (!["ADMIN", "MANAGER"].includes(currentUserRole)) {
    return NextResponse.json({ error: "Forbidden: Only Admin or Manager can create roles" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, displayName, description, color, permissions } = body;

    if (!displayName?.trim()) {
      return NextResponse.json({ error: "Role display name is required" }, { status: 400 });
    }

    // Auto-generate code name if not provided
    const cleanName = (name || displayName)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_");

    if (!cleanName) {
      return NextResponse.json({ error: "Valid role identifier is required" }, { status: 400 });
    }

    const existing = await prisma.role.findUnique({ where: { name: cleanName } });
    if (existing) {
      return NextResponse.json({ error: `Role '${cleanName}' already exists` }, { status: 400 });
    }

    const newRole = await prisma.role.create({
      data: {
        name: cleanName,
        displayName: displayName.trim(),
        description: description?.trim() || null,
        color: color || "#3b82f6",
        permissions: Array.isArray(permissions) ? JSON.stringify(permissions) : (permissions || "[]"),
        isSystem: false,
      },
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/roles error:", err);
    return NextResponse.json({ error: err.message || "Failed to create role" }, { status: 500 });
  }
}
