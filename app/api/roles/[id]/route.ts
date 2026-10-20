import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUserRole = (session.user as any).role;
  if (!["ADMIN", "MANAGER"].includes(currentUserRole)) {
    return NextResponse.json({ error: "Forbidden: Only Admin or Manager can modify roles" }, { status: 403 });
  }

  try {
    const role = await prisma.role.findUnique({ where: { id: params.id } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const body = await req.json();
    const { displayName, description, color, permissions } = body;

    const data: any = {};
    if (displayName !== undefined) data.displayName = displayName.trim();
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (color !== undefined) data.color = color;
    if (permissions !== undefined) {
      data.permissions = Array.isArray(permissions) ? JSON.stringify(permissions) : String(permissions);
    }

    const updated = await prisma.role.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT /api/roles/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUserRole = (session.user as any).role;
  if (currentUserRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Only Admin can delete roles" }, { status: 403 });
  }

  try {
    const role = await prisma.role.findUnique({ where: { id: params.id } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    if (role.isSystem) {
      return NextResponse.json({ error: "Default system roles (ADMIN, MANAGER, TECHNICIAN, etc.) cannot be deleted" }, { status: 400 });
    }

    // Check if any user is assigned to this role
    const assignedUsersCount = await prisma.user.count({ where: { role: role.name } });
    if (assignedUsersCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete role '${role.displayName}'. There are ${assignedUsersCount} active user(s) assigned to this role. Reassign them first.` },
        { status: 400 }
      );
    }

    await prisma.role.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: `Role '${role.displayName}' deleted successfully.` });
  } catch (err: any) {
    console.error("DELETE /api/roles/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete role" }, { status: 500 });
  }
}
