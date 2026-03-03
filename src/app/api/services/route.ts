import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";

export async function GET() {
  const allServices = await db.select().from(services).orderBy(services.name);
  return NextResponse.json(allServices);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, slug, category, hasAutoFetch } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  const result = await db
    .insert(services)
    .values({ name, slug, category, hasAutoFetch: hasAutoFetch ?? false })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
