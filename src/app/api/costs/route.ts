import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costRecords, serviceAccounts, services, entities, paymentCards } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const accountId = searchParams.get("accountId");
  const entityId = searchParams.get("entityId");

  const conditions = [];
  if (year) conditions.push(eq(costRecords.year, parseInt(year)));
  if (month) conditions.push(eq(costRecords.month, parseInt(month)));
  if (accountId) conditions.push(eq(costRecords.accountId, parseInt(accountId)));
  if (entityId) conditions.push(eq(serviceAccounts.entityId, parseInt(entityId)));

  const results = await db
    .select({
      id: costRecords.id,
      accountId: costRecords.accountId,
      accountLabel: serviceAccounts.label,
      accountColor: serviceAccounts.color,
      serviceName: services.name,
      serviceSlug: services.slug,
      entityName: entities.name,
      year: costRecords.year,
      month: costRecords.month,
      amount: costRecords.amount,
      currency: costRecords.currency,
      source: costRecords.source,
      paymentStatus: costRecords.paymentStatus,
      cardId: costRecords.cardId,
      cardLabel: paymentCards.label,
      cardLast4: paymentCards.last4,
      notes: costRecords.notes,
      fetcherSlug: serviceAccounts.fetcherSlug,
      hasAutoFetch: services.hasAutoFetch,
      createdAt: costRecords.createdAt,
      updatedAt: costRecords.updatedAt,
    })
    .from(costRecords)
    .innerJoin(serviceAccounts, eq(costRecords.accountId, serviceAccounts.id))
    .innerJoin(services, eq(serviceAccounts.serviceId, services.id))
    .leftJoin(entities, eq(serviceAccounts.entityId, entities.id))
    .leftJoin(paymentCards, eq(costRecords.cardId, paymentCards.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(costRecords.year, costRecords.month, serviceAccounts.label);

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { accountId, year, month, amount, notes, source, paymentStatus, cardId } = body;

  if (!accountId || !year || !month || amount === undefined) {
    return NextResponse.json(
      { error: "accountId, year, month, and amount are required" },
      { status: 400 }
    );
  }

  const roundedAmount = Math.round(Number(amount) * 100) / 100;

  const result = await db
    .insert(costRecords)
    .values({
      accountId,
      year,
      month,
      amount: roundedAmount,
      notes,
      source: source || "manual",
      paymentStatus: paymentStatus || "pending",
      cardId: cardId || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [costRecords.accountId, costRecords.year, costRecords.month],
      set: {
        amount: sql`excluded.amount`,
        notes: sql`excluded.notes`,
        source: sql`excluded.source`,
        paymentStatus: sql`excluded.payment_status`,
        cardId: sql`excluded.card_id`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
