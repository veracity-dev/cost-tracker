import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costRecords, serviceAccounts, services, entities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const entityId = searchParams.get("entityId");

  // Get all accounts with service + entity info
  const allAccounts = await db
    .select({
      id: serviceAccounts.id,
      serviceId: serviceAccounts.serviceId,
      serviceName: services.name,
      serviceSlug: services.slug,
      entityId: serviceAccounts.entityId,
      entityName: entities.name,
      label: serviceAccounts.label,
      fetcherSlug: serviceAccounts.fetcherSlug,
      color: serviceAccounts.color,
      hasAutoFetch: services.hasAutoFetch,
      createdAt: serviceAccounts.createdAt,
    })
    .from(serviceAccounts)
    .innerJoin(services, eq(serviceAccounts.serviceId, services.id))
    .leftJoin(entities, eq(serviceAccounts.entityId, entities.id))
    .orderBy(serviceAccounts.label);

  const allEntities = await db.select().from(entities).orderBy(entities.name);

  // Build cost query conditions
  const costConditions = [eq(costRecords.year, year)];
  if (entityId) {
    costConditions.push(eq(serviceAccounts.entityId, parseInt(entityId)));
  }

  const costs = await db
    .select({
      accountId: costRecords.accountId,
      month: costRecords.month,
      amount: costRecords.amount,
      source: costRecords.source,
      paymentStatus: costRecords.paymentStatus,
    })
    .from(costRecords)
    .innerJoin(serviceAccounts, eq(costRecords.accountId, serviceAccounts.id))
    .where(and(...costConditions));

  // Build pivot: account -> month -> data
  const costMap: Record<number, Record<number, { amount: number; source: string; paymentStatus: string }>> = {};
  for (const cost of costs) {
    if (!costMap[cost.accountId]) costMap[cost.accountId] = {};
    costMap[cost.accountId][cost.month] = {
      amount: cost.amount,
      source: cost.source || "manual",
      paymentStatus: cost.paymentStatus || "pending",
    };
  }

  const currentMonth = new Date().getMonth() + 1;
  let currentMonthTotal = 0;
  let yearTotal = 0;
  let paidTotal = 0;
  let pendingTotal = 0;
  let overdueTotal = 0;

  for (const cost of costs) {
    yearTotal += cost.amount;
    if (cost.month === currentMonth) {
      currentMonthTotal += cost.amount;
    }
    switch (cost.paymentStatus) {
      case "paid":
        paidTotal += cost.amount;
        break;
      case "overdue":
        overdueTotal += cost.amount;
        break;
      default:
        pendingTotal += cost.amount;
        break;
    }
  }

  const prevMonthTotal = costs
    .filter((c) => c.month === (currentMonth === 1 ? 12 : currentMonth - 1))
    .reduce((sum, c) => sum + c.amount, 0);

  const monthOverMonthChange =
    prevMonthTotal > 0
      ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
      : 0;

  return NextResponse.json({
    year,
    accounts: allAccounts,
    entities: allEntities,
    costMap,
    summary: {
      currentMonthTotal,
      yearTotal,
      monthOverMonthChange,
      currentMonth,
      paidTotal,
      pendingTotal,
      overdueTotal,
    },
  });
}
