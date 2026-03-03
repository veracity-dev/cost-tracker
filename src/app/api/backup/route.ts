import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { services, entities, serviceAccounts, paymentCards, costRecords, apiCredentials } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";

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

// Convert SQLite integer timestamp (epoch seconds) to ISO string for pg
function toDate(val: unknown): Date | null {
  if (val == null) return null;
  if (typeof val === "number") return new Date(val * 1000);
  if (typeof val === "string") return new Date(val);
  return null;
}

function toBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  return val === 1 || val === true;
}

// Read a table from the SQLite database into an array of objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readSqliteTable(sqliteDb: any, tableName: string): Record<string, unknown>[] {
  try {
    const stmt = sqliteDb.prepare(`SELECT * FROM ${tableName}`);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch {
    return [];
  }
}

async function importData(tables: {
  services: Record<string, unknown>[];
  entities: Record<string, unknown>[];
  service_accounts: Record<string, unknown>[];
  payment_cards: Record<string, unknown>[];
  cost_records: Record<string, unknown>[];
  api_credentials: Record<string, unknown>[];
}) {
  // Clear all existing data in reverse FK order
  await db.delete(apiCredentials);
  await db.delete(costRecords);
  await db.delete(serviceAccounts);
  await db.delete(paymentCards);
  await db.delete(entities);
  await db.delete(services);

  if (tables.services?.length) {
    for (const row of tables.services) {
      await db.execute(
        sql`INSERT INTO services (id, name, slug, category, has_auto_fetch, created_at)
            VALUES (${row.id}, ${row.name}, ${row.slug}, ${row.category || "other"}, ${toBool(row.has_auto_fetch)}, ${toDate(row.created_at) ?? new Date()})`
      );
    }
    await db.execute(sql`SELECT setval('services_id_seq', (SELECT COALESCE(MAX(id), 1) FROM services))`);
  }

  if (tables.entities?.length) {
    for (const row of tables.entities) {
      await db.execute(
        sql`INSERT INTO entities (id, name, slug, color, created_at)
            VALUES (${row.id}, ${row.name}, ${row.slug}, ${row.color || "#6366f1"}, ${toDate(row.created_at) ?? new Date()})`
      );
    }
    await db.execute(sql`SELECT setval('entities_id_seq', (SELECT COALESCE(MAX(id), 1) FROM entities))`);
  }

  if (tables.payment_cards?.length) {
    for (const row of tables.payment_cards) {
      await db.execute(
        sql`INSERT INTO payment_cards (id, label, last4, brand, is_default, created_at)
            VALUES (${row.id}, ${row.label}, ${row.last4}, ${row.brand}, ${toBool(row.is_default)}, ${toDate(row.created_at) ?? new Date()})`
      );
    }
    await db.execute(sql`SELECT setval('payment_cards_id_seq', (SELECT COALESCE(MAX(id), 1) FROM payment_cards))`);
  }

  if (tables.service_accounts?.length) {
    for (const row of tables.service_accounts) {
      await db.execute(
        sql`INSERT INTO service_accounts (id, service_id, entity_id, label, fetcher_slug, color, created_at)
            VALUES (${row.id}, ${row.service_id}, ${row.entity_id ?? null}, ${row.label}, ${row.fetcher_slug ?? null}, ${row.color || "#6366f1"}, ${toDate(row.created_at) ?? new Date()})`
      );
    }
    await db.execute(sql`SELECT setval('service_accounts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM service_accounts))`);
  }

  if (tables.cost_records?.length) {
    for (const row of tables.cost_records) {
      await db.execute(
        sql`INSERT INTO cost_records (id, account_id, year, month, amount, currency, source, payment_status, card_id, notes, fetched_at, created_at, updated_at)
            VALUES (${row.id}, ${row.account_id}, ${row.year}, ${row.month}, ${row.amount}, ${row.currency || "USD"}, ${row.source || "manual"}, ${row.payment_status ?? "pending"}, ${row.card_id ?? null}, ${row.notes ?? null}, ${toDate(row.fetched_at)}, ${toDate(row.created_at) ?? new Date()}, ${toDate(row.updated_at) ?? new Date()})`
      );
    }
    await db.execute(sql`SELECT setval('cost_records_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cost_records))`);
  }

  if (tables.api_credentials?.length) {
    for (const row of tables.api_credentials) {
      await db.execute(
        sql`INSERT INTO api_credentials (id, account_id, credentials, created_at, updated_at)
            VALUES (${row.id}, ${row.account_id}, ${row.credentials}, ${toDate(row.created_at) ?? new Date()}, ${toDate(row.updated_at) ?? new Date()})`
      );
    }
    await db.execute(sql`SELECT setval('api_credentials_id_seq', (SELECT COALESCE(MAX(id), 1) FROM api_credentials))`);
  }

  return {
    services: tables.services?.length || 0,
    entities: tables.entities?.length || 0,
    serviceAccounts: tables.service_accounts?.length || 0,
    paymentCards: tables.payment_cards?.length || 0,
    costRecords: tables.cost_records?.length || 0,
    apiCredentials: tables.api_credentials?.length || 0,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Open the SQLite database using sql.js with explicit WASM path
    const wasmPath = path.join(process.cwd(), "sql-wasm.wasm");
    const wasmFile = fs.readFileSync(wasmPath);
    const SQL = await initSqlJs({ wasmBinary: wasmFile.buffer.slice(wasmFile.byteOffset, wasmFile.byteOffset + wasmFile.byteLength) });
    const sqliteDb = new SQL.Database(buffer);

    // Read all tables from SQLite
    const tables = {
      services: readSqliteTable(sqliteDb, "services"),
      entities: readSqliteTable(sqliteDb, "entities"),
      service_accounts: readSqliteTable(sqliteDb, "service_accounts"),
      payment_cards: readSqliteTable(sqliteDb, "payment_cards"),
      cost_records: readSqliteTable(sqliteDb, "cost_records"),
      api_credentials: readSqliteTable(sqliteDb, "api_credentials"),
    };

    sqliteDb.close();

    if (!tables.services.length && !tables.entities.length) {
      return NextResponse.json(
        { error: "No data found in SQLite backup. Make sure it's a valid cost-tracker database." },
        { status: 400 }
      );
    }

    const counts = await importData(tables);

    return NextResponse.json({ success: true, imported: counts });
  } catch (err) {
    console.error("Import failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
