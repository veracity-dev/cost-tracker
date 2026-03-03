import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entities } from "@/lib/db/schema";

export async function GET() {
  const all = await db.select().from(entities).orderBy(entities.name);
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  const { name, color } = await request.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

  const result = await db
    .insert(entities)
    .values({ name, slug, color: color || "#6366f1" })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
