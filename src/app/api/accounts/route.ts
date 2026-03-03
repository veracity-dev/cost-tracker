import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceAccounts, services, entities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const results = await db
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

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const { serviceId, entityId, label, fetcherSlug, color } = await request.json();

  if (!serviceId || !label) {
    return NextResponse.json(
      { error: "serviceId and label are required" },
      { status: 400 }
    );
  }

  const result = await db
    .insert(serviceAccounts)
    .values({
      serviceId,
      entityId: entityId || null,
      label,
      fetcherSlug: fetcherSlug || null,
      color: color || "#6366f1",
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
