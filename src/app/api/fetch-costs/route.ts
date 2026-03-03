import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costRecords, serviceAccounts, apiCredentials } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getFetcher } from "@/lib/services";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET = process.env.AUTH_SECRET || "fallback-secret-change-me-now!!";

function getEncryptionKey(): Buffer {
  return crypto.scryptSync(SECRET, "salt", 32);
}

function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function POST(request: Request) {
  const { accountId, year, month } = await request.json();

  if (!accountId || !year || !month) {
    return NextResponse.json(
      { error: "accountId, year, and month are required" },
      { status: 400 }
    );
  }

  // Get account
  const account = await db
    .select()
    .from(serviceAccounts)
    .where(eq(serviceAccounts.id, accountId))
    .limit(1);

  if (account.length === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Get credentials
  const creds = await db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.accountId, account[0].id))
    .limit(1);

  if (creds.length === 0) {
    return NextResponse.json(
      { error: "No API credentials configured for this account" },
      { status: 400 }
    );
  }

  // Get fetcher using fetcherSlug
  const fetcherKey = account[0].fetcherSlug;
  if (!fetcherKey) {
    return NextResponse.json(
      { error: "No fetcher configured for this account" },
      { status: 400 }
    );
  }

  const fetcher = getFetcher(fetcherKey);
  if (!fetcher) {
    return NextResponse.json(
      { error: "No auto-fetch implementation for this fetcher" },
      { status: 400 }
    );
  }

  try {
    const credentials = JSON.parse(decrypt(creds[0].credentials));
    const result = await fetcher.fetch(credentials, year, month);
    const roundedAmount = Math.round(result.amount * 100) / 100;

    // Upsert cost record — only update paymentStatus on insert (default "pending"),
    // preserve existing status on update since auto-fetch can't determine payment status
    await db
      .insert(costRecords)
      .values({
        accountId: account[0].id,
        year,
        month,
        amount: roundedAmount,
        source: "api",
        paymentStatus: "pending",
        fetchedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [costRecords.accountId, costRecords.year, costRecords.month],
        set: {
          amount: sql`excluded.amount`,
          source: sql`'api'`,
          fetchedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      amount: roundedAmount,
      currency: result.currency,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
