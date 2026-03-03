import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) {
    updateData.name = body.name;
    updateData.slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  }
  if (body.color !== undefined) updateData.color = body.color;

  const result = await db
    .update(entities)
    .set(updateData)
    .where(eq(entities.id, parseInt(id)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await db
    .delete(entities)
    .where(eq(entities.id, parseInt(id)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
