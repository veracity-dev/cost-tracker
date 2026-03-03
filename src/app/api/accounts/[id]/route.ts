import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updateData: Record<string, unknown> = {};
  if (body.label !== undefined) updateData.label = body.label;
  if (body.entityId !== undefined) updateData.entityId = body.entityId || null;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.fetcherSlug !== undefined) updateData.fetcherSlug = body.fetcherSlug || null;

  const result = await db
    .update(serviceAccounts)
    .set(updateData)
    .where(eq(serviceAccounts.id, parseInt(id)))
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
    .delete(serviceAccounts)
    .where(eq(serviceAccounts.id, parseInt(id)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
