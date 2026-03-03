import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentCards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const cards = await db.select().from(paymentCards).orderBy(paymentCards.label);
  return NextResponse.json(cards);
}

export async function POST(request: Request) {
  const { label, last4, brand, isDefault } = await request.json();

  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  // If setting as default, unset other defaults first
  if (isDefault) {
    await db.update(paymentCards).set({ isDefault: false });
  }

  const result = await db
    .insert(paymentCards)
    .values({ label, last4, brand, isDefault: isDefault ?? false })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
