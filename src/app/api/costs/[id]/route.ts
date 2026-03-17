import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costRecords, serviceAccounts, services, entities } from "@/lib/db/schema";
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

  // Sync update to bill-tracker
  const record = result[0];
  await syncToBillTracker(record.accountId, record.year, record.month, record.amount, record.notes || undefined, record.paymentStatus || undefined);

  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get record details before deleting (for sync)
  const existing = await db
    .select()
    .from(costRecords)
    .where(eq(costRecords.id, parseInt(id)));

  const result = await db
    .delete(costRecords)
    .where(eq(costRecords.id, parseInt(id)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Sync delete to bill-tracker
  if (existing[0]) {
    const record = existing[0];
    await syncToBillTracker(record.accountId, record.year, record.month, record.amount, undefined, undefined, "delete");
  }

  return NextResponse.json({ success: true });
}

async function syncToBillTracker(
  accountId: number,
  year: number,
  month: number,
  amount: number,
  notes?: string,
  paymentStatus?: string,
  action?: string
) {
  const billTrackerUrl = process.env.BILL_TRACKER_URL;
  const webhookSecret = process.env.BILL_TRACKER_WEBHOOK_SECRET;
  if (!billTrackerUrl) return;

  try {
    const account = await db
      .select({
        serviceName: services.name,
        entityName: entities.name,
      })
      .from(serviceAccounts)
      .innerJoin(services, eq(serviceAccounts.serviceId, services.id))
      .leftJoin(entities, eq(serviceAccounts.entityId, entities.id))
      .where(eq(serviceAccounts.id, accountId))
      .then((rows) => rows[0]);

    if (!account) return;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (webhookSecret) headers["Authorization"] = `Bearer ${webhookSecret}`;

    await fetch(`${billTrackerUrl}/api/webhook/cost-sync`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        serviceName: account.serviceName,
        entityName: account.entityName,
        year,
        month,
        amount,
        paymentStatus: paymentStatus || "pending",
        notes,
        action: action || "upsert",
      }),
    });
  } catch (err) {
    console.error("Failed to sync to bill-tracker:", err);
  }
}
