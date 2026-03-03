import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { services, entities, serviceAccounts, paymentCards, costRecords, apiCredentials } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const [
    servicesData,
    entitiesData,
    serviceAccountsData,
    paymentCardsData,
    costRecordsData,
    apiCredentialsData,
  ] = await Promise.all([
    db.select().from(services),
    db.select().from(entities),
    db.select().from(serviceAccounts),
    db.select().from(paymentCards),
    db.select().from(costRecords),
    db.select().from(apiCredentials),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    tables: {
      services: servicesData,
      entities: entitiesData,
      serviceAccounts: serviceAccountsData,
      paymentCards: paymentCardsData,
      costRecords: costRecordsData,
      apiCredentials: apiCredentialsData,
    },
  };

  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cost-tracker-backup-${date}.json"`,
    },
  });
}

// Convert SQLite integer timestamp (epoch seconds) or ISO string to Date
function toDate(val: unknown): Date | null {
  if (val == null) return null;
  if (typeof val === "number") return new Date(val * 1000);
  if (typeof val === "string") return new Date(val);
  return null;
}

// Convert SQLite integer boolean (0/1) or actual boolean to boolean
function toBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  return val === 1 || val === true;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Support both { tables: { ... } } format (our export) and raw SQLite dump
    const tables = data.tables || data;

    if (!tables.services || !tables.entities) {
      return NextResponse.json(
        { error: "Invalid backup format. Expected 'tables' with services, entities, etc." },
        { status: 400 }
      );
    }

    // Clear all existing data in reverse FK order
    await db.delete(apiCredentials);
    await db.delete(costRecords);
    await db.delete(serviceAccounts);
    await db.delete(paymentCards);
    await db.delete(entities);
    await db.delete(services);

    // Insert services — preserve original IDs for FK integrity
    if (tables.services?.length) {
      for (const row of tables.services) {
        await db.execute(
          sql`INSERT INTO services (id, name, slug, category, has_auto_fetch, created_at)
              VALUES (${row.id}, ${row.name}, ${row.slug}, ${row.category || "other"}, ${toBool(row.hasAutoFetch ?? row.has_auto_fetch)}, ${toDate(row.createdAt ?? row.created_at) ?? new Date()})`
        );
      }
      // Advance the serial sequence past the max ID
      await db.execute(sql`SELECT setval('services_id_seq', (SELECT COALESCE(MAX(id), 1) FROM services))`);
    }

    if (tables.entities?.length) {
      for (const row of tables.entities) {
        await db.execute(
          sql`INSERT INTO entities (id, name, slug, color, created_at)
              VALUES (${row.id}, ${row.name}, ${row.slug}, ${row.color || "#6366f1"}, ${toDate(row.createdAt ?? row.created_at) ?? new Date()})`
        );
      }
      await db.execute(sql`SELECT setval('entities_id_seq', (SELECT COALESCE(MAX(id), 1) FROM entities))`);
    }

    if (tables.paymentCards?.length || tables.payment_cards?.length) {
      const cards = tables.paymentCards || tables.payment_cards;
      for (const row of cards) {
        await db.execute(
          sql`INSERT INTO payment_cards (id, label, last4, brand, is_default, created_at)
              VALUES (${row.id}, ${row.label}, ${row.last4}, ${row.brand}, ${toBool(row.isDefault ?? row.is_default)}, ${toDate(row.createdAt ?? row.created_at) ?? new Date()})`
        );
      }
      await db.execute(sql`SELECT setval('payment_cards_id_seq', (SELECT COALESCE(MAX(id), 1) FROM payment_cards))`);
    }

    if (tables.serviceAccounts?.length || tables.service_accounts?.length) {
      const accounts = tables.serviceAccounts || tables.service_accounts;
      for (const row of accounts) {
        await db.execute(
          sql`INSERT INTO service_accounts (id, service_id, entity_id, label, fetcher_slug, color, created_at)
              VALUES (${row.id}, ${row.serviceId ?? row.service_id}, ${row.entityId ?? row.entity_id ?? null}, ${row.label}, ${row.fetcherSlug ?? row.fetcher_slug ?? null}, ${row.color || "#6366f1"}, ${toDate(row.createdAt ?? row.created_at) ?? new Date()})`
        );
      }
      await db.execute(sql`SELECT setval('service_accounts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM service_accounts))`);
    }

    if (tables.costRecords?.length || tables.cost_records?.length) {
      const records = tables.costRecords || tables.cost_records;
      for (const row of records) {
        await db.execute(
          sql`INSERT INTO cost_records (id, account_id, year, month, amount, currency, source, payment_status, card_id, notes, fetched_at, created_at, updated_at)
              VALUES (${row.id}, ${row.accountId ?? row.account_id}, ${row.year}, ${row.month}, ${row.amount}, ${row.currency || "USD"}, ${row.source || "manual"}, ${row.paymentStatus ?? row.payment_status ?? "pending"}, ${row.cardId ?? row.card_id ?? null}, ${row.notes ?? null}, ${toDate(row.fetchedAt ?? row.fetched_at)}, ${toDate(row.createdAt ?? row.created_at) ?? new Date()}, ${toDate(row.updatedAt ?? row.updated_at) ?? new Date()})`
        );
      }
      await db.execute(sql`SELECT setval('cost_records_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cost_records))`);
    }

    if (tables.apiCredentials?.length || tables.api_credentials?.length) {
      const creds = tables.apiCredentials || tables.api_credentials;
      for (const row of creds) {
        await db.execute(
          sql`INSERT INTO api_credentials (id, account_id, credentials, created_at, updated_at)
              VALUES (${row.id}, ${row.accountId ?? row.account_id}, ${row.credentials}, ${toDate(row.createdAt ?? row.created_at) ?? new Date()}, ${toDate(row.updatedAt ?? row.updated_at) ?? new Date()})`
        );
      }
      await db.execute(sql`SELECT setval('api_credentials_id_seq', (SELECT COALESCE(MAX(id), 1) FROM api_credentials))`);
    }

    const counts = {
      services: tables.services?.length || 0,
      entities: tables.entities?.length || 0,
      serviceAccounts: (tables.serviceAccounts || tables.service_accounts)?.length || 0,
      paymentCards: (tables.paymentCards || tables.payment_cards)?.length || 0,
      costRecords: (tables.costRecords || tables.cost_records)?.length || 0,
      apiCredentials: (tables.apiCredentials || tables.api_credentials)?.length || 0,
    };

    return NextResponse.json({ success: true, imported: counts });
  } catch (err) {
    console.error("Import failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
