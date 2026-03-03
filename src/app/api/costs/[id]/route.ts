import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { amount, notes, paymentStatus, cardId } = body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (amount !== undefined) updateData.amount = amount;
  if (notes !== undefined) updateData.notes = notes;
  if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
  if (cardId !== undefined) updateData.cardId = cardId;

  const result = await db
    .update(costRecords)
    .set(updateData)
    .where(eq(costRecords.id, parseInt(id)))
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
    .delete(costRecords)
    .where(eq(costRecords.id, parseInt(id)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
