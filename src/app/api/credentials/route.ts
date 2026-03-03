import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiCredentials, serviceAccounts, services } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET = process.env.AUTH_SECRET || "fallback-secret-change-me-now!!";

function getEncryptionKey(): Buffer {
  return crypto.scryptSync(SECRET, "salt", 32);
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export async function GET() {
  const allCreds = await db
    .select({
      accountId: apiCredentials.accountId,
      accountLabel: serviceAccounts.label,
      serviceName: services.name,
      serviceSlug: services.slug,
      hasCredentials: apiCredentials.id,
    })
    .from(apiCredentials)
    .innerJoin(serviceAccounts, eq(apiCredentials.accountId, serviceAccounts.id))
    .innerJoin(services, eq(serviceAccounts.serviceId, services.id));

  return NextResponse.json(
    allCreds.map((c) => ({
      accountId: c.accountId,
      accountLabel: c.accountLabel,
      serviceName: c.serviceName,
      serviceSlug: c.serviceSlug,
      configured: true,
    }))
  );
}

export async function POST(request: Request) {
  const { accountId, credentials } = await request.json();

  if (!accountId || !credentials) {
    return NextResponse.json(
      { error: "accountId and credentials are required" },
      { status: 400 }
    );
  }

  const encrypted = encrypt(JSON.stringify(credentials));

  await db
    .insert(apiCredentials)
    .values({
      accountId,
      credentials: encrypted,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: apiCredentials.accountId,
      set: {
        credentials: encrypted,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  await db
    .delete(apiCredentials)
    .where(eq(apiCredentials.accountId, parseInt(accountId)));

  return NextResponse.json({ success: true });
}
