import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentCards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { label, last4, brand, isDefault } = await request.json();

  if (isDefault) {
    await db.update(paymentCards).set({ isDefault: false });
  }

  const result = await db
    .update(paymentCards)
    .set({ label, last4, brand, isDefault })
    .where(eq(paymentCards.id, parseInt(id)))
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

  await db.delete(paymentCards).where(eq(paymentCards.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
